/**
 * Domain configuration types.
 * A domain is a user-defined grouping of apps that work together.
 */

export type DomainConfig = {
  id: string; // Unique ID (e.g., 'news-team')
  name: string; // Display name
  description?: string; // Optional description
  appIds: string[]; // Apps in this domain
  primaryAppId: string; // Default app when opening domain
  icon?: string; // Lucide icon name
  color?: string; // Accent color (hex)
  createdAt: number;
  updatedAt: number;
};

/**
 * Record of all user-defined domains, keyed by domain ID.
 */
export type DomainConfigMap = Record<string, DomainConfig>;

/**
 * Default empty domains state.
 */
export const DEFAULT_DOMAINS: DomainConfigMap = {};
