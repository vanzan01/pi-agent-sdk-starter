#!/usr/bin/env node
/**
 * Tweet Validation Script
 *
 * Usage: node validate-tweet.js "tweet text here"
 *
 * Returns JSON:
 * - { "valid": true } if tweet passes all checks
 * - { "valid": false, "errors": [...] } if tweet fails
 *
 * Validation rules:
 * 1. Must be 1-280 characters
 * 2. Must contain at least one hashtag (#)
 * 3. Must contain at least one emoji
 * 4. Must NOT start with a quote character
 * 5. Must NOT contain markdown formatting
 * 6. Must NOT contain character count annotations
 * 7. Must NOT have "Tweet:" or "Here" prefix
 * 8. Must NOT be JSON wrapped
 * 9. Must NOT be meta-commentary (e.g. "I'll use...", "Let me craft...")
 * 10. Must NOT have multiple line breaks
 */

const tweet = process.argv[2];

if (!tweet) {
  console.log(
    JSON.stringify({
      valid: false,
      errors: ['No tweet provided. Usage: node validate-tweet.js "tweet text"']
    })
  );
  process.exit(1);
}

const errors = [];

// Rule 1: Length check (1-280 characters)
if (tweet.length === 0) {
  errors.push('Tweet is empty');
} else if (tweet.length > 280) {
  errors.push(`Tweet too long: ${tweet.length}/280 characters`);
}

// Rule 2: Must contain hashtag
if (!tweet.includes('#')) {
  errors.push('Missing hashtag - tweet must include at least one #hashtag');
}

// Rule 3: Must contain emoji
// Common emoji Unicode ranges
const emojiRegex =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u;
if (!emojiRegex.test(tweet)) {
  errors.push('Missing emoji - tweet must include at least one emoji');
}

// Rule 4: Must NOT start with quote
if (tweet.startsWith('"') || tweet.startsWith("'") || tweet.startsWith('`')) {
  errors.push('Tweet starts with quote character - remove surrounding quotes');
}

// Rule 5: Must NOT contain markdown
if (tweet.includes('**') || tweet.includes('```') || tweet.includes('##') || tweet.includes('__')) {
  errors.push('Tweet contains markdown formatting - remove ** or ``` or ## or __');
}

// Rule 6: Must NOT contain character count annotation
const charCountRegex = /\(\d+\s*characters?\)/i;
if (charCountRegex.test(tweet)) {
  errors.push('Tweet contains character count annotation like "(XX characters)" - remove it');
}

// Rule 7: Must NOT have "Tweet:" prefix
if (tweet.toLowerCase().startsWith('tweet:') || tweet.toLowerCase().startsWith('here')) {
  errors.push('Tweet starts with prefix like "Tweet:" or "Here" - output only the tweet text');
}

// Rule 8: Must NOT be JSON wrapped
if (tweet.startsWith('{') || tweet.includes('"tweet"') || tweet.includes("'tweet'")) {
  errors.push(
    'Tweet is JSON wrapped like {"tweet": "..."} - output ONLY the raw tweet text, no JSON'
  );
}

// Rule 9: Must NOT be meta-commentary (agent talking about the tweet instead of outputting it)
const metaPatterns = [
  /^i'll\s+(use|write|craft|create)/i,
  /^i\s+will\s+(use|write|craft|create)/i,
  /^let\s+me\s+(use|write|craft|create|try)/i,
  /^i'm\s+going\s+to/i,
  /^here'?s?\s+(my|the|a)\s+(tweet|draft)/i,
  /^(the|this)\s+tweet\s+(is|will|should)/i,
  /^analyzing\s+the/i,
  /tweet-writer\s+skill/i,
  /craft\s+an?\s+engaging\s+tweet/i,
  /appears?\s+truncated/i,
  /more\s+concise\s+version/i
];
const isMetaCommentary = metaPatterns.some((pattern) => pattern.test(tweet));
if (isMetaCommentary) {
  errors.push(
    'Output is meta-commentary about the tweet, not the actual tweet. Output ONLY the raw tweet text.'
  );
}

// Rule 10: Must NOT contain line breaks (tweets are single-line for this use case)
if (tweet.includes('\n') && tweet.split('\n').length > 2) {
  errors.push('Tweet contains multiple line breaks - keep it as a single concise statement');
}

// Output result
if (errors.length === 0) {
  console.log(JSON.stringify({ valid: true }));
  process.exit(0);
} else {
  console.log(JSON.stringify({ valid: false, errors }));
  process.exit(1);
}
