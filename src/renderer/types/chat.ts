import type { ToolUse } from '@/electron';

export type AgentInput = { description?: string; prompt?: string; subagent_type?: string; model?: string; [key: string]: unknown };
export type BashInput = { command: string; description?: string; timeout?: number; run_in_background?: boolean; [key: string]: unknown };
export type FileReadInput = { file_path: string; path?: string; limit?: number; offset?: number; [key: string]: unknown };
export type FileWriteInput = { file_path: string; path?: string; content?: string; [key: string]: unknown };
export type FileEditInput = { file_path: string; path?: string; old_string?: string; new_string?: string; replace_all?: boolean; [key: string]: unknown };
export type GlobInput = { pattern?: string; path?: string; [key: string]: unknown };
export type GrepInput = { pattern?: string; path?: string; include?: string; [key: string]: unknown };
export type NotebookEditInput = { notebook_path: string; cell_id?: string; new_source?: string; edit_mode?: string; cell_type?: string; [key: string]: unknown };
export type TodoWriteInput = { todos?: Array<{ content?: string; status?: string; priority?: string; id?: string; [key: string]: unknown }>; [key: string]: unknown };
export type WebFetchInput = { url?: string; prompt?: string; [key: string]: unknown };
export type WebSearchInput = { query?: string; allowed_domains?: string[]; blocked_domains?: string[]; [key: string]: unknown };

export type ReadInput = FileReadInput;
export type WriteInput = FileWriteInput;
export type EditInput = FileEditInput;

export type ToolInput =
  | AgentInput
  | BashInput
  | ReadInput
  | WriteInput
  | EditInput
  | GlobInput
  | GrepInput
  | TodoWriteInput
  | WebFetchInput
  | WebSearchInput
  | NotebookEditInput;

export interface ToolUseSimple extends ToolUse {
  inputJson?: string;
  parsedInput?: ToolInput;
  result?: string;
  isLoading?: boolean;
  isError?: boolean;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'thinking';
  text?: string;
  tool?: ToolUseSimple;
  thinking?: string;
  thinkingStartedAt?: number;
  thinkingDurationMs?: number;
  thinkingStreamIndex?: number;
  isComplete?: boolean;
  thinkingTokensUsed?: number;
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  savedPath?: string;
  relativePath?: string;
  previewUrl?: string;
  isImage?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  timestamp: Date;
  attachments?: MessageAttachment[];
}
