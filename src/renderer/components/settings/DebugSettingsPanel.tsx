import { ChevronDown, ChevronUp } from 'lucide-react';

import type { ConfigSource } from '@/electron';

interface PathInfo {
  platform: string;
  pathSeparator: string;
  pathEntries: string[];
  pathCount: number;
  fullPath: string;
}

interface EnvVar {
  key: string;
  value: string;
}

interface DiagnosticMetadata {
  appVersion: string;
  electronVersion: string;
  chromiumVersion: string;
  v8Version: string;
  nodeVersion: string;
  piSdkVersion: string;
  piAgentDir: string;
  piAuthPath: string;
  piModelsPath: string;
  piSettingsPath: string;
  platform: string;
  arch: string;
  osRelease: string;
  osType: string;
  osVersion: string;
}

interface DebugSettingsPanelProps {
  debugMode: boolean;
  debugModeSource: ConfigSource;
  isSavingDebugMode: boolean;
  isDebugExpanded: boolean;
  pathInfo: PathInfo | null;
  isLoadingPathInfo: boolean;
  envVars: EnvVar[] | null;
  isLoadingEnvVars: boolean;
  diagnosticMetadata: DiagnosticMetadata | null;
  isLoadingDiagnosticMetadata: boolean;
  onToggleDebugMode: () => Promise<void>;
  onToggleExpanded: (next: boolean) => void;
  onLoadPathInfo: () => Promise<void>;
  onLoadEnvVars: () => Promise<void>;
  onLoadDiagnosticMetadata: () => Promise<void>;
}

export function DebugSettingsPanel({
  debugMode,
  debugModeSource,
  isSavingDebugMode,
  isDebugExpanded,
  pathInfo,
  isLoadingPathInfo,
  envVars,
  isLoadingEnvVars,
  diagnosticMetadata,
  isLoadingDiagnosticMetadata,
  onToggleDebugMode,
  onToggleExpanded,
  onLoadPathInfo,
  onLoadEnvVars,
  onLoadDiagnosticMetadata
}: DebugSettingsPanelProps) {
  const handleToggleExpanded = () => {
    const next = !isDebugExpanded;
    onToggleExpanded(next);
    if (next) {
      void onLoadPathInfo();
      void onLoadEnvVars();
      void onLoadDiagnosticMetadata();
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            Debug Mode
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Log additional debug information to help diagnose issues.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            debugModeSource === 'env' ?
              'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            : debugModeSource === 'project' ?
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
          }`}
        >
          {debugModeSource === 'env' ?
            'Environment'
          : debugModeSource === 'project' ?
            'Project'
          : 'Default'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Debug Mode</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {debugMode ? 'Debug logging is enabled.' : 'Debug logging is disabled.'}
          </p>
        </div>
        <button
          id="debug-mode-toggle"
          type="button"
          onClick={onToggleDebugMode}
          disabled={isSavingDebugMode}
          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-transparent px-0.5 transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-neutral-900/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            debugMode ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
          role="switch"
          aria-checked={debugMode}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out dark:bg-neutral-900 ${
              debugMode ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

      <button
        onClick={handleToggleExpanded}
        className="flex w-full items-center justify-between rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-100 dark:hover:border-neutral-700/60"
      >
        <span>Developer / Debug Info</span>
        {isDebugExpanded ?
          <ChevronUp className="h-4 w-4" />
        : <ChevronDown className="h-4 w-4" />}
      </button>

      {isDebugExpanded && (
        <div className="space-y-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          {/* App Information */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.35em] text-neutral-400 uppercase dark:text-neutral-500">
              App Information
            </p>
            {isLoadingDiagnosticMetadata ?
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Loading...</p>
            : diagnosticMetadata ?
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DebugInfoRow label="App Version" value={diagnosticMetadata.appVersion} />
                <DebugInfoRow label="Electron Version" value={diagnosticMetadata.electronVersion} />
                <DebugInfoRow label="Chromium Version" value={diagnosticMetadata.chromiumVersion} />
                <DebugInfoRow label="V8 Version" value={diagnosticMetadata.v8Version} />
                <DebugInfoRow label="Node.js Version" value={diagnosticMetadata.nodeVersion} />
                <DebugInfoRow label="Pi SDK Version" value={diagnosticMetadata.piSdkVersion} />
                <DebugInfoRow label="Pi Agent Directory" value={diagnosticMetadata.piAgentDir} />
                <DebugInfoRow label="Pi Auth File" value={diagnosticMetadata.piAuthPath} />
                <DebugInfoRow label="Pi Models File" value={diagnosticMetadata.piModelsPath} />
                <DebugInfoRow label="Pi Settings File" value={diagnosticMetadata.piSettingsPath} />
                <DebugInfoRow
                  label="Platform"
                  value={`${diagnosticMetadata.platform} (${diagnosticMetadata.arch})`}
                />
                <DebugInfoRow label="OS Type" value={diagnosticMetadata.osType} />
                <DebugInfoRow label="OS Release" value={diagnosticMetadata.osRelease} />
              </div>
            : <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Failed to load diagnostic information
              </p>
            }
          </div>

          <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.35em] text-neutral-400 uppercase dark:text-neutral-500">
              PATH Environment Variable
            </p>
            {isLoadingPathInfo ?
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Loading...</p>
            : pathInfo ?
              <div className="space-y-2">
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">Platform:</span> {pathInfo.platform}
                  {' \u203a '} {/* › */}
                  <span className="font-medium">Entries:</span> {pathInfo.pathCount}
                  {' \u203a '} {/* › */}
                  <span className="font-medium">Separator:</span>{' '}
                  {pathInfo.pathSeparator === ';' ? '; (Windows)' : ': (Unix)'}
                </div>
                <div className="max-h-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950/40">
                  <div className="space-y-1">
                    {pathInfo.pathEntries.map((entry, index) => (
                      <div
                        key={index}
                        className="font-mono text-xs text-neutral-700 dark:text-neutral-300"
                      >
                        <span className="text-neutral-400 dark:text-neutral-500">
                          {String(index + 1).padStart(3, ' ')}.
                        </span>{' '}
                        {entry}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            : <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Failed to load PATH info
              </p>
            }
          </div>

          <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

          <div className="space-y-2">
            <p className="text-[11px] font-semibold tracking-[0.35em] text-neutral-400 uppercase dark:text-neutral-500">
              All Environment Variables
            </p>
            {isLoadingEnvVars ?
              <p className="text-xs text-neutral-600 dark:text-neutral-400">Loading...</p>
            : envVars ?
              <div className="space-y-2">
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">Total:</span> {envVars.length} variables
                </div>
                <div className="max-h-64 overflow-y-auto rounded-2xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950/40">
                  <div className="space-y-1">
                    {envVars.map((envVar, index) => (
                      <div
                        key={index}
                        className="font-mono text-xs text-neutral-700 dark:text-neutral-300"
                      >
                        <span className="text-neutral-400 dark:text-neutral-500">
                          {String(index + 1).padStart(3, ' ')}.
                        </span>{' '}
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {envVar.key}
                        </span>
                        {' = '}
                        <span className="text-neutral-600 dark:text-neutral-400">
                          {envVar.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            : <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Failed to load environment variables
              </p>
            }
          </div>
        </div>
      )}
    </section>
  );
}

function DebugInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="mt-0.5 font-mono text-xs text-neutral-700 dark:text-neutral-300">{value}</p>
    </div>
  );
}
