#!/usr/bin/env node
/**
 * Cross-platform clean script.
 * Removes build artifacts, caches, and downloaded runtimes.
 */
import { existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const dirsToRemove = [
  'node_modules',
  'out',
  'dist',
  '.turbo',
  'resources/bun',
  'resources/git-portable',
  'resources/msys2'
];

const filesToRemove = [
  '.eslintcache',
  'resources/bun.exe',
  'resources/uv',
  'resources/uv.exe',
  'resources/jq.exe',
  'resources/.bun-version',
  'resources/.uv-version',
  'resources/.jq-version',
  'resources/.git-portable-version',
  'resources/.msys2-version'
];

const globPatterns = ['*.tsbuildinfo'];

function remove(path) {
  const fullPath = join(rootDir, path);
  if (existsSync(fullPath)) {
    try {
      rmSync(fullPath, { recursive: true, force: true });
      console.log(`Removed: ${path}`);
    } catch (err) {
      console.error(`Failed to remove ${path}: ${err.message}`);
    }
  }
}

async function main() {
  console.log('Cleaning project...\n');

  // Remove directories
  for (const dir of dirsToRemove) {
    remove(dir);
  }

  // Remove files
  for (const file of filesToRemove) {
    remove(file);
  }

  // Remove glob patterns
  for (const pattern of globPatterns) {
    const files = await glob(pattern, { cwd: rootDir });
    for (const file of files) {
      remove(file);
    }
  }

  console.log('\nClean complete.');
}

main().catch(console.error);
