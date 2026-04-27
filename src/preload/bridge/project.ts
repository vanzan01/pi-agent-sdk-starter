/**
 * Project Bridge
 * Exposes project management operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { ProjectBridge } from '../../shared/types/electron-api';

export function createProjectBridge(ipcRenderer: IpcRenderer): ProjectBridge {
  return {
    create: (projectName: string) => ipcRenderer.invoke('project:create', projectName),
    list: (limit?: number) => ipcRenderer.invoke('project:list', limit),
    switch: (projectId: string) => ipcRenderer.invoke('project:switch', projectId),
    current: () => ipcRenderer.invoke('project:current'),
    close: () => ipcRenderer.invoke('project:close')
  };
}
