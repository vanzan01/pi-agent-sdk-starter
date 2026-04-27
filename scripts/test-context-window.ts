import { AuthStorage, ModelRegistry } from '@mariozechner/pi-coding-agent';

import { getPiSdkTestAgentPaths } from './pi-sdk-test-paths';

const paths = getPiSdkTestAgentPaths();
const authStorage = AuthStorage.create(paths.authPath);
const modelRegistry = ModelRegistry.create(authStorage, paths.modelsPath);
const available = await modelRegistry.getAvailable();

const required = [
  { provider: 'openai-codex', id: 'gpt-5.4', minContext: 272_000 },
  { provider: 'openai-codex', id: 'gpt-5.5', minContext: 272_000 }
];

let failed = false;
for (const expected of required) {
  const model = available.find(
    (candidate) => candidate.provider === expected.provider && candidate.id === expected.id
  );
  if (!model) {
    console.error(`FAIL: ${expected.provider}/${expected.id} is not available via Pi SDK auth`);
    failed = true;
    continue;
  }
  console.log(`${expected.provider}/${expected.id}: contextWindow=${model.contextWindow}`);
  if ((model.contextWindow ?? 0) < expected.minContext) {
    console.error(
      `FAIL: ${expected.provider}/${expected.id} context window is below ${expected.minContext}`
    );
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('PASS: Pi SDK models are available with expected context windows.');
