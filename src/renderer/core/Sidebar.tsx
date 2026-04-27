import { ChevronDown, Layers, LogOut, Maximize2, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { AppManifest } from '../../shared/apps';
import type { DomainConfig } from '../../shared/domains';

interface SidebarProps {
  apps: AppManifest[];
  activeAppId: string;
  onSelectApp: (appId: string) => void;
  onSelectAppInDomain?: (appId: string) => void;
  onOpenSettings: (tab?: string) => void;
  onToggleLayoutMode?: () => void;
  // Domain-related props
  activeDomain?: DomainConfig | null;
  domainApps?: AppManifest[];
  onExitDomain?: () => void;
  // For domain selection when not in a domain
  allDomains?: DomainConfig[];
  onSelectDomain?: (domainId: string) => void;
}

export function Sidebar({
  apps,
  activeAppId,
  onSelectApp,
  onSelectAppInDomain,
  onOpenSettings,
  onToggleLayoutMode,
  activeDomain,
  domainApps,
  onExitDomain,
  allDomains,
  onSelectDomain
}: SidebarProps) {
  const [domainsOpen, setDomainsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // When in a domain, show only domain apps; otherwise show all visible apps
  const isInDomain = !!activeDomain && domainApps && domainApps.length > 0;
  const visibleApps = isInDomain ? domainApps : apps.filter((app) => !app.hidden);
  const hasDomains = allDomains && allDomains.length > 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDomainsOpen(false);
      }
    };

    if (domainsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [domainsOpen]);

  const handleSelectDomain = (domainId: string) => {
    setDomainsOpen(false);
    onSelectDomain?.(domainId);
  };

  return (
    <aside className="flex h-full flex-col bg-[var(--bg-white)]">
      <div className="px-4 py-5">
        <p className="text-xs tracking-wide text-[var(--text-tertiary)] uppercase">Pi SDK Starter Kit</p>
        {isInDomain ?
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" style={{ color: activeDomain.color }} />
            <p className="font-serif text-2xl font-medium text-[var(--text-primary)]">{activeDomain.name}</p>
          </div>
        : <p className="font-serif text-2xl font-medium text-[var(--text-primary)]">Apps</p>}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {visibleApps.map((app) => {
          const isActive = app.id === activeAppId;
          const isPrimaryInDomain = isInDomain && app.id === activeDomain.primaryAppId;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() =>
                isInDomain && onSelectAppInDomain ?
                  onSelectAppInDomain(app.id)
                : onSelectApp(app.id)
              }
              className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                isActive ? 'bg-[var(--accent-coral)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--user-bubble)]'
              }`}
            >
              <span
                className={`inline-flex h-2 w-2 rounded-full ${
                  isActive ? 'bg-white/70' : 'bg-[var(--border-light)]'
                }`}
                aria-hidden
              />
              <span className="flex-1">{app.name}</span>
              {isPrimaryInDomain && (
                <span className="text-[10px] font-semibold tracking-wide text-[var(--text-tertiary)] uppercase">
                  Primary
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-[var(--border-light)] p-3">
        {/* Exit Domain button - only show when in a domain */}
        {isInDomain && onExitDomain && (
          <button
            type="button"
            onClick={onExitDomain}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-white)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--user-bubble)]"
            title="Exit domain and return to launcher"
          >
            <LogOut className="h-4 w-4" />
            Exit Domain
          </button>
        )}
        {/* Domains dropdown - show when NOT in a domain */}
        {!isInDomain && (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDomainsOpen(!domainsOpen)}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-white)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--user-bubble)]"
              title="Switch to a domain"
            >
              <Layers className="h-4 w-4" />
              Domains
              <ChevronDown
                className={`h-4 w-4 transition-transform ${domainsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {domainsOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-full rounded-md border border-[var(--border-light)] bg-[var(--bg-white)] py-1 shadow-lg">
                {hasDomains &&
                  allDomains.map((domain) => (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => handleSelectDomain(domain.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--user-bubble)]"
                    >
                      <span
                        className="inline-flex h-2 w-2 rounded-full"
                        style={{ backgroundColor: domain.color || '#64748b' }}
                      />
                      <span className="flex-1 truncate">{domain.name}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">{domain.appIds.length}</span>
                    </button>
                  ))}
                {hasDomains && <div className="my-1 border-t border-[var(--border-light)]" />}
                <button
                  type="button"
                  onClick={() => {
                    setDomainsOpen(false);
                    onOpenSettings('domains');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--user-bubble)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Domain...</span>
                </button>
              </div>
            )}
          </div>
        )}
        {onToggleLayoutMode && (
          <button
            type="button"
            onClick={onToggleLayoutMode}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border-light)] bg-[var(--bg-white)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--user-bubble)]"
            title="Enter Full UI mode"
          >
            <Maximize2 className="h-4 w-4" />
            Full UI
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenSettings()}
          className="flex w-full items-center justify-center rounded-md border border-[var(--border-light)] bg-[var(--bg-white)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--user-bubble)]"
        >
          Settings
        </button>
      </div>
    </aside>
  );
}
