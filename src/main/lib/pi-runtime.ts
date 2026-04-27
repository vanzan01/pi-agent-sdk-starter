import { mkdirSync } from 'fs';
import { homedir } from 'os';
import { AuthStorage, ModelRegistry, SettingsManager } from '@mariozechner/pi-coding-agent';

import { getWorkspaceDir } from './config';
import {
  buildPiRuntimePaths,
  type PiRuntimePaths,
  type ProjectPiRuntimePaths
} from './pi-runtime-paths';

export function getPiRuntimePaths(projectDir = getWorkspaceDir()): PiRuntimePaths {
  return buildPiRuntimePaths(homedir(), projectDir);
}

export function ensurePiRuntimePaths(projectDir = getWorkspaceDir()): PiRuntimePaths {
  const paths = getPiRuntimePaths(projectDir);
  mkdirSync(paths.sdkDir, { recursive: true });
  mkdirSync(paths.projectConfigDir, { recursive: true });
  return paths;
}

export function createEmbeddedPiAuthStorage(): AuthStorage {
  const paths = ensurePiRuntimePaths();
  return AuthStorage.create(paths.authPath);
}

export function createEmbeddedPiModelRegistry(
  authStorage: AuthStorage,
  paths: ProjectPiRuntimePaths = ensurePiRuntimePaths()
): ModelRegistry {
  return ModelRegistry.create(authStorage, paths.modelsPath);
}

export function createEmbeddedPiSettingsManager(cwd: string): SettingsManager {
  const paths = ensurePiRuntimePaths(cwd);
  return SettingsManager.create(cwd, paths.projectConfigDir);
}
