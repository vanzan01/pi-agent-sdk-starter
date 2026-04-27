import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AppEventMessage as _AppEventMessage,
  ActiveAppInfo,
  AppResponse,
  BroadcastResult,
  EventEmitResult,
  EventPattern,
  IncomingAppMessage,
  MessageDeliveryResult,
  SystemEvent
} from '../../shared/core/app-messaging';
import { matchEventPattern } from '../../shared/core/event-types';

export interface UseAppMessagingOptions {
  /** Channels to listen on. Empty array = all channels */
  channels?: string[];
  /** Auto-register as listener on mount (default: true) */
  autoRegister?: boolean;
}

export interface UseAppMessagingReturn {
  /** List of currently active (listening) apps */
  activeApps: ActiveAppInfo[];
  /** Refresh the list of active apps */
  refreshActiveApps: () => Promise<void>;
  /** Whether this app is registered as a listener */
  isRegistered: boolean;
  /** Manually register as a listener */
  register: () => Promise<boolean>;
  /** Manually unregister as a listener */
  unregister: () => Promise<boolean>;
  /** Send a message to a specific app */
  sendToApp: <T = unknown>(
    toAppId: string,
    channel: string,
    payload: T
  ) => Promise<MessageDeliveryResult>;
  /** Broadcast a message to all listening apps */
  broadcast: <T = unknown>(channel: string, payload: T) => Promise<BroadcastResult>;
  /** Send a request and await response */
  sendRequest: <TReq = unknown, TRes = unknown>(
    toAppId: string,
    channel: string,
    payload: TReq,
    timeout?: number
  ) => Promise<AppResponse<TRes>>;
  /** Register a handler for incoming messages on a channel */
  onMessage: <T = unknown>(
    channel: string,
    handler: (message: IncomingAppMessage<T>) => void
  ) => () => void;
  /** Register a handler for incoming requests (expects a response) */
  onRequest: <TReq = unknown, TRes = unknown>(
    channel: string,
    handler: (
      message: IncomingAppMessage<TReq>
    ) => TRes | Promise<TRes> | { error: string } | Promise<{ error: string }>
  ) => () => void;

  // =========================================================================
  // Event Bus API (Pub/Sub Pattern)
  // =========================================================================

  /** Emit an event to all subscribed apps */
  emit: <T extends SystemEvent>(event: T) => Promise<EventEmitResult>;
  /** Subscribe to events matching a pattern ('*', 'usage:*', 'agent:completed', etc.) */
  subscribe: (pattern: EventPattern, handler: (event: SystemEvent) => void) => () => void;
}

/**
 * React hook for inter-app messaging in the LEGO architecture.
 *
 * @example
 * // Basic usage - auto-registers on mount
 * const { sendToApp, onMessage } = useAppMessaging('my-app');
 *
 * // Listen for messages
 * useEffect(() => {
 *   return onMessage('data-updated', (msg) => {
 *     console.log('Got data:', msg.payload);
 *   });
 * }, [onMessage]);
 *
 * // Send a message
 * await sendToApp('other-app', 'do-something', { foo: 'bar' });
 *
 * @example
 * // Request-response pattern
 * const { sendRequest, onRequest } = useAppMessaging('my-app');
 *
 * // Register request handler
 * useEffect(() => {
 *   return onRequest('get-data', async (msg) => {
 *     const data = await fetchData(msg.payload.id);
 *     return data;
 *   });
 * }, [onRequest]);
 *
 * // Send request and await response
 * const response = await sendRequest('data-provider', 'get-data', { id: 123 });
 * if (response.success) {
 *   console.log('Got:', response.payload);
 * }
 */
export function useAppMessaging(
  appId: string,
  options: UseAppMessagingOptions = {}
): UseAppMessagingReturn {
  const channels = useMemo(() => options.channels ?? [], [options.channels]);
  const autoRegister = options.autoRegister ?? true;

  const [activeApps, setActiveApps] = useState<ActiveAppInfo[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);

  // Track message handlers by channel
  const messageHandlersRef = useRef<
    Map<string, Set<(message: IncomingAppMessage<unknown>) => void>>
  >(new Map());

  // Track request handlers by channel
  const requestHandlersRef = useRef<
    Map<
      string,
      (
        message: IncomingAppMessage<unknown>
      ) => unknown | Promise<unknown> | { error: string } | Promise<{ error: string }>
    >
  >(new Map());

  // Track event handlers by pattern (for pub/sub)
  const eventHandlersRef = useRef<Map<EventPattern, Set<(event: SystemEvent) => void>>>(new Map());

  // Refresh active apps list
  const refreshActiveApps = useCallback(async () => {
    const apps = await window.electron.apps.getActiveApps();
    setActiveApps(apps);
  }, []);

  // Register as listener
  const register = useCallback(async () => {
    const result = await window.electron.apps.registerListener(appId, channels);
    setIsRegistered(result.success);
    return result.success;
  }, [appId, channels]);

  // Unregister as listener
  const unregister = useCallback(async () => {
    const result = await window.electron.apps.unregisterListener(appId);
    if (result.success) {
      setIsRegistered(false);
    }
    return result.success;
  }, [appId]);

  // Send message to specific app
  const sendToApp = useCallback(
    async <T = unknown>(
      toAppId: string,
      channel: string,
      payload: T
    ): Promise<MessageDeliveryResult> => {
      return window.electron.apps.sendToApp(appId, toAppId, channel, payload);
    },
    [appId]
  );

  // Broadcast to all apps
  const broadcast = useCallback(
    async <T = unknown>(channel: string, payload: T): Promise<BroadcastResult> => {
      return window.electron.apps.broadcast(appId, channel, payload);
    },
    [appId]
  );

  // Send request and await response
  const sendRequest = useCallback(
    async <TReq = unknown, TRes = unknown>(
      toAppId: string,
      channel: string,
      payload: TReq,
      timeout?: number
    ): Promise<AppResponse<TRes>> => {
      return window.electron.apps.sendRequest<TRes>(appId, toAppId, channel, payload, timeout);
    },
    [appId]
  );

  // Register message handler for a channel
  const onMessage = useCallback(
    <T = unknown>(
      channel: string,
      handler: (message: IncomingAppMessage<T>) => void
    ): (() => void) => {
      if (!messageHandlersRef.current.has(channel)) {
        messageHandlersRef.current.set(channel, new Set());
      }
      const handlers = messageHandlersRef.current.get(channel)!;
      handlers.add(handler as (message: IncomingAppMessage<unknown>) => void);

      // Return unsubscribe function
      return () => {
        handlers.delete(handler as (message: IncomingAppMessage<unknown>) => void);
        if (handlers.size === 0) {
          messageHandlersRef.current.delete(channel);
        }
      };
    },
    []
  );

  // Register request handler for a channel (only one handler per channel)
  const onRequest = useCallback(
    <TReq = unknown, TRes = unknown>(
      channel: string,
      handler: (
        message: IncomingAppMessage<TReq>
      ) => TRes | Promise<TRes> | { error: string } | Promise<{ error: string }>
    ): (() => void) => {
      requestHandlersRef.current.set(
        channel,
        handler as (
          message: IncomingAppMessage<unknown>
        ) => unknown | Promise<unknown> | { error: string } | Promise<{ error: string }>
      );

      return () => {
        requestHandlersRef.current.delete(channel);
      };
    },
    []
  );

  // =========================================================================
  // Event Bus API (Pub/Sub Pattern)
  // =========================================================================

  // Emit an event to all subscribed apps
  const emit = useCallback(
    async <T extends SystemEvent>(event: T): Promise<EventEmitResult> => {
      // Ensure event has sourceAppId and timestamp
      const fullEvent = {
        ...event,
        sourceAppId: appId,
        timestamp: event.timestamp || Date.now()
      };
      return window.electron.apps.emit(appId, fullEvent);
    },
    [appId]
  );

  // Subscribe to events matching a pattern
  const subscribe = useCallback(
    (pattern: EventPattern, handler: (event: SystemEvent) => void): (() => void) => {
      // Track handler locally
      if (!eventHandlersRef.current.has(pattern)) {
        eventHandlersRef.current.set(pattern, new Set());
      }
      const handlers = eventHandlersRef.current.get(pattern)!;
      handlers.add(handler);

      // Register subscription with main process (fire async, log errors)
      window.electron.apps.subscribe(appId, pattern).catch((err) => {
        console.error(`[useAppMessaging] Failed to subscribe to ${pattern}:`, err);
      });

      // Return unsubscribe function
      return () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(pattern);
          // Unsubscribe from main process
          window.electron.apps.unsubscribe(appId, pattern).catch((err) => {
            console.error(`[useAppMessaging] Failed to unsubscribe from ${pattern}:`, err);
          });
        }
      };
    },
    [appId]
  );

  // Set up incoming message listener
  useEffect(() => {
    const unsubscribe = window.electron.apps.onAppMessage(appId, async (message) => {
      // Create IncomingAppMessage with receivedAt timestamp
      const incomingMessage: IncomingAppMessage<unknown> = {
        ...message,
        receivedAt: Date.now()
      };

      // Handle requests - call request handler and send response
      if (message.type === 'request' && message.correlationId) {
        const requestHandler = requestHandlersRef.current.get(message.channel);
        if (requestHandler) {
          try {
            const result = await Promise.resolve(requestHandler(incomingMessage));

            // Check if result is an error response
            if (result && typeof result === 'object' && 'error' in result) {
              await window.electron.apps.sendResponse(
                appId,
                message.fromAppId,
                message.channel,
                message.correlationId,
                null,
                false,
                (result as { error: string }).error
              );
            } else {
              await window.electron.apps.sendResponse(
                appId,
                message.fromAppId,
                message.channel,
                message.correlationId,
                result,
                true
              );
            }
          } catch (err) {
            await window.electron.apps.sendResponse(
              appId,
              message.fromAppId,
              message.channel,
              message.correlationId,
              null,
              false,
              err instanceof Error ? err.message : 'Request handler error'
            );
          }
        }
        return; // Don't pass requests to regular message handlers
      }

      // Handle regular messages and broadcasts
      const handlers = messageHandlersRef.current.get(message.channel);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(incomingMessage);
          } catch (err) {
            console.error(`[useAppMessaging] Handler error for channel ${message.channel}:`, err);
          }
        }
      }

      // Also check for wildcard handlers (listen to all channels)
      const wildcardHandlers = messageHandlersRef.current.get('*');
      if (wildcardHandlers) {
        for (const handler of wildcardHandlers) {
          try {
            handler(incomingMessage);
          } catch (err) {
            console.error(`[useAppMessaging] Wildcard handler error:`, err);
          }
        }
      }
    });

    return unsubscribe;
  }, [appId]);

  // Set up incoming event listener (for pub/sub)
  useEffect(() => {
    const unsubscribe = window.electron.apps.onEvent(appId, (eventMessage) => {
      const event = eventMessage.payload as SystemEvent;

      // Dispatch to all matching handlers
      for (const [pattern, handlers] of eventHandlersRef.current) {
        if (matchEventPattern(event.type, pattern)) {
          for (const handler of handlers) {
            try {
              handler(event);
            } catch (err) {
              console.error(`[useAppMessaging] Event handler error for pattern ${pattern}:`, err);
            }
          }
        }
      }
    });

    return unsubscribe;
  }, [appId]);

  // Auto-register on mount
  useEffect(() => {
    if (!autoRegister) return;

    let mounted = true;

    // Register and fetch active apps asynchronously
    (async () => {
      const result = await window.electron.apps.registerListener(appId, channels);
      if (mounted) {
        setIsRegistered(result.success);
      }

      const apps = await window.electron.apps.getActiveApps();
      if (mounted) {
        setActiveApps(apps);
      }
    })();

    return () => {
      mounted = false;
      // Unregister on unmount
      window.electron.apps.unregisterListener(appId);
      // NOTE: Do NOT call unsubscribeAll here!
      // Each subscribe() returns its own cleanup function.
      // Calling unsubscribeAll here would wipe subscriptions when
      // this effect re-runs due to unstable `channels` reference.
    };
  }, [appId, autoRegister, channels]);

  return {
    activeApps,
    refreshActiveApps,
    isRegistered,
    register,
    unregister,
    sendToApp,
    broadcast,
    sendRequest,
    onMessage,
    onRequest,
    // Event bus API
    emit,
    subscribe
  };
}
