/**
 * DevServer Bridge
 * Exposes development server operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { DevserverBridge, DevServerStatus } from '../../shared/types/electron-api';

export function createDevserverBridge(ipcRenderer: IpcRenderer): DevserverBridge {
  return {
    start: (projectPath?: string) => ipcRenderer.invoke('devserver:start', projectPath),
    stop: () => ipcRenderer.invoke('devserver:stop'),
    restart: () => ipcRenderer.invoke('devserver:restart'),
    getStatus: () => ipcRenderer.invoke('devserver:get-status'),
    detectProject: (projectPath: string) =>
      ipcRenderer.invoke('devserver:detect-project', projectPath),
    onStatusChanged: (callback: (status: DevServerStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: DevServerStatus) =>
        callback(status);
      ipcRenderer.on('devserver:status-changed', listener);
      return () => ipcRenderer.removeListener('devserver:status-changed', listener);
    }
  };
}
