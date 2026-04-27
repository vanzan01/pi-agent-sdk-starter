import type { SDKUserMessage } from '../../shared/core';

import type { AppManifest } from '../../shared/apps';
import type { SerializedAttachmentPayload } from '../../shared/types/ipc';

export type AgentConversation = {
  messages: SDKUserMessage[];
  systemPrompt?: string;
  attachments?: SerializedAttachmentPayload[];
  allowedTools?: string[]; // Override app-level tools for this conversation
  model?: 'fast' | 'smart' | 'deep'; // Override model for this conversation
};

export type AgentRequest = {
  appId: string;
  conversation: AgentConversation;
};

export type AgentResponse =
  | { success: true }
  | {
      success: false;
      error: string;
    };

export type AppContext = {
  manifest: AppManifest;
  allowedTools: string[];
};
