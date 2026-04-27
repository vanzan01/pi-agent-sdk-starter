import {
  AlertCircle,
  Check,
  Download,
  Folder,
  FolderOpen,
  Layers,
  Loader2,
  Package,
  X
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { DomainConfig } from '../../shared/domains';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAppId: string;
  currentAppName: string;
  // Optional: when exporting from a domain context
  activeDomain?: DomainConfig | null;
}

interface ExportableApp {
  id: string;
  name: string;
  description?: string;
  skills: string[];
}

interface ExportProgress {
  jobId: string;
  status: string;
  current: number;
  total: number;
  currentFile?: string;
  error?: string;
  outputPath?: string;
  zipPath?: string;
}

type ExportState = 'idle' | 'exporting' | 'complete' | 'error';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function ExportModal({
  isOpen,
  onClose,
  currentAppId,
  currentAppName,
  activeDomain
}: ExportModalProps) {
  // Determine if this is a domain export
  const isDomainExport = !!activeDomain;
  const exportTitle = isDomainExport ? activeDomain.name : currentAppName;

  // Form state - default to domain apps if in domain context
  const defaultAppIds = isDomainExport ? activeDomain.appIds : [currentAppId];
  const defaultProjectName =
    isDomainExport ? `${activeDomain.id}-domain-export` : `${currentAppId}-export`;

  const [projectName, setProjectName] = useState(defaultProjectName);
  const [outputDir, setOutputDir] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>(defaultAppIds);
  const [includeReadme, setIncludeReadme] = useState(true);

  // Data state
  const [availableApps, setAvailableApps] = useState<ExportableApp[]>([]);
  const [previewSkills, setPreviewSkills] = useState<string[]>([]);
  const [previewFileCount, setPreviewFileCount] = useState(0);
  const [previewTotalSize, setPreviewTotalSize] = useState(0);

  // UI state
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultIds = activeDomain ? activeDomain.appIds : [currentAppId];
      const defaultName =
        activeDomain ? `${activeDomain.id}-domain-export` : `${currentAppId}-export`;
      setProjectName(defaultName);
      setSelectedAppIds(defaultIds);
      setExportState('idle');
      setProgress(null);
      setError(null);
      loadApps();
    }
  }, [isOpen, currentAppId, activeDomain]);

  // Load available apps
  const loadApps = async () => {
    setIsLoadingApps(true);
    try {
      const result = await window.electron.export.getApps();
      if (result.apps) {
        setAvailableApps(result.apps);
      }
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apps');
    } finally {
      setIsLoadingApps(false);
    }
  };

  // Load preview when selection changes
  useEffect(() => {
    if (!isOpen || selectedAppIds.length === 0 || !outputDir) return;

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const result = await window.electron.export.preview({
          projectName,
          outputDir,
          selectedAppIds,
          includeReadme
        });
        if (result.success && result.preview) {
          setPreviewSkills(result.preview.skills);
          setPreviewFileCount(result.preview.files.length);
          setPreviewTotalSize(result.preview.totalSize);
        }
      } catch {
        // Ignore preview errors
      } finally {
        setIsLoadingPreview(false);
      }
    };

    const timeout = setTimeout(loadPreview, 300);
    return () => clearTimeout(timeout);
  }, [isOpen, selectedAppIds, outputDir, projectName, includeReadme]);

  // Listen for export progress
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = window.electron.export.onProgress((prog) => {
      setProgress(prog);

      if (prog.status === 'complete') {
        setExportState('complete');
      } else if (prog.status === 'error') {
        setExportState('error');
        setError(prog.error || 'Export failed');
      } else if (prog.status === 'cancelled') {
        setExportState('idle');
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Browse for output directory
  const handleBrowse = useCallback(async () => {
    const result = await window.electron.export.browseDirectory();
    if (!result.cancelled && result.path) {
      setOutputDir(result.path);
    }
  }, []);

  // Start export
  const handleExport = useCallback(async () => {
    if (!projectName.trim() || !outputDir || selectedAppIds.length === 0) {
      return;
    }

    setExportState('exporting');
    setError(null);

    try {
      const result = await window.electron.export.start({
        projectName: projectName.trim(),
        outputDir,
        selectedAppIds,
        includeReadme
      });

      if (!result.success) {
        setExportState('error');
        setError(result.error || 'Failed to start export');
      }
    } catch (err) {
      setExportState('error');
      setError(err instanceof Error ? err.message : 'Failed to start export');
    }
  }, [projectName, outputDir, selectedAppIds, includeReadme]);

  // Cancel export
  const handleCancel = useCallback(async () => {
    if (progress?.jobId) {
      await window.electron.export.cancel(progress.jobId);
    }
    setExportState('idle');
    setProgress(null);
  }, [progress?.jobId]);

  // Open output folder
  const handleOpenFolder = useCallback(() => {
    if (progress?.outputPath) {
      window.electron.shell.openExternal(`file://${progress.outputPath}`);
    }
  }, [progress?.outputPath]);

  // Toggle app selection
  const toggleApp = useCallback((appId: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  }, []);

  if (!isOpen) return null;

  const progressPercent =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={exportState === 'exporting' ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: isDomainExport ? `${activeDomain.color}20` : undefined,
                  color: isDomainExport ? activeDomain.color : undefined
                }}
              >
                {isDomainExport ?
                  <Layers className="h-5 w-5" />
                : <Package className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Export: {exportTitle}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isDomainExport ?
                    `Export domain (${activeDomain.appIds.length} apps)`
                  : 'Create standalone project'}
                </p>
              </div>
            </div>
            {exportState !== 'exporting' && (
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-5">
            {exportState === 'exporting' ?
              // Progress view
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Exporting... {progressPercent}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {progress?.currentFile && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {progress.currentFile}
                  </p>
                )}
              </div>
            : exportState === 'complete' ?
              // Complete view
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Export Complete!
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Your project has been exported successfully.
                  </p>
                </div>
                {progress?.outputPath && (
                  <p className="truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {progress.outputPath}
                  </p>
                )}
              </div>
            : exportState === 'error' ?
              // Error view
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Export Failed
                  </h3>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
              // Form view
            : <div className="space-y-4">
                {/* Project Name */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-app-export"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Output Directory */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Output Directory
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={outputDir}
                      onChange={(e) => setOutputDir(e.target.value)}
                      placeholder="Select a directory..."
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={handleBrowse}
                      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Folder className="h-4 w-4" />
                      Browse
                    </button>
                  </div>
                </div>

                {/* App Selection */}
                {isLoadingApps ?
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                : availableApps.length > 1 && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Include Apps
                      </label>
                      <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                        {availableApps.map((app) => (
                          <label
                            key={app.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAppIds.includes(app.id)}
                              onChange={() => toggleApp(app.id)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500 dark:border-slate-600"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {app.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                }

                {/* Preview */}
                {outputDir && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <h4 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Will include:
                    </h4>
                    <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <li className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-slate-400" />
                        Core framework (src/main, src/preload, src/shared)
                      </li>
                      {selectedAppIds.map((id) => (
                        <li key={id} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-slate-400" />
                          App: {availableApps.find((a) => a.id === id)?.name || id}
                        </li>
                      ))}
                      {previewSkills.length > 0 && (
                        <li className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-slate-400" />
                          Skills: {previewSkills.join(', ')}
                        </li>
                      )}
                    </ul>
                    {isLoadingPreview ?
                      <p className="mt-2 text-xs text-slate-400">Calculating...</p>
                    : previewFileCount > 0 && (
                        <p className="mt-2 text-xs text-slate-400">
                          {previewFileCount} files, {formatBytes(previewTotalSize)}
                        </p>
                      )
                    }
                  </div>
                )}

                {/* Options */}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeReadme}
                    onChange={(e) => setIncludeReadme(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500 dark:border-slate-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Include README.md
                  </span>
                </label>

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </div>
            }
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
            {exportState === 'exporting' ?
              <button
                onClick={handleCancel}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            : exportState === 'complete' ?
              <>
                <button
                  onClick={handleOpenFolder}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <FolderOpen className="h-4 w-4" />
                  Open Folder
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Done
                </button>
              </>
            : exportState === 'error' ?
              <>
                <button
                  onClick={() => {
                    setExportState('idle');
                    setError(null);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Close
                </button>
              </>
            : <>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={!projectName.trim() || !outputDir || selectedAppIds.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </>
            }
          </div>
        </div>
      </div>
    </>
  );
}
