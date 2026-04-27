import { getModel } from '@mariozechner/pi-ai';
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager
} from '@mariozechner/pi-coding-agent';

import { getPiSdkTestAgentPaths } from './pi-sdk-test-paths';

export async function runPiCodexPrompt(
  prompt: string,
  systemPrompt = 'Be concise and follow instructions exactly.',
  modelId = 'gpt-5.4'
): Promise<string> {
  const paths = getPiSdkTestAgentPaths();
  const authStorage = AuthStorage.create(paths.authPath);
  const modelRegistry = ModelRegistry.create(authStorage, paths.modelsPath);
  const model =
    modelRegistry.find('openai-codex', modelId) ?? getModel('openai-codex', modelId as never);
  if (!model) throw new Error(`Model openai-codex/${modelId} not found`);

  const loader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir: paths.agentDir,
    systemPromptOverride: () => systemPrompt
  });
  await loader.reload();

  const { session } = await createAgentSession({
    cwd: process.cwd(),
    model,
    authStorage,
    modelRegistry,
    agentDir: paths.agentDir,
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(),
    tools: []
  });

  let response = '';
  const unsubscribe = session.subscribe((event) => {
    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
      response += event.assistantMessageEvent.delta;
    }
  });

  try {
    await session.prompt(prompt);
    return response.trim();
  } finally {
    unsubscribe();
    session.dispose();
  }
}
