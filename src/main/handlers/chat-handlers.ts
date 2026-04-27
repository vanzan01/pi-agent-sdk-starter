import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join, relative } from 'path';
import { ipcMain, type BrowserWindow } from 'electron';

import type {
  ChatModelPreference,
  SavedAttachmentInfo,
  SDKUserMessage,
  SendMessagePayload,
  SerializedAttachmentPayload
} from '../../shared/core';
import { ATTACHMENTS_DIR_NAME, MAX_ATTACHMENT_BYTES } from '../../shared/core';
import { runAgentConversation, runAgentMessage } from '../core/agent-runner';
import { buildAppContext } from '../core/app-context';
import type { AgentConversation } from '../core/types';
import { getWorkspaceDir } from '../lib/config';
import {
  getCurrentModelPreference,
  interruptCurrentResponse,
  resetSession,
  runSingleAgentCall,
  setChatModelPreference
} from '../lib/pi-session';

export function registerChatHandlers(getMainWindow: () => BrowserWindow | null): void {
  const sendMessage = async (
    appId: string | null | undefined,
    payload: SendMessagePayload
  ): Promise<
    | { success: true; attachments: SavedAttachmentInfo[] }
    | { success: false; error: string; attachments?: SavedAttachmentInfo[] }
  > => {
    const normalizedPayload = payload ?? { text: '', attachments: [] };
    const text = normalizedPayload.text?.trim() ?? '';
    const attachments = normalizedPayload.attachments ?? [];

    if (!text && attachments.length === 0) {
      return { success: false, error: 'Please enter a message or attach a file before sending.' };
    }

    try {
      const savedAttachments = await persistAttachments(attachments);

      const userMessage = buildUserMessage(text, savedAttachments);

      const result = await runAgentMessage(appId, userMessage, getMainWindow());
      if (result.success) {
        return { success: true, attachments: savedAttachments };
      }
      return {
        success: false,
        error: result.error ?? 'Failed to send',
        attachments: savedAttachments
      };
    } catch (error) {
      console.error('Error queueing message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  };

  const resetAgentSession = async (
    _appId?: string | null,
    resumeSessionId?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await resetSession(resumeSessionId);
      return { success: true };
    } catch (error) {
      console.error('Error resetting session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  };

  const stopMessage = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const mainWindow = getMainWindow();
      const wasInterrupted = await interruptCurrentResponse(mainWindow);
      if (!wasInterrupted) {
        return { success: false, error: 'No active response to stop.' };
      }
      return { success: true };
    } catch (error) {
      console.error('Error stopping response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  };

  const getModelPreference = async () => {
    return {
      preference: getCurrentModelPreference()
    };
  };

  const setModelPreferenceHandler = async (
    _event: unknown,
    preference: ChatModelPreference
  ): Promise<{ success: boolean; error?: string; preference: ChatModelPreference }> => {
    try {
      await setChatModelPreference(preference);
      return { success: true, preference: getCurrentModelPreference() };
    } catch (error) {
      console.error('Error updating model preference:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: errorMessage, preference: getCurrentModelPreference() };
    }
  };

  ipcMain.handle('agent:send-message', async (_event, appId: string, payload: SendMessagePayload) =>
    sendMessage(appId, payload)
  );

  // Type for dynamic conversation payload from IPC
  interface ConversationPayload {
    attachments?: SerializedAttachmentPayload[];
    messages?: Array<{
      type?: string;
      message?: {
        content?: Array<{ type: string; text?: string }>;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }

  ipcMain.handle('agent:run-conversation', async (_event, appId: string, conversation: unknown) => {
    // If payload includes attachments, persist them and inject into messages
    const conv = (conversation as ConversationPayload) ?? {};
    const attachments = Array.isArray(conv.attachments) ? conv.attachments : [];
    let saved: SavedAttachmentInfo[] = [];
    if (attachments.length > 0) {
      saved = await persistAttachments(attachments);
      const attachmentInstructions = saved.map((attachment) => {
        const { readTarget, displayPath } = resolveAttachmentPaths(attachment);
        return {
          type: 'text',
          text: `Attachment "${attachment.name}" is available at ${displayPath}. Please run Read("${readTarget}") when you need to inspect it.`
        };
      });
      if (Array.isArray(conv.messages)) {
        conv.messages = conv.messages.map((m) => {
          if (m.type === 'user' && m.message?.content) {
            return {
              ...m,
              message: {
                ...m.message,
                content: [...m.message.content, ...attachmentInstructions]
              }
            };
          }
          return m;
        });
      }
    }
    const result = await runAgentConversation(appId, conv as AgentConversation, getMainWindow());
    return attachments.length > 0 ? { ...result, attachments: saved } : result;
  });

  ipcMain.handle(
    'agent:reset-session',
    async (_event, _appId: string, resumeSessionId?: string | null) =>
      resetAgentSession(resumeSessionId)
  );

  ipcMain.handle('agent:stop-message', async () => stopMessage());

  ipcMain.handle('agent:get-model-preference', getModelPreference);

  ipcMain.handle('agent:set-model-preference', setModelPreferenceHandler);

  // Run a single agent call and return complete response (for sequential orchestration)
  ipcMain.handle(
    'agent:run-single-agent',
    async (
      _event,
      appId: string | null | undefined,
      config: {
        systemPrompt: string;
        allowedTools?: string[];
        model?: 'smart' | 'deep' | 'fast';
      },
      userPrompt: string
    ) => {
      const effectiveAppId = appId ?? 'chat';
      buildAppContext(effectiveAppId);
      return runSingleAgentCall(getMainWindow(), effectiveAppId, config, userPrompt);
    }
  );
}

/**
 * Resolves the read target and display path for an attachment.
 * Returns paths suitable for the agent to read the file.
 */
function resolveAttachmentPaths(attachment: SavedAttachmentInfo): {
  readTarget: string;
  displayPath: string;
} {
  const relativeSegment = attachment.relativePath;
  const isRelativeWithinWorkspace = relativeSegment && !relativeSegment.startsWith('..');

  if (!isRelativeWithinWorkspace) {
    return {
      readTarget: attachment.savedPath,
      displayPath: attachment.savedPath
    };
  }

  // Ensure path starts with ./ for relative paths
  const readTarget = relativeSegment.startsWith('.') ? relativeSegment : `./${relativeSegment}`;

  return {
    readTarget,
    displayPath: readTarget
  };
}

function sanitizeFileName(name: string): string {
  const withoutIllegal = name.replace(/[<>:"/\\|?*]/g, '_');
  const withoutControlChars = Array.from(withoutIllegal)
    .map((char) => (char.charCodeAt(0) < 32 ? '_' : char))
    .join('');
  return withoutControlChars.replace(/\s+/g, ' ').trim() || 'attachment';
}

async function persistAttachments(
  attachments: SerializedAttachmentPayload[]
): Promise<SavedAttachmentInfo[]> {
  if (attachments.length === 0) {
    return [];
  }

  const workspaceDir = getWorkspaceDir();
  const destinationDir = join(workspaceDir, ATTACHMENTS_DIR_NAME);
  await mkdir(destinationDir, { recursive: true });

  const saves: SavedAttachmentInfo[] = [];

  for (const attachment of attachments) {
    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      throw new Error(
        `Attachment "${attachment.name}" exceeds the ${Math.floor(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB limit.`
      );
    }

    const sanitized = sanitizeFileName(attachment.name);
    const uniqueName = `${Date.now()}-${randomUUID().slice(0, 8)}-${sanitized}`;
    const savedPath = join(destinationDir, uniqueName);

    const buffer =
      attachment.data instanceof Uint8Array ?
        Buffer.from(attachment.data.buffer, attachment.data.byteOffset, attachment.data.byteLength)
      : Buffer.from(attachment.data);

    await writeFile(savedPath, buffer);

    const relativePath = relative(workspaceDir, savedPath);

    saves.push({
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      savedPath,
      relativePath: relativePath.startsWith('..') ? savedPath : relativePath
    });
  }

  return saves;
}

function buildUserMessage(
  text: string,
  attachments: SavedAttachmentInfo[]
): SDKUserMessage['message'] {
  const contentBlocks: { type: 'text'; text: string }[] = [];
  if (text) {
    contentBlocks.push({ type: 'text', text });
  }

  attachments.forEach((attachment) => {
    const { readTarget, displayPath } = resolveAttachmentPaths(attachment);
    const instruction = `Attachment "${attachment.name}" is available at ${displayPath}. Please run Read("${readTarget}") when you need to inspect it.`;
    contentBlocks.push({ type: 'text', text: instruction });
  });

  if (contentBlocks.length === 0) {
    contentBlocks.push({
      type: 'text',
      text: 'User uploaded files without additional context.'
    });
  }

  return {
    role: 'user',
    content: contentBlocks
  };
}
