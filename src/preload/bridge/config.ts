import type { IpcRenderer } from 'electron';

import type { ModelConfig, AppSettingsPayload } from '../../shared/types/electron-api';
import type { ModelProvider } from '../../shared/core';

export function createConfigBridge(ipcRenderer: IpcRenderer) {
  return {
    getWorkspaceDir: () => ipcRenderer.invoke('config:get-workspace-dir'),
    setWorkspaceDir: (dir: string) => ipcRenderer.invoke('config:set-workspace-dir', dir),
    hasWorkspaceDir: () => ipcRenderer.invoke('config:has-workspace-dir'),
    getAppPath: () => ipcRenderer.invoke('config:get-app-path'),
    browseDirectory: () => ipcRenderer.invoke('config:browse-directory'),
    selectWorkspaceDir: () => ipcRenderer.invoke('config:browse-directory'),
    getConfigStatus: () => ipcRenderer.invoke('config:get-config-status'),
    getMergedConfig: () => ipcRenderer.invoke('config:get-merged-config'),
    initProjectConfig: (workspaceDir?: string) => ipcRenderer.invoke('config:init-project-config', workspaceDir),
    getDebugMode: () => ipcRenderer.invoke('config:get-debug-mode'),
    setDebugMode: (enabled: boolean) => ipcRenderer.invoke('config:set-debug-mode', enabled),
    getFloatingNav: () => ipcRenderer.invoke('config:get-floating-nav'),
    setFloatingNav: (enabled: boolean) => ipcRenderer.invoke('config:set-floating-nav', enabled),
    getPathInfo: () => ipcRenderer.invoke('config:get-path-info'),
    getEnvironmentVars: () => ipcRenderer.invoke('config:get-environment-vars'),
    getEnvVars: () => ipcRenderer.invoke('config:get-environment-vars'),
    getDiagnosticMetadata: () => ipcRenderer.invoke('config:get-diagnostic-metadata'),
    getThinkingLevel: () => ipcRenderer.invoke('config:get-thinking-level'),
    setThinkingLevel: (level: string) => ipcRenderer.invoke('config:set-thinking-level', level),
    getThinkingPresets: () => ipcRenderer.invoke('config:get-thinking-presets'),
    getSystemPromptAppend: () => ipcRenderer.invoke('config:get-system-prompt-append'),
    setSystemPromptAppend: (text: string | null) => ipcRenderer.invoke('config:set-system-prompt-append', text),
    getDefaultSystemPromptAppend: () => ipcRenderer.invoke('config:get-default-system-prompt-append'),
    getProvider: () => ipcRenderer.invoke('config:get-provider'),
    setProvider: (provider: ModelProvider) => ipcRenderer.invoke('config:set-provider', provider),
    getGlmConfig: () => ipcRenderer.invoke('config:get-glm-config'),
    setGlmApiKey: (apiKey: string | null) => ipcRenderer.invoke('config:set-glm-api-key', apiKey),
    setGlmBaseUrl: (baseUrl: string | null) => ipcRenderer.invoke('config:set-glm-base-url', baseUrl),
    getDefaultGlmBaseUrl: () => ipcRenderer.invoke('config:get-default-glm-base-url'),
    getCodexModels: () => ipcRenderer.invoke('config:get-codex-models'),
    setCodexModels: (models: ModelConfig) => ipcRenderer.invoke('config:set-codex-models', models),
    getDefaultCodexModels: () => ipcRenderer.invoke('config:get-default-codex-models'),
    getGlmModels: () => ipcRenderer.invoke('config:get-glm-models'),
    setGlmModels: (models: ModelConfig) => ipcRenderer.invoke('config:set-glm-models', models),
    getDefaultGlmModels: () => ipcRenderer.invoke('config:get-default-glm-models'),
    getAppSettings: (appId: string) => ipcRenderer.invoke('config:get-app-settings', appId),
    setAppSettings: (appId: string, settings: AppSettingsPayload) => ipcRenderer.invoke('config:set-app-settings', appId, settings),
    getSkillStatus: (appId: string) => ipcRenderer.invoke('skills:get-status', appId),
    onWorkspaceChanged: (callback: (data: { workspaceDir: string; provider: ModelProvider }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { workspaceDir: string; provider: ModelProvider }) => callback(data);
      ipcRenderer.on('config:workspace-changed', listener);
      return () => ipcRenderer.removeListener('config:workspace-changed', listener);
    },
    onFloatingNavChanged: (callback: (data: { enabled: boolean }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { enabled: boolean }) => callback(data);
      ipcRenderer.on('config:floating-nav-changed', listener);
      return () => ipcRenderer.removeListener('config:floating-nav-changed', listener);
    }
  };
}
