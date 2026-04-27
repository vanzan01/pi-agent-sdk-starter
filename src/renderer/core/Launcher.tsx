import { Layers, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AppManifest } from '../../shared/apps';
import { useDomainConfig } from '../hooks/useDomainConfig';
import DomainLaunchpadIcon from './DomainLaunchpadIcon';
import LaunchpadIcon from './LaunchpadIcon';

// Recent apps storage
const RECENT_APPS_KEY = 'recent-apps';
const MAX_RECENT_APPS = 5;

type LauncherView = 'apps' | 'domains';

export function getRecentApps(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_APPS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentApp(appId: string) {
  const recent = getRecentApps().filter((id) => id !== appId);
  recent.unshift(appId);
  localStorage.setItem(RECENT_APPS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_APPS)));
}

interface LauncherProps {
  apps: AppManifest[];
  onSelectApp: (appId: string) => void;
  onSelectDomain: (domainId: string) => void;
  onOpenSettings: () => void;
}

export default function Launcher({
  apps,
  onSelectApp,
  onSelectDomain,
  onOpenSettings
}: LauncherProps) {
  const [view, setView] = useState<LauncherView>('apps');

  // Filter out hidden apps
  const visibleApps = useMemo(() => apps.filter((app) => !app.hidden), [apps]);

  // Get domains
  const { domainList, getDomainApps } = useDomainConfig();
  const hasDomains = domainList.length > 0;

  // Get recent app IDs for indicator dots
  const recentAppIds = useMemo(() => getRecentApps(), []);

  const handleSelectApp = (appId: string) => {
    addRecentApp(appId);
    onSelectApp(appId);
  };

  const handleSelectDomain = (domainId: string) => {
    onSelectDomain(domainId);
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Decorative blur elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Title */}
      <div className="relative z-10 mt-12 mb-6 text-center">
        <h1 className="text-2xl font-semibold text-white/90">Pi SDK Starter Kit</h1>
        <p className="mt-1 text-sm text-white/50">
          {view === 'apps' ? 'Select an app to get started' : 'Select a domain to open'}
        </p>
      </div>

      {/* View Toggle - only show if there are domains */}
      {hasDomains && (
        <div className="relative z-10 mb-6 flex gap-1 rounded-full bg-white/10 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => setView('apps')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              view === 'apps' ?
                'bg-white text-slate-900 shadow-sm'
              : 'text-white/70 hover:text-white'
            }`}
          >
            Apps
          </button>
          <button
            type="button"
            onClick={() => setView('domains')}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              view === 'domains' ?
                'bg-white text-slate-900 shadow-sm'
              : 'text-white/70 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Domains
          </button>
        </div>
      )}

      {/* Content: Apps or Domains */}
      <div className="relative z-10 flex flex-1 items-start justify-center overflow-auto px-8 py-4">
        {view === 'apps' ?
          <div className="grid grid-cols-3 gap-8 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {visibleApps.map((app) => (
              <LaunchpadIcon
                key={app.id}
                app={app}
                isRecent={recentAppIds.includes(app.id)}
                onClick={() => handleSelectApp(app.id)}
              />
            ))}
          </div>
        : <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
            {domainList.map((domain) => (
              <DomainLaunchpadIcon
                key={domain.id}
                domain={domain}
                apps={getDomainApps(domain.id)}
                onClick={() => handleSelectDomain(domain.id)}
              />
            ))}
          </div>
        }
      </div>

      {/* Keyboard hint */}
      <div className="relative z-10 mb-4 text-center text-xs text-white/40">
        Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">Ctrl+H</kbd> to return
        here • <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono">Ctrl+Shift+L</kbd> from
        menu
      </div>

      {/* Settings gear in corner */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="absolute right-6 bottom-6 z-20 rounded-full bg-white/10 p-3 text-white/70 backdrop-blur transition hover:bg-white/20 hover:text-white"
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>
    </div>
  );
}
