import { runPiCodexPrompt } from './pi-sdk-test-utils';

const topic = `OpenAI announced a new coding model with stronger repository understanding and faster patch generation for developers.`;

const research = await runPiCodexPrompt(
  `Extract one concise AI-news item from this source text as JSON with keys headline and summary:\n${topic}`,
  'You are the Researcher stage. Return compact JSON only.'
);
console.log('Research:', research);

const analysis = await runPiCodexPrompt(
  `Analyze why this AI news matters in one sentence:\n${research}`,
  'You are the Analyst stage. Return one sentence only.'
);
console.log('Analysis:', analysis);

const tweet = await runPiCodexPrompt(
  `Write one tweet under 280 characters from this analysis. Include #AI.\n${analysis}`,
  'You are the Writer stage. Return only the tweet text.'
);
console.log('Tweet:', tweet);

if (!tweet.includes('#AI') || tweet.length > 280) {
  console.error(`FAIL: Tweet validation failed (${tweet.length} chars): ${tweet}`);
  process.exit(1);
}

console.log('PASS: Pi SDK Codex 3-stage ai-news-tweet pipeline completed.');
