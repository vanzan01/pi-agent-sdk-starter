import type { MouseEventHandler } from 'react';
import { Settings, Play, Loader2 } from 'lucide-react';

type HeaderProps = {
  isRunning: boolean;
  showSettings: boolean;
  onGenerate: MouseEventHandler<HTMLButtonElement>;
  onToggleSettings: MouseEventHandler<HTMLButtonElement>;
};

export function Header({ isRunning, showSettings, onGenerate, onToggleSettings }: HeaderProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-white)] p-5 shadow-sm">
      {/* Top bar with date and actions */}
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-light)] pb-4">
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span className="font-medium uppercase tracking-wider">Automated Pipeline</span>
          <span>·</span>
          <span>{today}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSettings}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              showSettings
                ? 'border-[var(--accent-coral)] bg-[var(--accent-coral)]/5 text-[var(--accent-coral)]'
                : 'border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--user-bubble)]'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Models</span>
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isRunning}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent-coral)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-coral-dark)] disabled:opacity-60"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Generate Tweet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Masthead */}
      <div className="text-center">
        <p className="mb-1 text-[10px] font-semibold tracking-[0.3em] uppercase text-[var(--text-tertiary)]">
          Multi-Agent System
        </p>
        <h1 className="font-serif text-4xl font-medium tracking-tight text-[var(--text-primary)]">
          AI News Pipeline
        </h1>
        <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-3 text-sm text-[var(--text-tertiary)]">
          <span className="h-px flex-1 bg-[var(--border-light)]" />
          <span className="font-medium">Research · Analyze · Write</span>
          <span className="h-px flex-1 bg-[var(--border-light)]" />
        </div>
      </div>
    </header>
  );
}
