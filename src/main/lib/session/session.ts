import type { SessionConfig, WindowGetter } from './types';

let currentPlanMode = false;
let currentProjectPath: string | null = null;

export function isPlanModeEnabled(): boolean {
  return currentPlanMode;
}

export function setPlanMode(enabled: boolean): void {
  currentPlanMode = enabled;
}

export function setCurrentProjectPath(path: string | null): void {
  currentProjectPath = path;
}

export function getCurrentProjectPath(): string | null {
  return currentProjectPath;
}

/**
 * Compatibility shell for the removed legacy per-conversation runner.
 * Active chat traffic uses the Pi SDK session runner directly.
 */
export class Session {
  private readonly state: { conversationId: string; projectPath: string; lastActivityAt: number };

  constructor(config: SessionConfig, _getMainWindow: WindowGetter) {
    this.state = {
      conversationId: config.conversationId,
      projectPath: config.projectPath,
      lastActivityAt: Date.now()
    };
  }

  get conversationId(): string {
    return this.state.conversationId;
  }

  get projectPath(): string {
    return this.state.projectPath;
  }

  get isProcessing(): boolean {
    return false;
  }

  get isAgentResponding(): boolean {
    return false;
  }

  get isIdle(): boolean {
    return true;
  }

  get queueLength(): number {
    return 0;
  }

  get lastActivityAt(): number {
    return this.state.lastActivityAt;
  }

  get sessionId(): string | null {
    return null;
  }

  isSessionActive(): boolean {
    return false;
  }

  async waitForSessionReady(): Promise<void> {
    return undefined;
  }

  async reset(_resumeSessionId?: string | null): Promise<void> {
    return undefined;
  }

  abort(): void {
    return undefined;
  }

  async interrupt(): Promise<boolean> {
    return false;
  }

  async dispose(): Promise<void> {
    return undefined;
  }
}
