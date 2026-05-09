import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, relative } from 'path';
import { AuthStorage, ModelRegistry } from '@earendil-works/pi-coding-agent';

import { buildPiRuntimePaths } from '../src/main/lib/pi-runtime-paths';

const rootPath = join(tmpdir(), `pi-sdk-starter-runtime-${process.pid}-${Date.now()}`);
const homePath = join(rootPath, 'home');
const projectPath = join(rootPath, 'project');
const paths = buildPiRuntimePaths(homePath, projectPath);
const globalPiAgentDir = join(homePath, '.pi', 'agent');

if (paths.authPath !== join(homePath, '.pi-sdk', 'auth.json')) {
  throw new Error(`Expected SDK auth path under ~/.pi-sdk. Received: ${paths.authPath}`);
}

if (paths.modelsPath !== join(projectPath, '.pi-sdk', 'models.json')) {
  throw new Error(
    `Expected project models path under <project>/.pi-sdk. Received: ${paths.modelsPath}`
  );
}

if (!relative(globalPiAgentDir, paths.authPath).startsWith('..')) {
  throw new Error(`SDK auth path must not use global ~/.pi/agent: ${paths.authPath}`);
}

mkdirSync(paths.sdkDir, { recursive: true });
mkdirSync(paths.projectConfigDir, { recursive: true });

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

console.log(`PASS: Pi SDK auth and project model paths are split correctly.`);
