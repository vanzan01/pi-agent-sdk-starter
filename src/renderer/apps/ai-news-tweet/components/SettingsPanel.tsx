import { X, Settings } from 'lucide-react';
import type { AgentId, StageModel, StageModels } from '../types';
import { AGENT_META } from '../utils';

type SettingsPanelProps = {
  stageModels: StageModels;
  onUpdateStageModel: (stage: AgentId, model: StageModel) => void;
  onClose: () => void;
};

const MODEL_OPTIONS: { value: StageModel; label: string; desc: string }[] = [
  { value: 'fast', label: 'GPT-5.4', desc: 'Fast & reliable' },
  { value: 'smart', label: 'GPT-5.4', desc: 'Balanced' },
  { value: 'deep', label: 'GPT-5.5', desc: 'Most capable' }
];

export function SettingsPanel({ stageModels, onUpdateStageModel, onClose }: SettingsPanelProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-white)] p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-[var(--accent-coral)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Model Configuration</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-light)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--user-bubble)] hover:text-[var(--text-secondary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-4 text-xs text-[var(--text-tertiary)]">
        Select the AI model for each pipeline stage. GPT-5.4 is fastest and most reliable for structured output.
      </p>

      {/* Model selectors */}
      <div className="grid gap-4 sm:grid-cols-3">
        {AGENT_META.map((meta) => (
          <div key={meta.id} className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </label>
            <select
              value={stageModels[meta.id]}
              onChange={(e) => onUpdateStageModel(meta.id, e.target.value as StageModel)}
              className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-white)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus:border-[var(--accent-coral)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)]/20"
            >
              {MODEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.desc}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
