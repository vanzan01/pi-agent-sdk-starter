import { spawnSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Build agent skills from the local `.claude/skills` directory into `out/.claude/skills`.
 * This runs for both dev (preDev) and production builds (beforeBuild hook).
 */

const projectRoot = join(__dirname, '..');
const sourceAgentRoot = join(projectRoot, '.claude');
const sourceSkillsRoot = join(sourceAgentRoot, 'skills');
const sourceAgentsRoot = join(sourceAgentRoot, 'agents');
const targetAgentRoot = join(projectRoot, 'out', '.claude');
const targetSkillsRoot = join(targetAgentRoot, 'skills');
const targetAgentsRoot = join(targetAgentRoot, 'agents');

// Use bundled bun if available, otherwise fall back to system bun
const bunExecutable =
  process.platform === 'win32' ?
    join(projectRoot, 'resources', 'bun.exe')
  : join(projectRoot, 'resources', 'bun');
const bunPath = existsSync(bunExecutable) ? bunExecutable : 'bun';

console.log('Building agent skills with root toolchain...');
console.log('  Source:', sourceSkillsRoot);
console.log('  Target:', targetSkillsRoot);

// Clean target directory
if (existsSync(targetAgentRoot)) {
  console.log('Cleaning target directory...');
  rmSync(targetAgentRoot, { recursive: true, force: true });
}
mkdirSync(targetSkillsRoot, { recursive: true });

// Find all skills
if (!existsSync(sourceSkillsRoot)) {
  console.warn('No .claude/skills directory found at:', sourceSkillsRoot);
  process.exit(0);
}

const skills = readdirSync(sourceSkillsRoot).filter((name) => {
  const skillPath = join(sourceSkillsRoot, name);
  return statSync(skillPath).isDirectory();
});

if (skills.length === 0) {
  console.log('No skills found.');
  process.exit(0);
}

console.log(`\nFound ${skills.length} skill(s):`, skills.join(', '));

// Process each skill
for (const skillName of skills) {
  console.log(`\nProcessing skill: ${skillName}`);
  const sourceSkillDir = join(sourceSkillsRoot, skillName);
  const targetSkillDir = join(targetSkillsRoot, skillName);

  // Create target skill directory
  mkdirSync(targetSkillDir, { recursive: true });

  // Copy all files from skill directory (except scripts/ and node_modules/ which we'll handle separately)
  const entries = readdirSync(sourceSkillDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'scripts') {
      continue; // Skip scripts directory, we'll compile these separately
    }
    if (entry.name === 'node_modules') {
      continue; // Skip node_modules - compiled binaries are standalone and don't need dependencies
    }

    const sourcePath = join(sourceSkillDir, entry.name);
    const targetPath = join(targetSkillDir, entry.name);

    try {
      cpSync(sourcePath, targetPath, { recursive: true });
      console.log(`  Copied ${entry.name}`);
    } catch (error) {
      console.warn(`  Warning: Failed to copy ${entry.name}:`, error.message);
    }
  }

  // Find and compile all TypeScript tools
  const scriptsDir = join(sourceSkillDir, 'scripts');
  if (!existsSync(scriptsDir)) {
    console.log('  No scripts directory found, skipping tool compilation');
    continue;
  }

  // First, copy all non-.ts files from scripts/ directory
  const copyNonTsFiles = (sourceDir, targetDir) => {
    const entries = readdirSync(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      const sourcePath = join(sourceDir, entry.name);
      const targetPath = join(targetDir, entry.name);

      if (entry.isDirectory()) {
        mkdirSync(targetPath, { recursive: true });
        copyNonTsFiles(sourcePath, targetPath);
      } else if (entry.isFile() && !entry.name.endsWith('.ts')) {
        cpSync(sourcePath, targetPath);
        console.log(`  Copied ${relative(sourceSkillDir, sourcePath)}`);
      }
    }
  };

  const targetScriptsDir = join(targetSkillDir, 'scripts');
  mkdirSync(targetScriptsDir, { recursive: true });
  copyNonTsFiles(scriptsDir, targetScriptsDir);

  // Recursively find all .ts files in scripts/
  const findTsFiles = (dir) => {
    const results = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findTsFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
    return results;
  };

  const tsFiles = findTsFiles(scriptsDir);
  console.log(`  Found ${tsFiles.length} TypeScript tool(s)`);

  for (const tsFile of tsFiles) {
    const relativePath = relative(sourceSkillDir, tsFile);

    console.log(`    Compiling ${relativePath}...`);

    // Binary output - add .exe extension on Windows
    const baseOutput = relativePath.replace(/\.ts$/, '');
    const binaryOutput = join(
      targetSkillDir,
      process.platform === 'win32' ? `${baseOutput}.exe` : baseOutput
    );

    // Create target directory
    const targetToolDir = dirname(binaryOutput);
    mkdirSync(targetToolDir, { recursive: true });

    // Compile with Bun - automatically compiles for current platform
    // --compile creates a standalone executable for the current OS/arch
    const compileResult = spawnSync(
      bunPath,
      ['build', '--compile', '--outfile', binaryOutput, tsFile],
      {
        cwd: projectRoot,
        stdio: 'inherit'
      }
    );

    if (compileResult.status !== 0) {
      console.error(`    Failed to compile ${relativePath}`);
      process.exit(1);
    }

    console.log(`    ✓ Compiled to ${relative(targetSkillsRoot, binaryOutput)}`);
  }
}

// Clean up Bun build artifacts
const bunBuildFiles = readdirSync(projectRoot).filter((f) => f.endsWith('.bun-build'));
for (const file of bunBuildFiles) {
  rmSync(join(projectRoot, file), { force: true });
}
if (bunBuildFiles.length > 0) {
  console.log(`Cleaned up ${bunBuildFiles.length} .bun-build artifact(s)`);
}

console.log('\n✅ Skills build completed successfully');

// ============================================================
// Build Agents from .claude/agents/{app-id}/*.md
// ============================================================

console.log('\n\nBuilding agent definitions...');
console.log('  Source:', sourceAgentsRoot);
console.log('  Target:', targetAgentsRoot);

if (existsSync(sourceAgentsRoot)) {
  // Create target agents directory
  mkdirSync(targetAgentsRoot, { recursive: true });

  // Find all app subdirectories
  const appDirs = readdirSync(sourceAgentsRoot).filter((name) => {
    const appPath = join(sourceAgentsRoot, name);
    return statSync(appPath).isDirectory();
  });

  if (appDirs.length === 0) {
    console.log('No agent directories found.');
  } else {
    console.log(`\nFound ${appDirs.length} app(s) with agents:`, appDirs.join(', '));

    for (const appId of appDirs) {
      console.log(`\nProcessing agents for app: ${appId}`);
      const sourceAppDir = join(sourceAgentsRoot, appId);
      const targetAppDir = join(targetAgentsRoot, appId);

      // Create target app directory
      mkdirSync(targetAppDir, { recursive: true });

      // Copy all .md files
      const agentFiles = readdirSync(sourceAppDir).filter((f) => f.endsWith('.md'));
      for (const agentFile of agentFiles) {
        const sourcePath = join(sourceAppDir, agentFile);
        const targetPath = join(targetAppDir, agentFile);
        cpSync(sourcePath, targetPath);
        console.log(`  Copied ${agentFile}`);
      }
    }

    console.log('\n✅ Agents build completed successfully');
  }
} else {
  console.log('No .claude/agents directory found, skipping agents build.');
}
