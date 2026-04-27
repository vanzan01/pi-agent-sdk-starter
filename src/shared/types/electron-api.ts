/**
 * Electron Bridge API Types
 *
 * Single source of truth for the window.electron API shape.
 * Used by both preload (implementation) and renderer (type declarations).
 */

import type {
  ChatModelPreference,
  GetChatModelPreferenceResponse,
  SendMessagePayload,
  SendMessageResponse,
  SetChatModelPreferenceResponse
} from '../core';

// Re-export for convenience
export type ChatResponse = SendMessageResponse;

// ============================================================================
// Common Response Types
// ============================================================================

export interface WorkspaceResponse {
  workspaceDir: string;
}

export interface AppPathResponse {
  appPath: string;
}

export interface SetWorkspaceResponse {
  success: boolean;
  error?: string;
}

export interface ShellExecuteResponse {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export interface PathInfoResponse {
  platform: string;
  pathSeparator: string;
  pathEntries: string[];
  pathCount: number;
  fullPath: string;
}

export interface EnvVar {
  key: string;
  value: string;
}

export interface EnvVarsResponse {
  envVars: EnvVar[];
  count: number;
}

export interface DiagnosticMetadataResponse {
  appVersion: string;
  electronVersion: string;
  chromiumVersion: string;
  v8Version: string;
  nodeVersion: string;
  piSdkVersion: string;
  piSdkDir: string;
  piProjectConfigDir: string;
  piAuthPath: string;
  piModelsPath: string;
  piSettingsPath: string;
  platform: string;
  arch: string;
  osRelease: string;
  osType: string;
  osVersion: string;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
  streamIndex: number;
}

export interface ToolInputDelta {
  index: number;
  toolId?: string;
  delta: string;
}

export interface ContentBlockStop {
  index: number;
  toolId?: string;
}

export interface ToolResultStart {
  toolUseId: string;
  content: string;
  isError: boolean;
}

export interface ToolResultDelta {
  toolUseId: string;
  delta: string;
}

export interface ToolResultComplete {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export interface ThinkingStart {
  index: number;
}

export interface ThinkingChunk {
  index: number;
  delta: string;
}

export interface AgentRunSingleAgentConfig {
  systemPrompt: string;
  allowedTools?: string[];
  model?: 'smart' | 'deep' | 'fast';
  outputFormat?: {
    type: 'json_schema';
    schema: Record<string, unknown>;
  };
}

export interface AgentRunSingleAgentSuccessResponse {
  success: true;
  response: string;
  structuredOutput?: unknown;
}

export interface AgentRunSingleAgentErrorResponse {
  success: false;
  error: string;
}

// ============================================================================
// Update Types
// ============================================================================

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

export interface UpdateStatus {
  checking: boolean;
  updateAvailable: boolean;
  downloading: boolean;
  downloadProgress: number;
  readyToInstall: boolean;
  error: string | null;
  updateInfo: UpdateInfo | null;
  lastCheckComplete: boolean;
}

// ============================================================================
// Conversation Types
// ============================================================================

export interface Conversation {
  id: string;
  title: string;
  messages: string;
  createdAt: number;
  updatedAt: number;
  sessionId?: string | null;
  projectPath?: string | null;
}

export interface ConversationListResponse {
  success: boolean;
  conversations?: Conversation[];
  error?: string;
}

export interface ConversationGetResponse {
  success: boolean;
  conversation?: Conversation;
  error?: string;
}

export interface ConversationCreateResponse {
  success: boolean;
  conversation?: Conversation;
  error?: string;
}

export interface ConversationUpdateResponse {
  success: boolean;
  error?: string;
}

export interface ConversationDeleteResponse {
  success: boolean;
  error?: string;
}

export interface DatabaseStatus {
  connected: boolean;
  type: 'sqlite' | null;
  path: string | null;
}

export interface ConversationDbStatusResponse {
  success: boolean;
  status?: DatabaseStatus;
  error?: string;
}

export interface DatabaseStats {
  conversationCount: number;
  fileSizeBytes: number;
  oldestConversation: number | null;
  newestConversation: number | null;
  path: string;
}

export interface ConversationDbStatsResponse {
  success: boolean;
  stats?: DatabaseStats;
  error?: string;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  title: string;
  projectPath: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectResponse {
  success: boolean;
  project?: Project;
  error?: string;
}

export interface ProjectListResponse {
  success: boolean;
  projects: Project[];
  error?: string;
}

// ============================================================================
// Filesystem Types
// ============================================================================

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export interface FileSystemResponse {
  success: boolean;
  entries?: FileNode[];
  content?: string;
  error?: string;
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  relativePath: string;
}

// ============================================================================
// DevServer Types
// ============================================================================

export interface DevServerStatus {
  running: boolean;
  url: string | null;
  port: number | null;
  projectType: string | null;
  error: string | null;
}

// ============================================================================
// Config Types
// ============================================================================

export type ConfigSource = 'default' | 'project' | 'env';

export interface AppSettingsPayload {
  promptAppend?: string | null;
  starterPrompt?: string | null;
  defaults?: {
    depth?: number | null;
    limit?: number | null;
  };
  custom?: Record<string, unknown>;
}

export interface AppSettingsResponse {
  settings: AppSettingsPayload;
  success?: boolean;
  error?: string;
}

export interface SkillStatusResponse {
  requested: string[];
  available: string[];
  missing: string[];
}

export interface PiModelReference {
  provider: string;
  modelId: string;
}

export interface PiModelSummary {
  provider: string;
  id: string;
  name: string;
  reasoning: boolean;
  input: string[];
  contextWindow: number;
  maxTokens: number;
  available: boolean;
}

export interface PiProviderSummary {
  id: string;
  name: string;
  authConfigured: boolean;
  authSource?: string;
  authLabel?: string;
  supportsOAuth: boolean;
  usesCallbackServer?: boolean;
  modelCount: number;
  availableModelCount: number;
  models: PiModelSummary[];
}

export interface PiModelsState {
  paths: {
    sdkDir: string;
    authPath: string;
    projectConfigDir: string;
    modelsPath: string;
    settingsPath: string;
  };
  providers: PiProviderSummary[];
  selected: Partial<Record<ChatModelPreference, PiModelReference>>;
  registryError: string | null;
}

export interface PiModelsMutationResponse {
  success: boolean;
  state?: PiModelsState;
  error?: string;
}

export interface PiOAuthPromptRendererRequest {
  requestId: string;
  provider: string;
  type: 'prompt' | 'manual-code';
  message: string;
  allowEmpty?: boolean;
}

export interface ConfigStatusResponse {
  hasProjectConfig: boolean;
  projectConfigPath: string | null;
  projectConfigDir: string | null;
}

export interface MergedConfigResponse {
  config: {
    thinkingLevel?: string;
    systemPromptAppend?: string;
    chatModelPreference?: string;
    debugMode?: boolean;
  };
  sources: Record<string, ConfigSource>;
}

// ============================================================================
// Bridge Sub-Types
// ============================================================================

export interface AgentBridge {
  sendMessage: (appId: string, payload: SendMessagePayload) => Promise<ChatResponse>;
  runConversation: (
    appId: string,
    conversation: unknown
  ) => Promise<{ success: boolean; error?: string }>;
  stopMessage: (conversationId?: string | null) => Promise<{ success: boolean; error?: string }>;
  resetSession: (
    appId?: string | null,
    resumeSessionId?: string | null,
    conversationId?: string | null
  ) => Promise<{ success: boolean; error?: string }>;
  getModelPreference: () => Promise<GetChatModelPreferenceResponse>;
  setModelPreference: (preference: ChatModelPreference) => Promise<SetChatModelPreferenceResponse>;
  getPlanMode: () => Promise<{ enabled: boolean }>;
  setPlanMode: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
  getSessionState: (conversationId: string) => Promise<{
    exists: boolean;
    isResponding: boolean;
    sessionId: string | null;
  }>;
  runSingleAgent: (
    appId: string,
    config: AgentRunSingleAgentConfig,
    userPrompt: string
  ) => Promise<AgentRunSingleAgentSuccessResponse | AgentRunSingleAgentErrorResponse>;
  onMessageChunk: (appId: string, callback: (chunk: string) => void) => () => void;
  onThinkingStart: (appId: string, callback: (data: ThinkingStart) => void) => () => void;
  onThinkingChunk: (appId: string, callback: (data: ThinkingChunk) => void) => () => void;
  onMessageComplete: (appId: string, callback: () => void) => () => void;
  onMessageStopped: (appId: string, callback: () => void) => () => void;
  onMessageError: (appId: string, callback: (error: string) => void) => () => void;
  onDebugMessage: (appId: string, callback: (message: string) => void) => () => void;
  onToolUseStart: (appId: string, callback: (tool: ToolUse) => void) => () => void;
  onToolInputDelta: (appId: string, callback: (data: ToolInputDelta) => void) => () => void;
  onContentBlockStop: (appId: string, callback: (data: ContentBlockStop) => void) => () => void;
  onToolResultStart: (appId: string, callback: (data: ToolResultStart) => void) => () => void;
  onToolResultDelta: (appId: string, callback: (data: ToolResultDelta) => void) => () => void;
  onToolResultComplete: (appId: string, callback: (data: ToolResultComplete) => void) => () => void;
  onSessionUpdated: (
    appId: string,
    callback: (data: { sessionId: string; resumed: boolean }) => void
  ) => () => void;
  onContextWindowUpdate: (
    appId: string,
    callback: (data: {
      model: string;
      provider?: string;
      modelId?: string;
      thinkingLevel?: string;
      contextWindow: number;
      tokensUsed: number;
      contextPercent?: number | null;
      totalInputTokens?: number;
      totalOutputTokens?: number;
      totalTokens?: number;
      cost?: number;
    }) => void
  ) => () => void;
}

export interface ConfigBridge {
  getWorkspaceDir: () => Promise<WorkspaceResponse>;
  getAppPath: () => Promise<AppPathResponse>;
  setWorkspaceDir: (workspaceDir: string) => Promise<SetWorkspaceResponse>;
  selectWorkspaceDir: () => Promise<{ success: boolean; canceled?: boolean; path?: string }>;
  getConfigStatus: () => Promise<ConfigStatusResponse>;
  initProjectConfig: () => Promise<{ success: boolean; projectDir?: string; error?: string }>;
  getMergedConfig: () => Promise<MergedConfigResponse>;
  getDebugMode: () => Promise<{ debugMode: boolean; source: ConfigSource }>;
  setDebugMode: (
    debugMode: boolean
  ) => Promise<{ success: boolean; source?: ConfigSource; error?: string }>;
  getFloatingNav: () => Promise<{ enabled: boolean; source: ConfigSource }>;
  setFloatingNav: (
    enabled: boolean
  ) => Promise<{ success: boolean; source?: ConfigSource; error?: string }>;
  getPathInfo: () => Promise<PathInfoResponse>;
  getEnvVars: () => Promise<EnvVarsResponse>;
  getDiagnosticMetadata: () => Promise<DiagnosticMetadataResponse>;
  getThinkingLevel: () => Promise<{
    level: string;
    tokens: number;
    label: string;
    description: string;
    source: ConfigSource;
  }>;
  setThinkingLevel: (level: string) => Promise<{
    success: boolean;
    level?: string;
    tokens?: number;
    label?: string;
    description?: string;
    source?: ConfigSource;
    error?: string;
  }>;
  getThinkingPresets: () => Promise<{
    presets: Record<string, { tokens: number; label: string; description: string }>;
    levels: string[];
    current: string;
  }>;
  getSystemPromptAppend: () => Promise<{
    text: string;
    isDefault: boolean;
    source: ConfigSource;
  }>;
  setSystemPromptAppend: (text: string | null) => Promise<{
    success: boolean;
    text: string;
    isDefault: boolean;
    source?: ConfigSource;
    error?: string;
  }>;
  getDefaultSystemPromptAppend: () => Promise<{ text: string }>;
  getPiModelsState: () => Promise<PiModelsState>;
  setPiProviderApiKey: (
    provider: string,
    apiKey: string | null
  ) => Promise<PiModelsMutationResponse>;
  clearPiProviderAuth: (provider: string) => Promise<PiModelsMutationResponse>;
  loginPiOAuthProvider: (provider: string) => Promise<PiModelsMutationResponse>;
  selectPiModelPreference: (
    preference: ChatModelPreference,
    provider: string,
    modelId: string
  ) => Promise<PiModelsMutationResponse>;
  onPiOAuthPrompt: (callback: (request: PiOAuthPromptRendererRequest) => void) => () => void;
  respondPiOAuthPrompt: (
    requestId: string,
    response: { value?: string; cancelled?: boolean }
  ) => void;
  getAppSettings: (appId: string) => Promise<AppSettingsResponse>;
  setAppSettings: (appId: string, settings: AppSettingsPayload) => Promise<AppSettingsResponse>;
  getSkillStatus: (appId: string) => Promise<SkillStatusResponse>;
  onWorkspaceChanged: (callback: (data: { workspaceDir: string }) => void) => () => void;
  onFloatingNavChanged: (callback: (data: { enabled: boolean }) => void) => () => void;
}

export interface ShellBridge {
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  execute: (
    command: string,
    options?: { cwd?: string; timeout?: number }
  ) => Promise<ShellExecuteResponse>;
}

export interface ConversationBridge {
  list: () => Promise<ConversationListResponse>;
  create: (messages: unknown[], sessionId?: string | null) => Promise<ConversationCreateResponse>;
  get: (id: string) => Promise<ConversationGetResponse>;
  update: (
    id: string,
    title?: string,
    messages?: unknown[],
    sessionId?: string | null
  ) => Promise<ConversationUpdateResponse>;
  delete: (id: string) => Promise<ConversationDeleteResponse>;
  dbStatus: () => Promise<ConversationDbStatusResponse>;
  dbStats: () => Promise<ConversationDbStatsResponse>;
  listByProject: (projectPath: string) => Promise<ConversationListResponse>;
  createForProject: (title?: string) => Promise<ConversationCreateResponse>;
  switch: (conversationId: string) => Promise<ConversationGetResponse>;
}

export interface UpdateBridge {
  getStatus: () => Promise<UpdateStatus>;
  check: () => Promise<{ success: boolean }>;
  download: () => Promise<{ success: boolean }>;
  install: () => Promise<{ success: boolean }>;
  onStatusChanged: (callback: (status: UpdateStatus) => void) => () => void;
}

export interface ProjectBridge {
  create: (projectName: string) => Promise<ProjectResponse>;
  list: (limit?: number) => Promise<ProjectListResponse>;
  switch: (projectId: string) => Promise<ProjectResponse & { conversation?: Conversation }>;
  current: () => Promise<ProjectResponse>;
  close: () => Promise<{ success: boolean; error?: string }>;
}

export interface FilesystemBridge {
  readDirectory: (dirPath: string) => Promise<FileSystemResponse>;
  readFile: (filePath: string) => Promise<FileSystemResponse>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  watch: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
  unwatch: () => Promise<{ success: boolean; error?: string }>;
  onFileChange: (callback: (event: FileChangeEvent) => void) => () => void;
}

export interface DevserverBridge {
  start: (
    projectPath?: string
  ) => Promise<{ success: boolean; url?: string; port?: number; error?: string }>;
  stop: () => Promise<{ success: boolean; error?: string }>;
  restart: () => Promise<{ success: boolean; url?: string; port?: number; error?: string }>;
  getStatus: () => Promise<DevServerStatus>;
  detectProject: (projectPath: string) => Promise<{ projectType: string | null }>;
  onStatusChanged: (callback: (status: DevServerStatus) => void) => () => void;
}

export interface AppsBridge {
  getActiveApps: () => Promise<
    Array<{
      appId: string;
      name: string;
      listeningChannels: string[];
      registeredAt: number;
    }>
  >;
  registerListener: (appId: string, channels?: string[]) => Promise<{ success: boolean }>;
  unregisterListener: (appId: string) => Promise<{ success: boolean }>;
  sendToApp: (
    fromAppId: string,
    toAppId: string,
    channel: string,
    payload: unknown
  ) => Promise<{
    success: boolean;
    delivered: boolean;
    recipientAppId: string;
    error?: string;
  }>;
  broadcast: (
    fromAppId: string,
    channel: string,
    payload: unknown
  ) => Promise<{
    success: boolean;
    deliveredTo: string[];
  }>;
  sendRequest: <T = unknown>(
    fromAppId: string,
    toAppId: string,
    channel: string,
    payload: unknown,
    timeout?: number
  ) => Promise<{
    success: boolean;
    payload: T | null;
    error?: string;
    correlationId: string;
  }>;
  sendResponse: (
    fromAppId: string,
    toAppId: string,
    channel: string,
    correlationId: string,
    payload: unknown,
    success?: boolean,
    error?: string
  ) => Promise<{ success: boolean }>;
  onAppMessage: (
    appId: string,
    callback: (message: {
      id: string;
      fromAppId: string;
      toAppId: string;
      type: 'message' | 'request' | 'broadcast';
      channel: string;
      payload: unknown;
      timestamp: number;
      correlationId?: string;
    }) => void
  ) => () => void;
  emit: (
    appId: string,
    event: unknown
  ) => Promise<{
    success: boolean;
    deliveredTo: string[];
  }>;
  subscribe: (appId: string, pattern: string) => Promise<{ success: boolean }>;
  unsubscribe: (appId: string, pattern: string) => Promise<{ success: boolean }>;
  unsubscribeAll: (appId: string) => Promise<{ success: boolean }>;
  getSubscriptions: (
    appId: string
  ) => Promise<Array<{ appId: string; pattern: string; subscribedAt: number }>>;
  onEvent: (
    appId: string,
    callback: (event: {
      id: string;
      type: 'event';
      eventType: string;
      sourceAppId: string;
      payload: unknown;
      timestamp: number;
    }) => void
  ) => () => void;
  queryAgentOutput: (dataKey: string) => Promise<{
    output: string | null;
  }>;
}

export interface AiNewsTweetBridge {
  startPipeline: (options?: {
    stageModels?: {
      research: 'fast' | 'smart' | 'deep';
      analysis: 'fast' | 'smart' | 'deep';
      writer: 'fast' | 'smart' | 'deep';
    };
  }) => Promise<{ success: boolean; runId?: string; error?: string }>;
  getPipelineStatus: (runId: string) => Promise<{
    success: boolean;
    state?: unknown; // AiNewsTweetPipelineState
    error?: string;
  }>;
}

export interface ExportBridge {
  getApps: () => Promise<{
    apps: Array<{ id: string; name: string; description?: string; skills: string[] }>;
    error?: string;
  }>;
  preview: (config: {
    projectName: string;
    outputDir: string;
    selectedAppIds: string[];
    includeReadme?: boolean;
  }) => Promise<{
    success: boolean;
    preview?: {
      files: Array<{ path: string; type: string; size: number }>;
      totalSize: number;
      skills: string[];
    };
    error?: string;
  }>;
  browseDirectory: () => Promise<{
    path?: string;
    cancelled: boolean;
  }>;
  start: (config: {
    projectName: string;
    outputDir: string;
    selectedAppIds: string[];
    includeReadme?: boolean;
  }) => Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
  }>;
  cancel: (jobId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  onProgress: (
    callback: (progress: {
      jobId: string;
      status: string;
      current: number;
      total: number;
      currentFile?: string;
      error?: string;
      outputPath?: string;
      zipPath?: string;
    }) => void
  ) => () => void;
}

// ============================================================================
// Chat Bridge (legacy, simpler than agent - no appId filtering)
// ============================================================================

export interface ChatBridge {
  sendMessage: (payload: SendMessagePayload) => Promise<unknown>;
  stopMessage: () => Promise<{ success: boolean; error?: string }>;
  resetSession: (resumeSessionId?: string | null) => Promise<{ success: boolean; error?: string }>;
  getModelPreference: () => Promise<unknown>;
  setModelPreference: (preference: ChatModelPreference) => Promise<unknown>;
  onMessageChunk: (callback: (chunk: string) => void) => () => void;
  onThinkingStart: (callback: (data: { index: number }) => void) => () => void;
  onThinkingChunk: (callback: (data: { index: number; delta: string }) => void) => () => void;
  onMessageComplete: (callback: () => void) => () => void;
  onMessageStopped: (callback: () => void) => () => void;
  onMessageError: (callback: (error: string) => void) => () => void;
  onDebugMessage: (callback: (message: string) => void) => () => void;
  onToolUseStart: (
    callback: (tool: {
      id: string;
      name: string;
      input: Record<string, unknown>;
      streamIndex: number;
    }) => void
  ) => () => void;
  onToolInputDelta: (callback: (data: { index: number; delta: string }) => void) => () => void;
  onContentBlockStop: (callback: (data: { index: number }) => void) => () => void;
  onToolResultStart: (
    callback: (data: { toolUseId: string; content: string; isError: boolean }) => void
  ) => () => void;
  onToolResultDelta: (callback: (data: { toolUseId: string; delta: string }) => void) => () => void;
  onToolResultComplete: (
    callback: (data: { toolUseId: string; content: string; isError?: boolean }) => void
  ) => () => void;
  onSessionUpdated: (
    callback: (data: { sessionId: string; resumed: boolean }) => void
  ) => () => void;
}

// ============================================================================
// Main ElectronAPI Type
// ============================================================================

export interface ElectronAPI {
  onNavigate: (callback: (view: string) => void) => () => void;
  agent: AgentBridge;
  chat: ChatBridge;
  config: ConfigBridge;
  shell: ShellBridge;
  conversation: ConversationBridge;
  update: UpdateBridge;
  project: ProjectBridge;
  filesystem: FilesystemBridge;
  devserver: DevserverBridge;
  apps: AppsBridge;
  aiNewsTweet: AiNewsTweetBridge;
  export: ExportBridge;
}
