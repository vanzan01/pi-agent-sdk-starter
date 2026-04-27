import type { SDKUserMessage } from '../../shared/core';
import type { BrowserWindow } from 'electron';

import {
  getActiveAppId,
  isSessionActive,
  resetSession,
  startStreamingSession,
  waitForSessionReady
} from '../lib/claude-session';
import { getGlmApiKey, getProvider } from '../lib/config';
import { messageQueue } from '../lib/message-queue';
import { buildSystemPromptAppend } from './ai-client';
import { buildAppContext } from './app-context';
import type { AgentConversation, AgentResponse } from './types';

async function validateProvider(): Promise<{ success: boolean; error?: string }> {
  const currentProvider = getProvider();
  if (currentProvider === 'glm') {
    const glmApiKey = getGlmApiKey();
    if (!glmApiKey) {
      return {
        success: false,
        error:
          'Z.AI GLM provider is selected but no API key is configured. Please add your GLM API key in Settings, or switch to Codex provider.'
      };
    }
  }
  return { success: true };
}

async function ensureAppContext(appId: string): Promise<ReturnType<typeof buildAppContext>> {
  // Check if we need to reset BEFORE calling buildAppContext
  // (buildAppContext calls setActiveAppContext, which would change the current appId)
  const currentAppId = getActiveAppId();
  const targetAppId = appId || 'chat';
  if (currentAppId !== targetAppId && isSessionActive()) {
    console.log(`[agent-runner] App switch detected: "${currentAppId}" -> "${targetAppId}", resetting session`);
    await resetSession();
  }

  const ctx = buildAppContext(appId);
  // buildAppContext already calls setActiveAppContext, so no need to call it again
  return ctx;
}

export async function runAgentMessage(
  appId: string | null | undefined,
  userMessage: SDKUserMessage['message'],
  mainWindow: BrowserWindow | null
): Promise<{ success: boolean; error?: string; allowedTools?: string[] }> {
  const providerCheck = await validateProvider();
  if (!providerCheck.success) {
    return providerCheck;
  }

  const ctx = await ensureAppContext(appId || 'chat');

  try {
    startStreamingSession(mainWindow, ctx.allowedTools, undefined, ctx.agents).catch((error) => {
      console.error('Failed to start streaming session:', error);
    });

    await waitForSessionReady();

    if (!isSessionActive()) {
      return { success: false, error: 'Failed to start agent session' };
    }

    await new Promise<void>((resolve) => {
      messageQueue.push({ message: userMessage, resolve });
    });

    return { success: true, allowedTools: ctx.allowedTools };
  } catch (error) {
    console.error('Error sending agent message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

export async function runAgentConversation(
  appId: string,
  conversation: AgentConversation,
  mainWindow: BrowserWindow | null
): Promise<AgentResponse> {
  const providerCheck = await validateProvider();
  if (!providerCheck.success) {
    return { success: false, error: providerCheck.error || 'Provider not ready' };
  }

  const ctx = await ensureAppContext(appId);
  const systemAppend = buildSystemPromptAppend(ctx.systemPrompt, conversation.systemPrompt);

  // Use conversation-level allowedTools if provided, otherwise fall back to app-level
  const effectiveTools =
    conversation.allowedTools !== undefined ? conversation.allowedTools : ctx.allowedTools;

  try {
    // Start streaming session (don't await - it runs until session ends)
    // sessionReadyPromise is created synchronously at the start of startStreamingSession
    // so waitForSessionReady() will have something to wait on
    startStreamingSession(mainWindow, effectiveTools, systemAppend, ctx.agents, conversation.model).catch((error) => {
      console.error('Failed to start streaming session:', error);
    });
    await waitForSessionReady();
    if (!isSessionActive()) {
      return { success: false, error: 'Failed to start agent session' };
    }
    for (const message of conversation.messages) {
      if (message.type === 'user') {
        await new Promise<void>((resolve) => {
          messageQueue.push({ message: message.message, resolve });
        });
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error running agent conversation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}
