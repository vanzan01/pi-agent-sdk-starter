import type { ConfigStatusResponse } from '@/electron';

interface WorkspaceSettingsPanelProps {
  currentWorkspaceDir: string;
  workspaceDir: string;
  isLoadingWorkspace: boolean;
  isSavingWorkspace: boolean;
  workspaceSaveStatus: 'idle' | 'success' | 'error';
  isFormLoading: boolean;
  setWorkspaceDir: (value: string) => void;
  handleBrowseWorkspace: () => Promise<void>;
  handleSaveWorkspace: () => Promise<void>;
  configStatus: ConfigStatusResponse | null;
}

export function WorkspaceSettingsPanel({
  currentWorkspaceDir,
  workspaceDir,
  isLoadingWorkspace,
  isSavingWorkspace,
  workspaceSaveStatus,
  isFormLoading,
  setWorkspaceDir,
  handleBrowseWorkspace,
  handleSaveWorkspace
}: WorkspaceSettingsPanelProps) {
  if (isLoadingWorkspace) {
    return null;
  }

  return (
    <>
      {/* Workspace Directory */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            Workspace Directory
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Directory where files are read and written. All settings are stored in this
            workspace&apos;s <code>.claude-sdk/config.json</code>.
          </p>
        </div>
        {currentWorkspaceDir && (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            {currentWorkspaceDir}
          </div>
        )}
        <div className="flex gap-2">
          <input
            id="workspace-input"
            type="text"
            value={workspaceDir}
            onChange={(e) => setWorkspaceDir(e.target.value)}
            placeholder={currentWorkspaceDir || '/path/to/workspace'}
            className="flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
          />
          <button
            onClick={handleBrowseWorkspace}
            type="button"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
          >
            Browse...
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSaveWorkspace}
            disabled={!workspaceDir.trim() || isSavingWorkspace || isFormLoading}
            className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {isSavingWorkspace ? 'Saving...' : 'Save'}
          </button>
        </div>
        {workspaceSaveStatus === 'success' && (
          <p className="text-xs font-medium text-green-600 dark:text-green-400">
            Workspace directory updated successfully
          </p>
        )}
        {workspaceSaveStatus === 'error' && (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            Failed to update workspace directory
          </p>
        )}
      </section>

      <div className="border-t border-neutral-200/80 dark:border-neutral-800" />
    </>
  );
}
