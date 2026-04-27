#!/usr/bin/env bun
/**
 * E2E Export Test Suite
 *
 * Runs test suites to validate domain export:
 * 1. Single-app: Chat
 * 2. Single-app: AI News Tweet (agents + skills)
 * 3. Multi-app: All apps
 *
 * Each suite: exports → validates files → validates handlers → npm install → npm run build
 */
import { spawnSync } from 'child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs';
import { dirname, join } from 'path';

// Import app registry - this works because it has no Electron deps
import { getAllApps, getAppById } from '../src/shared/apps/registry';
import type { AppManifest } from '../src/shared/apps/types';

const WORKSPACE_DIR = process.cwd();
const TEMP_DIR = join(WORKSPACE_DIR, '.test-export-temp');

// =============================================================================
// Types
// =============================================================================

type TestChecks = {
  shouldExist?: string[];
  shouldNotExist?: string[];
  handlersPresent?: string[];
  handlersAbsent?: string[];
};

type TestSuite = {
  name: string;
  apps: string[] | 'random:3';
  checks: TestChecks;
};

type ValidationResult = {
  success: boolean;
  errors: string[];
};

type SuiteResult = {
  name: string;
  success: boolean;
  duration: number;
  errors: string[];
  apps: string[];
  fileCount: number;
};

// =============================================================================
// Test Suites Configuration
// =============================================================================

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Single-app: Chat',
    apps: ['chat'],
    checks: {
      shouldExist: ['src/shared/apps/chat.ts', 'src/renderer/apps/chat/'],
      shouldNotExist: ['src/shared/apps/ai-news-tweet.ts'],
      handlersPresent: ['registerChatHandlers']
    }
  },
  {
    name: 'Single-app: AI News Tweet (agents + skills)',
    apps: ['ai-news-tweet'],
    checks: {
      shouldExist: [
        'src/shared/apps/ai-news-tweet.ts',
        '.claude/agents/ai-news-tweet/',
        '.claude/skills/news-tools/'
      ],
      shouldNotExist: ['src/shared/apps/chat.ts']
    }
  },
  {
    name: 'Multi-app: All apps',
    apps: ['chat', 'ai-news-tweet', '_template'],
    checks: {
      shouldExist: [
        'src/shared/apps/chat.ts',
        'src/shared/apps/ai-news-tweet.ts',
        'src/shared/apps/_template.ts'
      ]
    }
  }
];

// =============================================================================
// ANSI Colors
// =============================================================================

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m'
};

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}  ✓ ${message}${colors.reset}`);
}

function logError(message: string) {
  console.log(`${colors.red}  ✗ ${message}${colors.reset}`);
}

function logInfo(message: string) {
  console.log(`${colors.dim}  → ${message}${colors.reset}`);
}

// =============================================================================
// Export Infrastructure (reused from existing script)
// =============================================================================

const CORE_DIRECTORIES = [
  'src/main',
  'src/preload',
  'src/shared/core',
  'src/shared/types',
  'src/shared/domains',
  'src/renderer/core',
  'src/renderer/components',
  'src/renderer/hooks',
  'src/renderer/utils',
  'src/renderer/constants',
  'src/renderer/pages',
  'src/renderer/types',
  'scripts'
];

const CORE_FILES = [
  'src/shared/constants.ts',
  'src/renderer/App.tsx',
  'src/renderer/main.tsx',
  'src/renderer/index.html',
  'src/renderer/index.css',
  'src/renderer/electron.d.ts'
];

const CORE_CONFIG_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'electron.vite.config.ts',
  'eslint.config.js',
  '.prettierrc',
  '.prettierignore',
  '.gitignore'
];

const ALWAYS_EXCLUDED = [
  'src/main/lib/exporter.ts',
  'src/main/handlers/export-handlers.ts',
  'src/renderer/components/ExportModal.tsx',
  'src/shared/types/export.ts',
  'src/main/lib/devserver/',
  'src/main/handlers/devserver-handlers.ts'
];

function shouldExclude(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return ALWAYS_EXCLUDED.some((pattern) => {
    if (pattern.endsWith('/')) {
      return normalized.includes(pattern);
    }
    return normalized.endsWith(pattern) || normalized === pattern;
  });
}

function copyDir(src: string, dest: string, relativePath = ''): number {
  let count = 0;
  if (!existsSync(src)) return count;

  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    const relPath = join(relativePath, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'out', '.git', '.test-export-temp'].includes(entry.name))
        continue;
      if (shouldExclude(relPath + '/')) continue;
      mkdirSync(destPath, { recursive: true });
      count += copyDir(srcPath, destPath, relPath);
    } else {
      if (shouldExclude(relPath)) continue;
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

function copyFile(src: string, dest: string): void {
  if (!existsSync(src)) return;
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

function generateRegistry(apps: AppManifest[]): string {
  const imports: string[] = [];
  const appNames: string[] = [];
  for (const app of apps) {
    const varName = app.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'App';
    imports.push(`import { ${varName} } from './${app.id}';`);
    appNames.push(varName);
  }
  const defaultApp = appNames[0] || 'chatApp';
  return `${imports.join('\n')}
import type { AppManifest } from './types';

const apps: AppManifest[] = [
  ${appNames.join(',\n  ')}
];

export function getAllApps(): AppManifest[] {
  return apps;
}

function normalizeRoute(route: string | undefined | null): string {
  return (route ?? '').replace(/^#/, '').replace(/\\/+$/, '').toLowerCase();
}

export function getAppById(id: string): AppManifest | undefined {
  return apps.find((app) => app.id === id);
}

export function getAppByRoute(route: string): AppManifest | undefined {
  const normalized = normalizeRoute(route);
  return apps.find((app) => normalizeRoute(app.rootRoute) === normalized);
}

export function getDefaultApp(): AppManifest {
  return ${defaultApp};
}
`;
}

function generateSharedAppsIndex(apps: AppManifest[]): string {
  const exports = [`export * from './types';`, `export * from './registry';`];
  for (const app of apps) {
    exports.push(`export * from './${app.id}';`);
  }
  return exports.join('\n') + '\n';
}

function generateAppsIndex(apps: AppManifest[]): string {
  const imports: string[] = [];
  const switchCases: string[] = [];
  const renderCases: string[] = [];
  for (const app of apps) {
    const componentName =
      app.id
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('') + 'App';
    imports.push(`import ${componentName} from './${app.id}';`);
    switchCases.push(`    case '${app.id}':\n      return ${componentName};`);
    renderCases.push(`    case '${app.id}':\n      return <${componentName} />;`);
  }
  return `${imports.join('\n')}

export function getAppComponent(appId: string) {
  switch (appId) {
${switchCases.join('\n')}
    default:
      return null;
  }
}

export function AppRenderer({ appId, isPopout }: { appId: string; isPopout?: boolean }) {
  switch (appId) {
${renderCases.join('\n')}
    default:
      return null;
  }
}
`;
}

function generatePackageJson(projectName: string): string {
  const originalPkg = JSON.parse(readFileSync(join(WORKSPACE_DIR, 'package.json'), 'utf-8'));
  const displayName = projectName
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  return JSON.stringify(
    {
      ...originalPkg,
      name: projectName,
      description: displayName,
      version: '1.0.0',
      build: { ...originalPkg.build, appId: `com.test.${projectName}`, productName: displayName }
    },
    null,
    2
  );
}

function transformMainIndex(content: string): string {
  const handlersToRemove = [
    { file: 'devserver-handlers.ts', registerFn: 'registerDevServerHandlers' },
    { file: 'export-handlers.ts', registerFn: 'registerExportHandlers' }
  ];
  for (const handler of handlersToRemove) {
    const handlerName = handler.file.replace('.ts', '');
    content = content.replace(
      new RegExp(
        `import \\{ ${handler.registerFn} \\} from ['"]\\./handlers/${handlerName}['"];\\r?\\n?`,
        'g'
      ),
      ''
    );
    content = content.replace(
      new RegExp(`^[ \\t]*${handler.registerFn}\\([^;]*\\);\\r?\\n?`, 'gm'),
      ''
    );
  }
  return content;
}

function transformAppTsx(content: string): string {
  content = content.replace(/import \{ Package \} from ['"]lucide-react['"];\r?\n?/g, '');
  content = content.replace(
    /import ExportModal from ['"]@\/components\/ExportModal['"];\r?\n?/g,
    ''
  );
  content = content.replace(
    /const \[showExportModal, setShowExportModal\] = useState\(false\);\r?\n?/g,
    ''
  );
  content = content.replace(/\s*onExport=\{[^}]*\}/g, '');
  content = content.replace(
    /<button[\s\S]*?title="Export app as standalone project"[\s\S]*?<\/button>/g,
    ''
  );
  content = content.replace(/<ExportModal[\s\S]*?isOpen=\{showExportModal\}[\s\S]*?\/>/g, '');
  return content;
}

// =============================================================================
// App Selection
// =============================================================================

function pickRandomApps(count: number): AppManifest[] {
  const allApps = getAllApps().filter((app) => !app.hidden && app.exportable !== false);
  if (allApps.length < count) return allApps;
  const shuffled = [...allApps].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function resolveApps(appsConfig: string[] | 'random:3'): AppManifest[] {
  if (appsConfig === 'random:3') {
    return pickRandomApps(3);
  }
  return appsConfig.map((id) => getAppById(id)).filter((a): a is AppManifest => a !== undefined);
}

// =============================================================================
// Export Runner
// =============================================================================

async function runExport(
  apps: AppManifest[],
  projectName: string
): Promise<{ success: boolean; fileCount: number; outputDir: string }> {
  const outputDir = join(TEMP_DIR, projectName);

  // Clean up any previous run
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }
  mkdirSync(outputDir, { recursive: true });

  let fileCount = 0;

  // 1. Copy core directories
  for (const coreDir of CORE_DIRECTORIES) {
    fileCount += copyDir(join(WORKSPACE_DIR, coreDir), join(outputDir, coreDir), coreDir);
  }

  // 2. Copy core files
  for (const coreFile of CORE_FILES) {
    if (existsSync(join(WORKSPACE_DIR, coreFile))) {
      copyFile(join(WORKSPACE_DIR, coreFile), join(outputDir, coreFile));
      fileCount++;
    }
  }

  // 3. Copy config files (except package.json)
  for (const configFile of CORE_CONFIG_FILES) {
    if (configFile === 'package.json') continue;
    if (existsSync(join(WORKSPACE_DIR, configFile))) {
      copyFile(join(WORKSPACE_DIR, configFile), join(outputDir, configFile));
      fileCount++;
    }
  }

  // 4. Copy app-specific files
  copyFile(
    join(WORKSPACE_DIR, 'src/shared/apps/types.ts'),
    join(outputDir, 'src/shared/apps/types.ts')
  );
  fileCount++;

  for (const app of apps) {
    const manifestSrc = join(WORKSPACE_DIR, `src/shared/apps/${app.id}.ts`);
    if (existsSync(manifestSrc)) {
      copyFile(manifestSrc, join(outputDir, `src/shared/apps/${app.id}.ts`));
      fileCount++;
    }
    const rendererSrc = join(WORKSPACE_DIR, `src/renderer/apps/${app.id}`);
    if (existsSync(rendererSrc)) {
      fileCount += copyDir(
        rendererSrc,
        join(outputDir, `src/renderer/apps/${app.id}`),
        `src/renderer/apps/${app.id}`
      );
    }
  }

  // 5. Copy ALL skills
  const skillsDir = join(WORKSPACE_DIR, '.claude/skills');
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        fileCount += copyDir(
          join(skillsDir, entry.name),
          join(outputDir, '.claude/skills', entry.name),
          `.claude/skills/${entry.name}`
        );
      }
    }
  }

  // 6. Copy agents for selected apps
  for (const app of apps) {
    const agentDir = join(WORKSPACE_DIR, `.claude/agents/${app.id}`);
    if (existsSync(agentDir)) {
      fileCount += copyDir(
        agentDir,
        join(outputDir, `.claude/agents/${app.id}`),
        `.claude/agents/${app.id}`
      );
    }
  }

  // 7. Generate dynamic files
  mkdirSync(join(outputDir, 'src/shared/apps'), { recursive: true });
  writeFileSync(join(outputDir, 'src/shared/apps/registry.ts'), generateRegistry(apps));
  writeFileSync(join(outputDir, 'src/shared/apps/index.ts'), generateSharedAppsIndex(apps));
  mkdirSync(join(outputDir, 'src/renderer/apps'), { recursive: true });
  writeFileSync(join(outputDir, 'src/renderer/apps/index.tsx'), generateAppsIndex(apps));
  writeFileSync(join(outputDir, 'package.json'), generatePackageJson(projectName));
  fileCount += 4;

  // 8. Transform main/index.ts
  const mainIndexPath = join(outputDir, 'src/main/index.ts');
  if (existsSync(mainIndexPath)) {
    writeFileSync(mainIndexPath, transformMainIndex(readFileSync(mainIndexPath, 'utf-8')));
  }

  // 9. Transform App.tsx
  const appTsxPath = join(outputDir, 'src/renderer/App.tsx');
  if (existsSync(appTsxPath)) {
    writeFileSync(appTsxPath, transformAppTsx(readFileSync(appTsxPath, 'utf-8')));
  }

  return { success: true, fileCount, outputDir };
}

// =============================================================================
// Validation
// =============================================================================

function validateExport(outputDir: string, checks: TestChecks): ValidationResult {
  const errors: string[] = [];

  // 1. File existence checks
  for (const path of checks.shouldExist || []) {
    const fullPath = join(outputDir, path);
    if (!existsSync(fullPath)) {
      errors.push(`Missing expected: ${path}`);
    }
  }

  for (const path of checks.shouldNotExist || []) {
    const fullPath = join(outputDir, path);
    if (existsSync(fullPath)) {
      errors.push(`Should not exist: ${path}`);
    }
  }

  // 2. Handler pruning validation
  const mainIndexPath = join(outputDir, 'src/main/index.ts');
  if (existsSync(mainIndexPath)) {
    const mainIndex = readFileSync(mainIndexPath, 'utf-8');

    for (const handler of checks.handlersPresent || []) {
      if (!mainIndex.includes(handler)) {
        errors.push(`Missing handler: ${handler}`);
      }
    }

    for (const handler of checks.handlersAbsent || []) {
      if (mainIndex.includes(handler)) {
        errors.push(`Handler should be pruned: ${handler}`);
      }
    }
  }

  return { success: errors.length === 0, errors };
}

// =============================================================================
// NPM Commands
// =============================================================================

function runNpmInstall(outputDir: string): { success: boolean; output: string } {
  try {
    const result = spawnSync('npm', ['install'], {
      cwd: outputDir,
      shell: true,
      stdio: 'pipe',
      timeout: 5 * 60 * 1000
    });
    return {
      success: result.status === 0,
      output: result.stderr?.toString() || result.stdout?.toString() || ''
    };
  } catch (error) {
    return { success: false, output: String(error) };
  }
}

function runNpmBuild(outputDir: string): { success: boolean; output: string } {
  try {
    const result = spawnSync('npm', ['run', 'build'], {
      cwd: outputDir,
      shell: true,
      stdio: 'pipe',
      timeout: 5 * 60 * 1000
    });
    return {
      success: result.status === 0,
      output: result.stderr?.toString() || result.stdout?.toString() || ''
    };
  } catch (error) {
    return { success: false, output: String(error) };
  }
}

// =============================================================================
// Suite Runner
// =============================================================================

async function runSuite(
  suite: TestSuite,
  suiteIndex: number,
  totalSuites: number
): Promise<SuiteResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const projectName = `test-suite-${suiteIndex + 1}`;

  console.log(
    `\n${colors.cyan}[Suite ${suiteIndex + 1}/${totalSuites}]${colors.reset} ${colors.bold}${suite.name}${colors.reset}`
  );

  // Resolve apps
  const apps = resolveApps(suite.apps);
  if (apps.length === 0) {
    errors.push('No apps resolved');
    return { name: suite.name, success: false, duration: 0, errors, apps: [], fileCount: 0 };
  }

  if (suite.apps === 'random:3') {
    logInfo(`Apps: ${apps.map((a) => a.id).join(', ')}`);
  }

  // Step 1: Export
  const exportResult = await runExport(apps, projectName);
  if (!exportResult.success) {
    logError('Export failed');
    errors.push('Export failed');
    return {
      name: suite.name,
      success: false,
      duration: (Date.now() - startTime) / 1000,
      errors,
      apps: apps.map((a) => a.id),
      fileCount: 0
    };
  }
  logSuccess(`Export completed (${exportResult.fileCount} files)`);

  // Step 2: Validate files and handlers
  const hasChecks =
    (suite.checks.shouldExist?.length || 0) +
      (suite.checks.shouldNotExist?.length || 0) +
      (suite.checks.handlersPresent?.length || 0) +
      (suite.checks.handlersAbsent?.length || 0) >
    0;

  if (hasChecks) {
    const validation = validateExport(exportResult.outputDir, suite.checks);
    if (validation.success) {
      const checkCount =
        (suite.checks.shouldExist?.length || 0) + (suite.checks.shouldNotExist?.length || 0);
      const handlerCount =
        (suite.checks.handlersPresent?.length || 0) + (suite.checks.handlersAbsent?.length || 0);
      if (checkCount > 0) logSuccess(`File validation passed (${checkCount} checks)`);
      if (handlerCount > 0) logSuccess(`Handler validation passed (${handlerCount} handlers)`);
    } else {
      logError('Validation failed');
      for (const err of validation.errors) {
        logInfo(err);
        errors.push(err);
      }
      // Don't fail the whole suite for validation errors - continue to build
    }
  }

  // Step 3: npm install
  const installResult = runNpmInstall(exportResult.outputDir);
  if (!installResult.success) {
    logError('npm install failed');
    logInfo(installResult.output.slice(0, 500));
    errors.push('npm install failed');
    return {
      name: suite.name,
      success: false,
      duration: (Date.now() - startTime) / 1000,
      errors,
      apps: apps.map((a) => a.id),
      fileCount: exportResult.fileCount
    };
  }
  logSuccess('npm install completed');

  // Step 4: npm run build
  const buildResult = runNpmBuild(exportResult.outputDir);
  if (!buildResult.success) {
    logError('npm run build failed');
    logInfo(buildResult.output.slice(0, 1000));
    errors.push('npm run build failed');
    return {
      name: suite.name,
      success: false,
      duration: (Date.now() - startTime) / 1000,
      errors,
      apps: apps.map((a) => a.id),
      fileCount: exportResult.fileCount
    };
  }
  logSuccess('npm run build completed');

  const duration = (Date.now() - startTime) / 1000;
  const success = errors.length === 0;

  if (success) {
    log(
      `  ${colors.green}→ PASSED${colors.reset} ${colors.dim}(${duration.toFixed(1)}s)${colors.reset}`
    );
  } else {
    log(
      `  ${colors.red}→ FAILED${colors.reset} ${colors.dim}(${duration.toFixed(1)}s)${colors.reset}`
    );
  }

  return {
    name: suite.name,
    success,
    duration,
    errors,
    apps: apps.map((a) => a.id),
    fileCount: exportResult.fileCount
  };
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('='.repeat(80));
  log('  E2E EXPORT TEST SUITE', colors.cyan);
  console.log('='.repeat(80));

  const startTime = Date.now();
  const results: SuiteResult[] = [];

  // Clean up temp directory at start
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  try {
    // Run each suite sequentially
    for (let i = 0; i < TEST_SUITES.length; i++) {
      const result = await runSuite(TEST_SUITES[i], i, TEST_SUITES.length);
      results.push(result);
    }
  } finally {
    // Cleanup
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  }

  // Summary
  const totalDuration = (Date.now() - startTime) / 1000;
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log('\n' + '='.repeat(80));

  if (failed === 0) {
    log(`  ALL ${passed} SUITES PASSED (${totalDuration.toFixed(1)}s total)`, colors.green);
  } else {
    log(
      `  ${failed}/${results.length} SUITES FAILED (${totalDuration.toFixed(1)}s total)`,
      colors.red
    );
    console.log('\n  Failed suites:');
    for (const result of results.filter((r) => !r.success)) {
      console.log(`    ${colors.red}✗${colors.reset} ${result.name}`);
      for (const err of result.errors) {
        console.log(`      ${colors.dim}→ ${err}${colors.reset}`);
      }
    }
  }

  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  process.exit(1);
});
