/**
 * Shell Bridge
 * Exposes shell operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { ShellBridge } from '../../shared/types/electron-api';

export function createShellBridge(ipcRenderer: IpcRenderer): ShellBridge {
  return {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    execute: (command: string, options?: { cwd?: string; timeout?: number }) =>
      ipcRenderer.invoke('shell:execute', command, options)
  };
}
