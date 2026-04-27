/**
 * Export Bridge
 * Exposes app export operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { ExportBridge } from '../../shared/types/electron-api';

export function createExportBridge(ipcRenderer: IpcRenderer): ExportBridge {
  return {
    getApps: () => ipcRenderer.invoke('export:get-apps'),
    preview: (config) => ipcRenderer.invoke('export:preview', config),
    browseDirectory: () => ipcRenderer.invoke('export:browse-directory'),
    start: (config) => ipcRenderer.invoke('export:start', config),
    cancel: (jobId: string) => ipcRenderer.invoke('export:cancel', jobId),
    onProgress: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: Parameters<typeof callback>[0]) =>
        callback(progress);
      ipcRenderer.on('export:progress', listener);
      return () => ipcRenderer.removeListener('export:progress', listener);
    }
  };
}
