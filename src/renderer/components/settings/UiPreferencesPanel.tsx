import type { ConfigSource } from '@/electron';

import { SourceBadge } from './SourceBadge';

interface UiPreferencesPanelProps {
  floatingNavEnabled: boolean;
  floatingNavSource: ConfigSource;
  isSavingFloatingNav: boolean;
  onToggleFloatingNav: () => Promise<void>;
}

export function UiPreferencesPanel({
  floatingNavEnabled,
  floatingNavSource,
  isSavingFloatingNav,
  onToggleFloatingNav
}: UiPreferencesPanelProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            UI Preferences
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Customize the user interface behavior.
          </p>
        </div>
        <SourceBadge source={floatingNavSource} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Floating Navigation Bar
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {floatingNavEnabled ?
              'Navigation bar appears when hovering near the top of the screen in Full UI mode.'
            : 'Navigation bar only appears via keyboard (Ctrl+H).'}
          </p>
        </div>
        <button
          id="floating-nav-toggle"
          type="button"
          onClick={onToggleFloatingNav}
          disabled={isSavingFloatingNav}
          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border border-transparent px-0.5 transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-neutral-900/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            floatingNavEnabled ?
              'bg-neutral-900 dark:bg-neutral-100'
            : 'bg-neutral-200 dark:bg-neutral-700'
          }`}
          role="switch"
          aria-checked={floatingNavEnabled}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out dark:bg-neutral-900 ${
              floatingNavEnabled ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </section>
  );
}
