import { mkdirSync } from 'fs';
import { AuthStorage, ModelRegistry, SettingsManager } from '@mariozechner/pi-coding-agent';
import { app } from 'electron';

import { buildEmbeddedPiAgentPaths, type EmbeddedPiAgentPaths } from './pi-runtime-paths';

export function getEmbeddedPiAgentPaths(): EmbeddedPiAgentPaths {
  return buildEmbeddedPiAgentPaths(app.getPath('userData'));
}

export function ensureEmbeddedPiAgentPaths(): EmbeddedPiAgentPaths {
  const paths = getEmbeddedPiAgentPaths();
  mkdirSync(paths.agentDir, { recursive: true });
  return paths;
}

export function createEmbeddedPiAuthStorage(): AuthStorage {
  const paths = ensureEmbeddedPiAgentPaths();
  return AuthStorage.create(paths.authPath);
}

export function createEmbeddedPiModelRegistry(authStorage: AuthStorage): ModelRegistry {
  const paths = ensureEmbeddedPiAgentPaths();
  return ModelRegistry.create(authStorage, paths.modelsPath);
}

export function createEmbeddedPiSettingsManager(cwd: string): SettingsManager {
  const paths = ensureEmbeddedPiAgentPaths();
  return SettingsManager.create(cwd, paths.agentDir);
}
