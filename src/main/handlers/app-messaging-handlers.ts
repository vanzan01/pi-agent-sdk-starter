/**
 * IPC handlers for inter-app messaging.
 * Enables apps to discover and communicate with each other when grouped in a domain.
 *
 * Supports:
 * - Request/Response pattern (pull)
 * - Event Bus pattern (push) with wildcard subscriptions
 */

import { randomUUID } from 'crypto';
import { ipcMain, type BrowserWindow } from 'electron';

import { getAllApps } from '../../shared/apps';
import type {
  ActiveAppInfo,
  AppListener,
  AppResponse,
  BroadcastResult,
  EventEmitResult,
  EventPattern,
  EventSubscription,
  MessageDeliveryResult,
  SystemEvent
} from '../../shared/core/app-messaging';
import { matchEventPattern } from '../../shared/core/event-types';
import { getAgentOutput } from '../lib/agent-output-store';

// Track registered app listeners
const appListeners = new Map<string, AppListener>();

// Track event subscriptions (appId -> list of patterns)
const eventSubscriptions = new Map<string, EventSubscription[]>();

// Pending requests waiting for responses (for request-response pattern)
const pendingRequests = new Map<
  string,
  {
    resolve: (response: AppResponse) => void;
    timer: NodeJS.Timeout;
  }
>();

/**
 * Emit an event from the main process (for core events like agent lifecycle)
 */
export function emitEventFromMain(
  mainWindow: BrowserWindow | null,
  event: SystemEvent
): EventEmitResult {
  if (!mainWindow) {
    return { success: false, deliveredTo: [] };
  }

  const deliveredTo: string[] = [];
  const eventMessage = {
    id: randomUUID(),
    type: 'event' as const,
    eventType: event.type,
    sourceAppId: event.sourceAppId,
    payload: event,
    timestamp: Date.now()
  };

  // Find all apps subscribed to this event type
  for (const [appId, subscriptions] of eventSubscriptions) {
    for (const sub of subscriptions) {
      if (matchEventPattern(event.type, sub.pattern)) {
        deliveredTo.push(appId);
        break; // Only deliver once per app
      }
    }
  }

  if (deliveredTo.length > 0) {
    mainWindow.webContents.send('apps:event-received', eventMessage);
  }

  return { success: true, deliveredTo };
}

export function registerAppMessagingHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Register an app as a listener for messages
  ipcMain.handle(
    'apps:register-listener',
    (_event, appId: string, channels?: string[]): { success: boolean } => {
      appListeners.set(appId, {
        appId,
        channels: new Set(channels || []),
        registeredAt: Date.now()
      });
      return { success: true };
    }
  );

  // Unregister an app listener
  ipcMain.handle('apps:unregister-listener', (_event, appId: string): { success: boolean } => {
    appListeners.delete(appId);
    return { success: true };
  });

  // Get list of active apps (those with registered listeners)
  ipcMain.handle('apps:get-active-apps', (): ActiveAppInfo[] => {
    const allApps = getAllApps();
    const activeApps: ActiveAppInfo[] = [];

    for (const [appId, listener] of appListeners) {
      const manifest = allApps.find((app) => app.id === appId);
      if (manifest) {
        activeApps.push({
          appId,
          name: manifest.name,
          listeningChannels: Array.from(listener.channels),
          registeredAt: listener.registeredAt
        });
      }
    }

    return activeApps;
  });

  // Send message to a specific app
  ipcMain.handle(
    'apps:send-message',
    async (
      _event,
      fromAppId: string,
      toAppId: string,
      channel: string,
      payload: unknown
    ): Promise<MessageDeliveryResult> => {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return {
          success: false,
          delivered: false,
          recipientAppId: toAppId,
          error: 'No main window available'
        };
      }

      // Check if target app is listening
      const listener = appListeners.get(toAppId);
      if (!listener) {
        return {
          success: true,
          delivered: false,
          recipientAppId: toAppId,
          error: 'Recipient app is not listening'
        };
      }

      // Check if listener is subscribed to this channel (empty = all channels)
      if (listener.channels.size > 0 && !listener.channels.has(channel)) {
        return {
          success: true,
          delivered: false,
          recipientAppId: toAppId,
          error: `Recipient app is not listening on channel: ${channel}`
        };
      }

      // Deliver message to renderer
      const message = {
        id: randomUUID(),
        fromAppId,
        toAppId,
        type: 'message' as const,
        channel,
        payload,
        timestamp: Date.now(),
        receivedAt: Date.now()
      };

      mainWindow.webContents.send('apps:message-received', message);

      return {
        success: true,
        delivered: true,
        recipientAppId: toAppId
      };
    }
  );

  // Broadcast message to all listening apps
  ipcMain.handle(
    'apps:broadcast',
    async (
      _event,
      fromAppId: string,
      channel: string,
      payload: unknown
    ): Promise<BroadcastResult> => {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return { success: false, deliveredTo: [] };
      }

      const deliveredTo: string[] = [];

      // Find all listeners (except sender) that are subscribed to this channel
      for (const [appId, listener] of appListeners) {
        if (appId === fromAppId) continue; // Don't send to self

        // Check channel subscription (empty channels = all channels)
        if (listener.channels.size === 0 || listener.channels.has(channel)) {
          deliveredTo.push(appId);
        }
      }

      if (deliveredTo.length > 0) {
        const message = {
          id: randomUUID(),
          fromAppId,
          toAppId: '*',
          type: 'broadcast' as const,
          channel,
          payload,
          timestamp: Date.now(),
          receivedAt: Date.now()
        };

        mainWindow.webContents.send('apps:message-received', message);
      }

      return { success: true, deliveredTo };
    }
  );

  // Send request and wait for response
  ipcMain.handle(
    'apps:send-request',
    async (
      _event,
      fromAppId: string,
      toAppId: string,
      channel: string,
      payload: unknown,
      timeout: number = 30000
    ): Promise<AppResponse> => {
      const requestId = randomUUID();

      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return {
          success: false,
          payload: null,
          error: 'No main window available',
          correlationId: requestId
        };
      }

      // Check if target is listening
      const listener = appListeners.get(toAppId);
      if (!listener) {
        return {
          success: false,
          payload: null,
          error: 'Recipient app is not listening',
          correlationId: requestId
        };
      }

      // Check channel subscription
      if (listener.channels.size > 0 && !listener.channels.has(channel)) {
        return {
          success: false,
          payload: null,
          error: `Recipient app is not listening on channel: ${channel}`,
          correlationId: requestId
        };
      }

      // Create promise that will be resolved when response arrives
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          pendingRequests.delete(requestId);
          resolve({
            success: false,
            payload: null,
            error: `Request timeout after ${timeout}ms`,
            correlationId: requestId
          });
        }, timeout);

        pendingRequests.set(requestId, { resolve, timer });

        // Send request to recipient
        const message = {
          id: randomUUID(),
          fromAppId,
          toAppId,
          type: 'request' as const,
          channel,
          payload,
          timestamp: Date.now(),
          correlationId: requestId,
          receivedAt: Date.now()
        };

        mainWindow.webContents.send('apps:message-received', message);
      });
    }
  );

  // Handle response from an app (called by responder)
  ipcMain.handle(
    'apps:send-response',
    (
      _event,
      _fromAppId: string,
      _toAppId: string,
      _channel: string,
      correlationId: string,
      payload: unknown,
      success: boolean = true,
      error?: string
    ): { success: boolean } => {
      const pending = pendingRequests.get(correlationId);
      if (!pending) {
        return { success: false }; // Request already timed out or doesn't exist
      }

      clearTimeout(pending.timer);
      pendingRequests.delete(correlationId);

      pending.resolve({
        success,
        payload: payload as unknown,
        error,
        correlationId
      });

      return { success: true };
    }
  );

  // =========================================================================
  // Event Bus Handlers (Pub/Sub Pattern)
  // =========================================================================

  // Subscribe to events with a pattern
  ipcMain.handle(
    'apps:subscribe',
    (_event, appId: string, pattern: EventPattern): { success: boolean } => {
      console.log('[subscribe]', appId, 'subscribing to', pattern);

      if (!eventSubscriptions.has(appId)) {
        eventSubscriptions.set(appId, []);
      }

      const subs = eventSubscriptions.get(appId)!;

      // Check if already subscribed to this pattern
      if (subs.some((s) => s.pattern === pattern)) {
        console.log('[subscribe]', appId, 'already subscribed to', pattern);
        return { success: true }; // Already subscribed
      }

      subs.push({
        appId,
        pattern,
        subscribedAt: Date.now()
      });

      console.log('[subscribe]', appId, 'now has', subs.length, 'subscriptions');
      return { success: true };
    }
  );

  // Unsubscribe from a pattern
  ipcMain.handle(
    'apps:unsubscribe',
    (_event, appId: string, pattern: EventPattern): { success: boolean } => {
      const subs = eventSubscriptions.get(appId);
      if (!subs) {
        return { success: true };
      }

      const filtered = subs.filter((s) => s.pattern !== pattern);
      if (filtered.length === 0) {
        eventSubscriptions.delete(appId);
      } else {
        eventSubscriptions.set(appId, filtered);
      }

      return { success: true };
    }
  );

  // Unsubscribe from all patterns (cleanup on unmount)
  ipcMain.handle('apps:unsubscribe-all', (_event, appId: string): { success: boolean } => {
    eventSubscriptions.delete(appId);
    return { success: true };
  });

  // Emit an event (from renderer)
  ipcMain.handle(
    'apps:emit',
    async (_event, appId: string, systemEvent: SystemEvent): Promise<EventEmitResult> => {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        console.log('[emit] No main window');
        return { success: false, deliveredTo: [] };
      }

      // Ensure sourceAppId is set
      const eventWithSource = {
        ...systemEvent,
        sourceAppId: appId,
        timestamp: systemEvent.timestamp || Date.now()
      };

      console.log('[emit] Event from', appId, ':', eventWithSource.type);
      console.log('[emit] Current subscriptions:', Array.from(eventSubscriptions.entries()));

      const deliveredTo: string[] = [];
      const eventMessage = {
        id: randomUUID(),
        type: 'event' as const,
        eventType: eventWithSource.type,
        sourceAppId: appId,
        payload: eventWithSource,
        timestamp: Date.now()
      };

      // Find all apps subscribed to this event type
      for (const [subscriberAppId, subscriptions] of eventSubscriptions) {
        if (subscriberAppId === appId) continue; // Don't deliver to self

        for (const sub of subscriptions) {
          if (matchEventPattern(eventWithSource.type, sub.pattern)) {
            deliveredTo.push(subscriberAppId);
            break; // Only deliver once per app
          }
        }
      }

      console.log('[emit] Delivering to:', deliveredTo);

      if (deliveredTo.length > 0) {
        mainWindow.webContents.send('apps:event-received', eventMessage);
      }

      return { success: true, deliveredTo };
    }
  );

  // Get current subscriptions (for debugging)
  ipcMain.handle('apps:get-subscriptions', (_event, appId: string): EventSubscription[] => {
    return eventSubscriptions.get(appId) || [];
  });

  // =========================================================================
  // Agent Output Store Handlers
  // =========================================================================

  // Query stored agent output by data key
  ipcMain.handle(
    'apps:query-agent-output',
    (_event, dataKey: string): { output: string | null } => {
      const output = getAgentOutput(dataKey);
      return { output };
    }
  );
}
