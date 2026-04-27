import { runPiCodexPrompt } from './pi-sdk-test-utils';

const response = await runPiCodexPrompt(
  'Say exactly: "Pi Codex extended-context smoke test works!"',
  'Reply exactly as requested. Do not use tools.',
  'gpt-5.5'
);

if (!response.includes('Pi Codex extended-context smoke test works!')) {
  console.error(`FAIL: Unexpected response: ${response}`);
  process.exit(1);
}

console.log('PASS: Pi SDK gpt-5.5 Codex smoke test completed.');
