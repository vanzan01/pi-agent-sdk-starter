import { Package } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppRenderer } from '@/apps';
import ExportModal from '@/components/ExportModal';
import UpdateCheckFeedback from '@/components/UpdateCheckFeedback';
import UpdateNotification from '@/components/UpdateNotification';
import UpdateReadyBanner from '@/components/UpdateReadyBanner';
import FloatingNav from '@/core/FloatingNav';
import Launcher, { addRecentApp } from '@/core/Launcher';
import { Sidebar } from '@/core/Sidebar';
import Settings from '@/pages/Settings';

import {
  getAllApps,
  getAppById,
  getAppByRoute,
  getDefaultApp,
  type AppManifest,
  type LayoutMode
} from '../shared/apps';
import { useDomainConfig } from './hooks/useDomainConfig';

// Helper to get/set layout mode override per app from localStorage
const LAYOUT_STORAGE_KEY = 'app-layout-modes';

function getStoredLayoutModes(): Record<string, LayoutMode> {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStoredLayoutMode(appId: string, mode: LayoutMode) {
  const modes = getStoredLayoutModes();
  modes[appId] = mode;
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(modes));
}

function getEffectiveLayoutMode(app: AppManifest | undefined): LayoutMode {
  if (!app) return 'standard';
  const stored = getStoredLayoutModes()[app.id];
  if (stored) return stored;
  return app.layout?.preferredMode ?? 'standard';
}

export default function App() {
  const apps = useMemo(() => getAllApps(), []);
  const defaultApp = useMemo(() => getDefaultApp(), []);
  const [activeAppId, setActiveAppId] = useState<string>(defaultApp.id);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [showLauncher, setShowLauncher] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsAppId, setSettingsAppId] = useState<string | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<string | null>(null);
  const [layoutModeOverride, setLayoutModeOverride] = useState<LayoutMode | null>(null);
  const [floatingNavEnabled, setFloatingNavEnabled] = useState(true);
  const [isPopoutMode, setIsPopoutMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Domain configuration
  const { getDomain, getDomainApps, domainList } = useDomainConfig();
  const activeDomain = activeDomainId ? getDomain(activeDomainId) : null;
  const domainApps = activeDomainId ? getDomainApps(activeDomainId) : [];

  // Load floating nav setting from config
  useEffect(() => {
    window.electron.config.getFloatingNav().then((response) => {
      setFloatingNavEnabled(response.enabled);
    });
  }, []);

  // Listen for floating nav setting changes (from Settings page)
  useEffect(() => {
    const unsubscribe = window.electron.config.onFloatingNavChanged((data) => {
      setFloatingNavEnabled(data.enabled);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const parseHash = () => {
      const rawHash = window.location.hash?.slice(1) ?? '';
      const normalized = rawHash.replace(/^\/+/, '');

      // Handle launcher route (empty hash or just #/)
      if (normalized === '' || normalized === '/') {
        setShowLauncher(true);
        setShowSettings(false);
        setLayoutModeOverride(null);
        setIsPopoutMode(false);
        setActiveDomainId(null);
        return;
      }

      // Handle domain route: #/domain/{domainId} or #/domain/{domainId}/{appId}
      if (normalized.startsWith('domain/')) {
        const parts = normalized.split('/').filter(Boolean);
        const domainId = parts[1];
        const appIdFromUrl = parts[2]; // Optional: specific app within domain
        const domain = getDomain(domainId);
        if (domain) {
          // Use app from URL if valid and in domain, otherwise use primary app
          const validAppId =
            appIdFromUrl && domain.appIds.includes(appIdFromUrl) ?
              appIdFromUrl
            : domain.primaryAppId;
          const targetApp = getAppById(validAppId) ?? defaultApp;
          setActiveAppId(targetApp.id);
          setActiveDomainId(domainId);
          setShowLauncher(false);
          setShowSettings(false);
          setLayoutModeOverride(null);
          setIsPopoutMode(false);
          return;
        }
      }

      // Handle settings route: #/settings, #/settings/{appId}, or #/settings/domains
      if (normalized.startsWith('settings')) {
        const parts = normalized.split('/').filter(Boolean);
        const maybeTabOrAppId = parts[1];

        // Check if it's the special "domains" tab
        if (maybeTabOrAppId === 'domains') {
          setSettingsInitialTab('domains');
          setSettingsAppId(activeAppId);
        } else {
          const targetApp = getAppById(maybeTabOrAppId ?? activeAppId) ?? defaultApp;
          setActiveAppId(targetApp.id);
          setSettingsAppId(targetApp.id);
          setSettingsInitialTab(null);
        }

        setShowLauncher(false);
        setShowSettings(true);
        setLayoutModeOverride(null);
        setIsPopoutMode(false);
        // Keep domain context when opening settings
        return;
      }

      // Handle popout mode route: #/popout/app-id (frameless, transparent window)
      if (normalized.startsWith('popout/')) {
        const parts = normalized.split('/').filter(Boolean);
        const maybeAppId = parts[1];
        const targetApp = getAppById(maybeAppId) ?? defaultApp;
        setActiveAppId(targetApp.id);
        setShowLauncher(false);
        setShowSettings(false);
        setIsPopoutMode(true);
        setLayoutModeOverride(null);
        return;
      }

      // Handle forced layout mode routes: #/full-ui/app-id or #/standard/app-id
      if (normalized.startsWith('full-ui/') || normalized.startsWith('standard/')) {
        const parts = normalized.split('/').filter(Boolean);
        const forcedMode = parts[0] as LayoutMode;
        const maybeAppId = parts[1];
        const targetApp = getAppById(maybeAppId) ?? defaultApp;
        setActiveAppId(targetApp.id);
        setShowLauncher(false);
        setShowSettings(false);
        setIsPopoutMode(false);
        setLayoutModeOverride(forcedMode);
        return;
      }

      // Handle standard app routes
      const routeMatch = getAppByRoute(`/${normalized}`) ?? getAppByRoute(normalized);
      if (routeMatch) {
        setActiveAppId(routeMatch.id);
        setShowLauncher(false);
        setShowSettings(false);
        setLayoutModeOverride(null);
        setIsPopoutMode(false);
        return;
      }

      const appMatch = getAppById(normalized);
      if (appMatch) {
        setActiveAppId(appMatch.id);
        setShowLauncher(false);
        setShowSettings(false);
        setLayoutModeOverride(null);
        setIsPopoutMode(false);
        window.location.hash = appMatch.rootRoute;
        return;
      }

      // Fallback to launcher if no route matches
      setShowLauncher(true);
      setShowSettings(false);
      setLayoutModeOverride(null);
      setIsPopoutMode(false);
      window.location.hash = '';
    };

    // Listen for navigation events from main process
    const unsubscribeNavigate = window.electron.onNavigate((view: string) => {
      if (view === 'settings') {
        const target = activeAppId || defaultApp.id;
        setSettingsAppId(target);
        setShowSettings(true);
        window.location.hash = `/settings/${target}`;
      } else if (view === 'launcher') {
        setShowLauncher(true);
        setShowSettings(false);
        setLayoutModeOverride(null);
        window.location.hash = '';
      } else {
        setShowSettings(false);
        window.location.hash = getAppById(activeAppId)?.rootRoute ?? defaultApp.rootRoute;
      }
    });

    parseHash();
    window.addEventListener('hashchange', parseHash);

    return () => {
      unsubscribeNavigate();
      window.removeEventListener('hashchange', parseHash);
    };
  }, [activeAppId, defaultApp, getDomain]);

  const activeApp: AppManifest | undefined =
    apps.find((app) => app.id === activeAppId) ?? defaultApp;

  // Calculate effective layout mode (override > stored > manifest default)
  const effectiveLayoutMode: LayoutMode = layoutModeOverride ?? getEffectiveLayoutMode(activeApp);

  const handleSelectApp = useCallback(
    (appId: string) => {
      const targetApp = getAppById(appId) ?? defaultApp;
      addRecentApp(targetApp.id);
      setActiveAppId(targetApp.id);
      setShowLauncher(false);
      setLayoutModeOverride(null); // Reset override when switching apps
      setActiveDomainId(null); // Clear domain when selecting app from launcher
      window.location.hash = targetApp.rootRoute;
      setShowSettings(false);
    },
    [defaultApp]
  );

  const handleSelectDomain = useCallback(
    (domainId: string) => {
      const domain = getDomain(domainId);
      if (!domain) return;

      const targetApp = getAppById(domain.primaryAppId) ?? defaultApp;
      addRecentApp(targetApp.id);
      setActiveAppId(targetApp.id);
      setActiveDomainId(domainId);
      setShowLauncher(false);
      setLayoutModeOverride(null);
      window.location.hash = `/domain/${domainId}/${targetApp.id}`;
      setShowSettings(false);
    },
    [defaultApp, getDomain]
  );

  // Switch apps while staying within the current domain
  const handleSelectAppInDomain = useCallback(
    (appId: string) => {
      const targetApp = getAppById(appId) ?? defaultApp;
      addRecentApp(targetApp.id);
      setActiveAppId(targetApp.id);
      // Keep activeDomainId unchanged - stay in the domain
      setShowLauncher(false);
      setLayoutModeOverride(null);
      setShowSettings(false);
      // Update URL to include the new app (activeDomainId is in closure via state)
      if (activeDomainId) {
        window.location.hash = `/domain/${activeDomainId}/${targetApp.id}`;
      }
    },
    [defaultApp, activeDomainId]
  );

  const handleOpenSettings = useCallback(
    (appId?: string, tab?: string) => {
      const targetApp = getAppById(appId || activeAppId) ?? defaultApp;
      setSettingsAppId(targetApp.id);
      setSettingsInitialTab(tab ?? null);
      setShowSettings(true);
      window.location.hash = tab ? `/settings/${tab}` : `/settings/${targetApp.id}`;
    },
    [activeAppId, defaultApp]
  );

  const handleToggleLayoutMode = useCallback(() => {
    const newMode = effectiveLayoutMode === 'full-ui' ? 'standard' : 'full-ui';
    setLayoutModeOverride(newMode);
    if (activeApp) {
      setStoredLayoutMode(activeApp.id, newMode);
    }
  }, [effectiveLayoutMode, activeApp]);

  const handleGoHome = useCallback(() => {
    setShowLauncher(true);
    setShowSettings(false);
    setLayoutModeOverride(null);
    setActiveDomainId(null);
    window.location.hash = '';
  }, []);

  const handleExitDomain = useCallback(() => {
    // Stay in current app view, just exit domain context
    const currentApp = getAppById(activeAppId) ?? defaultApp;
    setActiveDomainId(null);
    setShowLauncher(false); // Stay in app view
    setShowSettings(false);
    setLayoutModeOverride(null);
    window.location.hash = currentApp.rootRoute;
  }, [activeAppId, defaultApp]);

  // Check if the current app allows mode toggle
  const canToggleMode = activeApp?.layout?.allowModeToggle !== false;

  // Popout mode: minimal transparent window with just the app content
  if (isPopoutMode) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-transparent">
        <AppRenderer appId={activeApp?.id ?? defaultApp.id} isPopout />
      </div>
    );
  }

  // Whether to show the app content area (hide when launcher or settings are open)
  const showAppContent = !showLauncher && !showSettings;

  return (
    <>
      <UpdateCheckFeedback />
      <UpdateNotification />
      <UpdateReadyBanner />

      {/* ================================================================== */}
      {/* ALL APPS - FIXED POSITION - NEVER MOVES IN REACT TREE             */}
      {/* This container is ALWAYS a direct child of the fragment.          */}
      {/* Switching layout mode only changes padding, never remounts apps.  */}
      {/* ================================================================== */}
      <div
        className={`fixed inset-0 bg-[var(--bg-cream)] ${
          showAppContent ? '' : 'pointer-events-none invisible'
        }`}
        style={{ paddingLeft: effectiveLayoutMode === 'standard' ? '16rem' : 0 }}
      >
        {/* Standard mode header - only shown in standard layout */}
        {effectiveLayoutMode === 'standard' && (
          <div className="flex items-center justify-between border-b border-[var(--border-light)] bg-[var(--bg-white)]/80 px-6 py-4 backdrop-blur">
            <div>
              <p className="text-xs tracking-wide text-[var(--text-tertiary)] uppercase">Active app</p>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                {activeApp?.name ?? 'Unknown app'}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-light)] bg-[var(--bg-white)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--user-bubble)]"
              title="Export app as standalone project"
            >
              <Package className="h-4 w-4" />
              Export
            </button>
          </div>
        )}

        {/* Apps container - all apps always mounted, visibility toggled */}
        <div
          className="relative"
          style={{ height: effectiveLayoutMode === 'standard' ? 'calc(100% - 73px)' : '100%' }}
        >
          {apps.map((app) => (
            <div
              key={app.id}
              className={`absolute inset-0 ${
                app.id === activeAppId ? '' : 'pointer-events-none invisible'
              }`}
            >
              <AppRenderer appId={app.id} />
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================== */}
      {/* LAYOUT CHROME - Rendered as siblings, not parents of apps         */}
      {/* ================================================================== */}

      {/* Standard mode: Sidebar on the left */}
      {showAppContent && effectiveLayoutMode === 'standard' && (
        <div className="fixed top-0 bottom-0 left-0 z-10 w-64 border-r border-[var(--border-light)]">
          <Sidebar
            apps={apps}
            activeAppId={activeAppId}
            onSelectApp={handleSelectApp}
            onSelectAppInDomain={handleSelectAppInDomain}
            onOpenSettings={(tab) => handleOpenSettings(undefined, tab)}
            onToggleLayoutMode={canToggleMode ? handleToggleLayoutMode : undefined}
            activeDomain={activeDomain}
            domainApps={domainApps}
            onExitDomain={handleExitDomain}
            allDomains={domainList}
            onSelectDomain={handleSelectDomain}
          />
        </div>
      )}

      {/* Full-UI mode: Floating nav */}
      {showAppContent && effectiveLayoutMode === 'full-ui' && (
        <FloatingNav
          appName={activeApp?.name ?? 'Unknown app'}
          onHome={handleGoHome}
          onSettings={() => handleOpenSettings()}
          onExport={() => setShowExportModal(true)}
          onToggleMode={canToggleMode ? handleToggleLayoutMode : undefined}
          layoutMode={effectiveLayoutMode}
          hoverEnabled={floatingNavEnabled}
        />
      )}

      {/* ================================================================== */}
      {/* OVERLAYS - Settings, Launcher, Export Modal                       */}
      {/* ================================================================== */}

      {showSettings && (
        <Settings
          apps={apps}
          activeAppId={settingsAppId ?? activeApp?.id ?? defaultApp.id}
          initialTab={settingsInitialTab}
          onBack={() => {
            setShowSettings(false);
            setSettingsInitialTab(null);
            window.location.hash = activeApp?.rootRoute ?? defaultApp.rootRoute;
          }}
          onSelectApp={(appId) => handleOpenSettings(appId)}
        />
      )}

      {showLauncher && (
        <Launcher
          apps={apps}
          onSelectApp={handleSelectApp}
          onSelectDomain={handleSelectDomain}
          onOpenSettings={() => handleOpenSettings()}
        />
      )}

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        currentAppId={activeApp?.id ?? defaultApp.id}
        currentAppName={activeApp?.name ?? 'Unknown app'}
        activeDomain={activeDomain}
      />
    </>
  );
}
