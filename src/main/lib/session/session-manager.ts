import { Session } from './session';
import type { SessionConfig, SessionStats, WindowGetter } from './types';

/**
 * SessionManager manages multiple parallel Session instances.
 * Each conversation gets its own isolated session for parallel streaming.
 */
class SessionManager {
  private sessions = new Map<string, Session>();
  private getMainWindow: WindowGetter = () => null;

  // Resource limits
  private readonly maxConcurrentSessions = 5;
  private readonly idleTimeoutMs = 5 * 60 * 1000; // 5 minutes
  private idleCleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the session manager with a function to get the main window.
   * Using a getter ensures we always get the current window reference.
   */
  initialize(getMainWindow: WindowGetter): void {
    this.getMainWindow = getMainWindow;

    // Start idle cleanup interval
    this.startIdleCleanup();
  }

  /**
   * Clean up all sessions and resources.
   */
  async cleanup(): Promise<void> {
    this.stopIdleCleanup();
    await this.disposeAllSessions();
    this.getMainWindow = () => null;
  }

  /**
   * Get or create a session for a conversation.
   */
  getOrCreateSession(config: SessionConfig): Session {
    const { conversationId } = config;

    // Return existing session if available
    if (this.sessions.has(conversationId)) {
      return this.sessions.get(conversationId)!;
    }

    // Check concurrent session limit (only count actively processing sessions)
    const activeSessions = [...this.sessions.values()].filter((s) => s.isProcessing).length;
    if (activeSessions >= this.maxConcurrentSessions) {
      throw new Error(
        `Maximum concurrent sessions (${this.maxConcurrentSessions}) reached. ` +
          `Please wait for some sessions to complete or close unused conversations.`
      );
    }

    // Create new session - pass the getter so it can always get the current window
    const session = new Session(config, this.getMainWindow);
    this.sessions.set(conversationId, session);

    console.log(`[SessionManager] Created session for conversation: ${conversationId}`);
    return session;
  }

  /**
   * Get an existing session by conversation ID.
   */
  getSession(conversationId: string): Session | undefined {
    return this.sessions.get(conversationId);
  }

  /**
   * Check if a session exists for a conversation.
   */
  hasSession(conversationId: string): boolean {
    return this.sessions.has(conversationId);
  }

  /**
   * Dispose of a specific session.
   */
  async disposeSession(conversationId: string): Promise<void> {
    const session = this.sessions.get(conversationId);
    if (session) {
      await session.dispose();
      this.sessions.delete(conversationId);
      console.log(`[SessionManager] Disposed session for conversation: ${conversationId}`);
    }
  }

  /**
   * Reset a specific session (for plan mode changes, etc.)
   */
  async resetSession(conversationId: string, resumeSessionId?: string | null): Promise<void> {
    const session = this.sessions.get(conversationId);
    if (session) {
      await session.reset(resumeSessionId);
    }
  }

  /**
   * Dispose all idle sessions (not processing and no queued messages).
   */
  async disposeIdleSessions(): Promise<void> {
    const now = Date.now();
    const toDispose: string[] = [];

    for (const [id, session] of this.sessions) {
      if (session.isIdle && now - session.lastActivityAt > this.idleTimeoutMs) {
        toDispose.push(id);
      }
    }

    for (const id of toDispose) {
      await this.disposeSession(id);
    }

    if (toDispose.length > 0) {
      console.log(`[SessionManager] Disposed ${toDispose.length} idle sessions`);
    }
  }

  /**
   * Dispose all sessions.
   */
  async disposeAllSessions(): Promise<void> {
    const ids = [...this.sessions.keys()];
    for (const id of ids) {
      await this.disposeSession(id);
    }
  }

  /**
   * Abort all active sessions.
   */
  abortAllSessions(): void {
    for (const session of this.sessions.values()) {
      session.abort();
    }
  }

  /**
   * Interrupt all active sessions.
   */
  async interruptAllSessions(): Promise<void> {
    const promises: Promise<boolean>[] = [];
    for (const session of this.sessions.values()) {
      if (session.isAgentResponding) {
        promises.push(session.interrupt());
      }
    }
    await Promise.all(promises);
  }

  /**
   * Get statistics about current sessions.
   */
  getStats(): SessionStats {
    let active = 0;
    let queued = 0;
    for (const session of this.sessions.values()) {
      if (session.isProcessing) active++;
      queued += session.queueLength;
    }
    return {
      total: this.sessions.size,
      active,
      queued
    };
  }

  /**
   * Check if any session is currently responding.
   */
  isAnySessionResponding(): boolean {
    for (const session of this.sessions.values()) {
      if (session.isAgentResponding) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the current project path for a session.
   */
  getSessionProjectPath(conversationId: string): string | null {
    const session = this.sessions.get(conversationId);
    return session?.projectPath ?? null;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private startIdleCleanup(): void {
    // Run cleanup every minute
    this.idleCleanupInterval = setInterval(() => {
      this.disposeIdleSessions().catch((error) => {
        console.error('[SessionManager] Error during idle cleanup:', error);
      });
    }, 60 * 1000);
  }

  private stopIdleCleanup(): void {
    if (this.idleCleanupInterval) {
      clearInterval(this.idleCleanupInterval);
      this.idleCleanupInterval = null;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
