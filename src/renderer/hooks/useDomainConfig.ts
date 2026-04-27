/**
 * Hook for managing domain configurations with localStorage persistence.
 * Domains are user-defined groupings of apps that work together.
 */

import { useCallback, useEffect, useState } from 'react';

import { getAllApps, getAppById } from '../../shared/apps/registry';
import type { AppManifest } from '../../shared/apps/types';
import type { DomainConfig, DomainConfigMap } from '../../shared/domains';
import { DEFAULT_DOMAINS } from '../../shared/domains';

const STORAGE_KEY = 'domain-configs';
const DOMAINS_CHANGED_EVENT = 'domains-changed';

function loadDomains(): DomainConfigMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as DomainConfigMap;
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_DOMAINS;
}

function saveDomains(domains: DomainConfigMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(domains));
    // Notify other instances in the same window
    window.dispatchEvent(new CustomEvent(DOMAINS_CHANGED_EVENT));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Generate a unique domain ID from a name.
 */
function generateDomainId(name: string, existingIds: string[]): string {
  const baseId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  let id = baseId || 'domain';
  let counter = 1;

  while (existingIds.includes(id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }

  return id;
}

export interface UseDomainConfigReturn {
  /** All configured domains */
  domains: DomainConfigMap;

  /** Array of domain configs for iteration */
  domainList: DomainConfig[];

  /** Create a new domain */
  createDomain: (
    name: string,
    appIds: string[],
    primaryAppId: string,
    options?: { description?: string; icon?: string; color?: string }
  ) => DomainConfig;

  /** Update an existing domain */
  updateDomain: (
    domainId: string,
    updates: Partial<Omit<DomainConfig, 'id' | 'createdAt' | 'updatedAt'>>
  ) => void;

  /** Delete a domain */
  deleteDomain: (domainId: string) => void;

  /** Get a domain by ID */
  getDomain: (domainId: string) => DomainConfig | undefined;

  /** Get all apps in a domain */
  getDomainApps: (domainId: string) => AppManifest[];

  /** Get visible apps that can be added to domains */
  getAvailableApps: () => AppManifest[];

  /** Check if an app is in any domain */
  isAppInAnyDomain: (appId: string) => boolean;

  /** Get domains containing a specific app */
  getDomainsForApp: (appId: string) => DomainConfig[];

  /** Reset all domains to empty */
  resetDomains: () => void;
}

// Track if we're in the middle of an update to prevent loops
let isUpdating = false;

export function useDomainConfig(): UseDomainConfigReturn {
  const [domains, setDomains] = useState<DomainConfigMap>(loadDomains);

  // Save whenever domains change (but don't re-trigger our own listener)
  useEffect(() => {
    if (!isUpdating) {
      isUpdating = true;
      saveDomains(domains);
      // Allow next update after a tick
      setTimeout(() => {
        isUpdating = false;
      }, 0);
    }
  }, [domains]);

  // Listen for changes from other hook instances
  useEffect(() => {
    const handleDomainsChanged = () => {
      if (!isUpdating) {
        isUpdating = true;
        setDomains(loadDomains());
        setTimeout(() => {
          isUpdating = false;
        }, 0);
      }
    };

    window.addEventListener(DOMAINS_CHANGED_EVENT, handleDomainsChanged);
    return () => window.removeEventListener(DOMAINS_CHANGED_EVENT, handleDomainsChanged);
  }, []);

  const domainList = Object.values(domains);

  const createDomain = useCallback(
    (
      name: string,
      appIds: string[],
      primaryAppId: string,
      options?: { description?: string; icon?: string; color?: string }
    ): DomainConfig => {
      const id = generateDomainId(name, Object.keys(domains));
      const now = Date.now();

      const newDomain: DomainConfig = {
        id,
        name,
        appIds,
        primaryAppId,
        description: options?.description,
        icon: options?.icon,
        color: options?.color,
        createdAt: now,
        updatedAt: now
      };

      setDomains((prev) => ({
        ...prev,
        [id]: newDomain
      }));

      return newDomain;
    },
    [domains]
  );

  const updateDomain = useCallback(
    (domainId: string, updates: Partial<Omit<DomainConfig, 'id' | 'createdAt' | 'updatedAt'>>) => {
      setDomains((prev) => {
        const existing = prev[domainId];
        if (!existing) return prev;

        return {
          ...prev,
          [domainId]: {
            ...existing,
            ...updates,
            updatedAt: Date.now()
          }
        };
      });
    },
    []
  );

  const deleteDomain = useCallback((domainId: string) => {
    setDomains((prev) => {
      const { [domainId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const getDomain = useCallback(
    (domainId: string): DomainConfig | undefined => {
      return domains[domainId];
    },
    [domains]
  );

  const getDomainApps = useCallback(
    (domainId: string): AppManifest[] => {
      const domain = domains[domainId];
      if (!domain) return [];

      return domain.appIds
        .map((appId) => getAppById(appId))
        .filter((app): app is AppManifest => app !== undefined);
    },
    [domains]
  );

  const getAvailableApps = useCallback((): AppManifest[] => {
    return getAllApps().filter((app) => !app.hidden);
  }, []);

  const isAppInAnyDomain = useCallback(
    (appId: string): boolean => {
      return Object.values(domains).some((domain) => domain.appIds.includes(appId));
    },
    [domains]
  );

  const getDomainsForApp = useCallback(
    (appId: string): DomainConfig[] => {
      return Object.values(domains).filter((domain) => domain.appIds.includes(appId));
    },
    [domains]
  );

  const resetDomains = useCallback(() => {
    setDomains(DEFAULT_DOMAINS);
  }, []);

  return {
    domains,
    domainList,
    createDomain,
    updateDomain,
    deleteDomain,
    getDomain,
    getDomainApps,
    getAvailableApps,
    isAppInAnyDomain,
    getDomainsForApp,
    resetDomains
  };
}
