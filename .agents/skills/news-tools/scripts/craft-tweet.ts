#!/usr/bin/env bun

type ParsedArgs = {
  title: string;
  why: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  let title = '';
  let why = '';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--title' && argv[i + 1]) {
      title = argv[i + 1];
      i += 1;
    } else if (arg === '--why' && argv[i + 1]) {
      why = argv[i + 1];
      i += 1;
    }
  }
  return { title, why };
}

function craftTweet(title: string, why: string): string {
  const base = `${title.trim()} — ${why.trim()}`;
  // Add a couple of relevant hashtags if room allows
  const hashtags = ['#AI', '#Agent'];
  const tweetWithTags = `${base} ${hashtags.join(' ')}`.trim();
  if (tweetWithTags.length <= 280) {
    return tweetWithTags;
  }
  // If too long, truncate why
  const truncatedWhy = why.slice(0, 200).trim();
  const retry = `${title.trim()} — ${truncatedWhy} ${hashtags.join(' ')}`.trim();
  return retry.length <= 280 ? retry : retry.slice(0, 277) + '...';
}

function main() {
  try {
    const { title, why } = parseArgs(process.argv.slice(2));
    if (!title || !why) {
      throw new Error(
        'Missing required args. Usage: ./craft-tweet --title "<headline>" --why "<why it matters>"'
      );
    }
    const tweet = craftTweet(title, why);
    console.log(JSON.stringify({ tweet }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(JSON.stringify({ error: message }));
    process.exitCode = 1;
  }
}

main();
