/**
 * Update Bridge
 * Exposes app update operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { UpdateBridge, UpdateStatus } from '../../shared/types/electron-api';

export function createUpdateBridge(ipcRenderer: IpcRenderer): UpdateBridge {
  return {
    getStatus: () => ipcRenderer.invoke('update:get-status'),
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onStatusChanged: (callback: (status: UpdateStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) =>
        callback(status);
      ipcRenderer.on('update:status-changed', listener);
      return () => ipcRenderer.removeListener('update:status-changed', listener);
    }
  };
}
