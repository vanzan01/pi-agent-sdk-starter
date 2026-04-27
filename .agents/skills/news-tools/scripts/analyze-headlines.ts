#!/usr/bin/env bun
import { readFileSync } from 'fs';

type NewsItem = {
  id?: string;
  title?: string;
  summary?: string;
  why_it_matters?: string;
};

type ParsedArgs = {
  itemsJson: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  let itemsJson = '';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--items' && argv[i + 1]) {
      itemsJson = argv[i + 1];
      i += 1;
    }
    if (arg === '--items-file' && argv[i + 1]) {
      const path = argv[i + 1];
      itemsJson = readFileSync(path, 'utf-8');
      i += 1;
    }
  }
  return { itemsJson };
}

function chooseWinner(items: NewsItem[]): NewsItem {
  if (items.length === 0) {
    throw new Error('No news items provided.');
  }
  // Simple heuristic: prefer items that mention "AI" or "agent", fallback to first.
  const scored = items.map((item) => {
    const text = `${item.title ?? ''} ${item.summary ?? ''}`.toLowerCase();
    let score = 0;
    if (text.includes('agent')) score += 2;
    if (text.includes('ai')) score += 1;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item || items[0];
}

function main() {
  try {
    const { itemsJson } = parseArgs(process.argv.slice(2));
    if (!itemsJson.trim()) {
      throw new Error('Missing --items JSON array input.');
    }
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) {
      throw new Error('Expected --items to be a JSON array.');
    }
    const winner = chooseWinner(parsed);
    const why =
      winner.why_it_matters ||
      'This item leads with concrete AI/agent developments that change how teams build and deploy AI.';
    const output = {
      winner: {
        id: winner.id ?? 'unknown',
        title: winner.title ?? 'Untitled',
        why_it_matters: why
      }
    };
    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(JSON.stringify({ error: message }));
    process.exitCode = 1;
  }
}

main();
