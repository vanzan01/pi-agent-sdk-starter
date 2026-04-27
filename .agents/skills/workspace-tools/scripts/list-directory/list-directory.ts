#!/usr/bin/env bun
import { lstatSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

type EntryType = 'file' | 'dir' | 'symlink';

interface TreeNode {
  name: string;
  path: string;
  type: EntryType;
  size: number;
  error?: string;
  children?: TreeNode[];
}

interface ParsedArgs {
  targetPath: string;
  depth: number;
  compact: boolean;
}

const DEFAULT_DEPTH = 2;
const IGNORED = new Set([
  '.DS_Store',
  '.git',
  '.turbo',
  '.idea',
  '.vscode',
  'node_modules',
  'dist',
  'out'
]);

function parseArgs(argv: string[]): ParsedArgs {
  let targetPath = '.';
  let depth = DEFAULT_DEPTH;
  let compact = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--path' && argv[i + 1]) {
      targetPath = argv[i + 1];
      i += 1;
    } else if (arg === '--depth' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        depth = parsed;
      }
      i += 1;
    } else if (arg === '--json') {
      compact = true;
    }
  }

  return {
    targetPath,
    depth,
    compact
  };
}

function buildTree(targetPath: string, depthRemaining: number): TreeNode {
  const stats = lstatSync(targetPath);
  const entryType: EntryType =
    stats.isSymbolicLink() ? 'symlink'
    : stats.isDirectory() ? 'dir'
    : 'file';

  const node: TreeNode = {
    name: targetPath.split(/[/\\]/).pop() || targetPath,
    path: targetPath,
    type: entryType,
    size: stats.size
  };

  if (entryType !== 'dir' || depthRemaining <= 0) {
    return node;
  }

  const children: TreeNode[] = [];

  for (const entry of readdirSync(targetPath)) {
    if (IGNORED.has(entry)) {
      continue;
    }

    const childPath = join(targetPath, entry);
    try {
      const childNode = buildTree(childPath, depthRemaining - 1);
      children.push(childNode);
    } catch (error) {
      children.push({
        name: entry,
        path: childPath,
        type: 'file',
        size: 0,
        children: [],
        // Attach error context without throwing to keep output usable
        ...(error instanceof Error && { error: error.message })
      });
    }
  }

  node.children = children;
  return node;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const resolvedPath = resolve(args.targetPath);

  try {
    const tree = buildTree(resolvedPath, args.depth);
    const output = {
      root: resolvedPath,
      depth: args.depth,
      tree
    };

    const spacing = args.compact ? 0 : 2;
    console.log(JSON.stringify(output, null, spacing));
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('Unknown error occurred while scanning the directory.');
    }
    process.exitCode = 1;
  }
}

main();
