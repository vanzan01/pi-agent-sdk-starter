import { runPiSdkPrompt } from './pi-sdk-test-utils';

const response = await runPiSdkPrompt(
  'Say exactly: "Pi SDK extended-context smoke test works!"',
  'Reply exactly as requested. Do not use tools.',
  'gpt-5.5'
);

if (!response.includes('Pi SDK extended-context smoke test works!')) {
  console.error(`FAIL: Unexpected response: ${response}`);
  process.exit(1);
}

console.log('PASS: Pi SDK gpt-5.5 smoke test completed.');
