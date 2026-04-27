import type { ConfigSource } from '@/electron';

interface ModelConfig {
  fast: string;
  smart: string;
  deep: string;
}

interface ModelsSettingsPanelProps {
  provider: 'codex' | 'glm';
  providerSource: ConfigSource;
  codexModels: ModelConfig;
  codexModelsInput: ModelConfig;
  glmModels: ModelConfig;
  glmModelsInput: ModelConfig;
  isSavingModels: boolean;
  modelsSaveState: 'idle' | 'success' | 'error';
  onCodexModelsInputChange: (next: ModelConfig) => void;
  onGlmModelsInputChange: (next: ModelConfig) => void;
  onSaveCodexModels: () => Promise<void>;
  onResetCodexModels: () => Promise<void>;
  onSaveGlmModels: () => Promise<void>;
  onResetGlmModels: () => Promise<void>;
}

export function ModelsSettingsPanel({
  provider,
  providerSource,
  codexModels,
  codexModelsInput,
  glmModels,
  glmModelsInput,
  isSavingModels,
  modelsSaveState,
  onCodexModelsInputChange,
  onGlmModelsInputChange,
  onSaveCodexModels,
  onResetCodexModels,
  onSaveGlmModels,
  onResetGlmModels
}: ModelsSettingsPanelProps) {
  const showCodex = provider === 'codex';
  const showGlm = provider === 'glm';

  if (!showCodex && !showGlm) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            Model IDs
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Configure which model to use for each speed tier.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {providerSource === 'project' && 'Project'}
          {providerSource === 'env' && 'Environment'}
          {providerSource === 'default' && 'Default'}
        </span>
      </div>

      {showCodex && (
        <div className="space-y-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <ModelInputs
            title="OpenAI Codex"
            labels={{ fast: 'Fast (GPT-5.4)', smart: 'Smart (GPT-5.4)', deep: 'Deep (GPT-5.5)' }}
            current={codexModels}
            draft={codexModelsInput}
            onChange={onCodexModelsInputChange}
          />

          <SaveRow
            isSaving={isSavingModels}
            draft={codexModelsInput}
            onSave={onSaveCodexModels}
            onReset={onResetCodexModels}
            modelsSaveState={modelsSaveState}
          />
        </div>
      )}

      {showGlm && (
        <div className="space-y-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
          <ModelInputs
            title="GLM (Zhipu AI)"
            labels={{ fast: 'Fast', smart: 'Smart', deep: 'Deep' }}
            current={glmModels}
            draft={glmModelsInput}
            onChange={onGlmModelsInputChange}
          />

          <SaveRow
            isSaving={isSavingModels}
            draft={glmModelsInput}
            onSave={onSaveGlmModels}
            onReset={onResetGlmModels}
            modelsSaveState={modelsSaveState}
          />
        </div>
      )}
    </section>
  );
}

function ModelInputs({
  title,
  labels,
  current,
  draft,
  onChange
}: {
  title: string;
  labels: { fast: string; smart: string; deep: string };
  current: ModelConfig;
  draft: ModelConfig;
  onChange: (next: ModelConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</label>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          Set the model ID for each speed tier.
        </p>
      </div>

      <div className="grid gap-3">
        {(['fast', 'smart', 'deep'] as const).map((tier) => (
          <div key={tier} className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
              {labels[tier]}
            </label>
            <div className="rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-1.5 font-mono text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
              Current: {current[tier]}
            </div>
            <input
              type="text"
              value={draft[tier]}
              onChange={(e) =>
                onChange({
                  ...draft,
                  [tier]: e.target.value
                })
              }
              placeholder={current[tier]}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SaveRow({
  isSaving,
  draft,
  onSave,
  onReset,
  modelsSaveState
}: {
  isSaving: boolean;
  draft: ModelConfig;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
  modelsSaveState: 'idle' | 'success' | 'error';
}) {
  const hasDraft = draft.fast || draft.smart || draft.deep;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          onClick={onReset}
          disabled={isSaving}
          className="rounded-full border border-neutral-200 px-5 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:border-neutral-500 dark:hover:bg-neutral-800/60"
        >
          Reset to defaults
        </button>
        <button
          onClick={onSave}
          disabled={isSaving || !hasDraft}
          className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {isSaving ? 'Saving...' : 'Save Model IDs'}
        </button>
      </div>

      {modelsSaveState === 'success' && (
        <p className="text-xs font-medium text-green-600 dark:text-green-400">Model IDs saved</p>
      )}
      {modelsSaveState === 'error' && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">Failed to save model IDs</p>
      )}
    </div>
  );
}
