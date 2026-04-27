import type { IpcRenderer } from 'electron';

import type {
  AppSettingsPayload,
  PiOAuthPromptRendererRequest
} from '../../shared/types/electron-api';

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
    initProjectConfig: (workspaceDir?: string) =>
      ipcRenderer.invoke('config:init-project-config', workspaceDir),
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
    setSystemPromptAppend: (text: string | null) =>
      ipcRenderer.invoke('config:set-system-prompt-append', text),
    getDefaultSystemPromptAppend: () =>
      ipcRenderer.invoke('config:get-default-system-prompt-append'),
    getPiModelsState: () => ipcRenderer.invoke('config:get-pi-models-state'),
    setPiProviderApiKey: (provider: string, apiKey: string | null) =>
      ipcRenderer.invoke('config:set-pi-provider-api-key', provider, apiKey),
    clearPiProviderAuth: (provider: string) =>
      ipcRenderer.invoke('config:clear-pi-provider-auth', provider),
    loginPiOAuthProvider: (provider: string) =>
      ipcRenderer.invoke('config:login-pi-oauth-provider', provider),
    selectPiModelPreference: (
      preference: 'fast' | 'smart' | 'deep',
      provider: string,
      modelId: string
    ) => ipcRenderer.invoke('config:select-pi-model-preference', preference, provider, modelId),
    onPiOAuthPrompt: (callback: (request: PiOAuthPromptRendererRequest) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, request: PiOAuthPromptRendererRequest) =>
        callback(request);
      ipcRenderer.on('config:pi-oauth-prompt', listener);
      return () => ipcRenderer.removeListener('config:pi-oauth-prompt', listener);
    },
    respondPiOAuthPrompt: (requestId: string, response: { value?: string; cancelled?: boolean }) =>
      ipcRenderer.send('config:pi-oauth-prompt-response', { requestId, ...response }),
    getAppSettings: (appId: string) => ipcRenderer.invoke('config:get-app-settings', appId),
    setAppSettings: (appId: string, settings: AppSettingsPayload) =>
      ipcRenderer.invoke('config:set-app-settings', appId, settings),
    getSkillStatus: (appId: string) => ipcRenderer.invoke('skills:get-status', appId),
    onWorkspaceChanged: (callback: (data: { workspaceDir: string }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { workspaceDir: string }) =>
        callback(data);
      ipcRenderer.on('config:workspace-changed', listener);
      return () => ipcRenderer.removeListener('config:workspace-changed', listener);
    },
    onFloatingNavChanged: (callback: (data: { enabled: boolean }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { enabled: boolean }) =>
        callback(data);
      ipcRenderer.on('config:floating-nav-changed', listener);
      return () => ipcRenderer.removeListener('config:floating-nav-changed', listener);
    }
  };
}
