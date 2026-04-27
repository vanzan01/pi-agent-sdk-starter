import { Folder } from 'lucide-react';

import type { ConfigStatusResponse } from '@/electron';

interface ConfigStatusBannerProps {
  configStatus: ConfigStatusResponse | null;
}

export function ConfigStatusBanner({ configStatus }: ConfigStatusBannerProps) {
  if (!configStatus || !configStatus.hasProjectConfig || !configStatus.projectConfigPath) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Folder className="h-3.5 w-3.5 text-green-500" />
          <span className="font-medium text-neutral-600 dark:text-neutral-300">Project config:</span>
          <span className="font-mono text-neutral-500 dark:text-neutral-400">
            {configStatus.projectConfigPath}
          </span>
        </div>
        <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Active
        </span>
      </div>
    </div>
  );
}
