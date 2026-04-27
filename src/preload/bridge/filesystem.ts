/**
 * Filesystem Bridge
 * Exposes filesystem operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { FilesystemBridge, FileChangeEvent } from '../../shared/types/electron-api';

export function createFilesystemBridge(ipcRenderer: IpcRenderer): FilesystemBridge {
  return {
    readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:read-directory', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:write-file', filePath, content),
    watch: (dirPath: string) => ipcRenderer.invoke('fs:watch', dirPath),
    unwatch: () => ipcRenderer.invoke('fs:unwatch'),
    onFileChange: (callback: (event: FileChangeEvent) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, fileEvent: FileChangeEvent) =>
        callback(fileEvent);
      ipcRenderer.on('fs:file-changed', listener);
      return () => ipcRenderer.removeListener('fs:file-changed', listener);
    }
  };
}
