#!/usr/bin/env bun
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

type SummaryResult = {
  file: string;
  summary: string[];
  todos: string[];
  stats: {
    words: number;
    characters: number;
    lines: number;
  };
  note?: string;
};

function parseArgs(argv: string[]) {
  const args: Record<string, string | number> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--path' && argv[i + 1]) {
      args.path = argv[i + 1];
      i++;
    } else if (arg === '--max-sentences' && argv[i + 1]) {
      args.maxSentences = Number(argv[i + 1]);
      i++;
    }
  }
  return {
    path: typeof args.path === 'string' ? args.path : '',
    maxSentences:
      typeof args.maxSentences === 'number' && Number.isFinite(args.maxSentences) ?
        Math.max(1, Math.min(8, args.maxSentences))
      : 3
  };
}

function extractSentences(text: string, maxSentences: number): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  return sentences.filter(Boolean).slice(0, maxSentences);
}

function extractTodos(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const todos: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/(\bTODO\b|\bto-do\b)/i.test(trimmed)) {
      todos.push(trimmed);
      continue;
    }
    if (/^[-*]\s*(\[.\])/.test(trimmed)) {
      todos.push(trimmed);
    }
  }
  return todos.slice(0, 15);
}

function summarizeFile(filePath: string, maxSentences: number): SummaryResult {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    return {
      file: resolved,
      summary: [],
      todos: [],
      stats: { words: 0, characters: 0, lines: 0 },
      note: 'File not found'
    };
  }

  const content = readFileSync(resolved, 'utf-8');
  const words = content.trim().split(/\s+/).filter(Boolean);
  const lines = content.split(/\r?\n/);

  const summary = extractSentences(content, maxSentences);
  const todos = extractTodos(content);

  return {
    file: resolved,
    summary,
    todos,
    stats: {
      words: words.length,
      characters: content.length,
      lines: lines.length
    }
  };
}

function main() {
  const { path, maxSentences } = parseArgs(process.argv.slice(2));
  const result = summarizeFile(path, maxSentences);
  console.log(JSON.stringify(result, null, 2));
}

main();
