#!/usr/bin/env node
// Tweet validation script
// Returns: {"valid": true} or {"valid": false, "errors": [...]}

const tweet = process.argv[2];
const errors = [];

// Rule 1: Not empty
if (!tweet || tweet.length === 0) {
  errors.push('Tweet is empty');
} else {
  // Rule 2: Length limit
  if (tweet.length > 280) {
    errors.push(`Too long: ${tweet.length}/280 characters`);
  }

  // Rule 3: Must have hashtag
  if (!tweet.includes('#')) {
    errors.push('Missing hashtag - add at least one #hashtag');
  }

  // Rule 4: Must have emoji
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  if (!emojiRegex.test(tweet)) {
    errors.push('Missing emoji - add at least one emoji');
  }

  // Rule 5: No JSON wrapping
  if (tweet.trim().startsWith('{') || tweet.includes('"tweet"')) {
    errors.push('Output is JSON wrapped - output raw tweet text only');
  }

  // Rule 6: No markdown
  if (tweet.includes('**') || tweet.includes('##')) {
    errors.push('Contains markdown formatting - use plain text only');
  }

  // Rule 7: No quotes wrapping the whole tweet
  const trimmed = tweet.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    errors.push('Tweet is wrapped in quotes - remove surrounding quotes');
  }

  // Rule 8: No explanatory text
  const lowerTweet = tweet.toLowerCase();
  if (
    lowerTweet.includes("here's a tweet") ||
    lowerTweet.includes('here is a tweet') ||
    lowerTweet.includes('tweet:')
  ) {
    errors.push('Contains explanatory text - output only the tweet itself');
  }
}

// Output result
if (errors.length === 0) {
  console.log(JSON.stringify({ valid: true }));
  process.exit(0);
} else {
  console.log(JSON.stringify({ valid: false, errors }));
  process.exit(1);
}
