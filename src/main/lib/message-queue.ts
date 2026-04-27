import type { SDKUserMessage } from '../../shared/core';

export interface MessageQueueItem {
  message: SDKUserMessage['message'];
  resolve: () => void;
}

export const messageQueue: MessageQueueItem[] = [];
let sessionId = `session-${Date.now()}`;
let shouldAbort = false;

// Clear the message queue and reject pending promises
export function clearMessageQueue(): void {
  // Resolve all pending messages to prevent hanging promises
  while (messageQueue.length > 0) {
    const item = messageQueue.shift();
    if (item) {
      item.resolve();
    }
  }
}

// Signal the generator to abort
export function abortGenerator(): void {
  shouldAbort = true;
}

// Reset abort flag for new session
export function resetAbortFlag(): void {
  shouldAbort = false;
}

function generateSessionId(): string {
  return `session-${Date.now()}`;
}

// Allow external callers to set the session ID (e.g., when resuming)
export function setSessionId(nextSessionId?: string | null): void {
  if (nextSessionId && nextSessionId.trim().length > 0) {
    sessionId = nextSessionId;
    return;
  }
  sessionId = generateSessionId();
}

// Generate a new session ID (optionally seeded with a specific value)
export function regenerateSessionId(nextSessionId?: string | null): void {
  setSessionId(nextSessionId);
}

// Get current session ID
export function getSessionId(): string {
  return sessionId;
}

// Async generator for streaming input mode
export async function* messageGenerator(): AsyncGenerator<SDKUserMessage> {
  while (true) {
    // Check if generator should abort
    if (shouldAbort) {
      return;
    }

    // Wait for a message to be queued
    await new Promise<void>((resolve) => {
      const checkQueue = () => {
        // Check abort flag while waiting
        if (shouldAbort) {
          resolve();
          return;
        }

        if (messageQueue.length > 0) {
          resolve();
        } else {
          setTimeout(checkQueue, 100);
        }
      };
      checkQueue();
    });

    // Check abort flag again after waiting
    if (shouldAbort) {
      return;
    }

    // Get the next message from the queue
    const item = messageQueue.shift();
    if (item) {
      yield {
        type: 'user',
        message: item.message,
        parent_tool_use_id: null,
        session_id: getSessionId()
      };
      item.resolve();
    }
  }
}
