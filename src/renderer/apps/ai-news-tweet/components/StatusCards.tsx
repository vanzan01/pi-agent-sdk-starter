import { CheckCircle2, Circle, Loader2, ArrowRight } from 'lucide-react';
import type { AgentId, AgentRuntime } from '../types';
import { AGENT_META } from '../utils';

type StatusCardsProps = {
  agentStates: Record<AgentId, AgentRuntime>;
};

export function StatusCards({ agentStates }: StatusCardsProps) {
  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-white)] p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {AGENT_META.map((meta, idx) => {
          const state = agentStates[meta.id];
          const isComplete = state.status === 'complete';
          const isRunning = state.status === 'running';
          const isLast = idx === AGENT_META.length - 1;

          return (
            <div key={meta.id} className="flex flex-1 items-center">
              {/* Stage card */}
              <div
                className={`flex flex-1 items-center gap-3 rounded-xl border p-3 transition-all ${
                  isRunning
                    ? 'border-[var(--accent-coral)] bg-[var(--accent-coral)]/5'
                    : isComplete
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-[var(--border-light)] bg-[var(--user-bubble)]'
                }`}
              >
                {/* Status icon */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isComplete
                      ? 'bg-emerald-500 text-white'
                      : isRunning
                        ? 'bg-[var(--accent-coral)] text-white'
                        : 'bg-[var(--border-light)] text-[var(--text-tertiary)]'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>

                {/* Label */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-medium ${
                      isRunning
                        ? 'text-[var(--accent-coral)]'
                        : isComplete
                          ? 'text-emerald-600'
                          : 'text-[var(--text-tertiary)]'
                    }`}
                  >
                    Stage {idx + 1}
                  </p>
                  <p
                    className={`truncate text-sm font-semibold ${
                      isRunning || isComplete ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {meta.label}
                  </p>
                </div>
              </div>

              {/* Arrow connector */}
              {!isLast && (
                <div className="px-2">
                  <ArrowRight
                    className={`h-4 w-4 ${
                      isComplete ? 'text-emerald-400' : 'text-[var(--border-light)]'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
