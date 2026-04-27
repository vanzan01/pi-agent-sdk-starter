#!/usr/bin/env node
/**
 * Cross-platform bun runner.
 * Resolves bun.exe on Windows, resources/bun on Unix.
 * Usage: node scripts/run-bun.js [args...]
 */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function resolveBun() {
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    const bunExe = join(rootDir, 'resources', 'bun.exe');
    if (existsSync(bunExe)) return bunExe;
  } else {
    const bun = join(rootDir, 'resources', 'bun');
    if (existsSync(bun)) return bun;
  }

  // Fallback to global bun
  return 'bun';
}

const bunPath = resolveBun();
const args = process.argv.slice(2);

const child = spawn(bunPath, args, {
  stdio: 'inherit',
  cwd: rootDir,
  shell: process.platform === 'win32'
});

child.on('close', (code) => {
  process.exit(code || 0);
});
