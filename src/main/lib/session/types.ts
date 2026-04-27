import type { SDKUserMessage } from '../../../shared/core';
import type { BrowserWindow } from 'electron';

/**
 * Function type to get the current main window.
 * Used to ensure we always have a fresh window reference.
 */
export type WindowGetter = () => BrowserWindow | null;

/**
 * Session state for an individual conversation session.
 * Each session has isolated state for parallel streaming.
 */
export interface SessionState {
  conversationId: string;
  projectPath: string;
  isProcessing: boolean;
  shouldAbort: boolean;
  isAgentResponding: boolean;
  lastActivityAt: number;
}

/**
 * Configuration for creating a new session.
 */
export interface SessionConfig {
  conversationId: string;
  projectPath: string;
  resumeSessionId?: string | null;
}

/**
 * Queued message waiting to be sent to the session.
 */
export interface QueuedMessage {
  id: string;
  message: SDKUserMessage['message'];
  resolve: () => void;
  timestamp: number;
}

/**
 * Statistics for a session manager.
 */
export interface SessionStats {
  total: number;
  active: number;
  queued: number;
}

/**
 * Event payload sent to renderer with conversationId context.
 */
export interface SessionEvent {
  conversationId: string;
  type: string;
  data?: unknown;
}
