/**
 * Electron API Type Declarations
 *
 * This file provides the Window.electron type for the renderer process.
 * All types are imported from the single source of truth in shared/types/electron-api.ts.
 */
import type { ElectronAPI } from '../shared/types/electron-api';

// Re-export commonly used types for renderer code convenience
export type {
  // Response types
  WorkspaceResponse,
  AppPathResponse,
  SetWorkspaceResponse,
  ShellExecuteResponse,
  PathInfoResponse,
  EnvVar,
  EnvVarsResponse,
  DiagnosticMetadataResponse,
  UpdateInfo,
  UpdateStatus,
  Conversation,
  Project,
  ProjectResponse,
  ProjectListResponse,
  FileNode,
  FileSystemResponse,
  FileChangeEvent,
  DevServerStatus,
  ConversationListResponse,
  ConversationGetResponse,
  ConversationCreateResponse,
  ConversationUpdateResponse,
  ConversationDeleteResponse,
  DatabaseStatus,
  ConversationDbStatusResponse,
  DatabaseStats,
  ConversationDbStatsResponse,
  AppSettingsPayload,
  AppSettingsResponse,
  SkillStatusResponse,
  ConfigSource,

  // Tool types
  ToolUse,
  ToolInputDelta,
  ContentBlockStop,
  ToolResultStart,
  ToolResultDelta,
  ToolResultComplete,
  ThinkingStart,
  ThinkingChunk,

  // Model config types
  ModelConfig,
  ModelConfigResponse,
  SetModelConfigResponse,
  ConfigStatusResponse,
  MergedConfigResponse,

  // Agent types
  AgentRunSingleAgentConfig,
  AgentRunSingleAgentSuccessResponse,
  AgentRunSingleAgentErrorResponse,

  // Bridge interfaces
  AgentBridge,
  ConfigBridge,
  ShellBridge,
  ConversationBridge,
  UpdateBridge,
  ProjectBridge,
  FilesystemBridge,
  DevserverBridge,
  AppsBridge,
  AiNewsTweetBridge,
  ExportBridge,
  ChatBridge,

  // Main API type
  ElectronAPI
} from '../shared/types/electron-api';

export type ChatResponse = import('../shared/core').SendMessageResponse;

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
