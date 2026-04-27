import { DEFAULT_GLM_BASE_URL } from '../../../shared/core';
import type { ConfigSource } from '@/electron';

interface ProviderSettingsPanelProps {
  hasAnyChatApp: boolean;
  provider: 'codex' | 'glm';
  providerSource: ConfigSource;
  isSavingProvider: boolean;
  glmApiKey: string;
  glmApiKeyInput: string;
  glmBaseUrl: string;
  glmBaseUrlInput: string;
  isSavingGlmConfig: boolean;
  glmSaveState: 'idle' | 'success' | 'error';
  onProviderChange: (provider: 'codex' | 'glm') => void;
  onGlmApiKeyInputChange: (value: string) => void;
  onGlmBaseUrlInputChange: (value: string) => void;
  onSaveGlmApiKey: () => Promise<void>;
  onClearGlmApiKey: () => Promise<void>;
  onSaveGlmBaseUrl: () => Promise<void>;
}

export function ProviderSettingsPanel({
  hasAnyChatApp,
  provider,
  providerSource,
  isSavingProvider,
  glmApiKey,
  glmApiKeyInput,
  glmBaseUrl,
  glmBaseUrlInput,
  isSavingGlmConfig,
  glmSaveState,
  onProviderChange,
  onGlmApiKeyInputChange,
  onGlmBaseUrlInputChange,
  onSaveGlmApiKey,
  onClearGlmApiKey,
  onSaveGlmBaseUrl
}: ProviderSettingsPanelProps) {
  if (!hasAnyChatApp) {
    return null;
  }

  return (
    <>
      {/* Model Provider - only shown when chat feature is available */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              Model Provider
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Choose between Pi SDK&apos;s OpenAI Codex OAuth provider or GLM (Zhipu AI).
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            {providerSource === 'project' && 'Project'}
            {providerSource === 'env' && 'Environment'}
            {providerSource === 'default' && 'Default'}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onProviderChange('codex')}
            disabled={isSavingProvider}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
              provider === 'codex'
                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            OpenAI Codex
          </button>
          <button
            onClick={() => onProviderChange('glm')}
            disabled={isSavingProvider}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
              provider === 'glm'
                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            GLM (Zhipu AI)
          </button>
        </div>

        {/* GLM Configuration - only show when GLM is selected */}
        {provider === 'glm' && (
          <div className="space-y-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  GLM API Key (Z.AI)
                </label>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Get your API key from the Z.AI Open Platform. Stored securely in your workspace{' '}
                  <code>.env</code> file as <code>GLM_API_KEY</code>.
                </p>
              </div>
              {glmApiKey && (
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Current key: <span className="font-mono">...{glmApiKey.slice(-4)}</span>
                </div>
              )}
              <input
                type="password"
                value={glmApiKeyInput}
                onChange={(e) => onGlmApiKeyInputChange(e.target.value)}
                placeholder={glmApiKey ? `...${glmApiKey.slice(-4)}` : 'Enter GLM API key'}
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
              />
              <div className="flex flex-wrap items-center justify-end gap-3">
                {glmApiKey && (
                  <button
                    onClick={onClearGlmApiKey}
                    disabled={isSavingGlmConfig}
                    className="rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/70 dark:text-red-200 dark:hover:border-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-50"
                  >
                    Clear key
                  </button>
                )}
                <button
                  onClick={onSaveGlmApiKey}
                  disabled={!glmApiKeyInput.trim() || isSavingGlmConfig}
                  className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {isSavingGlmConfig ? 'Saving...' : 'Save API Key'}
                </button>
              </div>
            </div>

            <div className="border-t border-neutral-200/80 dark:border-neutral-700" />

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Base URL (Advanced)
                </label>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Default: {DEFAULT_GLM_BASE_URL}
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-2 font-mono text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                {glmBaseUrl}
              </div>
              <input
                type="text"
                value={glmBaseUrlInput}
                onChange={(e) => onGlmBaseUrlInputChange(e.target.value)}
                placeholder="Override base URL (leave empty for default)"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
              />
              <div className="flex justify-end">
                <button
                  onClick={onSaveGlmBaseUrl}
                  disabled={isSavingGlmConfig}
                  className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {isSavingGlmConfig ? 'Saving...' : 'Save Base URL'}
                </button>
              </div>
            </div>

            {glmSaveState === 'success' && (
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                GLM configuration saved
              </p>
            )}
            {glmSaveState === 'error' && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                Failed to save GLM configuration
              </p>
            )}
          </div>
        )}
      </section>

      <div className="border-t border-neutral-200/80 dark:border-neutral-800" />
    </>
  );
}
