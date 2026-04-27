/**
 * Event type definitions for the pub/sub event bus system.
 * Apps emit events, and other apps can subscribe with wildcard patterns.
 */

// Base event interface - all events extend this
export interface BaseEvent {
  type: string;
  timestamp: number;
  sourceAppId: string;
}

// Agent lifecycle events (emitted by core agent-runner)
export interface AgentStartedEvent extends BaseEvent {
  type: 'agent:started';
  appId: string;
  conversationId?: string;
  taskPreview?: string;
}

export interface AgentCompletedEvent extends BaseEvent {
  type: 'agent:completed';
  appId: string;
  conversationId?: string;
  summary: string;
}

export interface AgentErrorEvent extends BaseEvent {
  type: 'agent:error';
  appId: string;
  conversationId?: string;
  error: string;
}

// Agent step completion event (emitted by transcript parser in main process)
// Contains a dataKey to query stored output from main process store
export interface AgentStepCompleteEvent extends BaseEvent {
  type: 'agent:step-complete';
  appId: string;
  agentId: string; // The step/agent identifier (e.g., 'researcher', 'analysis', 'writer')
  dataKey: string; // Key to query stored output: "appId:agentId"
}

// AI News Tweet events
// Note: These events contain raw output.
export interface TweetResearchCompleteEvent extends BaseEvent {
  type: 'tweet:research-complete';
  rawOutput: string; // Raw agent output for AI summarization
}

export interface TweetAnalysisCompleteEvent extends BaseEvent {
  type: 'tweet:analysis-complete';
  rawOutput: string; // Raw agent output for AI summarization
}

export interface TweetReadyEvent extends BaseEvent {
  type: 'tweet:ready';
  tweet: string; // Full tweet content
  charCount: number;
  content?: string; // Alias for tweet
}

export interface TweetPostedEvent extends BaseEvent {
  type: 'tweet:posted';
  success: boolean;
}

// Union type of all system events
export type SystemEvent =
  // Agent lifecycle
  | AgentStartedEvent
  | AgentCompletedEvent
  | AgentErrorEvent
  | AgentStepCompleteEvent
  // AI News Tweet
  | TweetResearchCompleteEvent
  | TweetAnalysisCompleteEvent
  | TweetReadyEvent
  | TweetPostedEvent;

// Event type strings for pattern matching
export type SystemEventType = SystemEvent['type'];

// Extract event by type
export type EventOfType<T extends SystemEventType> = Extract<SystemEvent, { type: T }>;

// Wildcard pattern types
export type EventPattern =
  | '*' // All events
  | 'agent:*' // All agent events
  | 'tweet:*' // All tweet events
  | SystemEventType; // Specific event type

/**
 * Match an event type against a pattern (supports wildcards)
 */
export function matchEventPattern(eventType: string, pattern: EventPattern): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1); // Remove trailing *
    return eventType.startsWith(prefix);
  }
  return eventType === pattern;
}

/**
 * Create a typed event helper
 */
export function createEvent<T extends SystemEventType>(
  type: T,
  sourceAppId: string,
  payload: Omit<EventOfType<T>, 'type' | 'timestamp' | 'sourceAppId'>
): EventOfType<T> {
  return {
    type,
    timestamp: Date.now(),
    sourceAppId,
    ...payload
  } as EventOfType<T>;
}
