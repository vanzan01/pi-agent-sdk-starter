// Shared IPC response types used by both main and renderer processes

export interface WorkspaceDirResponse {
  workspaceDir: string;
}

export interface SuccessResponse {
  success: boolean;
  error?: string;
}

export type ChatModelPreference = 'fast' | 'smart' | 'deep';

export type ModelProvider = 'codex' | 'glm';

export const DEFAULT_GLM_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';

export interface SerializedAttachmentPayload {
  name: string;
  mimeType: string;
  size: number;
  data: ArrayBuffer | Uint8Array;
}

export interface SendMessagePayload {
  text: string;
  attachments?: SerializedAttachmentPayload[];
  sessionId?: string;
}

export interface GetChatModelPreferenceResponse {
  preference: ChatModelPreference;
}

export interface SetChatModelPreferenceResponse extends SuccessResponse {
  preference: ChatModelPreference;
}

export interface SavedAttachmentInfo {
  name: string;
  mimeType: string;
  size: number;
  savedPath: string;
  relativePath: string;
}

export interface SendMessageResponse {
  success: boolean;
  error?: string;
  attachments?: SavedAttachmentInfo[];
}

export interface ShellResponse {
  success: boolean;
  error?: string;
}

export interface GetSystemPromptAppendResponse {
  text: string;
  isDefault: boolean;
}

export interface SetSystemPromptAppendResponse extends SuccessResponse {
  text: string;
  isDefault: boolean;
}

export interface GetProviderResponse {
  provider: ModelProvider;
  source: 'default' | 'project' | 'env';
}

export interface SetProviderResponse extends SuccessResponse {
  provider: ModelProvider;
}

export interface GetGlmConfigResponse {
  apiKey: string | null;
  baseUrl: string;
  apiKeySource: 'default' | 'project' | 'env';
  baseUrlSource: 'default' | 'project' | 'env';
}

export interface SetGlmConfigResponse extends SuccessResponse {
  apiKey: string | null;
  baseUrl: string;
}
