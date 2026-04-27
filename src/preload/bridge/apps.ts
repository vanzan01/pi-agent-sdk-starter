/**
 * Apps Bridge
 * Exposes inter-app messaging and event bus operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { AppsBridge } from '../../shared/types/electron-api';

export function createAppsBridge(ipcRenderer: IpcRenderer): AppsBridge {
  return {
    getActiveApps: () => ipcRenderer.invoke('apps:get-active-apps'),
    registerListener: (appId, channels) =>
      ipcRenderer.invoke('apps:register-listener', appId, channels),
    unregisterListener: (appId) => ipcRenderer.invoke('apps:unregister-listener', appId),
    sendToApp: (fromAppId, toAppId, channel, payload) =>
      ipcRenderer.invoke('apps:send-message', fromAppId, toAppId, channel, payload),
    broadcast: (fromAppId, channel, payload) =>
      ipcRenderer.invoke('apps:broadcast', fromAppId, channel, payload),
    sendRequest: (fromAppId, toAppId, channel, payload, timeout) =>
      ipcRenderer.invoke('apps:send-request', fromAppId, toAppId, channel, payload, timeout),
    sendResponse: (fromAppId, toAppId, channel, correlationId, payload, success, error) =>
      ipcRenderer.invoke(
        'apps:send-response',
        fromAppId,
        toAppId,
        channel,
        correlationId,
        payload,
        success,
        error
      ),
    onAppMessage: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        message: {
          id: string;
          fromAppId: string;
          toAppId: string;
          type: 'message' | 'request' | 'broadcast';
          channel: string;
          payload: unknown;
          timestamp: number;
          correlationId?: string;
        }
      ) => {
        // Filter: only deliver to intended recipient
        if (message.toAppId !== appId && message.toAppId !== '*') return;
        // Don't deliver broadcasts back to sender
        if (message.type === 'broadcast' && message.fromAppId === appId) return;
        callback(message);
      };
      ipcRenderer.on('apps:message-received', listener);
      return () => ipcRenderer.removeListener('apps:message-received', listener);
    },
    emit: (appId, event) => ipcRenderer.invoke('apps:emit', appId, event),
    subscribe: (appId, pattern) => ipcRenderer.invoke('apps:subscribe', appId, pattern),
    unsubscribe: (appId, pattern) => ipcRenderer.invoke('apps:unsubscribe', appId, pattern),
    unsubscribeAll: (appId) => ipcRenderer.invoke('apps:unsubscribe-all', appId),
    getSubscriptions: (appId) => ipcRenderer.invoke('apps:get-subscriptions', appId),
    onEvent: (appId, callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        event: {
          id: string;
          type: 'event';
          eventType: string;
          sourceAppId: string;
          payload: unknown;
          timestamp: number;
        }
      ) => {
        callback(event);
      };
      ipcRenderer.on('apps:event-received', listener);
      return () => ipcRenderer.removeListener('apps:event-received', listener);
    },
    queryAgentOutput: (dataKey) => ipcRenderer.invoke('apps:query-agent-output', dataKey)
  };
}
