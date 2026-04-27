import { join } from 'path';

export interface EmbeddedPiAgentPaths {
  sdkDir: string;
  authPath: string;
}

export interface ProjectPiRuntimePaths {
  projectConfigDir: string;
  modelsPath: string;
  settingsPath: string;
}

export interface PiRuntimePaths extends EmbeddedPiAgentPaths, ProjectPiRuntimePaths {}

export function buildEmbeddedPiAgentPaths(homePath: string): EmbeddedPiAgentPaths {
  const sdkDir = join(homePath, '.pi-sdk');
  return {
    sdkDir,
    authPath: join(sdkDir, 'auth.json')
  };
}

export function buildProjectPiRuntimePaths(projectDir: string): ProjectPiRuntimePaths {
  const projectConfigDir = join(projectDir, '.pi-sdk');
  return {
    projectConfigDir,
    modelsPath: join(projectConfigDir, 'models.json'),
    settingsPath: join(projectConfigDir, 'settings.json')
  };
}

export function buildPiRuntimePaths(homePath: string, projectDir: string): PiRuntimePaths {
  return {
    ...buildEmbeddedPiAgentPaths(homePath),
    ...buildProjectPiRuntimePaths(projectDir)
  };
}
