import { tmpdir } from 'os';
import { join } from 'path';

import { normalizePiSdkError } from '../src/main/lib/pi-error-normalizer';
import { buildPiRuntimePaths } from '../src/main/lib/pi-runtime-paths';

const rootPath = join(tmpdir(), 'pi-sdk-starter-normalizer-test');
const paths = buildPiRuntimePaths(join(rootPath, 'home'), join(rootPath, 'project'));
const rawError = new Error(
  [
    'No API key found for openai-codex.',
    '',
    'Use /login to log into a provider via OAuth or API key. See:',
    '  C:\\example\\project\\docs\\providers.md',
    '  C:\\example\\project\\docs\\models.md'
  ].join('\n')
);

const normalized = normalizePiSdkError(rawError, 'fallback', paths);

if (!normalized.includes('No credentials found for openai-codex')) {
  throw new Error(`Expected provider-specific normalized message. Received:\n${normalized}`);
}

if (normalized.includes('/login') || normalized.includes('docs\\providers.md')) {
  throw new Error(`Expected CLI guidance to be removed. Received:\n${normalized}`);
}

if (!normalized.includes(paths.authPath) || !normalized.includes(paths.modelsPath)) {
  throw new Error(`Expected embedded runtime paths in message. Received:\n${normalized}`);
}

console.log('PASS: Pi SDK auth guidance is normalized for embedded app runtime.');
