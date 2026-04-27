import { ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { AgentMeta, AgentRuntime } from '../types';
import { formatSnippet } from '../utils';

type AgentPanelProps = {
  meta: AgentMeta;
  state: AgentRuntime;
  isActive: boolean;
  agentColor: string;
};

export function AgentPanel({ meta, state, isActive }: AgentPanelProps) {
  const [inputExpanded, setInputExpanded] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  const isComplete = state.status === 'complete';
  const isRunning = state.status === 'running';
  const hasError = Boolean(state.error);

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border bg-[var(--bg-white)] shadow-sm transition-all ${
        isActive
          ? 'border-[var(--accent-coral)] ring-2 ring-[var(--accent-coral)]/20'
          : isComplete
            ? 'border-emerald-200'
            : 'border-[var(--border-light)]'
      }`}
    >
      {/* Header */}
      <div
        className={`border-b px-4 py-3 ${
          isActive
            ? 'border-[var(--accent-coral)]/20 bg-[var(--accent-coral)]/5'
            : isComplete
              ? 'border-emerald-100 bg-emerald-50'
              : 'border-[var(--border-light)] bg-[var(--user-bubble)]'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                isComplete
                  ? 'bg-emerald-500 text-white'
                  : isActive
                    ? 'bg-[var(--accent-coral)] text-white'
                    : 'bg-[var(--border-light)] text-[var(--text-secondary)]'
              }`}
            >
              {meta.icon}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">{meta.label}</h3>
              <p className="text-xs text-[var(--text-tertiary)]">{meta.subtitle}</p>
            </div>
          </div>

          {/* Status badge */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              hasError
                ? 'bg-red-100 text-red-600'
                : isComplete
                  ? 'bg-emerald-100 text-emerald-600'
                  : isRunning
                    ? 'bg-[var(--accent-coral)]/10 text-[var(--accent-coral)]'
                    : 'bg-[var(--user-bubble)] text-[var(--text-tertiary)]'
            }`}
          >
            {hasError ? (
              <>
                <AlertCircle className="h-3 w-3" />
                <span>Error</span>
              </>
            ) : isComplete ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                <span>Done</span>
              </>
            ) : isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Running</span>
              </>
            ) : (
              <span>Pending</span>
            )}
          </div>
        </div>

        <p className="mt-2 text-xs text-[var(--text-secondary)]">{meta.mission}</p>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Input section */}
        <div className="rounded-xl border border-[var(--border-light)] bg-[var(--user-bubble)]">
          <button
            type="button"
            onClick={() => setInputExpanded(!inputExpanded)}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <span className="text-xs font-medium text-[var(--text-tertiary)]">Input</span>
            {inputExpanded ? (
              <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
            )}
          </button>
          {inputExpanded && (
            <div className="border-t border-[var(--border-light)] px-3 py-2">
              {state.incomingContext ? (
                <pre className="max-h-24 overflow-y-auto text-xs whitespace-pre-wrap text-[var(--text-secondary)]">
                  {formatSnippet(state.incomingContext)}
                </pre>
              ) : (
                <p className="text-xs italic text-[var(--text-tertiary)]">Waiting for input...</p>
              )}
            </div>
          )}
        </div>

        {/* Output section */}
        <div
          className={`flex-1 rounded-xl border ${
            isComplete
              ? 'border-emerald-200 bg-emerald-50'
              : isRunning
                ? 'border-[var(--accent-coral)]/30 bg-[var(--accent-coral)]/5'
                : 'border-[var(--border-light)] bg-[var(--user-bubble)]'
          }`}
        >
          <button
            type="button"
            onClick={() => setOutputExpanded(!outputExpanded)}
            className="flex w-full items-center justify-between px-3 py-2 text-left"
          >
            <span
              className={`text-xs font-medium ${
                isComplete
                  ? 'text-emerald-600'
                  : isRunning
                    ? 'text-[var(--accent-coral)]'
                    : 'text-[var(--text-tertiary)]'
              }`}
            >
              {isComplete ? 'Output' : isRunning ? 'Processing...' : 'Output'}
            </span>
            {outputExpanded ? (
              <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
            )}
          </button>
          {outputExpanded && (
            <div
              className={`border-t px-3 py-2 ${
                isComplete
                  ? 'border-emerald-200'
                  : isRunning
                    ? 'border-[var(--accent-coral)]/20'
                    : 'border-[var(--border-light)]'
              }`}
            >
              {state.error ? (
                <p className="text-xs text-red-600">{state.error}</p>
              ) : isRunning ? (
                <div className="flex items-center gap-2 text-xs text-[var(--accent-coral)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{state.lastLog || 'Processing...'}</span>
                </div>
              ) : state.result ? (
                <pre className="max-h-48 overflow-y-auto text-xs whitespace-pre-wrap text-[var(--text-secondary)]">
                  {formatSnippet(state.result, 1000)}
                </pre>
              ) : (
                <p className="text-xs italic text-[var(--text-tertiary)]">No output yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
