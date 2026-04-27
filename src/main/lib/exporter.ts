import { createWriteStream, existsSync, readdirSync } from 'fs';
import { copyFile, mkdir, readFile, stat, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import archiver from 'archiver';
import { app, BrowserWindow } from 'electron';

import { getAllApps, getAppById, type AppManifest } from '../../shared/apps';
import type { AppFeature } from '../../shared/apps/types';
import type {
  ExportableApp,
  ExportConfig,
  ExportFileEntry,
  ExportPreview,
  ExportProgress
} from '../../shared/types/export';

// Active export jobs (for cancellation support)
const activeJobs = new Map<string, { cancelled: boolean }>();

/**
 * Get the project root directory (where package.json lives)
 */
function getProjectRoot(): string {
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
  if (isDev) {
    return app.getAppPath();
  } else {
    // In production, app.getAppPath() returns the path inside app.asar
    // We need the actual resource directory
    return join(process.resourcesPath, 'app.asar.unpacked');
  }
}

/**
 * Get all exportable apps
 */
export function getExportableApps(): ExportableApp[] {
  const apps = getAllApps();
  return apps
    .filter((app) => !app.hidden && app.exportable !== false)
    .map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      skills: app.skills
    }));
}

/**
 * Collect all required skills from selected apps
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function collectSkills(appIds: string[]): string[] {
  const skillSet = new Set<string>();
  for (const appId of appIds) {
    const appManifest = getAppById(appId);
    if (appManifest) {
      for (const skill of appManifest.skills) {
        skillSet.add(skill);
      }
    }
  }
  return Array.from(skillSet);
}

/**
 * Core directories that are always included in export
 */
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

/**
 * Core files (not in directories) that are always included
 */
const CORE_FILES = [
  'src/shared/constants.ts',
  'src/renderer/App.tsx',
  'src/renderer/main.tsx',
  'src/renderer/index.html',
  'src/renderer/index.css',
  'src/renderer/electron.d.ts',
  'src/renderer/apps/shared/settingsTypes.ts'
];

/**
 * Core config files that are always included
 */
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

/**
 * Files and directories to ALWAYS exclude from export
 * These are development-only or self-referential (export shouldn't include export code)
 */
const ALWAYS_EXCLUDED = [
  // Export-related code (standalone apps shouldn't be able to export themselves)
  'src/main/lib/exporter.ts',
  'src/main/handlers/export-handlers.ts',
  'src/renderer/components/ExportModal.tsx',
  'src/shared/types/export.ts',
  // Dev server is development-only
  'src/main/lib/devserver/',
  'src/main/handlers/devserver-handlers.ts'
];

/**
 * Feature modules - maps feature names to the files they require.
 * Files not in any feature module are always included (core functionality).
 * Handler names map to both the handler file and the registration function name.
 */
type FeatureModule = {
  handlers?: { file: string; registerFn: string; args?: string }[];
  libs?: string[];
  components?: string[];
  pages?: string[];
  hooks?: string[];
  constants?: string[];
};

const FEATURE_MODULES: Record<AppFeature, FeatureModule> = {
  chat: {
    handlers: [
      { file: 'chat-handlers.ts', registerFn: 'registerChatHandlers' },
      { file: 'conversation-handlers.ts', registerFn: 'registerConversationHandlers' }
    ],
    libs: [
      'conversation-db.ts',
      // Note: pi-session.ts is NOT excluded because config-handlers.ts depends on it
      // Note: message-queue.ts is NOT excluded because pi-session.ts depends on it
      'session/',
      'url-extractor.ts'
    ],
    components: [
      'ChatHistoryDrawer.tsx',
      'ChatInput.tsx',
      'Message.tsx',
      'MessageList.tsx',
      'BlockGroup.tsx',
      'Markdown.tsx',
      'ToolUse.tsx',
      'AttachmentPreviewList.tsx',
      'tools/'
    ],
    pages: ['Chat.tsx'],
    hooks: ['useagentChat.ts', 'useAutoScroll.ts'],
    constants: ['chatSuggestions.ts']
  },
  filesystem: {
    handlers: [
      {
        file: 'filesystem-handlers.ts',
        registerFn: 'registerFilesystemHandlers',
        args: '() => mainWindow'
      }
    ]
  },
  shell: {
    handlers: [{ file: 'shell-handlers.ts', registerFn: 'registerShellHandlers' }]
  },
  project: {
    handlers: [{ file: 'project-handlers.ts', registerFn: 'registerProjectHandlers' }]
  },
  usage: {
    handlers: [{ file: 'usage-handlers.ts', registerFn: 'registerUsageHandlers' }],
    libs: ['usage-monitor/']
  }
};

/**
 * Collect all required features from selected apps.
 * Returns null if ANY app lacks a features declaration (safe default: include all handlers).
 * Only returns a feature set when ALL apps explicitly declare their features.
 */
function collectFeatures(appIds: string[]): Set<AppFeature> | null {
  const features = new Set<AppFeature>();
  for (const appId of appIds) {
    const appManifest = getAppById(appId);
    // If ANY app lacks features declaration, return null to disable optimization
    // This ensures we don't accidentally exclude handlers that an app needs
    if (!appManifest?.features) {
      return null;
    }
    for (const feature of appManifest.features) {
      features.add(feature);
    }
  }
  return features;
}

/**
 * Build exclusion patterns based on unused features.
 * If requiredFeatures is null, returns empty array (include all handlers).
 */
function buildFeatureExclusions(requiredFeatures: Set<AppFeature> | null): string[] {
  // If null, no exclusions - include all handlers (safe default)
  if (requiredFeatures === null) {
    return [];
  }

  const exclusions: string[] = [];

  for (const [feature, module] of Object.entries(FEATURE_MODULES) as [
    AppFeature,
    FeatureModule
  ][]) {
    if (requiredFeatures.has(feature)) continue; // Feature is required, don't exclude

    // Exclude handlers
    if (module.handlers) {
      for (const handler of module.handlers) {
        exclusions.push(`src/main/handlers/${handler.file}`);
      }
    }

    // Exclude libs
    if (module.libs) {
      for (const lib of module.libs) {
        exclusions.push(`src/main/lib/${lib}`);
      }
    }

    // Exclude components
    if (module.components) {
      for (const comp of module.components) {
        exclusions.push(`src/renderer/components/${comp}`);
      }
    }

    // Exclude pages
    if (module.pages) {
      for (const page of module.pages) {
        exclusions.push(`src/renderer/pages/${page}`);
      }
    }

    // Exclude hooks
    if (module.hooks) {
      for (const hook of module.hooks) {
        exclusions.push(`src/renderer/hooks/${hook}`);
      }
    }

    // Exclude constants
    if (module.constants) {
      for (const constant of module.constants) {
        exclusions.push(`src/renderer/constants/${constant}`);
      }
    }
  }

  return exclusions;
}

/**
 * Get handlers that should be removed from main/index.ts
 */
function getExcludedHandlers(
  requiredFeatures: Set<AppFeature> | null
): { file: string; registerFn: string; args?: string }[] {
  // If null, no exclusions - include all handlers (safe default)
  if (requiredFeatures === null) {
    return [];
  }

  const excluded: { file: string; registerFn: string; args?: string }[] = [];

  for (const [feature, module] of Object.entries(FEATURE_MODULES) as [
    AppFeature,
    FeatureModule
  ][]) {
    if (requiredFeatures.has(feature)) continue;
    if (module.handlers) {
      excluded.push(...module.handlers);
    }
  }

  return excluded;
}

/**
 * Check if a file path matches an exclusion pattern
 */
function matchesExclusionPattern(filePath: string, pattern: string): boolean {
  if (pattern.endsWith('/')) {
    // Directory pattern - exclude anything under this directory
    return filePath.startsWith(pattern) || filePath.includes('/' + pattern);
  }
  // Exact file match
  return filePath === pattern || filePath.endsWith('/' + pattern);
}

/**
 * Check if a file path should be excluded from export
 */
function shouldExcludeFile(filePath: string, featureExclusions: string[] = []): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');

  // Check always-excluded patterns
  if (ALWAYS_EXCLUDED.some((pattern) => matchesExclusionPattern(normalizedPath, pattern))) {
    return true;
  }

  // Check feature-based exclusions
  if (featureExclusions.some((pattern) => matchesExclusionPattern(normalizedPath, pattern))) {
    return true;
  }

  return false;
}

/**
 * Files that need branding replacement during copy
 */
const BRANDING_FILES = [
  'src/renderer/index.html',
  'src/main/index.ts',
  'src/main/lib/layered-config.ts',
  'src/main/lib/config.ts',
  'src/renderer/components/MessageList.tsx',
  'src/renderer/core/AppShell.tsx',
  'src/renderer/core/Launcher.tsx'
];

/**
 * Check if a file needs branding replacement
 */
function needsBrandingReplacement(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return BRANDING_FILES.some((f) => normalizedPath === f || normalizedPath.endsWith('/' + f));
}

/**
 * Check if file is src/main/index.ts (needs special transformation)
 */
function isMainIndexFile(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return normalizedPath === 'src/main/index.ts' || normalizedPath.endsWith('/src/main/index.ts');
}

/**
 * Check if file is src/renderer/App.tsx (needs export code removal)
 */
function isAppTsxFile(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return (
    normalizedPath === 'src/renderer/App.tsx' || normalizedPath.endsWith('/src/renderer/App.tsx')
  );
}

/**
 * Transform src/main/index.ts to remove excluded handler imports and registrations
 */
function transformMainIndex(
  content: string,
  excludedHandlers: { file: string; registerFn: string }[]
): string {
  // Always remove devserver and export handlers (they're in ALWAYS_EXCLUDED)
  const alwaysExcludedHandlers = [
    { file: 'devserver-handlers.ts', registerFn: 'registerDevServerHandlers' },
    { file: 'export-handlers.ts', registerFn: 'registerExportHandlers' }
  ];

  const allExcluded = [...alwaysExcludedHandlers, ...excludedHandlers];

  for (const handler of allExcluded) {
    // Remove import line
    const handlerName = handler.file.replace('.ts', '');
    const importRegex = new RegExp(
      `import \\{ ${handler.registerFn} \\} from ['"]\\./handlers/${handlerName}['"];\\r?\\n?`,
      'g'
    );
    content = content.replace(importRegex, '');

    // Remove registration call (match entire line, handles arrow function args)
    const registerRegex = new RegExp(`^[ \\t]*${handler.registerFn}\\([^;]*\\);\\r?\\n?`, 'gm');
    content = content.replace(registerRegex, '');
  }

  return content;
}

/**
 * Transform src/renderer/App.tsx to remove export-related code
 */
function transformAppTsx(content: string): string {
  // Remove Package icon import (only used for export button)
  content = content.replace(/import \{ Package \} from ['"]lucide-react['"];\r?\n?/g, '');

  // Remove ExportModal import
  content = content.replace(
    /import ExportModal from ['"]@\/components\/ExportModal['"];\r?\n?/g,
    ''
  );

  // Remove showExportModal useState
  content = content.replace(
    /const \[showExportModal, setShowExportModal\] = useState\(false\);\r?\n?/g,
    ''
  );

  // Remove onExport prop from FloatingNav
  content = content.replace(/\s*onExport=\{[^}]*\}/g, '');

  // Remove the entire Export button in standard layout (the button with title="Export app...")
  content = content.replace(
    /<button[\s\S]*?title="Export app as standalone project"[\s\S]*?<\/button>/g,
    ''
  );

  // Remove the entire ExportModal component usage (multiline)
  content = content.replace(/<ExportModal[\s\S]*?isOpen=\{showExportModal\}[\s\S]*?\/>/g, '');

  return content;
}

/**
 * Copy a file with optional transformations (branding replacement, handler removal)
 */
async function copyFileWithBranding(
  srcPath: string,
  destPath: string,
  filePath: string,
  displayName: string,
  excludedHandlers: { file: string; registerFn: string }[] = []
): Promise<void> {
  const needsBranding = needsBrandingReplacement(filePath);
  const needsMainTransform = isMainIndexFile(filePath);
  const needsAppTransform = isAppTsxFile(filePath);

  if (needsBranding || needsMainTransform || needsAppTransform) {
    // Read, transform, and write
    let content = await readFile(srcPath, 'utf-8');

    if (needsBranding) {
      content = content.replace(/Pi SDK Starter Kit/g, displayName);
    }

    if (needsMainTransform) {
      content = transformMainIndex(content, excludedHandlers);
    }

    if (needsAppTransform) {
      content = transformAppTsx(content);
    }

    await writeFile(destPath, content, 'utf-8');
  } else {
    // Simple copy for non-transformed files
    await copyFile(srcPath, destPath);
  }
}

/**
 * Recursively collect all files in a directory
 */
async function collectFilesInDir(
  baseDir: string,
  dirPath: string,
  type: ExportFileEntry['type'],
  featureExclusions: string[] = []
): Promise<ExportFileEntry[]> {
  const files: ExportFileEntry[] = [];
  const fullPath = join(baseDir, dirPath);

  if (!existsSync(fullPath)) {
    return files;
  }

  const entries = readdirSync(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    const fullEntryPath = join(baseDir, entryPath);

    if (entry.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (['node_modules', 'dist', 'out', '.git'].includes(entry.name)) {
        continue;
      }
      // Skip excluded directories
      const normalizedDirPath = entryPath.replace(/\\/g, '/') + '/';
      if (shouldExcludeFile(normalizedDirPath, featureExclusions)) {
        continue;
      }
      const subFiles = await collectFilesInDir(baseDir, entryPath, type, featureExclusions);
      files.push(...subFiles);
    } else {
      const normalizedEntryPath = entryPath.replace(/\\/g, '/');
      // Skip excluded files
      if (shouldExcludeFile(normalizedEntryPath, featureExclusions)) {
        continue;
      }
      try {
        const stats = await stat(fullEntryPath);
        files.push({
          path: normalizedEntryPath,
          type,
          size: stats.size
        });
      } catch {
        // Skip files we can't stat
      }
    }
  }

  return files;
}

/**
 * Generate export preview
 */
export async function generateExportPreview(config: ExportConfig): Promise<ExportPreview> {
  const projectRoot = getProjectRoot();
  const files: ExportFileEntry[] = [];

  // Compute feature-based exclusions
  const requiredFeatures = collectFeatures(config.selectedAppIds);
  const featureExclusions = buildFeatureExclusions(requiredFeatures);

  // 1. Collect core directories
  for (const coreDir of CORE_DIRECTORIES) {
    const dirFiles = await collectFilesInDir(projectRoot, coreDir, 'core', featureExclusions);
    files.push(...dirFiles);
  }

  // 2. Collect core files (individual files not in directories)
  for (const coreFile of CORE_FILES) {
    const fullPath = join(projectRoot, coreFile);
    if (existsSync(fullPath)) {
      try {
        const stats = await stat(fullPath);
        files.push({
          path: coreFile,
          type: 'core',
          size: stats.size
        });
      } catch {
        // Skip files we can't stat
      }
    }
  }

  // 3. Collect core config files
  for (const configFile of CORE_CONFIG_FILES) {
    const fullPath = join(projectRoot, configFile);
    if (existsSync(fullPath)) {
      try {
        const stats = await stat(fullPath);
        files.push({
          path: configFile,
          type: 'config',
          size: stats.size
        });
      } catch {
        // Skip files we can't stat
      }
    }
  }

  // 4. Collect app-specific files
  // src/shared/apps/types.ts is always needed
  const typesPath = join(projectRoot, 'src/shared/apps/types.ts');
  if (existsSync(typesPath)) {
    const stats = await stat(typesPath);
    files.push({
      path: 'src/shared/apps/types.ts',
      type: 'app',
      size: stats.size
    });
  }

  // Note: src/shared/apps/index.ts is generated dynamically during export, not copied

  // Collect selected app manifests and renderer code
  for (const appId of config.selectedAppIds) {
    // App manifest in shared/apps
    const manifestPath = `src/shared/apps/${appId}.ts`;
    const fullManifestPath = join(projectRoot, manifestPath);
    if (existsSync(fullManifestPath)) {
      const stats = await stat(fullManifestPath);
      files.push({
        path: manifestPath,
        type: 'app',
        size: stats.size
      });
    }

    // App renderer directory
    const appRendererDir = `src/renderer/apps/${appId}`;
    const appRendererFiles = await collectFilesInDir(projectRoot, appRendererDir, 'app');
    files.push(...appRendererFiles);
  }

  // 5. Collect ALL skills (export everything from .agents/skills/)
  // This prevents runtime "skill not found" errors - skills are tiny files so export all
  const skillsDir = join(projectRoot, '.agents/skills');
  const allSkills: string[] = [];
  if (existsSync(skillsDir)) {
    const skillEntries = readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of skillEntries) {
      if (entry.isDirectory()) {
        allSkills.push(entry.name);
        const skillFiles = await collectFilesInDir(
          projectRoot,
          `.agents/skills/${entry.name}`,
          'skill'
        );
        files.push(...skillFiles);
      }
    }
  }

  // 6. Collect agents (stored in .agents/agents/{appId}/)
  for (const appId of config.selectedAppIds) {
    const agentDir = `.agents/agents/${appId}`;
    const agentDirPath = join(projectRoot, agentDir);
    if (existsSync(agentDirPath)) {
      const agentFiles = await collectFilesInDir(projectRoot, agentDir, 'skill');
      files.push(...agentFiles);
    }
  }

  // 7. Collect additional shared directories declared by apps
  const sharedDirs = new Set<string>();
  for (const appId of config.selectedAppIds) {
    const appManifest = getAppById(appId);
    if (appManifest?.sharedDirs) {
      for (const dir of appManifest.sharedDirs) {
        sharedDirs.add(dir);
      }
    }
  }
  for (const sharedDir of sharedDirs) {
    const dirFiles = await collectFilesInDir(projectRoot, sharedDir, 'core');
    files.push(...dirFiles);
  }

  // 8. Collect additional .agents assets declared by apps
  const agentAssets = new Set<string>();
  for (const appId of config.selectedAppIds) {
    const appManifest = getAppById(appId);
    if (appManifest?.agentAssets) {
      for (const asset of appManifest.agentAssets) {
        agentAssets.add(asset);
      }
    }
  }
  for (const asset of agentAssets) {
    const assetPath = `.agents/${asset}`;
    const assetFullPath = join(projectRoot, assetPath);
    if (existsSync(assetFullPath)) {
      const assetFiles = await collectFilesInDir(projectRoot, assetPath, 'skill');
      files.push(...assetFiles);
    }
  }

  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return {
    files,
    totalSize,
    skills: allSkills
  };
}

/**
 * Generate registry.ts content for selected apps
 */
function generateRegistryContent(appIds: string[], manifests: AppManifest[]): string {
  const imports: string[] = [];
  const appNames: string[] = [];

  for (const appId of appIds) {
    const manifest = manifests.find((m) => m.id === appId);
    if (manifest) {
      const varName = appId
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((part, index) => {
          const lower = part.toLowerCase();
          return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join('') + 'App';
      imports.push(`import { ${varName} } from './${appId}';`);
      appNames.push(varName);
    }
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

/**
 * Generate src/shared/apps/index.ts for selected apps
 */
function generateSharedAppsIndexContent(appIds: string[]): string {
  const exports: string[] = [`export * from './types';`, `export * from './registry';`];

  for (const appId of appIds) {
    exports.push(`export * from './${appId}';`);
  }

  return exports.join('\n') + '\n';
}

/**
 * Generate renderer apps index.tsx for selected apps
 */
function generateAppsIndexContent(appIds: string[], manifests: AppManifest[]): string {
  const imports: string[] = [];
  const switchCases: string[] = [];
  const renderCases: string[] = [];

  for (const appId of appIds) {
    const manifest = manifests.find((m) => m.id === appId);
    if (manifest) {
      // Convert app-id to PascalCase for component name
      const componentName =
        appId
          .split('-')
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join('') + 'App';
      imports.push(`import ${componentName} from './${appId}';`);
      switchCases.push(`    case '${appId}':\n      return ${componentName};`);
      renderCases.push(`    case '${appId}':\n      return <${componentName} />;`);
    }
  }

  return `${imports.join('\n')}

export function getAppComponent(appId: string) {
  switch (appId) {
${switchCases.join('\n')}
    default:
      return null;
  }
}

// Wrapper component that renders the appropriate app based on appId
// This avoids the "component created during render" lint error
export function AppRenderer({ appId, isPopout }: { appId: string; isPopout?: boolean }) {
  switch (appId) {
${renderCases.join('\n')}
    default:
      return null;
  }
}
`;
}

function toAppIdentifier(appId: string): string {
  return appId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, index) => {
      const lower = part.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

function toPascalIdentifier(appId: string): string {
  const camel = toAppIdentifier(appId);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function generateSettingsRegistryContent(projectRoot: string, appIds: string[]): string {
  const imports: string[] = [];
  const entries: string[] = [];

  for (const appId of appIds) {
    const panelPath = join(projectRoot, 'src', 'renderer', 'apps', appId, 'AppSettingsPanel.tsx');
    if (!existsSync(panelPath)) continue;

    const componentName = `${toPascalIdentifier(appId)}AppSettingsPanel`;
    imports.push(`import { ${componentName} } from './${appId}/AppSettingsPanel';`);
    entries.push(`  '${appId}': ${componentName}`);
  }

  return `import type { ComponentType } from 'react';

import type { AppManifest } from '../../shared/apps';
import type { AppSettingsPanelProps } from './shared/settingsTypes';
${imports.length > 0 ? `${imports.join('\n')}\n` : ''}
type PanelComponent = ComponentType<AppSettingsPanelProps>;

const registry: Record<string, PanelComponent> = {
${entries.join(',\n')}
};

export function getAppSettingsPanel(app: AppManifest | undefined): PanelComponent | null {
  if (!app) return null;
  return registry[app.id] ?? null;
}
`;
}

/**
 * Generate package.json for exported project
 */
async function generatePackageJson(projectRoot: string, config: ExportConfig): Promise<string> {
  const originalPkgPath = join(projectRoot, 'package.json');
  const originalPkg = JSON.parse(await readFile(originalPkgPath, 'utf-8'));

  // Generate a display name from project name (e.g., "my-app" -> "My App")
  const displayName = config.projectName
    .split('-')
    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  const exportedPkg = {
    ...originalPkg,
    name: config.projectName,
    description: displayName,
    version: '1.0.0',
    // Keep the build config but update branding
    build: {
      ...originalPkg.build,
      appId: `com.export.${config.projectName.replace(/[^a-z0-9]/gi, '-')}`,
      productName: config.projectName
        .split('-')
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }
  };

  return JSON.stringify(exportedPkg, null, 2);
}

/**
 * Generate README for exported project
 */
function generateReadme(config: ExportConfig, skills: string[]): string {
  const appList = config.selectedAppIds.map((id) => `- ${id}`).join('\n');
  const skillList = skills.length > 0 ? skills.map((s) => `- ${s}`).join('\n') : '(none)';
  const displayName = config.projectName
    .split('-')
    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  return `# ${displayName}

An Electron application powered by the Pi SDK.

## Included Apps

${appList}

## Included Skills

${skillList}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   bun install
   \`\`\`

2. Sign in to Codex OAuth with Pi (\`pi\`, then \`/login\`, then ChatGPT Plus/Pro), or configure GLM in Settings if this app uses GLM.

3. Run in development:
   \`\`\`bash
   bun run dev
   \`\`\`

4. Build for production:
   \`\`\`bash
   bun run build
   bun run build:mac  # or build:win
   \`\`\`

## License

MIT
`;
}

/**
 * Send progress update to renderer
 */
function sendProgress(progress: ExportProgress): void {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send('export:progress', progress);
  }
}

/**
 * Run the export process
 */
export async function runExport(config: ExportConfig): Promise<{ jobId: string }> {
  const jobId = `export-${Date.now()}`;
  const jobState = { cancelled: false };
  activeJobs.set(jobId, jobState);

  // Run export in background
  doExport(jobId, config, jobState).catch((error) => {
    console.error('Export failed:', error);
    sendProgress({
      jobId,
      status: 'error',
      current: 0,
      total: 0,
      error: error instanceof Error ? error.message : 'Export failed'
    });
  });

  return { jobId };
}

/**
 * Cancel an export job
 */
export function cancelExport(jobId: string): boolean {
  const job = activeJobs.get(jobId);
  if (job) {
    job.cancelled = true;
    return true;
  }
  return false;
}

/**
 * Perform the actual export
 */
async function doExport(
  jobId: string,
  config: ExportConfig,
  jobState: { cancelled: boolean }
): Promise<void> {
  const projectRoot = getProjectRoot();
  const outputDir = join(config.outputDir, config.projectName);
  const zipPath = join(config.outputDir, `${config.projectName}.zip`);

  // Generate display name for branding replacement
  const displayName = config.projectName
    .split('-')
    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  // Compute feature-based exclusions for handler transformation
  const requiredFeatures = collectFeatures(config.selectedAppIds);
  const excludedHandlers = getExcludedHandlers(requiredFeatures);

  try {
    sendProgress({
      jobId,
      status: 'preparing',
      current: 0,
      total: 0
    });

    // Generate preview to get file list
    const preview = await generateExportPreview(config);
    const files = preview.files;
    const total = files.length + 6; // +6 for generated files (registry, shared/apps/index, renderer/apps/index, package.json, README, zip)

    if (jobState.cancelled) {
      sendProgress({ jobId, status: 'cancelled', current: 0, total });
      return;
    }

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Copy files
    let current = 0;
    sendProgress({ jobId, status: 'copying', current, total });

    for (const file of files) {
      if (jobState.cancelled) {
        sendProgress({ jobId, status: 'cancelled', current, total });
        return;
      }

      const srcPath = join(projectRoot, file.path);
      const destPath = join(outputDir, file.path);

      // Ensure destination directory exists
      await mkdir(dirname(destPath), { recursive: true });

      // Copy file with branding replacement and handler removal if needed
      await copyFileWithBranding(srcPath, destPath, file.path, displayName, excludedHandlers);

      current++;
      sendProgress({
        jobId,
        status: 'copying',
        current,
        total,
        currentFile: file.path
      });
    }

    // Generate registry.ts
    sendProgress({ jobId, status: 'generating', current, total, currentFile: 'registry.ts' });
    const manifests = config.selectedAppIds
      .map((id) => getAppById(id))
      .filter(Boolean) as AppManifest[];
    const registryContent = generateRegistryContent(config.selectedAppIds, manifests);
    await mkdir(join(outputDir, 'src/shared/apps'), { recursive: true });
    await writeFile(join(outputDir, 'src/shared/apps/registry.ts'), registryContent);
    current++;

    // Generate shared/apps/index.ts
    sendProgress({
      jobId,
      status: 'generating',
      current,
      total,
      currentFile: 'shared/apps/index.ts'
    });
    const sharedAppsIndexContent = generateSharedAppsIndexContent(config.selectedAppIds);
    await writeFile(join(outputDir, 'src/shared/apps/index.ts'), sharedAppsIndexContent);
    current++;

    // Generate renderer apps index.tsx
    sendProgress({ jobId, status: 'generating', current, total, currentFile: 'apps/index.tsx' });
    const appsIndexContent = generateAppsIndexContent(config.selectedAppIds, manifests);
    await mkdir(join(outputDir, 'src/renderer/apps'), { recursive: true });
    await writeFile(join(outputDir, 'src/renderer/apps/index.tsx'), appsIndexContent);
    current++;

    // Generate renderer apps settingsRegistry.ts
    sendProgress({
      jobId,
      status: 'generating',
      current,
      total,
      currentFile: 'apps/settingsRegistry.ts'
    });
    const settingsRegistryContent = generateSettingsRegistryContent(
      projectRoot,
      config.selectedAppIds
    );
    await writeFile(
      join(outputDir, 'src/renderer/apps/settingsRegistry.ts'),
      settingsRegistryContent
    );
    current++;

    // Generate package.json
    sendProgress({ jobId, status: 'generating', current, total, currentFile: 'package.json' });
    const packageJson = await generatePackageJson(projectRoot, config);
    await writeFile(join(outputDir, 'package.json'), packageJson);
    current++;

    // Generate README
    if (config.includeReadme !== false) {
      sendProgress({ jobId, status: 'generating', current, total, currentFile: 'README.md' });
      const readme = generateReadme(config, preview.skills);
      await writeFile(join(outputDir, 'README.md'), readme);
    }
    current++;

    // Create zip file
    sendProgress({
      jobId,
      status: 'zipping',
      current,
      total,
      currentFile: `${config.projectName}.zip`
    });
    await createZip(outputDir, zipPath);
    current++;

    // Done!
    sendProgress({
      jobId,
      status: 'complete',
      current: total,
      total,
      outputPath: outputDir,
      zipPath
    });
  } finally {
    activeJobs.delete(jobId);
  }
}

/**
 * Create a zip archive of the output directory
 */
function createZip(sourceDir: string, zipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, basename(sourceDir));
    archive.finalize();
  });
}
