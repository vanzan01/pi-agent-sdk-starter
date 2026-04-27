import { spawnSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function beforeBuild(_context) {
  const projectDir = join(__dirname, '..');

  // Step 1: Download runtime binaries (bun, uv)
  console.log('Downloading runtime binaries...');
  const downloadBinariesScript = join(__dirname, 'downloadRuntimeBinaries.js');
  const downloadResult = spawnSync('node', [downloadBinariesScript], {
    cwd: projectDir,
    stdio: 'inherit'
  });

  if (downloadResult.status !== 0) {
    throw new Error('Failed to download runtime binaries');
  }

  // Step 2: Copy runtime dependencies (SDK + native bindings)
  console.log('Copying runtime dependencies to out/node_modules...');

  const pkgJson = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'));
  const optionalDeps = new Set(Object.keys(pkgJson.optionalDependencies ?? {}));
  const runtimeDeps = new Set([...Object.keys(pkgJson.dependencies ?? {}), ...optionalDeps]);

  const nodeModulesDir = join(projectDir, 'node_modules');
  const outNodeModulesDir = join(projectDir, 'out', 'node_modules');
  mkdirSync(outNodeModulesDir, { recursive: true });

  // Track which dependencies we've already copied to avoid duplicates
  const copiedDeps = new Set();

  // Recursively copy a dependency and its transitive dependencies
  function copyDependency(depName, isOptional = false) {
    if (copiedDeps.has(depName)) {
      return; // Already copied
    }

    const sourceDir = join(nodeModulesDir, depName);
    const targetDir = join(outNodeModulesDir, depName);

    if (!existsSync(sourceDir)) {
      if (isOptional) {
        console.log(`- Skipping optional dependency ${depName} (not installed on this platform)`);
        return;
      }

      throw new Error(`Dependency ${depName} not found in node_modules`);
    }

    // Copy the dependency
    mkdirSync(dirname(targetDir), { recursive: true });
    cpSync(sourceDir, targetDir, {
      recursive: true,
      dereference: true,
      force: true
    });

    copiedDeps.add(depName);
    console.log(`- Copied ${depName}`);

    // Read the dependency's package.json to find its dependencies
    const depPkgJsonPath = join(sourceDir, 'package.json');
    if (existsSync(depPkgJsonPath)) {
      try {
        const depPkgJson = JSON.parse(readFileSync(depPkgJsonPath, 'utf-8'));
        const depDependencies = depPkgJson.dependencies ?? {};
        const depOptionalDeps = depPkgJson.optionalDependencies ?? {};

        // Copy all runtime dependencies of this dependency
        // Note: We only copy from 'dependencies', not 'devDependencies'
        for (const depDepName of Object.keys(depDependencies)) {
          copyDependency(depDepName, false);
        }

        // Copy optional dependencies
        for (const depDepName of Object.keys(depOptionalDeps)) {
          copyDependency(depDepName, true);
        }
      } catch (error) {
        console.warn(`- Warning: Failed to read package.json for ${depName}:`, error.message);
      }
    }
  }

  // Copy all direct runtime dependencies (this will recursively copy transitive deps)
  for (const depName of runtimeDeps) {
    copyDependency(depName, optionalDeps.has(depName));
  }

  // Step 3: Compile skills from project root
  console.log('\nCompiling agent skills...');
  const buildSkillsScript = join(__dirname, 'buildSkills.js');

  // Use bundled bun executable if available
  const bunExecutable =
    process.platform === 'win32' ?
      join(projectDir, 'resources', 'bun.exe')
    : join(projectDir, 'resources', 'bun');
  const bunPath = existsSync(bunExecutable) ? bunExecutable : 'bun';

  const result = spawnSync(bunPath, [buildSkillsScript], {
    cwd: projectDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('Failed to compile agent skills');
  }
}
