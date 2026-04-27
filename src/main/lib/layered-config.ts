import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { config as dotenvConfig } from 'dotenv';

import type { ThinkingLevel } from '../../shared/constants';
import type { ChatModelPreference, ModelProvider } from '../../shared/core';

/**
 * Configuration schema for project configs.
 * All fields are optional - missing fields fall back to app defaults.
 *
 * All settings are stored in the project folder:
 * - .pi-sdk/config.json - Non-sensitive settings
 * - .env - API keys for optional non-Codex providers (GLM_API_KEY, etc.)
 */
export interface ConfigSchema {
  // AI Configuration
  thinkingLevel?: ThinkingLevel;
  systemPromptAppend?: string;
  chatModelPreference?: ChatModelPreference;

  // Provider settings (default: codex)
  provider?: ModelProvider;
  // Note: glmApiKey is stored in .env as GLM_API_KEY, not in config.json
  glmBaseUrl?: string;

  // Model IDs per provider (allows overriding SDK defaults)
  // Codex defaults: gpt-5.4, gpt-5.4, gpt-5.5
  codexModels?: {
    fast?: string;
    smart?: string;
    deep?: string;
  };
  // GLM defaults: glm-5, glm-5.1, glm-5.1
  glmModels?: {
    fast?: string;
    smart?: string;
    deep?: string;
  };

  // Developer settings
  debugMode?: boolean;

  // UI Preferences
  floatingNavEnabled?: boolean;

  // Per-app settings (keyed by app id)
  appSettings?: Record<string, unknown>;
}

/**
 * Source indicator for where a config value came from.
 * - 'default': Built-in app default
 * - 'project': From .pi-sdk/config.json in workspace
 * - 'env': From environment variable or .env file
 */
export type ConfigSource = 'default' | 'project' | 'env';

/**
 * Result of getting a config value with source tracking.
 */
export interface ConfigValue<T> {
  value: T;
  source: ConfigSource;
}

// Project config directory name
const PROJECT_CONFIG_DIR = '.pi-sdk';
const PROJECT_CONFIG_FILE = 'config.json';

// Cache for current project directory
let currentProjectDir: string | null = null;

/**
 * Gets the path to the project config directory.
 * Location: <projectDir>/.pi-sdk/
 */
export function getProjectConfigDir(projectDir: string): string {
  return join(projectDir, PROJECT_CONFIG_DIR);
}

/**
 * Gets the path to the project config file.
 * Location: <projectDir>/.pi-sdk/config.json
 */
export function getProjectConfigPath(projectDir: string): string {
  return join(getProjectConfigDir(projectDir), PROJECT_CONFIG_FILE);
}

/**
 * Gets the path to the project .env file.
 * Location: <projectDir>/.env
 */
export function getProjectEnvPath(projectDir: string): string {
  return join(projectDir, '.env');
}

/**
 * Sets the current project directory.
 * This determines which project config to load.
 */
export function setCurrentProjectDir(projectDir: string | null): void {
  currentProjectDir = projectDir;
}

/**
 * Gets the current project directory.
 */
export function getCurrentProjectDir(): string | null {
  return currentProjectDir;
}

/**
 * Loads the project config from <projectDir>/.pi-sdk/config.json.
 */
export function loadProjectConfig(projectDir: string): ConfigSchema {
  try {
    const configPath = getProjectConfigPath(projectDir);
    if (existsSync(configPath)) {
      const data = readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load project config:', error);
  }
  return {};
}

/**
 * Saves to the project config in <projectDir>/.pi-sdk/config.json.
 * Creates the .pi-sdk directory if it doesn't exist.
 */
export async function saveProjectConfig(projectDir: string, config: ConfigSchema): Promise<void> {
  try {
    const configDir = getProjectConfigDir(projectDir);
    const configPath = getProjectConfigPath(projectDir);

    // Create .pi-sdk directory if it doesn't exist
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }

    writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Auto-add to .gitignore if this is a git repo
    await ensureGitignore(projectDir);
  } catch (error) {
    console.error('Failed to save project config:', error);
    throw error;
  }
}

/**
 * Loads environment variables from project .env file.
 * Returns the parsed values (does not modify process.env).
 */
export function loadProjectEnv(projectDir: string): Record<string, string> {
  const envPath = getProjectEnvPath(projectDir);
  if (existsSync(envPath)) {
    const result = dotenvConfig({ path: envPath, override: false });
    return result.parsed || {};
  }
  return {};
}

/**
 * Generic helper to get an API key from environment or project .env file.
 * Priority: system env > project .env
 */
function getEnvApiKeyWithSource(
  envVarName: string,
  projectDir?: string | null
): ConfigValue<string | null> {
  // 1. Check system environment variable
  const envApiKey = process.env[envVarName]?.trim();
  if (envApiKey) {
    return { value: envApiKey, source: 'env' };
  }

  const effectiveProjectDir = projectDir ?? currentProjectDir;

  if (effectiveProjectDir) {
    // 2. Check project .env file
    const projectEnv = loadProjectEnv(effectiveProjectDir);
    if (projectEnv[envVarName]?.trim()) {
      return { value: projectEnv[envVarName].trim(), source: 'env' };
    }
  }

  return { value: null, source: 'default' };
}

/**
 * Gets the GLM API key with proper priority:
 * 1. process.env.GLM_API_KEY (highest - system env)
 * 2. Project .env file GLM_API_KEY
 */
export function getGlmApiKeyWithSource(projectDir?: string | null): ConfigValue<string | null> {
  return getEnvApiKeyWithSource('GLM_API_KEY', projectDir);
}

/**
 * Gets Finnhub API key from .env file.
 * Priority: system env FINNHUB_API_KEY > project .env FINNHUB_API_KEY
 */
export function getFinnhubApiKeyWithSource(projectDir?: string | null): ConfigValue<string | null> {
  return getEnvApiKeyWithSource('FINNHUB_API_KEY', projectDir);
}

/**
 * Gets Perplexity API key from .env file.
 * Priority: system env PERPLEXITY_API_KEY > project .env PERPLEXITY_API_KEY
 */
export function getPerplexityApiKeyWithSource(projectDir?: string | null): ConfigValue<string | null> {
  return getEnvApiKeyWithSource('PERPLEXITY_API_KEY', projectDir);
}

/**
 * Sets or removes an environment variable in the project .env file.
 * Creates the .env file if it doesn't exist.
 */
export function setEnvValue(key: string, value: string | null, projectDir?: string | null): void {
  const effectiveProjectDir = projectDir ?? currentProjectDir;

  if (!effectiveProjectDir) {
    throw new Error('No project directory set');
  }

  const envPath = getProjectEnvPath(effectiveProjectDir);
  let envContent = '';

  // Read existing .env file if it exists
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
  }

  // Parse existing lines
  const lines = envContent.split('\n');
  const newLines: string[] = [];
  let keyFound = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Check if this line sets our key (handles KEY=value and KEY="value")
    if (trimmedLine.startsWith(`${key}=`) || trimmedLine.startsWith(`${key} =`)) {
      keyFound = true;
      // Only add if we have a new value (skip if removing)
      if (value !== null) {
        newLines.push(`${key}=${value}`);
      }
    } else {
      newLines.push(line);
    }
  }

  // If key wasn't found and we have a value, add it
  if (!keyFound && value !== null) {
    // Add a newline before if file doesn't end with one
    if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
      newLines.push('');
    }
    newLines.push(`${key}=${value}`);
  }

  // Write back to file
  writeFileSync(envPath, newLines.join('\n'));
}

/**
 * Gets a config value with source tracking.
 * Priority: project > default
 */
export function getConfigValue<K extends keyof ConfigSchema>(
  key: K,
  defaultValue: NonNullable<ConfigSchema[K]>,
  projectDir?: string | null
): ConfigValue<NonNullable<ConfigSchema[K]>> {
  const effectiveProjectDir = projectDir ?? currentProjectDir;

  // Check project config
  if (effectiveProjectDir) {
    const projectConfig = loadProjectConfig(effectiveProjectDir);
    if (projectConfig[key] !== undefined) {
      return { value: projectConfig[key] as NonNullable<ConfigSchema[K]>, source: 'project' };
    }
  }

  // Return default
  return { value: defaultValue, source: 'default' };
}

/**
 * Sets a config value to the project config.
 */
export async function setConfigValue<K extends keyof ConfigSchema>(
  key: K,
  value: ConfigSchema[K] | null,
  projectDir?: string | null
): Promise<void> {
  const effectiveProjectDir = projectDir ?? currentProjectDir;
  if (!effectiveProjectDir) {
    throw new Error('No project directory set');
  }

  const config = loadProjectConfig(effectiveProjectDir);
  if (value === null || value === undefined) {
    delete config[key];
  } else {
    config[key] = value;
  }
  await saveProjectConfig(effectiveProjectDir, config);
}

/**
 * Gets the project config with source tracking.
 * Returns the effective value for each setting along with its source.
 */
export function getMergedConfig(projectDir?: string | null): {
  config: ConfigSchema;
  sources: Record<keyof ConfigSchema, ConfigSource>;
} {
  const effectiveProjectDir = projectDir ?? currentProjectDir;
  const projectConfig = effectiveProjectDir ? loadProjectConfig(effectiveProjectDir) : {};

  // Track sources
  const sources: Record<keyof ConfigSchema, ConfigSource> = {} as Record<
    keyof ConfigSchema,
    ConfigSource
  >;

  const allKeys: (keyof ConfigSchema)[] = [
    'thinkingLevel',
    'systemPromptAppend',
    'chatModelPreference',
    'provider',
    'glmBaseUrl',
    'codexModels',
    'glmModels',
    'debugMode'
  ];

  for (const key of allKeys) {
    if (projectConfig[key] !== undefined) {
      sources[key] = 'project';
    } else {
      sources[key] = 'default';
    }
  }

  return { config: projectConfig, sources };
}

/**
 * Checks if a project has a .pi-sdk config directory.
 */
export function hasProjectConfig(projectDir: string): boolean {
  return existsSync(getProjectConfigDir(projectDir));
}

/**
 * Initializes a new project config directory.
 * Creates .pi-sdk/ folder and adds it to .gitignore.
 */
export async function initProjectConfig(projectDir: string): Promise<void> {
  const configDir = getProjectConfigDir(projectDir);

  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  // Create empty config file
  const configPath = getProjectConfigPath(projectDir);
  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify({}, null, 2));
  }

  // Add to .gitignore
  await ensureGitignore(projectDir);
}

/**
 * Ensures .pi-sdk/config.json is in .gitignore.
 * Only modifies .gitignore if the project is a git repo.
 */
async function ensureGitignore(projectDir: string): Promise<void> {
  const gitDir = join(projectDir, '.git');
  if (!existsSync(gitDir)) {
    return; // Not a git repo
  }

  const gitignorePath = join(projectDir, '.gitignore');
  const entriesToAdd = [
    `# Pi SDK Starter Kit config (contains user settings)`,
    `${PROJECT_CONFIG_DIR}/${PROJECT_CONFIG_FILE}`,
    ``
  ];

  try {
    let gitignoreContent = '';
    if (existsSync(gitignorePath)) {
      gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    }

    // Check if already has the entry
    if (gitignoreContent.includes(`${PROJECT_CONFIG_DIR}/${PROJECT_CONFIG_FILE}`)) {
      return;
    }

    // Add entries
    const newContent = entriesToAdd.join('\n');
    if (gitignoreContent && !gitignoreContent.endsWith('\n')) {
      appendFileSync(gitignorePath, '\n' + newContent);
    } else {
      appendFileSync(gitignorePath, newContent);
    }
  } catch (error) {
    console.error('Failed to update .gitignore:', error);
  }
}

/**
 * Gets config status for UI display.
 * Returns information about what configs exist and their locations.
 */
export function getConfigStatus(projectDir?: string | null): {
  hasProjectConfig: boolean;
  projectConfigPath: string | null;
  projectConfigDir: string | null;
} {
  const effectiveProjectDir = projectDir ?? currentProjectDir;

  return {
    hasProjectConfig: effectiveProjectDir ? hasProjectConfig(effectiveProjectDir) : false,
    projectConfigPath: effectiveProjectDir ? getProjectConfigPath(effectiveProjectDir) : null,
    projectConfigDir: effectiveProjectDir ? getProjectConfigDir(effectiveProjectDir) : null
  };
}
