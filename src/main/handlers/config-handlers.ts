import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { release, type, version } from 'os';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import { THINKING_LEVELS, THINKING_PRESETS, type ThinkingLevel } from '../../shared/constants';
import { DEFAULT_GLM_BASE_URL, type ModelProvider } from '../../shared/core';
import { getSkillStatus } from '../core/skills';
import { resetSession } from '../lib/claude-session';
import {
  buildagentSessionEnv,
  buildEnhancedPath,
  DEFAULT_CODEX_MODELS,
  DEFAULT_GLM_MODELS,
  DEFAULT_SYSTEM_PROMPT_APPEND,
  ensureWorkspaceDir,
  // Model config
  getCodexModelsWithSource,
  getAppSettings,
  getConfigStatus,
  // Layered config utilities
  getCurrentProjectDir,
  getDebugModeWithSource,
  getFloatingNavWithSource,
  getGlmApiKeyWithSource,
  getGlmBaseUrlWithSource,
  getGlmModelsWithSource,
  getMergedConfig,
  // Provider config
  getProviderWithSource,
  getSystemPromptAppendWithSource,
  getThinkingLevel,
  getThinkingLevelWithSource,
  getWorkspaceDir,
  hasWorkspaceDir,
  initProjectConfig,
  setCodexModels,
  setAppSettings,
  setConfigValue,
  setGlmApiKey,
  setGlmBaseUrl,
  setGlmModels,
  setProvider,
  setWorkspaceDir,
  type ConfigSource,
  type ModelConfig
} from '../lib/config';

const requireModule = createRequire(import.meta.url);

function getagentAgentSdkVersion(): string {
  try {
    // Try to resolve the Pi SDK package.json
    const sdkPackagePath = requireModule.resolve('@mariozechner/pi-coding-agent/package.json');

    // Handle app.asar unpacked case (production builds)
    let packagePath = sdkPackagePath;
    if (sdkPackagePath.includes('app.asar')) {
      const unpackedPath = sdkPackagePath.replace('app.asar', 'app.asar.unpacked');
      if (existsSync(unpackedPath)) {
        packagePath = unpackedPath;
      }
    }

    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      return packageJson.version || 'unknown';
    }
  } catch {
    // Fallback if we can't read the version
  }
  return 'unknown';
}

export function registerConfigHandlers(): void {
  // Get workspace directory
  ipcMain.handle('config:get-workspace-dir', () => {
    return { workspaceDir: getWorkspaceDir() };
  });

  // Get app root directory (the actual codebase, not user workspace)
  ipcMain.handle('config:get-app-path', () => {
    return { appPath: app.getAppPath() };
  });

  // Check if workspace has been explicitly set
  ipcMain.handle('config:has-workspace-dir', () => {
    return { hasWorkspace: hasWorkspaceDir() };
  });

  // Set workspace directory
  ipcMain.handle('config:set-workspace-dir', async (_event, workspaceDir: string) => {
    const trimmedPath = workspaceDir.trim();
    if (!trimmedPath) {
      return { success: false, error: 'Workspace directory cannot be empty' };
    }

    // Use the new setWorkspaceDir which also updates current project context
    setWorkspaceDir(trimmedPath);

    // Reset the SDK session so it starts fresh with the new workspace cwd
    await resetSession();

    // Create the new workspace directory and sync .claude folder
    await ensureWorkspaceDir();

    // Notify all renderer windows about the workspace change
    // Include the new provider setting so UI can update immediately
    const newProvider = getProviderWithSource().value;
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('config:workspace-changed', {
          workspaceDir: trimmedPath,
          provider: newProvider
        });
      }
    }

    return { success: true };
  });

  // Show folder picker dialog for selecting workspace directory
  ipcMain.handle('config:select-workspace-dir', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Workspace Directory',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: getWorkspaceDir()
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return { success: true, path: result.filePaths[0] };
  });

  // Get layered config status (for UI to show project config info)
  ipcMain.handle('config:get-config-status', () => {
    return getConfigStatus();
  });

  // Initialize project config in current workspace
  ipcMain.handle('config:init-project-config', async () => {
    const projectDir = getCurrentProjectDir() || getWorkspaceDir();
    try {
      await initProjectConfig(projectDir);
      return { success: true, projectDir };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize project config'
      };
    }
  });

  // Get merged config with source information
  ipcMain.handle('config:get-merged-config', () => {
    const projectDir = getCurrentProjectDir() || getWorkspaceDir();
    return getMergedConfig(projectDir);
  });

  // Get debug mode with source info
  ipcMain.handle('config:get-debug-mode', () => {
    const result = getDebugModeWithSource();
    return { debugMode: result.value, source: result.source };
  });

  // Set debug mode (to project config)
  ipcMain.handle('config:set-debug-mode', async (_event, debugMode: boolean) => {
    try {
      await setConfigValue('debugMode', debugMode);
      return { success: true, source: 'project' as ConfigSource };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save debug mode'
      };
    }
  });

  // Get floating nav enabled with source info
  ipcMain.handle('config:get-floating-nav', () => {
    const result = getFloatingNavWithSource();
    return { enabled: result.value, source: result.source };
  });

  // Set floating nav enabled (to project config)
  ipcMain.handle('config:set-floating-nav', async (_event, enabled: boolean) => {
    try {
      await setConfigValue('floatingNavEnabled', enabled);

      // Broadcast change to all windows so App.tsx can react
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('config:floating-nav-changed', { enabled });
        }
      }

      return { success: true, source: 'project' as ConfigSource };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save floating nav setting'
      };
    }
  });

  // Get PATH environment variable info (for debug/dev section)
  // Uses the enhanced PATH for consistency
  ipcMain.handle('config:get-path-info', () => {
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    // Use enhanced PATH to match app runtime behavior
    const enhancedPath = buildEnhancedPath();
    const pathEntries = enhancedPath.split(pathSeparator).filter((p) => p.trim());
    return {
      platform: process.platform,
      pathSeparator,
      pathEntries,
      pathCount: pathEntries.length,
      fullPath: enhancedPath
    };
  });

  // Get all environment variables (for debug/dev section)
  // Uses the same environment object as app sessions for consistency
  // Masks sensitive variables like API keys, passwords, tokens, etc.
  ipcMain.handle('config:get-env-vars', () => {
    const sensitivePatterns = [
      /KEY/i,
      /SECRET/i,
      /PASSWORD/i,
      /TOKEN/i,
      /AUTH/i,
      /CREDENTIAL/i,
      /PRIVATE/i
    ];

    const maskValue = (key: string, value: string): string => {
      // Check if key matches any sensitive pattern
      const isSensitive = sensitivePatterns.some((pattern) => pattern.test(key));
      if (!isSensitive) {
        return value;
      }

      // Mask sensitive values
      if (value.length <= 8) {
        return '••••';
      }
      // Show first 4 and last 4 chars for longer values
      return `${value.slice(0, 4)}••••${value.slice(-4)}`;
    };

    // Use the same environment builder as app sessions to ensure consistency
    const env = buildagentSessionEnv();

    const envVars: Array<{ key: string; value: string }> = [];
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        envVars.push({
          key,
          value: maskValue(key, value)
        });
      }
    }

    // Sort alphabetically by key
    envVars.sort((a, b) => a.key.localeCompare(b.key));

    return { envVars, count: envVars.length };
  });

  // Get app diagnostic metadata (versions, platform info, etc.)
  ipcMain.handle('config:get-diagnostic-metadata', () => {
    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromiumVersion: process.versions.chrome,
      v8Version: process.versions.v8,
      nodeVersion: process.versions.node,
      claudeAgentSdkVersion: getagentAgentSdkVersion(),
      platform: process.platform,
      arch: process.arch,
      osRelease: release(),
      osType: type(),
      osVersion: version()
    };
  });

  // Get thinking level with source info
  ipcMain.handle('config:get-thinking-level', () => {
    const result = getThinkingLevelWithSource();
    const preset = THINKING_PRESETS[result.value];
    return {
      level: result.value,
      tokens: preset.tokens,
      label: preset.label,
      description: preset.description,
      source: result.source
    };
  });

  // Set thinking level (to project config)
  ipcMain.handle('config:set-thinking-level', async (_event, level: string) => {
    // Validate the level is valid
    if (!THINKING_LEVELS.includes(level as ThinkingLevel)) {
      return {
        success: false,
        error: `Invalid thinking level: ${level}. Must be one of: ${THINKING_LEVELS.join(', ')}`
      };
    }

    try {
      await setConfigValue('thinkingLevel', level as ThinkingLevel);
      const preset = THINKING_PRESETS[level as ThinkingLevel];

      return {
        success: true,
        level,
        tokens: preset.tokens,
        label: preset.label,
        description: preset.description,
        source: 'project' as ConfigSource
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save thinking level'
      };
    }
  });

  // Get all thinking presets (for UI dropdown)
  ipcMain.handle('config:get-thinking-presets', () => {
    return {
      presets: THINKING_PRESETS,
      levels: THINKING_LEVELS,
      current: getThinkingLevel()
    };
  });

  // Get system prompt append with source info
  ipcMain.handle('config:get-system-prompt-append', () => {
    const result = getSystemPromptAppendWithSource();
    return {
      text: result.value,
      isDefault: result.value === DEFAULT_SYSTEM_PROMPT_APPEND,
      source: result.source
    };
  });

  // Set system prompt append (pass null to reset to default)
  ipcMain.handle('config:set-system-prompt-append', async (_event, text: string | null) => {
    try {
      // null or default text removes the override (falls back to default)
      await setConfigValue(
        'systemPromptAppend',
        text === DEFAULT_SYSTEM_PROMPT_APPEND ? null : text
      );
      const result = getSystemPromptAppendWithSource();
      return {
        success: true,
        text: result.value,
        isDefault: result.value === DEFAULT_SYSTEM_PROMPT_APPEND,
        source: result.source
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save system prompt'
      };
    }
  });

  // Get default system prompt append (for reset functionality)
  ipcMain.handle('config:get-default-system-prompt-append', () => {
    return {
      text: DEFAULT_SYSTEM_PROMPT_APPEND
    };
  });

  // ============================================================================
  // Per-app settings (prompt append, starter prompts, simple defaults)
  // ============================================================================

  ipcMain.handle('config:get-app-settings', (_event, appId: string) => {
    const settings = getAppSettings(appId);
    return { settings };
  });

  ipcMain.handle(
    'config:set-app-settings',
    async (
      _event,
      appId: string,
      settings: {
        promptAppend?: string | null;
        starterPrompt?: string | null;
        defaults?: { depth?: number | null; limit?: number | null };
      }
    ) => {
      try {
        await setAppSettings(appId, settings ?? {});
        const saved = getAppSettings(appId);
        // Reset session to apply any prompt changes
        await resetSession();
        return { success: true, settings: saved };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save app settings'
        };
      }
    }
  );

  // ============================================================================
  // Skills status (per app)
  // ============================================================================

  ipcMain.handle('skills:get-status', (_event, appId: string) => {
    return getSkillStatus(appId);
  });

  // ============================================================================
  // Provider Configuration
  // ============================================================================

  // Get current provider with source info
  ipcMain.handle('config:get-provider', () => {
    const result = getProviderWithSource();
    return {
      provider: result.value,
      source: result.source
    };
  });

  // Set provider (codex or glm)
  ipcMain.handle('config:set-provider', async (_event, provider: ModelProvider) => {
    // Validate provider value
    if (provider !== 'codex' && provider !== 'glm') {
      return {
        success: false,
        error: `Invalid provider: ${provider}. Must be 'codex' or 'glm'`
      };
    }

    try {
      await setProvider(provider);

      // Reset session when provider changes to apply new config
      await resetSession();

      return {
        success: true,
        provider
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set provider'
      };
    }
  });

  // Get GLM configuration (API key + base URL)
  ipcMain.handle('config:get-glm-config', () => {
    // Ensure workspace is initialized so currentProjectDir is set for .env file reading
    getWorkspaceDir();

    const apiKeyResult = getGlmApiKeyWithSource();
    const baseUrlResult = getGlmBaseUrlWithSource();

    return {
      apiKey: apiKeyResult.value || null,
      baseUrl: baseUrlResult.value,
      apiKeySource: apiKeyResult.source,
      baseUrlSource: baseUrlResult.source
    };
  });

  // Set GLM API key (stored in .env file for security)
  ipcMain.handle('config:set-glm-api-key', async (_event, apiKey: string | null) => {
    try {
      const normalized = apiKey?.trim() || null;
      setGlmApiKey(normalized);

      // Existing Pi SDK sessions keep their in-memory runtime API key. Reset immediately so
      // clearing the GLM key actually disables GLM instead of letting the old session continue.
      await resetSession();

      const apiKeyResult = getGlmApiKeyWithSource();
      const baseUrlResult = getGlmBaseUrlWithSource();

      return {
        success: true,
        apiKey: apiKeyResult.value || null,
        baseUrl: baseUrlResult.value
      };
    } catch (error) {
      console.error('Failed to save GLM API key:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save GLM API key'
      };
    }
  });

  // Set GLM base URL
  ipcMain.handle('config:set-glm-base-url', async (_event, baseUrl: string | null) => {
    try {
      await setGlmBaseUrl(baseUrl);
      await resetSession();

      const apiKeyResult = getGlmApiKeyWithSource();
      const baseUrlResult = getGlmBaseUrlWithSource();

      return {
        success: true,
        apiKey: apiKeyResult.value || null,
        baseUrl: baseUrlResult.value
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save GLM base URL'
      };
    }
  });

  // Get default GLM base URL (for reset functionality)
  ipcMain.handle('config:get-default-glm-base-url', () => {
    return {
      baseUrl: DEFAULT_GLM_BASE_URL
    };
  });

  // ============================================================================
  // Model IDs Configuration
  // ============================================================================

  // Get Codex model IDs with source info
  ipcMain.handle('config:get-codex-models', () => {
    const result = getCodexModelsWithSource();
    return {
      models: result.value,
      source: result.source
    };
  });

  // Set Codex model IDs
  ipcMain.handle('config:set-codex-models', async (_event, models: ModelConfig) => {
    try {
      await setCodexModels(models);
      // Reset session to apply new model config
      await resetSession();
      const result = getCodexModelsWithSource();
      return {
        success: true,
        models: result.value,
        source: result.source
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save Codex models'
      };
    }
  });

  // Get default Codex model IDs (for reset functionality)
  ipcMain.handle('config:get-default-codex-models', () => {
    return {
      models: DEFAULT_CODEX_MODELS
    };
  });

  // Get GLM model IDs with source info
  ipcMain.handle('config:get-glm-models', () => {
    const result = getGlmModelsWithSource();
    return {
      models: result.value,
      source: result.source
    };
  });

  // Set GLM model IDs
  ipcMain.handle('config:set-glm-models', async (_event, models: ModelConfig) => {
    try {
      await setGlmModels(models);
      // Reset session to apply new model config
      await resetSession();
      const result = getGlmModelsWithSource();
      return {
        success: true,
        models: result.value,
        source: result.source
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save GLM models'
      };
    }
  });

  // Get default GLM model IDs (for reset functionality)
  ipcMain.handle('config:get-default-glm-models', () => {
    return {
      models: DEFAULT_GLM_MODELS
    };
  });
}
