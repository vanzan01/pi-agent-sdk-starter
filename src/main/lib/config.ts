import { existsSync, readFileSync, writeFileSync } from 'fs';
import { chmod, cp, mkdir, rm } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { app } from 'electron';

import {
  DEFAULT_THINKING_LEVEL,
  THINKING_PRESETS,
  type ThinkingLevel
} from '../../shared/constants';
import type { ChatModelPreference, ModelProvider } from '../../shared/core';
import { DEFAULT_GLM_BASE_URL } from '../../shared/core';
import {
  getConfigStatus,
  getConfigValue,
  getCurrentProjectDir,
  getFinnhubApiKeyWithSource as getFinnhubApiKeyWithSourceFromEnv,
  getGlmApiKeyWithSource as getGlmApiKeyWithSourceFromEnv,
  getMergedConfig,
  getPerplexityApiKeyWithSource as getPerplexityApiKeyWithSourceFromEnv,
  hasProjectConfig,
  initProjectConfig,
  loadProjectConfig,
  saveProjectConfig,
  setConfigValue,
  setCurrentProjectDir,
  setEnvValue,
  type ConfigSchema,
  type ConfigSource,
  type ConfigValue,
  type PiModelReference
} from './layered-config';

// Re-export layered config utilities for external use
export {
  type ConfigSchema,
  type ConfigSource,
  type ConfigValue,
  loadProjectConfig,
  saveProjectConfig,
  getCurrentProjectDir,
  setCurrentProjectDir,
  getConfigValue,
  setConfigValue,
  getMergedConfig,
  hasProjectConfig,
  initProjectConfig,
  getConfigStatus
};

// Note: Additional WithSource functions are exported below:
// - getDebugModeWithSource
// - getThinkingLevelWithSource
// - getSystemPromptAppendWithSource

/**
 * Default system prompt append for Pi SDK Starter Kit.
 */
export const DEFAULT_SYSTEM_PROMPT_APPEND = `**Workspace Context:**
This is a multi-purpose workspace for diverse projects, scripts, and workflows—not a single monolithic codebase. Each subdirectory may represent different applications or tasks. Always understand context before making assumptions about project structure.

**Provider identity:**
This app routes through Pi SDK providers only. Do not claim to be an unrelated provider or model family. If asked about model identity, use the configured provider/model from the app rather than self-identifying from training data.

**Tooling preferences:**
- JavaScript/TypeScript: Use bun (not node/npm/npx).
- Python: Use uv (not python/pip/conda). Write scripts to files (e.g., temp.py) instead of inline -c commands and run with uv run --with <deps> script.py.

**Memory:**
Maintain \`AGENTS.md\` in the workspace root as your persistent memory. Update continuously (not just when asked) with: database schemas, project patterns, code snippets, user preferences, and anything useful for future tasks.`;

// Lightweight per-app settings stored in layered config
export type AppSettings = {
  promptAppend?: string | null;
  starterPrompt?: string | null;
  defaults?: {
    depth?: number | null;
    limit?: number | null;
  };
};

// ============================================================================
// Workspace Directory Management
// ============================================================================

// File to store last used workspace path (minimal persistence)
const WORKSPACE_STATE_FILE = 'workspace-state.json';

interface WorkspaceState {
  lastWorkspaceDir?: string;
}

function getWorkspaceStatePath(): string {
  return join(app.getPath('userData'), WORKSPACE_STATE_FILE);
}

function loadWorkspaceState(): WorkspaceState {
  try {
    const statePath = getWorkspaceStatePath();
    if (existsSync(statePath)) {
      const data = readFileSync(statePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load workspace state:', error);
  }
  return {};
}

function saveWorkspaceState(state: WorkspaceState): void {
  try {
    const statePath = getWorkspaceStatePath();
    writeFileSync(statePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Failed to save workspace state:', error);
  }
}

/**
 * Gets the workspace directory.
 * Returns the last used workspace, or default Desktop/pi-sdk if none set.
 * Also ensures the current project directory is set for layered config.
 */
export function getWorkspaceDir(): string {
  const state = loadWorkspaceState();
  let dir: string;
  if (state.lastWorkspaceDir && existsSync(state.lastWorkspaceDir)) {
    dir = state.lastWorkspaceDir;
  } else {
    // Default to Desktop/pi-sdk
    dir = join(app.getPath('desktop'), 'pi-sdk');
  }
  // Ensure current project dir is set for layered config
  // This is important for settings to work before the user changes workspace
  if (getCurrentProjectDir() !== dir) {
    setCurrentProjectDir(dir);
  }
  return dir;
}

/**
 * Checks if a workspace has been explicitly set by the user.
 */
export function hasWorkspaceDir(): boolean {
  const state = loadWorkspaceState();
  return !!(state.lastWorkspaceDir && existsSync(state.lastWorkspaceDir));
}

/**
 * Sets the workspace directory and updates the current project context.
 */
export function setWorkspaceDir(dir: string): void {
  saveWorkspaceState({ lastWorkspaceDir: dir });
  // Update the current project directory for layered config
  setCurrentProjectDir(dir);
  // Reset workspace sync promise so ensureWorkspaceDir() will sync to the new workspace
  workspaceSyncPromise = null;
}

// ============================================================================
// Debug Mode
// ============================================================================

/**
 * Gets debug mode from project config.
 */
export function getDebugMode(): boolean {
  const result = getConfigValue('debugMode', false);
  return result.value;
}

/**
 * Gets debug mode with source information.
 */
export function getDebugModeWithSource(): ConfigValue<boolean> {
  return getConfigValue('debugMode', false);
}

// ============================================================================
// Floating Navigation
// ============================================================================

/**
 * Gets floating nav enabled setting with source information.
 * Default is true (enabled).
 */
export function getFloatingNavWithSource(): ConfigValue<boolean> {
  return getConfigValue('floatingNavEnabled', true);
}

// ============================================================================
// Chat Model Preference
// ============================================================================

/**
 * Gets chat model preference from project config.
 */
export function getChatModelPreferenceSetting(): ChatModelPreference {
  const result = getConfigValue('chatModelPreference', 'fast');
  return result.value;
}

/**
 * Sets chat model preference to project config.
 */
export async function setChatModelPreferenceSetting(
  preference: ChatModelPreference
): Promise<void> {
  await setConfigValue('chatModelPreference', preference);
}

// ============================================================================
// Thinking Level
// ============================================================================

/**
 * Gets thinking level from project config.
 */
function normalizeThinkingLevel(level: unknown): ThinkingLevel {
  switch (level) {
    case 'low':
    case 'medium':
    case 'high':
    case 'xhigh':
      return level;
    // Legacy names from the legacy UI.
    case 'light':
      return 'low';
    case 'balanced':
      return 'medium';
    case 'deep':
      return 'high';
    case 'off':
    default:
      return DEFAULT_THINKING_LEVEL;
  }
}

export function getThinkingLevel(): ThinkingLevel {
  const result = getConfigValue('thinkingLevel', DEFAULT_THINKING_LEVEL);
  return normalizeThinkingLevel(result.value);
}

/**
 * Gets thinking level with source information.
 */
export function getThinkingLevelWithSource(): ConfigValue<ThinkingLevel> {
  const result = getConfigValue('thinkingLevel', DEFAULT_THINKING_LEVEL);
  return {
    ...result,
    value: normalizeThinkingLevel(result.value)
  };
}

export function getMaxThinkingTokens(): number {
  if (getProvider() === 'glm') {
    return 0;
  }
  const level = getThinkingLevel();
  return THINKING_PRESETS[level].tokens;
}

// ============================================================================
// System Prompt
// ============================================================================

/**
 * Gets system prompt append from project config.
 */
export function getSystemPromptAppend(): string {
  const result = getConfigValue('systemPromptAppend', DEFAULT_SYSTEM_PROMPT_APPEND);
  return result.value;
}

/**
 * Gets system prompt append with source information.
 */
export function getSystemPromptAppendWithSource(): ConfigValue<string> {
  return getConfigValue('systemPromptAppend', DEFAULT_SYSTEM_PROMPT_APPEND);
}

/**
 * Gets per-app settings (prompt append, starter prompt, simple defaults).
 */
export function getAppSettings(appId: string): AppSettings {
  const result = getConfigValue<'appSettings'>('appSettings', {}) as ConfigValue<
    Record<string, AppSettings>
  >;
  const value = result.value?.[appId] || {};
  return {
    promptAppend: value.promptAppend ?? null,
    starterPrompt: value.starterPrompt ?? null,
    defaults: {
      depth: value.defaults?.depth ?? null,
      limit: value.defaults?.limit ?? null
    }
  };
}

/**
 * Saves per-app settings.
 */
export async function setAppSettings(appId: string, settings: AppSettings): Promise<void> {
  const existing =
    (getConfigValue<'appSettings'>('appSettings', {}) as ConfigValue<Record<string, AppSettings>>)
      .value || {};
  const normalized: AppSettings = {
    promptAppend: settings.promptAppend ?? null,
    starterPrompt: settings.starterPrompt ?? null,
    defaults: {
      depth: settings.defaults?.depth ?? null,
      limit: settings.defaults?.limit ?? null
    }
  };
  await setConfigValue('appSettings', { ...existing, [appId]: normalized });
}

// ============================================================================
// Model Provider Configuration
// ============================================================================

const DEFAULT_PROVIDER: ModelProvider = 'codex';

/**
 * Gets the current model provider.
 */
function normalizeProvider(provider: unknown): ModelProvider {
  return provider === 'glm' ? 'glm' : 'codex';
}

export function getProvider(): ModelProvider {
  const result = getConfigValue('provider', DEFAULT_PROVIDER);
  return normalizeProvider(result.value);
}

/**
 * Gets the current model provider with source information.
 */
export function getProviderWithSource(): ConfigValue<ModelProvider> {
  const result = getConfigValue('provider', DEFAULT_PROVIDER);
  return {
    value: normalizeProvider(result.value),
    source: result.source
  };
}

/**
 * Sets the model provider to project config.
 */
export async function setProvider(provider: ModelProvider): Promise<void> {
  await setConfigValue('provider', provider);
}

/**
 * Gets GLM API key from .env file.
 * Priority: system env GLM_API_KEY > project .env GLM_API_KEY
 */
export function getGlmApiKey(): string | null {
  const result = getGlmApiKeyWithSourceFromEnv();
  return result.value;
}

/**
 * Gets GLM API key with source information.
 * Priority: system env GLM_API_KEY > project .env GLM_API_KEY
 */
export function getGlmApiKeyWithSource(): ConfigValue<string | null> {
  return getGlmApiKeyWithSourceFromEnv();
}

/**
 * Sets GLM API key to project .env file.
 */
export function setGlmApiKey(apiKey: string | null): void {
  setEnvValue('GLM_API_KEY', apiKey);
}

/**
 * Gets Finnhub API key from .env file.
 * Priority: system env FINNHUB_API_KEY > project .env FINNHUB_API_KEY
 */
export function getFinnhubApiKey(): string | null {
  const result = getFinnhubApiKeyWithSourceFromEnv();
  return result.value;
}

/**
 * Sets Finnhub API key to project .env file.
 */
export function setFinnhubApiKey(apiKey: string | null): void {
  setEnvValue('FINNHUB_API_KEY', apiKey);
}

/**
 * Gets Perplexity API key from .env file.
 * Priority: system env PERPLEXITY_API_KEY > project .env PERPLEXITY_API_KEY
 */
export function getPerplexityApiKey(): string | null {
  const result = getPerplexityApiKeyWithSourceFromEnv();
  return result.value;
}

/**
 * Sets Perplexity API key to project .env file.
 */
export function setPerplexityApiKey(apiKey: string | null): void {
  setEnvValue('PERPLEXITY_API_KEY', apiKey);
}

/**
 * Gets GLM base URL from project config.
 */
export function getGlmBaseUrl(): string {
  const result = getConfigValue('glmBaseUrl', DEFAULT_GLM_BASE_URL);
  return result.value;
}

/**
 * Gets GLM base URL with source information.
 */
export function getGlmBaseUrlWithSource(): ConfigValue<string> {
  return getConfigValue('glmBaseUrl', DEFAULT_GLM_BASE_URL);
}

/**
 * Sets GLM base URL to project config.
 */
export async function setGlmBaseUrl(baseUrl: string | null): Promise<void> {
  // If null or default, clear the setting
  if (!baseUrl || baseUrl === DEFAULT_GLM_BASE_URL) {
    await setConfigValue('glmBaseUrl', null);
  } else {
    await setConfigValue('glmBaseUrl', baseUrl);
  }
}

// ============================================================================
// Model IDs Configuration
// ============================================================================

// Default model IDs for each provider — use full model IDs, not aliases
export const DEFAULT_CODEX_MODELS = {
  fast: 'gpt-5.4',
  smart: 'gpt-5.4',
  deep: 'gpt-5.5'
} as const;

export const DEFAULT_GLM_MODELS = {
  fast: 'glm-5',
  smart: 'glm-5.1',
  deep: 'glm-5.1'
} as const;

// Type for model slots
export type ModelSlot = 'fast' | 'smart' | 'deep';
export type ModelConfig = { fast?: string; smart?: string; deep?: string };

/**
 * Merges user config with defaults, falling back to defaults for missing values.
 */
function mergeModelsWithDefaults(
  config: ModelConfig,
  defaults: Required<ModelConfig>
): Required<ModelConfig> {
  return {
    fast: config.fast || defaults.fast,
    smart: config.smart || defaults.smart,
    deep: config.deep || defaults.deep
  };
}

/**
 * Filters out default values, keeping only overridden settings.
 */
function filterNonDefaultModels(models: ModelConfig, defaults: Required<ModelConfig>): ModelConfig {
  const result: ModelConfig = {};
  if (models.fast && models.fast !== defaults.fast) {
    result.fast = models.fast;
  }
  if (models.smart && models.smart !== defaults.smart) {
    result.smart = models.smart;
  }
  if (models.deep && models.deep !== defaults.deep) {
    result.deep = models.deep;
  }
  return result;
}

/**
 * Gets the Codex model IDs from config.
 * Returns configured values merged with defaults.
 */
export function getCodexModels(): Required<ModelConfig> {
  const result = getConfigValue('codexModels', DEFAULT_CODEX_MODELS);
  return mergeModelsWithDefaults(result.value as ModelConfig, DEFAULT_CODEX_MODELS);
}

/**
 * Gets the Codex model IDs with source information.
 */
export function getCodexModelsWithSource(): ConfigValue<Required<ModelConfig>> {
  const result = getConfigValue('codexModels', DEFAULT_CODEX_MODELS);
  return {
    value: mergeModelsWithDefaults(result.value as ModelConfig, DEFAULT_CODEX_MODELS),
    source: result.source
  };
}

/**
 * Sets Codex model IDs to project config.
 */
export async function setCodexModels(models: ModelConfig): Promise<void> {
  const toStore = filterNonDefaultModels(models, DEFAULT_CODEX_MODELS);
  if (Object.keys(toStore).length === 0) {
    await setConfigValue('codexModels', null);
  } else {
    await setConfigValue('codexModels', toStore);
  }
}

/**
 * Gets the GLM model IDs from config.
 * Returns configured values merged with defaults.
 */
export function getGlmModels(): Required<ModelConfig> {
  const result = getConfigValue('glmModels', DEFAULT_GLM_MODELS);
  return mergeModelsWithDefaults(result.value as ModelConfig, DEFAULT_GLM_MODELS);
}

/**
 * Gets the GLM model IDs with source information.
 */
export function getGlmModelsWithSource(): ConfigValue<Required<ModelConfig>> {
  const result = getConfigValue('glmModels', DEFAULT_GLM_MODELS);
  return {
    value: mergeModelsWithDefaults(result.value as ModelConfig, DEFAULT_GLM_MODELS),
    source: result.source
  };
}

/**
 * Sets GLM model IDs to project config.
 */
export async function setGlmModels(models: ModelConfig): Promise<void> {
  const toStore = filterNonDefaultModels(models, DEFAULT_GLM_MODELS);
  if (Object.keys(toStore).length === 0) {
    await setConfigValue('glmModels', null);
  } else {
    await setConfigValue('glmModels', toStore);
  }
}

export function getPiModelPreferences(): Partial<Record<ChatModelPreference, PiModelReference>> {
  const result = getConfigValue('piModelPreferences', {});
  return result.value as Partial<Record<ChatModelPreference, PiModelReference>>;
}

export function getPiModelPreference(preference: ChatModelPreference): PiModelReference | null {
  return getPiModelPreferences()[preference] ?? null;
}

export async function setPiModelPreference(
  preference: ChatModelPreference,
  model: PiModelReference | null
): Promise<void> {
  const current = getPiModelPreferences();
  if (model) {
    current[preference] = model;
  } else {
    delete current[preference];
  }
  await setConfigValue('piModelPreferences', Object.keys(current).length > 0 ? current : null);
}

// ============================================================================
// Bundled Binary Paths
// ============================================================================

export function getBundledBunPath(): string {
  // Return the path to the bundled bun executable
  // In development: resources/bun in project root
  // In production: app.asar.unpacked not needed as resources/ is at top level
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
  const bunName = process.platform === 'win32' ? 'bun.exe' : 'bun';
  if (isDev) {
    // In dev, resources/ is in the project root
    return join(app.getAppPath(), 'resources', bunName);
  } else {
    // In production, resources/ is at the app bundle root
    return join(process.resourcesPath, bunName);
  }
}

export function getBundledUvPath(): string {
  // Return the path to the bundled uv executable (Python package manager)
  // In development: resources/uv in project root
  // In production: resources/ is at the app bundle root
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
  const uvName = process.platform === 'win32' ? 'uv.exe' : 'uv';
  if (isDev) {
    // In dev, resources/ is in the project root
    return join(app.getAppPath(), 'resources', uvName);
  } else {
    // In production, resources/ is at the app bundle root
    return join(process.resourcesPath, uvName);
  }
}

export function getBundledGitPath(): string | null {
  // Return the path to the bundled Git directory (Windows only)
  // In development: resources/git-portable in project root
  // In production: resources/ is at the app bundle root
  if (process.platform !== 'win32') {
    return null; // Only Windows has bundled Git
  }

  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
  if (isDev) {
    // In dev, resources/ is in the project root
    return join(app.getAppPath(), 'resources', 'git-portable');
  } else {
    // In production, resources/ is at the app bundle root
    return join(process.resourcesPath, 'git-portable');
  }
}

export function getBundledMsys2Path(): string | null {
  // Return the path to the bundled MSYS2 directory (Windows only)
  // MSYS2 provides bash, awk, sed, and other unix utilities
  // In development: resources/msys2 in project root
  // In production: resources/ is at the app bundle root
  if (process.platform !== 'win32') {
    return null; // Only Windows has bundled MSYS2
  }

  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
  if (isDev) {
    // In dev, resources/ is in the project root
    return join(app.getAppPath(), 'resources', 'msys2');
  } else {
    // In production, resources/ is at the app bundle root
    return join(process.resourcesPath, 'msys2');
  }
}

/**
 * Checks if a bash.exe path is from MSYS2 (as opposed to Git Bash).
 * MSYS2 bash needs special environment variables to properly inherit Windows env vars.
 */
export function isMsys2Bash(bashExePath: string | null): boolean {
  if (!bashExePath || process.platform !== 'win32') {
    return false;
  }

  const normalizedPath = resolve(bashExePath).toLowerCase();

  // Check if it's the bundled MSYS2 bash
  const bundledMsys2Path = getBundledMsys2Path();
  if (bundledMsys2Path) {
    const msys2BashExe = resolve(join(bundledMsys2Path, 'usr', 'bin', 'bash.exe')).toLowerCase();
    if (normalizedPath === msys2BashExe) {
      return true;
    }
  }

  // Check if path contains 'msys2' or 'msys64' (common MSYS2 installation paths)
  return normalizedPath.includes('msys2') || normalizedPath.includes('msys64');
}

/**
 * Finds the path to bash.exe on Windows.
 * Checks bundled Git, bundled MSYS2, and system Git installations in order.
 * Returns null if bash.exe cannot be found.
 */
export function getBashExePath(): string | null {
  if (process.platform !== 'win32') {
    return null; // Only needed on Windows
  }

  // 1. Check bundled Git (git-portable/usr/bin/bash.exe)
  const bundledGitPath = getBundledGitPath();
  if (bundledGitPath) {
    const gitBashExe = join(bundledGitPath, 'usr', 'bin', 'bash.exe');
    if (existsSync(gitBashExe)) {
      return resolve(gitBashExe);
    }
  }

  // 2. Check bundled MSYS2 (msys2/usr/bin/bash.exe)
  const bundledMsys2Path = getBundledMsys2Path();
  if (bundledMsys2Path) {
    const msys2BashExe = join(bundledMsys2Path, 'usr', 'bin', 'bash.exe');
    if (existsSync(msys2BashExe)) {
      return resolve(msys2BashExe);
    }
  }

  // 3. Check common system Git installation paths
  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 =
    process.env['ProgramFiles(x86)'] || process.env.PROGRAMFILES_X86 || 'C:\\Program Files (x86)';

  const commonGitPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    join(programFiles, 'Git', 'bin', 'bash.exe'),
    join(programFilesX86, 'Git', 'bin', 'bash.exe')
  ];

  for (const gitBashPath of commonGitPaths) {
    if (existsSync(gitBashPath)) {
      return resolve(gitBashPath);
    }
  }

  // 4. Check if bash.exe is in PATH
  const pathEntries = (process.env.PATH || '').split(';');
  for (const pathEntry of pathEntries) {
    const bashExe = join(pathEntry.trim(), 'bash.exe');
    if (existsSync(bashExe)) {
      return resolve(bashExe);
    }
  }

  return null;
}

/**
 * Builds an enhanced PATH that includes all bundled binaries (bun, uv, git, msys2)
 * and filters out duplicates from the user's existing PATH.
 * This ensures consistent PATH setup for the Electron app and spawned tools.
 */
export function buildEnhancedPath(): string {
  const pathSeparator = process.platform === 'win32' ? ';' : ':';

  // Collect all bundled binary directories
  const bundledBinDirs: string[] = [
    resolve(dirname(getBundledBunPath())),
    resolve(dirname(getBundledUvPath()))
  ];

  // Add Git paths (Windows only)
  const bundledGitPath = getBundledGitPath();
  if (bundledGitPath) {
    const gitPaths = ['bin', 'mingw64/bin', 'cmd']
      .map((subpath) => resolve(join(bundledGitPath, subpath)))
      .filter((p) => existsSync(p));
    bundledBinDirs.push(...gitPaths);
  }

  // Add MSYS2 paths (Windows only)
  const bundledMsys2Path = getBundledMsys2Path();
  if (bundledMsys2Path) {
    const msys2Paths = ['usr/bin', 'mingw64/bin']
      .map((subpath) => resolve(join(bundledMsys2Path, subpath)))
      .filter((p) => existsSync(p));
    bundledBinDirs.push(...msys2Paths);
  }

  // Normalize paths for comparison (case-insensitive on Windows)
  const normalize = (p: string): string => {
    const normalized = resolve(p);
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  };

  const bundledPathsSet = new Set(bundledBinDirs.map(normalize));

  // Filter out bundled paths from user PATH to avoid duplicates
  const userPathEntries = (process.env.PATH || '').split(pathSeparator).filter((entry) => {
    const trimmed = entry.trim();
    return trimmed && !bundledPathsSet.has(normalize(trimmed));
  });

  // Combine: bundled binaries first, then user PATH
  return [...bundledBinDirs, ...userPathEntries].join(pathSeparator);
}

/**
 * Builds the complete environment object used by local tools and debug panels.
 * Codex OAuth is handled by Pi SDK AuthStorage, not environment variables.
 */
export function buildPiSessionEnv(): Record<string, string> {
  const enhancedPath = buildEnhancedPath();
  const workspaceDir = getWorkspaceDir();
  const provider = getProvider();

  // Start with process.env but explicitly set provider-specific values below.
  const env: Record<string, string> = {
    ...process.env,
    PATH: enhancedPath
  };

  // Configure API key and base URL based on provider
  if (provider === 'glm') {
    // GLM provider: use GLM API key and base URL
    const glmApiKey = getGlmApiKey();
    const glmBaseUrl = getGlmBaseUrl();

    // CRITICAL: GLM requires an API key - throw error if missing
    if (!glmApiKey) {
      throw new Error(
        'GLM_API_KEY_MISSING: Z.AI GLM provider is selected but no API key is configured. Please add your GLM API key in Settings.'
      );
    }

    env.GLM_API_KEY = glmApiKey;
    env.GLM_BASE_URL = glmBaseUrl;

    const glmModels = getGlmModels();
    env.GLM_FAST_MODEL = glmModels.fast;
    env.GLM_SMART_MODEL = glmModels.smart;
    env.GLM_DEEP_MODEL = glmModels.deep;

    // Longer timeout for GLM API (50 minutes as per Z.AI docs)
    env.API_TIMEOUT_MS = '3000000';
  }

  if (process.platform === 'win32') {
    const bashExePath = getBashExePath();
    if (bashExePath && isMsys2Bash(bashExePath)) {
      env.MSYSTEM = 'MSYS';
      env.MSYS2_PATH_TYPE = 'inherit';
      env.HOME = resolve(workspaceDir);
    }
  }

  // Enable debug mode if configured
  if (getDebugMode()) {
    env.DEBUG = '1';
  }

  // Add Finnhub API key if configured (for finance apps)
  // Keys are read from workspace .env (synced on startup from project root)
  const finnhubApiKey = getFinnhubApiKey();
  if (finnhubApiKey) {
    env.FINNHUB_API_KEY = finnhubApiKey;
  }

  // Add Perplexity API key if configured (for AI-curated news)
  const perplexityApiKey = getPerplexityApiKey();
  if (perplexityApiKey) {
    env.PERPLEXITY_API_KEY = perplexityApiKey;
  }

  return env;
}

// Track workspace sync state
let workspaceSyncPromise: Promise<void> | null = null;

/**
 * Returns a promise that resolves when the workspace is ready.
 * Call this before starting a chat session to ensure skills are synced.
 */
export async function waitForWorkspaceReady(): Promise<void> {
  if (workspaceSyncPromise) {
    await workspaceSyncPromise;
  }
}

export async function ensureWorkspaceDir(): Promise<void> {
  // If sync is already in progress, wait for it
  if (workspaceSyncPromise) {
    return workspaceSyncPromise;
  }

  // Create the sync promise
  workspaceSyncPromise = (async () => {
    const workspaceDir = getWorkspaceDir();
    if (!existsSync(workspaceDir)) {
      await mkdir(workspaceDir, { recursive: true });
    }

    // Always sync .agents directory - delete and replace to ensure clean state
    try {
      // .agents directory is at out/.agents in both dev and production
      // In development: buildSkills.js builds to out/.agents, app.getAppPath() returns project root
      // In production: .agents is unpacked to app.asar.unpacked/out/.agents
      const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
      const sourceAgentDir =
        isDev ?
          join(app.getAppPath(), 'out', '.agents')
        : join(process.resourcesPath, 'app.asar.unpacked', 'out', '.agents');

      if (existsSync(sourceAgentDir)) {
        console.log('Syncing .agents directory to workspace...');
        const destAgentDir = join(workspaceDir, '.agents');

        // Remove existing .agents directory if it exists
        if (existsSync(destAgentDir)) {
          await rm(destAgentDir, { recursive: true, force: true });
        }

        // Copy entire .agents directory (including skills)
        await cp(sourceAgentDir, destAgentDir, { recursive: true });
        console.log('.agents directory synced successfully');
      } else {
        console.warn(`Could not find .agents directory at ${sourceAgentDir}`);
      }

      // Only sync .env file if destination doesn't exist (preserve user settings)
      const sourceEnvPath =
        isDev ?
          join(app.getAppPath(), '.env')
        : join(process.resourcesPath, 'app.asar.unpacked', '.env');
      const destEnvPath = join(workspaceDir, '.env');

      if (existsSync(sourceEnvPath) && !existsSync(destEnvPath)) {
        try {
          await cp(sourceEnvPath, destEnvPath);
          console.log('.env file initialized in workspace (first run)');
        } catch (envError) {
          console.warn('Failed to initialize .env file:', envError);
        }
      } else if (existsSync(destEnvPath)) {
        console.log('.env file already exists in workspace, preserving user settings');
      }
    } catch (error) {
      console.error('Failed to sync .agents directory:', error);
    }

    // Sync core binaries to workspace/bin/ directory
    try {
      const destBinDir = join(workspaceDir, 'bin');
      if (!existsSync(destBinDir)) {
        await mkdir(destBinDir, { recursive: true });
      }

      const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
      const resourcesDir = isDev ? join(app.getAppPath(), 'resources') : process.resourcesPath;

      // Platform-aware binary names
      const binaries = [
        { name: 'bun', file: process.platform === 'win32' ? 'bun.exe' : 'bun' },
        { name: 'uv', file: process.platform === 'win32' ? 'uv.exe' : 'uv' },
        { name: 'jq', file: process.platform === 'win32' ? 'jq.exe' : 'jq' }
      ];

      // Copy each binary
      for (const binary of binaries) {
        const source = join(resourcesDir, binary.file);
        const dest = join(destBinDir, binary.file);

        if (existsSync(source)) {
          await cp(source, dest);
          // Make executable on Unix
          if (process.platform !== 'win32') {
            await chmod(dest, 0o755);
          }
          console.log(`${binary.name} synced successfully`);
        } else {
          console.warn(`Could not find ${binary.name} at ${source}`);
        }
      }

      // Sync git-portable on Windows only
      if (process.platform === 'win32') {
        const gitPortableDir = join(resourcesDir, 'git-portable');
        const destGitDir = join(workspaceDir, 'git-portable');

        if (existsSync(gitPortableDir)) {
          if (existsSync(destGitDir)) {
            await rm(destGitDir, { recursive: true, force: true });
          }
          await cp(gitPortableDir, destGitDir, { recursive: true });
          console.log('git-portable synced successfully');
        } else {
          console.warn(`Could not find git-portable at ${gitPortableDir}`);
        }
      }

      console.log('Core binaries synced to workspace/bin/');
    } catch (error) {
      console.error('Failed to sync core binaries:', error);
    }
  })();

  return workspaceSyncPromise;
}
