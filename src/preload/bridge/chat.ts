/**
 * Chat Bridge
 * Exposes chat operations to the renderer (legacy, simpler than agent).
 */
import type { IpcRenderer } from 'electron';
import type { ChatBridge } from '../../shared/types/electron-api';

export function createChatBridge(ipcRenderer: IpcRenderer): ChatBridge {
  return {
    sendMessage: (payload) => ipcRenderer.invoke('chat:send-message', payload),
    stopMessage: () => ipcRenderer.invoke('chat:stop-message'),
    resetSession: (resumeSessionId) => ipcRenderer.invoke('chat:reset-session', resumeSessionId),
    getModelPreference: () => ipcRenderer.invoke('chat:get-model-preference'),
    setModelPreference: (preference) => ipcRenderer.invoke('chat:set-model-preference', preference),
    onMessageChunk: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, chunk: string) => callback(chunk);
      ipcRenderer.on('chat:message-chunk', listener);
      return () => ipcRenderer.removeListener('chat:message-chunk', listener);
    },
    onThinkingStart: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { index: number }) =>
        callback(data);
      ipcRenderer.on('chat:thinking-start', listener);
      return () => ipcRenderer.removeListener('chat:thinking-start', listener);
    },
    onThinkingChunk: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { index: number; delta: string }
      ) => callback(data);
      ipcRenderer.on('chat:thinking-chunk', listener);
      return () => ipcRenderer.removeListener('chat:thinking-chunk', listener);
    },
    onMessageComplete: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('chat:message-complete', listener);
      return () => ipcRenderer.removeListener('chat:message-complete', listener);
    },
    onMessageStopped: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('chat:message-stopped', listener);
      return () => ipcRenderer.removeListener('chat:message-stopped', listener);
    },
    onMessageError: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, error: string) => callback(error);
      ipcRenderer.on('chat:message-error', listener);
      return () => ipcRenderer.removeListener('chat:message-error', listener);
    },
    onDebugMessage: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
      ipcRenderer.on('chat:debug-message', listener);
      return () => ipcRenderer.removeListener('chat:debug-message', listener);
    },
    onToolUseStart: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        tool: { id: string; name: string; input: Record<string, unknown>; streamIndex: number }
      ) => callback(tool);
      ipcRenderer.on('chat:tool-use-start', listener);
      return () => ipcRenderer.removeListener('chat:tool-use-start', listener);
    },
    onToolInputDelta: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { index: number; delta: string }
      ) => callback(data);
      ipcRenderer.on('chat:tool-input-delta', listener);
      return () => ipcRenderer.removeListener('chat:tool-input-delta', listener);
    },
    onContentBlockStop: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { index: number }) =>
        callback(data);
      ipcRenderer.on('chat:content-block-stop', listener);
      return () => ipcRenderer.removeListener('chat:content-block-stop', listener);
    },
    onToolResultStart: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { toolUseId: string; content: string; isError: boolean }
      ) => callback(data);
      ipcRenderer.on('chat:tool-result-start', listener);
      return () => ipcRenderer.removeListener('chat:tool-result-start', listener);
    },
    onToolResultDelta: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { toolUseId: string; delta: string }
      ) => callback(data);
      ipcRenderer.on('chat:tool-result-delta', listener);
      return () => ipcRenderer.removeListener('chat:tool-result-delta', listener);
    },
    onToolResultComplete: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { toolUseId: string; content: string; isError?: boolean }
      ) => callback(data);
      ipcRenderer.on('chat:tool-result-complete', listener);
      return () => ipcRenderer.removeListener('chat:tool-result-complete', listener);
    },
    onSessionUpdated: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { sessionId: string; resumed: boolean }
      ) => callback(data);
      ipcRenderer.on('chat:session-updated', listener);
      return () => ipcRenderer.removeListener('chat:session-updated', listener);
    }
  };
}
