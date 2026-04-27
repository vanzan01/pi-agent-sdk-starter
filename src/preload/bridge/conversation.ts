/**
 * Conversation Bridge
 * Exposes conversation management operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { ConversationBridge } from '../../shared/types/electron-api';

export function createConversationBridge(ipcRenderer: IpcRenderer): ConversationBridge {
  return {
    list: () => ipcRenderer.invoke('conversation:list'),
    create: (messages: unknown[], sessionId?: string | null) =>
      ipcRenderer.invoke('conversation:create', messages, sessionId),
    get: (id: string) => ipcRenderer.invoke('conversation:get', id),
    update: (id: string, title?: string, messages?: unknown[], sessionId?: string | null) =>
      ipcRenderer.invoke('conversation:update', id, title, messages, sessionId),
    delete: (id: string) => ipcRenderer.invoke('conversation:delete', id),
    dbStatus: () => ipcRenderer.invoke('conversation:dbStatus'),
    dbStats: () => ipcRenderer.invoke('conversation:dbStats'),
    listByProject: (projectPath: string) =>
      ipcRenderer.invoke('conversation:list-by-project', projectPath),
    createForProject: (title?: string) =>
      ipcRenderer.invoke('conversation:create-for-project', title),
    switch: (conversationId: string) => ipcRenderer.invoke('conversation:switch', conversationId)
  };
}
