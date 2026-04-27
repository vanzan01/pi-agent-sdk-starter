import { Maximize2 } from 'lucide-react';
import type { ReactNode } from 'react';

import type { AppManifest, LayoutMode } from '../../shared/apps';

interface AppShellProps {
  apps: AppManifest[];
  activeAppId: string;
  onSelectApp: (appId: string) => void;
  onOpenSettings: () => void;
  onToggleLayoutMode?: () => void;
  layoutMode?: LayoutMode;
  children: ReactNode;
}

export function AppShell({
  apps,
  activeAppId,
  onSelectApp,
  onOpenSettings,
  onToggleLayoutMode,
  layoutMode: _layoutMode,
  children
}: AppShellProps) {
  // Filter out hidden apps from the sidebar
  const visibleApps = apps.filter((app) => !app.hidden);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white/70 backdrop-blur">
        <div className="px-4 py-5">
          <p className="text-xs tracking-wide text-slate-500 uppercase">Pi SDK Starter Kit</p>
          <p className="text-lg font-semibold text-slate-900">Apps</p>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {visibleApps.map((app) => {
            const isActive = app.id === activeAppId;
            return (
              <button
                key={app.id}
                type="button"
                onClick={() => onSelectApp(app.id)}
                className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                  isActive ?
                    'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    isActive ? 'bg-emerald-300' : 'bg-slate-300'
                  }`}
                  aria-hidden
                />
                <span className="flex-1">{app.name}</span>
              </button>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-slate-200 p-3">
          {onToggleLayoutMode && (
            <button
              type="button"
              onClick={onToggleLayoutMode}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
              title="Enter Full UI mode"
            >
              <Maximize2 className="h-4 w-4" />
              Full UI
            </button>
          )}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
          >
            Settings
          </button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
