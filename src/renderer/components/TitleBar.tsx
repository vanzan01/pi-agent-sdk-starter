import { History, Plus } from 'lucide-react';

import type { TrackingStatus } from '../../shared/core/usage-utils';

export interface UsageDisplayInfo {
  status?: 'loading' | 'unavailable';
  // Weekly (7-day) stats
  weeklyStatus?: TrackingStatus;
  weeklyUtilization?: number;
  weeklyProjected?: number;
  // Session (5-hour) stats
  sessionStatus?: TrackingStatus;
  sessionUtilization?: number;
  sessionProjected?: number;
}

interface TitleBarProps {
  onOpenHistory?: () => void;
  onNewChat?: () => void;
  usageInfo?: UsageDisplayInfo;
  variant?: 'sticky' | 'inline';
  tone?: 'light' | 'dark';
}

export default function TitleBar({
  onOpenHistory,
  onNewChat,
  usageInfo,
  variant = 'sticky',
  tone = 'light'
}: TitleBarProps) {
  // Detect Windows platform
  const isWindows = navigator.platform.toLowerCase().includes('win');

  const hasActions = onOpenHistory || onNewChat;
  const isLoading = usageInfo?.status === 'loading';
  const isUnavailable = usageInfo?.status === 'unavailable';
  const hasWeeklyStats = usageInfo?.weeklyUtilization != null;
  const hasSessionStats = usageInfo?.sessionUtilization != null;
  const showUsage = usageInfo && !isUnavailable && (isLoading || hasWeeklyStats || hasSessionStats);

  // Usage status display helpers
  // on-track = green (good), under = cyan (ahead), over = red (warning)
  const statusConfig: Record<TrackingStatus, { dot: string; text: string; label: string }> = {
    under: { dot: 'bg-cyan-500', text: 'text-cyan-400', label: 'Under' },
    'on-track': { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'On track' },
    over: { dot: 'bg-rose-500', text: 'text-rose-400', label: 'Over' }
  };

  const baseBarClasses =
    tone === 'dark' ?
      'h-12 border border-slate-700/80 bg-slate-900/85 text-slate-100 shadow-sm shadow-black/20 backdrop-blur-md'
    : 'h-12 border-b border-[var(--border-light)] bg-[var(--bg-white)]/80 backdrop-blur-md text-[var(--text-primary)]';
  const wrapperClasses =
    variant === 'sticky' ? `sticky top-0 z-30 ${baseBarClasses}` : `relative z-0 ${baseBarClasses}`;

  const historyButtonClasses =
    tone === 'dark' ?
      'flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-800/80 px-3 py-1.5 text-sm font-medium text-slate-100 shadow-sm shadow-black/10 transition-colors hover:border-slate-600 hover:bg-slate-700/80'
    : 'flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--bg-white)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--user-bubble)]';

  const newButtonClasses =
    tone === 'dark' ?
      'flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-800/80 text-slate-100 shadow-sm shadow-black/10 transition-colors hover:border-slate-600 hover:bg-slate-700/80'
    : 'flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--bg-white)] text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--user-bubble)]';

  return (
    <div className={`${wrapperClasses} [-webkit-app-region:drag]`}>
      <div
        className={`flex h-full items-center justify-between pr-3 sm:pr-4 ${
          isWindows ? 'pl-3 sm:pl-4' : 'pl-16 sm:pl-20'
        }`}
      >
        {/* Left side: action buttons */}
        {hasActions ?
          <div className="flex items-center gap-2 [-webkit-app-region:no-drag]">
            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className={historyButtonClasses}
                title="Open chat history"
                aria-label="Open chat history"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Chat history</span>
              </button>
            )}

            {onNewChat && (
              <button
                onClick={onNewChat}
                className={newButtonClasses}
                title="Start new chat"
                aria-label="Start new chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        : <div /> /* Spacer for justify-between */}

        {/* Right side: usage display */}
        {showUsage && (
          <div className="flex items-center gap-3 text-xs [-webkit-app-region:no-drag]">
            {isLoading ?
              <div className="flex items-center gap-2 text-slate-400">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                <span>Loading...</span>
              </div>
            : <>
                {/* Weekly stats (7-day) - shown first */}
                {hasWeeklyStats && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">7d:</span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusConfig[usageInfo.weeklyStatus!]?.dot ?? 'bg-slate-500'}`}
                    />
                    <span className="text-slate-300">
                      {usageInfo.weeklyUtilization!.toFixed(0)}%
                    </span>
                    {usageInfo.weeklyProjected != null && (
                      <span className="text-slate-500">
                        →{Math.min(usageInfo.weeklyProjected, 999).toFixed(0)}%
                      </span>
                    )}
                  </div>
                )}

                {/* Session stats (5-hour) */}
                {hasSessionStats && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">5h:</span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusConfig[usageInfo.sessionStatus!]?.dot ?? 'bg-slate-500'}`}
                    />
                    <span className="text-slate-300">
                      {usageInfo.sessionUtilization!.toFixed(0)}%
                    </span>
                    {usageInfo.sessionProjected != null && (
                      <span className="text-slate-500">
                        →{Math.min(usageInfo.sessionProjected, 999).toFixed(0)}%
                      </span>
                    )}
                  </div>
                )}
              </>
            }
          </div>
        )}
      </div>
    </div>
  );
}
