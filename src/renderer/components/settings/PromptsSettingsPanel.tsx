import type { ConfigSource } from '@/electron';

interface PromptsSettingsPanelProps {
  hasAnyChatApp: boolean;
  systemPromptAppend: string;
  isDefaultPrompt: boolean;
  systemPromptSource: ConfigSource;
  isSavingPrompt: boolean;
  isLoadingPrompt: boolean;
  promptSaveState: 'idle' | 'success' | 'error';
  onSystemPromptChange: (value: string) => void;
  onSaveSystemPrompt: () => Promise<void>;
  onResetSystemPrompt: () => Promise<void>;
}

export function PromptsSettingsPanel({
  hasAnyChatApp,
  systemPromptAppend,
  isDefaultPrompt,
  systemPromptSource,
  isSavingPrompt,
  isLoadingPrompt,
  promptSaveState,
  onSystemPromptChange,
  onSaveSystemPrompt,
  onResetSystemPrompt
}: PromptsSettingsPanelProps) {
  if (!hasAnyChatApp) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            Custom Instructions
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Additional instructions appended to the Pi SDK system prompt. Use markdown for
            formatting. Changes take effect on new conversations.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {systemPromptSource === 'project' && 'Project'}
          {systemPromptSource === 'env' && 'Environment'}
          {systemPromptSource === 'default' && 'Default'}
        </span>
      </div>
      <div className="space-y-3">
        <textarea
          id="system-prompt-input"
          value={systemPromptAppend}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          rows={10}
          className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
          placeholder="Enter custom instructions for Pi..."
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isDefaultPrompt && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Modified
              </span>
            )}
            {promptSaveState === 'success' && (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Saved</span>
            )}
            {promptSaveState === 'error' && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Failed to save
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isDefaultPrompt && (
              <button
                onClick={onResetSystemPrompt}
                disabled={isSavingPrompt}
                className="rounded-full border border-neutral-200 px-5 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
              >
                Reset to Default
              </button>
            )}
            <button
              onClick={onSaveSystemPrompt}
              disabled={isSavingPrompt || isLoadingPrompt}
              className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {isSavingPrompt ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
