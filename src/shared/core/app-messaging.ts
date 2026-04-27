/**
 * Inter-app messaging types for the LEGO architecture.
 * Apps can communicate when grouped in a domain while remaining self-contained.
 *
 * Supports two patterns:
 * 1. Request/Response (pull): Apps query each other for data
 * 2. Event Bus (push): Apps emit events, others subscribe with wildcards
 */

import type { EventPattern, SystemEvent } from './event-types';

// Message types
export type AppMessageType = 'message' | 'request' | 'response' | 'broadcast' | 'event';

// Core message envelope
export interface AppMessage<T = unknown> {
  id: string;
  fromAppId: string;
  toAppId: string | '*'; // '*' for broadcast
  type: AppMessageType;
  channel: string; // Freeform channel name (e.g., 'get-news', 'data-sync')
  payload: T;
  timestamp: number;
  correlationId?: string; // For request/response pairing
}

// Delivery result returned to sender
export interface MessageDeliveryResult {
  success: boolean;
  delivered: boolean; // Whether recipient was listening
  recipientAppId: string;
  error?: string;
}

// Broadcast result
export interface BroadcastResult {
  success: boolean;
  deliveredTo: string[];
}

// Request-response types
export interface AppRequest<T = unknown> extends AppMessage<T> {
  type: 'request';
  timeout?: number; // Request timeout in ms (default 30000)
}

export interface AppResponse<T = unknown> {
  success: boolean;
  payload: T | null;
  error?: string;
  correlationId: string;
}

// Active app info returned by getActiveApps
export interface ActiveAppInfo {
  appId: string;
  name: string;
  listeningChannels: string[]; // Which channels the app is listening to
  registeredAt: number;
}

// Incoming message event payload (what listeners receive)
export interface IncomingAppMessage<T = unknown> extends AppMessage<T> {
  receivedAt: number;
}

// Internal listener tracking (used by main process)
export interface AppListener {
  appId: string;
  channels: Set<string>; // Empty set = all channels
  registeredAt: number;
}

// ============================================================================
// Event Bus Types (Pub/Sub Pattern)
// ============================================================================

// Event envelope (sent over IPC)
export interface AppEventMessage {
  id: string;
  type: 'event';
  eventType: string; // e.g., 'usage:session-warning', 'agent:completed'
  sourceAppId: string;
  payload: SystemEvent;
  timestamp: number;
}

// Subscription tracking
export interface EventSubscription {
  appId: string;
  pattern: EventPattern; // '*', 'usage:*', 'agent:completed', etc.
  subscribedAt: number;
}

// Emit result (tells sender how many received it)
export interface EventEmitResult {
  success: boolean;
  deliveredTo: string[];
}

// Re-export event types for convenience
export type { EventPattern, SystemEvent } from './event-types';
export { matchEventPattern, createEvent } from './event-types';
