import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir, tmpdir } from 'os';
import { join, relative } from 'path';
import { AuthStorage, ModelRegistry } from '@mariozechner/pi-coding-agent';

import { buildEmbeddedPiAgentPaths } from '../src/main/lib/pi-runtime-paths';

const userDataPath = join(tmpdir(), `pi-sdk-starter-runtime-${process.pid}-${Date.now()}`);
const paths = buildEmbeddedPiAgentPaths(userDataPath);
const globalPiAgentDir = join(homedir(), '.pi', 'agent');

if (!paths.agentDir.startsWith(userDataPath)) {
  throw new Error(`Embedded Pi agent dir escaped user data path: ${paths.agentDir}`);
}

if (!relative(globalPiAgentDir, paths.agentDir).startsWith('..')) {
  throw new Error(`Embedded Pi agent dir must not use global ~/.pi/agent: ${paths.agentDir}`);
}

mkdirSync(paths.agentDir, { recursive: true });

writeFileSync(
  paths.modelsPath,
  JSON.stringify(
    {
      providers: {
        'embedded-test': {
          baseUrl: 'https://example.invalid/v1',
          apiKey: 'embedded-test-key',
          api: 'openai-completions',
          models: [
            {
              id: 'embedded-model',
              name: 'Embedded Test Model',
              reasoning: false,
              input: ['text'],
              cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0
              },
              contextWindow: 1024,
              maxTokens: 256
            }
          ]
        }
      }
    },
    null,
    2
  )
);

const authStorage = AuthStorage.create(paths.authPath);
const modelRegistry = ModelRegistry.create(authStorage, paths.modelsPath);
const model = modelRegistry.find('embedded-test', 'embedded-model');

if (!model) {
  throw new Error('Expected custom model to load from embedded models.json');
}

if (
  !modelRegistry
    .getAvailable()
    .some((candidate) => candidate.provider === model.provider && candidate.id === model.id)
) {
  throw new Error('Expected custom model to be available through embedded provider apiKey');
}

if (!existsSync(paths.authPath)) {
  throw new Error('Expected AuthStorage to create embedded auth.json');
}

console.log(`PASS: embedded Pi runtime paths are self-contained at ${paths.agentDir}`);
