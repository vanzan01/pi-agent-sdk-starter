/**
 * Agent Bridge
 * Exposes agent operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { AgentBridge } from '../../shared/types/electron-api';

export function createAgentBridge(ipcRenderer: IpcRenderer): AgentBridge {
  return {
    sendMessage: (appId, payload) => ipcRenderer.invoke('agent:send-message', appId, payload),
    runConversation: (appId, conversation) =>
      ipcRenderer.invoke('agent:run-conversation', appId, conversation),
    stopMessage: (conversationId) => ipcRenderer.invoke('agent:stop-message', conversationId),
    resetSession: (appId, resumeSessionId, conversationId) =>
      ipcRenderer.invoke('agent:reset-session', appId, resumeSessionId, conversationId),
    getModelPreference: () => ipcRenderer.invoke('agent:get-model-preference'),
    setModelPreference: (preference) =>
      ipcRenderer.invoke('agent:set-model-preference', preference),
    getPlanMode: () => ipcRenderer.invoke('agent:get-plan-mode'),
    setPlanMode: (enabled) => ipcRenderer.invoke('agent:set-plan-mode', enabled),
    getSessionState: (conversationId) =>
      ipcRenderer.invoke('agent:get-session-state', conversationId),
    runSingleAgent: (appId, config, userPrompt) =>
      ipcRenderer.invoke('agent:run-single-agent', appId, config, userPrompt),

    // Event listeners with appId filtering
    onMessageChunk: (appId, callback) => {
      let chunkCount = 0;
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string; chunk?: string; data?: unknown }
      ) => {
        chunkCount++;
        if (chunkCount <= 3 || chunkCount % 100 === 0) {
          console.log(
            `[Preload] Chunk #${chunkCount} received: appId="${data?.appId}" (listener wants "${appId}")`
          );
        }
        if (!data || (data.appId !== appId && data.conversationId !== appId)) {
          if (chunkCount <= 3) {
            console.log(`[Preload] Chunk #${chunkCount} FILTERED OUT (appId mismatch)`);
          }
          return;
        }
        const chunk =
          typeof data.chunk === 'string'
            ? data.chunk
            : typeof data.data === 'string'
              ? data.data
              : null;
        if (chunk === null) return;
        callback(chunk);
      };
      ipcRenderer.on('agent:message-chunk', listener);
      return () => ipcRenderer.removeListener('agent:message-chunk', listener);
    },
    onThinkingStart: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string; index: number }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback({ index: data.index });
      };
      ipcRenderer.on('agent:thinking-start', listener);
      return () => ipcRenderer.removeListener('agent:thinking-start', listener);
    },
    onThinkingChunk: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string; index: number; delta: string }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback({ index: data.index, delta: data.delta });
      };
      ipcRenderer.on('agent:thinking-chunk', listener);
      return () => ipcRenderer.removeListener('agent:thinking-chunk', listener);
    },
    onMessageComplete: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback();
      };
      ipcRenderer.on('agent:message-complete', listener);
      return () => ipcRenderer.removeListener('agent:message-complete', listener);
    },
    onMessageStopped: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback();
      };
      ipcRenderer.on('agent:message-stopped', listener);
      return () => ipcRenderer.removeListener('agent:message-stopped', listener);
    },
    onMessageError: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string; error?: string }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback(data.error || 'Unknown error');
      };
      ipcRenderer.on('agent:message-error', listener);
      return () => ipcRenderer.removeListener('agent:message-error', listener);
    },
    onDebugMessage: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string; message?: string }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        if (typeof data.message === 'string') {
          callback(data.message);
        }
      };
      ipcRenderer.on('agent:debug-message', listener);
      return () => ipcRenderer.removeListener('agent:debug-message', listener);
    },
    onToolUseStart: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        tool: {
          appId?: string;
          conversationId?: string;
          id: string;
          name: string;
          input: Record<string, unknown>;
          streamIndex: number;
        }
      ) => {
        if (!tool || (tool.appId !== appId && tool.conversationId !== appId)) return;
        const { id, name, input, streamIndex } = tool;
        callback({ id, name, input, streamIndex });
      };
      ipcRenderer.on('agent:tool-use-start', listener);
      return () => ipcRenderer.removeListener('agent:tool-use-start', listener);
    },
    onToolInputDelta: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: {
          appId?: string;
          conversationId?: string;
          index: number;
          toolId?: string;
          delta: string;
        }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback({ index: data.index, toolId: data.toolId, delta: data.delta });
      };
      ipcRenderer.on('agent:tool-input-delta', listener);
      return () => ipcRenderer.removeListener('agent:tool-input-delta', listener);
    },
    onContentBlockStop: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string; index: number; toolId?: string }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback({ index: data.index, toolId: data.toolId });
      };
      ipcRenderer.on('agent:content-block-stop', listener);
      return () => ipcRenderer.removeListener('agent:content-block-stop', listener);
    },
    onToolResultStart: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: {
          appId?: string;
          conversationId?: string;
          toolUseId: string;
          content: string;
          isError: boolean;
        }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback({ toolUseId: data.toolUseId, content: data.content, isError: data.isError });
      };
      ipcRenderer.on('agent:tool-result-start', listener);
      return () => ipcRenderer.removeListener('agent:tool-result-start', listener);
    },
    onToolResultDelta: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string; toolUseId: string; delta: string }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback({ toolUseId: data.toolUseId, delta: data.delta });
      };
      ipcRenderer.on('agent:tool-result-delta', listener);
      return () => ipcRenderer.removeListener('agent:tool-result-delta', listener);
    },
    onToolResultComplete: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: {
          appId?: string;
          conversationId?: string;
          toolUseId: string;
          content: string;
          isError?: boolean;
        }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback({
          toolUseId: data.toolUseId,
          content: data.content,
          isError: data.isError
        });
      };
      ipcRenderer.on('agent:tool-result-complete', listener);
      return () => ipcRenderer.removeListener('agent:tool-result-complete', listener);
    },
    onSessionUpdated: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: { appId?: string; conversationId?: string; sessionId: string; resumed: boolean }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback({ sessionId: data.sessionId, resumed: data.resumed });
      };
      ipcRenderer.on('agent:session-updated', listener);
      return () => ipcRenderer.removeListener('agent:session-updated', listener);
    },
    onContextWindowUpdate: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        data: {
          appId?: string;
          conversationId?: string;
          model: string;
          contextWindow: number;
          tokensUsed: number;
        }
      ) => {
        if (!data || (data.appId !== appId && data.conversationId !== appId)) return;
        callback({ model: data.model, contextWindow: data.contextWindow, tokensUsed: data.tokensUsed });
      };
      ipcRenderer.on('agent:context-window-update', listener);
      return () => ipcRenderer.removeListener('agent:context-window-update', listener);
    }
  };
}
