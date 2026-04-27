import { getModel } from '@mariozechner/pi-ai';
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  ModelRegistry,
  SessionManager
} from '@mariozechner/pi-coding-agent';

import { getPiSdkTestAgentPaths } from './pi-sdk-test-paths';

const paths = getPiSdkTestAgentPaths();
const authStorage = AuthStorage.create(paths.authPath);
const modelRegistry = ModelRegistry.create(authStorage, paths.modelsPath);
const model = modelRegistry.find('openai-codex', 'gpt-5.4') ?? getModel('openai-codex', 'gpt-5.4');

if (!model) {
  console.error('FAIL: openai-codex/gpt-5.4 is not registered in Pi SDK');
  process.exit(1);
}

const available = await modelRegistry.getAvailable();
if (
  !available.some(
    (candidate) => candidate.provider === 'openai-codex' && candidate.id === 'gpt-5.4'
  )
) {
  console.error(
    `FAIL: openai-codex/gpt-5.4 is not available in ${paths.authPath}. Configure Codex OAuth in the starter-owned Pi auth store.`
  );
  process.exit(1);
}

const loader = new DefaultResourceLoader({
  cwd: process.cwd(),
  agentDir: paths.projectConfigDir,
  systemPromptOverride: () => 'Reply exactly as requested. Do not use tools.'
});
await loader.reload();

const { session } = await createAgentSession({
  cwd: process.cwd(),
  model,
  authStorage,
  modelRegistry,
  agentDir: paths.projectConfigDir,
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

await session.prompt('Say exactly: "Pi Codex OAuth works!"');
unsubscribe();
session.dispose();

if (!response.includes('Pi Codex OAuth works!')) {
  console.error(`FAIL: Unexpected response: ${response.trim()}`);
  process.exit(1);
}

console.log('PASS: Pi SDK authenticated with OpenAI Codex OAuth and received expected response.');
