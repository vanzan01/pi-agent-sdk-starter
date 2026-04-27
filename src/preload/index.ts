/**
 * Preload Script - Composition Root
 *
 * This file composes all bridge modules and exposes them to the renderer
 * via contextBridge. Each domain is implemented in its own bridge module
 * under ./bridge/ for maintainability.
 *
 * The ElectronAPI type in shared/types/electron-api.ts is the single
 * source of truth for the API shape. TypeScript will catch any drift
 * between implementation and types.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types/electron-api';

// Import all bridge factories
import {
  createAgentBridge,
  createAiNewsTweetBridge,
  createAppsBridge,
  createChatBridge,
  createConfigBridge,
  createConversationBridge,
  createDevserverBridge,
  createExportBridge,
  createFilesystemBridge,
  createProjectBridge,
  createShellBridge,
  createUpdateBridge
} from './bridge';

// Compose the API object from all bridge modules
// Type annotation ensures implementation matches shared type definition
const api: ElectronAPI = {
  // Navigation
  onNavigate: (callback: (view: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, view: string) => callback(view);
    ipcRenderer.on('navigate', listener);
    return () => ipcRenderer.removeListener('navigate', listener);
  },

  // Core bridges
  agent: createAgentBridge(ipcRenderer),
  chat: createChatBridge(ipcRenderer),
  config: createConfigBridge(ipcRenderer),
  shell: createShellBridge(ipcRenderer),
  conversation: createConversationBridge(ipcRenderer),
  update: createUpdateBridge(ipcRenderer),
  project: createProjectBridge(ipcRenderer),
  filesystem: createFilesystemBridge(ipcRenderer),
  devserver: createDevserverBridge(ipcRenderer),
  apps: createAppsBridge(ipcRenderer),

  // Demo app bridge
  aiNewsTweet: createAiNewsTweetBridge(ipcRenderer),
  export: createExportBridge(ipcRenderer)
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', api);
