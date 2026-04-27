import { useEffect, useState } from 'react';

import type { AppSettingsPanelProps } from '../shared/settingsTypes';

export function TemplateAppSettingsPanel({ app }: AppSettingsPanelProps) {
  const [promptAppend, setPromptAppend] = useState('');
  const [starterPrompt, setStarterPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await window.electron.config.getAppSettings(app.id);
        const settings = response.settings || {};
        setPromptAppend(settings.promptAppend || '');
        setStarterPrompt(settings.starterPrompt || '');
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [app.id]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveState('idle');
    try {
      const payload = {
        promptAppend: promptAppend.trim() || null,
        starterPrompt: starterPrompt.trim() || null
      };
      const response = await window.electron.config.setAppSettings(app.id, payload);
      if (response.success !== false) {
        setSaveState('success');
        setTimeout(() => setSaveState('idle'), 2000);
      } else {
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 2500);
      }
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            App prompt append
          </p>
          {saveState === 'success' && (
            <span className="text-xs font-semibold text-green-600">Saved</span>
          )}
          {saveState === 'error' && (
            <span className="text-xs font-semibold text-red-600">Error</span>
          )}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Extra instructions appended after this app&apos;s manifest prompt. Tailor tone or
          constraints for this app only.
        </p>
        <textarea
          value={promptAppend}
          onChange={(e) => setPromptAppend(e.target.value)}
          className="min-h-[96px] w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm transition focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950/50 dark:text-neutral-100"
          placeholder="Guide the user through this template task step by step."
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          Starter prompt (for demo buttons)
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Default user prompt used by this app&apos;s quick-start/demo actions.
        </p>
        <textarea
          value={starterPrompt}
          onChange={(e) => setStarterPrompt(e.target.value)}
          className="min-h-[72px] w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 shadow-sm transition focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950/50 dark:text-neutral-100"
          placeholder="E.g., “Walk me through creating a new CLI tool scaffold.”"
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isSaving || isLoading}
          onClick={handleSave}
          className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          {isSaving ? 'Saving…' : 'Save app settings'}
        </button>
      </div>
    </div>
  );
}

