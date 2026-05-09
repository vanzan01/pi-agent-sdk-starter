import { getModel } from '@earendil-works/pi-ai';
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  type AgentSession
} from '@earendil-works/pi-coding-agent';
import { BrowserWindow } from 'electron';

import type { AgentDefinition } from '../../shared/apps';
import type { ThinkingLevel } from '../../shared/constants';
import type { ChatModelPreference, SDKUserMessageContent } from '../../shared/core';
import { emitEventFromMain } from '../handlers/app-messaging-handlers';
import {
  clearProcessedMarkers,
  isMarkerProcessed,
  markAsProcessed,
  storeAgentOutput
} from './agent-output-store';
import {
  getChatModelPreferenceSetting,
  getDebugMode,
  getPiModelPreference,
  getSystemPromptAppend,
  getThinkingLevel,
  getWorkspaceDir,
  setChatModelPreferenceSetting,
  setConfigValue,
  waitForWorkspaceReady
} from './config';
import {
  abortGenerator,
  clearMessageQueue,
  messageQueue,
  regenerateSessionId,
  resetAbortFlag,
  setSessionId
} from './message-queue';
import { normalizePiSdkError } from './pi-error-normalizer';
import {
  createEmbeddedPiAuthStorage,
  createEmbeddedPiModelRegistry,
  createEmbeddedPiSettingsManager,
  ensurePiRuntimePaths
} from './pi-runtime';

const FAST_MODEL_ID = 'gpt-5.4';
const SMART_MODEL_ID = 'gpt-5.4';
const DEEP_MODEL_ID = 'gpt-5.5';
const DEFAULT_PROVIDER = 'openai-codex';

const MODEL_BY_PREFERENCE: Record<ChatModelPreference, string> = {
  fast: FAST_MODEL_ID,
  smart: SMART_MODEL_ID,
  deep: DEEP_MODEL_ID
};

type AgentEventChannel =
  | 'message-chunk'
  | 'thinking-start'
  | 'thinking-chunk'
  | 'tool-use-start'
  | 'tool-input-delta'
  | 'content-block-stop'
  | 'tool-result-start'
  | 'tool-result-delta'
  | 'tool-result-complete'
  | 'message-complete'
  | 'message-stopped'
  | 'message-error'
  | 'session-updated'
  | 'debug-message'
  | 'context-window-update';

let currentModelPreference: ChatModelPreference | null = null;
let activeAppId = 'chat';
let activeAppSystemPrompt: string | null = null;
let activeSystemPromptAppend: string | null = null;
let activeAllowedTools: string[] | undefined = undefined;
let querySession: AgentSession | null = null;
let unsubscribeSession: (() => void) | null = null;
let isProcessing = false;
let shouldAbortSession = false;
let sessionTerminationPromise: Promise<void> | null = null;
let isInterruptingResponse = false;
let _pendingResumeSessionId: string | null = null;
let sessionReadyPromise: Promise<void> | null = null;
let resolveSessionReady: (() => void) | null = null;
let transcriptAccumulator = '';
let sessionAppId = 'chat';
let currentSessionToken = 0;
let chunkDebugCount = 0;
let activePromptPromise: Promise<void> | null = null;

const AGENT_MARKER_REGEX = /<<<([a-zA-Z0-9_-]+)>>>([\s\S]*?)<<<end-\1>>>/g;

function ensureModelPreference(): ChatModelPreference {
  if (currentModelPreference === null) {
    currentModelPreference = getChatModelPreferenceSetting();
  }
  return currentModelPreference;
}

export function setActiveAppContext(appId: string, systemPrompt: string | null | undefined): void {
  const prevAppId = activeAppId;
  activeAppId = appId || 'chat';
  activeAppSystemPrompt = systemPrompt ?? null;
  console.log(`[Main] setActiveAppContext: "${prevAppId}" -> "${activeAppId}"`);
}

export function getActiveAppId(): string {
  return activeAppId;
}

export function getActiveSystemPromptAppend(): string | null {
  return activeSystemPromptAppend;
}

function sendAgentEvent(
  mainWindow: BrowserWindow | null,
  channel: AgentEventChannel,
  payload?: unknown,
  appIdOverride?: string
): void {
  const targetWindow =
    mainWindow && !mainWindow.isDestroyed() ?
      mainWindow
    : (BrowserWindow.getAllWindows()[0] ?? null);
  if (!targetWindow || targetWindow.isDestroyed()) return;

  const effectiveAppId = appIdOverride ?? sessionAppId;
  const enrichedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload) ?
      { appId: effectiveAppId, ...(payload as Record<string, unknown>) }
    : { appId: effectiveAppId, data: payload };

  if (channel === 'message-chunk') {
    chunkDebugCount++;
    if (chunkDebugCount <= 5 || chunkDebugCount % 100 === 0) {
      console.log(`[Main] Sending chunk #${chunkDebugCount} with appId="${effectiveAppId}"`);
    }
  }

  targetWindow.webContents.send(`agent:${channel}`, enrichedPayload);
}

function processTranscriptForAgentOutputs(appId: string, mainWindow: BrowserWindow | null): void {
  AGENT_MARKER_REGEX.lastIndex = 0;
  let match;
  while ((match = AGENT_MARKER_REGEX.exec(transcriptAccumulator)) !== null) {
    const [fullMatch, agentId, content] = match;
    const markerHash = `${appId}:${agentId}:${fullMatch.length}`;
    if (isMarkerProcessed(markerHash)) continue;
    markAsProcessed(markerHash);
    const dataKey = storeAgentOutput(appId, agentId, content.trim());
    emitEventFromMain(mainWindow, {
      type: 'agent:step-complete',
      sourceAppId: 'core',
      timestamp: Date.now(),
      appId,
      agentId,
      dataKey
    });
  }
}

function getModelIdForPreference(preference?: ChatModelPreference): string {
  const pref = preference ?? ensureModelPreference();
  return MODEL_BY_PREFERENCE[pref] ?? FAST_MODEL_ID;
}

type PiThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

function mapThinkingLevel(level: ThinkingLevel): PiThinkingLevel {
  return level;
}

function messageToPrompt(message: SDKUserMessageContent | string): string {
  if (typeof message === 'string') return message;
  if (!message?.content) return '';
  return message.content
    .map((block) => (block.type === 'text' && typeof block.text === 'string' ? block.text : ''))
    .filter(Boolean)
    .join('\n\n');
}

function buildDefaultSystemPromptAppend(): string {
  return [getSystemPromptAppend(), activeAppSystemPrompt]
    .filter((text) => typeof text === 'string' && text.trim().length > 0)
    .join('\n\n');
}

function buildIdentityGuard(provider: string, modelId: string): string {
  return [
    'Identity and routing:',
    '- You are running inside the Pi SDK Starter Kit.',
    `- The configured provider/model for this session is ${provider}/${modelId}.`,
    '- Do not claim to be any provider or model family other than the configured provider/model.',
    '- If asked what model you are, report the configured provider/model above and mention that model self-identification can be unreliable.'
  ].join('\n');
}

async function createPiSession(
  systemPrompt: string,
  preference: ChatModelPreference
): Promise<AgentSession> {
  const cwd = getWorkspaceDir();
  const piPaths = ensurePiRuntimePaths(cwd);
  const authStorage = createEmbeddedPiAuthStorage();
  const selectedPiModel = getPiModelPreference(preference);
  const provider = selectedPiModel?.provider ?? DEFAULT_PROVIDER;
  const fallbackModelId = getModelIdForPreference(preference);
  const rawModelId = selectedPiModel?.modelId ?? fallbackModelId;
  const effectiveModelId = rawModelId;

  const modelRegistry = createEmbeddedPiModelRegistry(authStorage);
  const model =
    modelRegistry.find(provider as never, effectiveModelId as never) ??
    getModel(provider as never, effectiveModelId as never);
  if (!model) {
    throw new Error(`Pi SDK model not found: ${provider}/${effectiveModelId}`);
  }

  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir: piPaths.projectConfigDir,
    systemPromptOverride: () =>
      [
        buildIdentityGuard(provider, effectiveModelId),
        systemPrompt || 'You are a helpful coding assistant powered by Pi SDK.'
      ]
        .filter(Boolean)
        .join('\n\n')
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    cwd,
    model,
    thinkingLevel: mapThinkingLevel(getThinkingLevel()),
    authStorage,
    modelRegistry,
    resourceLoader,
    settingsManager: createEmbeddedPiSettingsManager(cwd),
    sessionManager: SessionManager.inMemory()
  });

  return session;
}

function emitContextWindowUpdate(
  session: AgentSession,
  mainWindow: BrowserWindow | null,
  appIdSnapshot: string
): void {
  const model = session.model;
  const usage = session.getContextUsage();
  const contextWindow = usage?.contextWindow ?? model?.contextWindow ?? 0;
  if (!contextWindow) return;

  const stats = session.getSessionStats();
  sendAgentEvent(
    mainWindow,
    'context-window-update',
    {
      model: model ? `${model.provider}/${model.id}` : 'unknown',
      provider: model?.provider ?? 'unknown',
      modelId: model?.id ?? 'unknown',
      thinkingLevel: session.thinkingLevel,
      contextWindow,
      tokensUsed: usage?.tokens ?? 0,
      contextPercent: usage?.percent ?? null,
      totalInputTokens: stats.tokens.input,
      totalOutputTokens: stats.tokens.output,
      totalTokens: stats.tokens.total,
      cost: stats.cost
    },
    appIdSnapshot
  );
}

function bindSessionEvents(
  session: AgentSession,
  mainWindow: BrowserWindow | null,
  appIdSnapshot: string
): () => void {
  setSessionId(session.sessionId);
  sendAgentEvent(
    mainWindow,
    'session-updated',
    { sessionId: session.sessionId, resumed: false },
    appIdSnapshot
  );
  emitContextWindowUpdate(session, mainWindow, appIdSnapshot);

  return session.subscribe((event: Record<string, unknown>) => {
    if (getDebugMode()) {
      sendAgentEvent(
        mainWindow,
        'debug-message',
        { message: `[pi-sdk] ${event.type}` },
        appIdSnapshot
      );
    }

    switch (event.type) {
      case 'message_update': {
        const assistantEvent = event.assistantMessageEvent as
          | { type?: string; delta?: string }
          | undefined;
        if (assistantEvent?.type === 'text_delta') {
          const delta = assistantEvent.delta ?? '';
          sendAgentEvent(mainWindow, 'message-chunk', { chunk: delta }, appIdSnapshot);
          transcriptAccumulator += delta;
          processTranscriptForAgentOutputs(appIdSnapshot, mainWindow);
        } else if (assistantEvent?.type === 'thinking_delta') {
          sendAgentEvent(
            mainWindow,
            'thinking-chunk',
            { index: -1, delta: assistantEvent.delta ?? '' },
            appIdSnapshot
          );
        }
        break;
      }
      case 'tool_execution_start': {
        sendAgentEvent(
          mainWindow,
          'tool-use-start',
          {
            id: event.toolCallId ?? event.id ?? `${event.toolName}-${Date.now()}`,
            name: event.toolName ?? 'tool',
            input: event.parameters ?? event.input ?? {},
            streamIndex: -1
          },
          appIdSnapshot
        );
        break;
      }
      case 'tool_execution_update': {
        const text = typeof event.output === 'string' ? event.output : event.text;
        if (text) {
          sendAgentEvent(
            mainWindow,
            'tool-result-delta',
            {
              toolUseId: event.toolCallId ?? event.id ?? '',
              delta: text
            },
            appIdSnapshot
          );
        }
        break;
      }
      case 'tool_execution_end': {
        const content =
          typeof event.result === 'string' ? event.result
          : event.result ? JSON.stringify(event.result, null, 2)
          : typeof event.output === 'string' ? event.output
          : '';
        sendAgentEvent(
          mainWindow,
          'tool-result-complete',
          {
            toolUseId: event.toolCallId ?? event.id ?? '',
            content,
            isError: Boolean(event.isError)
          },
          appIdSnapshot
        );
        break;
      }
      case 'turn_start':
        sendAgentEvent(mainWindow, 'thinking-start', { index: -1 }, appIdSnapshot);
        break;
      case 'message_end':
        emitContextWindowUpdate(session, mainWindow, appIdSnapshot);
        break;
      case 'agent_end':
        emitContextWindowUpdate(session, mainWindow, appIdSnapshot);
        sendAgentEvent(mainWindow, 'message-complete', {}, appIdSnapshot);
        emitEventFromMain(mainWindow, {
          type: 'agent:completed',
          timestamp: Date.now(),
          sourceAppId: 'core',
          appId: appIdSnapshot,
          summary: `Task completed in ${appIdSnapshot}`
        });
        break;
      default:
        break;
    }
  });
}

export function getCurrentModelPreference(): ChatModelPreference {
  return ensureModelPreference();
}

export function getCurrentThinkingLevel(): ThinkingLevel {
  return getThinkingLevel();
}

export async function setCurrentThinkingLevel(level: ThinkingLevel): Promise<void> {
  await setConfigValue('thinkingLevel', level);
  await resetSession();
}

export async function setChatModelPreference(preference: ChatModelPreference): Promise<void> {
  const current = ensureModelPreference();
  if (preference === current) return;
  currentModelPreference = preference;
  setChatModelPreferenceSetting(currentModelPreference);
  await resetSession();
}

export function isSessionActive(): boolean {
  return isProcessing || querySession !== null;
}

export async function waitForSessionReady(): Promise<void> {
  if (sessionReadyPromise) await sessionReadyPromise;
}

export function preWarmSession(mainWindow: BrowserWindow | null): void {
  if (isSessionActive()) return;
  console.log('Pre-warming Pi SDK session...');
  startStreamingSession(mainWindow).catch((error) => {
    console.error('Failed to pre-warm session:', error);
  });
}

export async function interruptCurrentResponse(mainWindow: BrowserWindow | null): Promise<boolean> {
  if (!querySession) return false;
  if (isInterruptingResponse) return true;
  isInterruptingResponse = true;
  try {
    await querySession.abort();
    sendAgentEvent(mainWindow, 'message-stopped', {});
    return true;
  } finally {
    isInterruptingResponse = false;
  }
}

export async function resetSession(resumeSessionId?: string | null): Promise<void> {
  shouldAbortSession = true;
  abortGenerator();
  clearMessageQueue();
  regenerateSessionId(resumeSessionId ?? null);
  _pendingResumeSessionId = resumeSessionId ?? null;

  if (activePromptPromise) {
    await querySession?.abort().catch(() => undefined);
    await activePromptPromise.catch(() => undefined);
  }

  if (sessionTerminationPromise) await sessionTerminationPromise;

  unsubscribeSession?.();
  unsubscribeSession = null;
  querySession?.dispose();
  querySession = null;
  isProcessing = false;
  sessionTerminationPromise = null;
  sessionReadyPromise = null;
  resolveSessionReady = null;
  activeSystemPromptAppend = null;
  activeAllowedTools = undefined;
}

export async function runSingleAgentCall(
  mainWindow: BrowserWindow | null,
  appId: string,
  config: {
    systemPrompt: string;
    allowedTools?: string[];
    model?: 'smart' | 'deep' | 'fast';
    outputFormat?: { type: 'json_schema'; schema: Record<string, unknown> };
  },
  userPrompt: string
): Promise<
  | { success: true; response: string; structuredOutput?: unknown }
  | { success: false; error: string }
> {
  sessionAppId = appId;
  const appIdSnapshot = appId;
  await waitForWorkspaceReady();

  let responseText = '';
  let session: AgentSession | null = null;
  let unsubscribe: (() => void) | null = null;
  try {
    const requestedPreference: ChatModelPreference =
      config.model === 'deep' ? 'deep'
      : config.model === 'fast' ? 'fast'
      : 'smart';
    const prompt =
      config.outputFormat ?
        `${userPrompt}\n\nReturn output that conforms to this JSON schema:\n${JSON.stringify(config.outputFormat.schema, null, 2)}`
      : userPrompt;

    session = await createPiSession(config.systemPrompt, requestedPreference);
    unsubscribe = session.subscribe((event: Record<string, unknown>) => {
      if (event.type === 'message_update') {
        const assistantEvent = event.assistantMessageEvent as
          | { type?: string; delta?: string }
          | undefined;
        if (assistantEvent?.type === 'text_delta') {
          const delta = assistantEvent.delta ?? '';
          responseText += delta;
          sendAgentEvent(mainWindow, 'message-chunk', { chunk: delta }, appIdSnapshot);
        } else if (assistantEvent?.type === 'thinking_delta') {
          sendAgentEvent(
            mainWindow,
            'thinking-chunk',
            { index: -1, delta: assistantEvent.delta ?? '' },
            appIdSnapshot
          );
        }
      } else if (event.type === 'tool_execution_start') {
        sendAgentEvent(
          mainWindow,
          'tool-use-start',
          {
            id: event.toolCallId ?? event.id ?? `${event.toolName}-${Date.now()}`,
            name: event.toolName ?? 'tool',
            input: event.parameters ?? event.input ?? {},
            streamIndex: -1
          },
          appIdSnapshot
        );
      } else if (event.type === 'tool_execution_end') {
        sendAgentEvent(
          mainWindow,
          'tool-result-complete',
          {
            toolUseId: event.toolCallId ?? event.id ?? '',
            content:
              typeof event.result === 'string' ?
                event.result
              : JSON.stringify(event.result ?? '', null, 2),
            isError: Boolean(event.isError)
          },
          appIdSnapshot
        );
      } else if (event.type === 'agent_end') {
        sendAgentEvent(mainWindow, 'message-complete', {}, appIdSnapshot);
      }
    });
    await session.prompt(prompt);
    return { success: true, response: responseText };
  } catch (error) {
    console.error('[SingleAgent] Error:', error);
    return {
      success: false,
      error: normalizePiSdkError(error, 'Unknown error', ensurePiRuntimePaths())
    };
  } finally {
    unsubscribe?.();
    session?.dispose();
  }
}

export async function startStreamingSession(
  mainWindow: BrowserWindow | null,
  allowedTools?: string[],
  systemPromptAppend?: string | null,
  _agents?: Record<string, AgentDefinition>,
  modelOverride?: 'fast' | 'smart' | 'deep'
): Promise<void> {
  if (!sessionReadyPromise && !isProcessing && !querySession) {
    sessionReadyPromise = new Promise((resolve) => {
      resolveSessionReady = resolve;
    });
  }

  if (sessionTerminationPromise) await sessionTerminationPromise;

  const providedAppend =
    typeof systemPromptAppend === 'string' && systemPromptAppend.trim().length > 0 ?
      systemPromptAppend
    : null;
  const desiredAppend = providedAppend ?? buildDefaultSystemPromptAppend();
  const toolsChanged =
    JSON.stringify(allowedTools ?? null) !== JSON.stringify(activeAllowedTools ?? null);
  const appIdChanged = sessionAppId !== activeAppId;

  if (
    (isProcessing || querySession) &&
    (desiredAppend !== activeSystemPromptAppend || toolsChanged || appIdChanged)
  ) {
    await resetSession();
  }

  if (isProcessing || querySession) {
    if (sessionReadyPromise) await sessionReadyPromise;
    return;
  }

  shouldAbortSession = false;
  resetAbortFlag();
  isProcessing = true;
  transcriptAccumulator = '';
  clearProcessedMarkers();
  sessionAppId = activeAppId;
  const sessionAppIdSnapshot = sessionAppId;
  const mySessionToken = ++currentSessionToken;
  chunkDebugCount = 0;

  let resolveTermination: () => void;
  sessionTerminationPromise = new Promise((resolve) => {
    resolveTermination = resolve;
  });

  await waitForWorkspaceReady();

  try {
    const modelPreference = modelOverride ?? ensureModelPreference();

    activeSystemPromptAppend = desiredAppend;
    activeAllowedTools = allowedTools;

    querySession = await createPiSession(desiredAppend, modelPreference);
    unsubscribeSession = bindSessionEvents(querySession, mainWindow, sessionAppIdSnapshot);

    resolveSessionReady?.();
    resolveSessionReady = null;

    emitEventFromMain(mainWindow, {
      type: 'agent:started',
      timestamp: Date.now(),
      sourceAppId: 'core',
      appId: sessionAppIdSnapshot,
      taskPreview: `Task started in ${sessionAppIdSnapshot}`
    });

    while (!shouldAbortSession && mySessionToken === currentSessionToken) {
      const item = await waitForQueuedMessage();
      if (!item || shouldAbortSession || mySessionToken !== currentSessionToken) break;
      const prompt = messageToPrompt(item.message);
      item.resolve();
      if (!prompt.trim()) continue;
      activePromptPromise = querySession.prompt(prompt);
      await activePromptPromise;
      activePromptPromise = null;
    }
  } catch (error) {
    console.error('Error in Pi SDK streaming session:', error);
    const normalizedError = normalizePiSdkError(
      error,
      'Unknown error occurred',
      ensurePiRuntimePaths()
    );
    resolveSessionReady?.();
    resolveSessionReady = null;
    sendAgentEvent(
      mainWindow,
      'message-error',
      {
        error: normalizedError
      },
      sessionAppIdSnapshot
    );
    emitEventFromMain(mainWindow, {
      type: 'agent:error',
      timestamp: Date.now(),
      sourceAppId: 'core',
      appId: sessionAppIdSnapshot,
      error: normalizedError
    });
  } finally {
    activePromptPromise = null;
    isProcessing = false;
    unsubscribeSession?.();
    unsubscribeSession = null;
    querySession?.dispose();
    querySession = null;
    sessionReadyPromise = null;
    resolveTermination!();
  }
}

async function waitForQueuedMessage(): Promise<{
  message: SDKUserMessageContent;
  resolve: () => void;
} | null> {
  while (!shouldAbortSession) {
    const item = messageQueue.shift();
    if (item) return item;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}
