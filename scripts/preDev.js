import { spawnSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Pre-dev script that ensures skills are built before starting dev server.
 * This provides consistency between dev and production builds.
 */

console.log('Preparing development environment...\n');

// Step 1: Download runtime binaries (bun, uv)
const downloadBinariesScript = join(__dirname, 'downloadRuntimeBinaries.js');
const downloadResult = spawnSync('node', [downloadBinariesScript], {
  stdio: 'inherit',
  cwd: join(__dirname, '..')
});

if (downloadResult.status !== 0) {
  console.error('\n❌ Failed to download runtime binaries');
  process.exit(1);
}

// Step 2: Ensure out directory exists
const outDir = join(__dirname, '..', 'out');
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

// Step 3: Run buildSkills.js to compile skills to out/.claude/skills
const buildSkillsScript = join(__dirname, 'buildSkills.js');
const buildResult = spawnSync('node', [buildSkillsScript], {
  stdio: 'inherit',
  cwd: join(__dirname, '..')
});

if (buildResult.status !== 0) {
  console.error('\n❌ Failed to build skills');
  process.exit(1);
}

console.log('\n✅ Development environment ready\n');
