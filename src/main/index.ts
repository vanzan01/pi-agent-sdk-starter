import { existsSync } from 'fs';
import { join } from 'path';
import { app, BrowserWindow, Menu } from 'electron';

import { registerAiNewsTweetHandlers } from './handlers/ai-news-tweet-handlers';
import { registerAppMessagingHandlers } from './handlers/app-messaging-handlers';
import { registerChatHandlers } from './handlers/chat-handlers';
import { registerConfigHandlers } from './handlers/config-handlers';
import { registerConversationHandlers } from './handlers/conversation-handlers';
import { registerDevServerHandlers } from './handlers/devserver-handlers';
import { registerExportHandlers } from './handlers/export-handlers';
import { registerFilesystemHandlers } from './handlers/filesystem-handlers';
import { registerProjectHandlers } from './handlers/project-handlers';
import { registerShellHandlers } from './handlers/shell-handlers';
import { registerUpdateHandlers } from './handlers/update-handlers';
import { buildEnhancedPath, ensureWorkspaceDir } from './lib/config';
import { initializeUpdater, startPeriodicUpdateCheck } from './lib/updater';
import { loadWindowBounds, saveWindowBounds } from './lib/window-state';
import { createApplicationMenu } from './menu';

// Workaround for Electron 39.2.0 crash
// The crash occurs in v8::V8::EnableWebAssemblyTrapHandler during V8 initialization
app.commandLine.appendSwitch('disable-features', 'WebAssemblyTrapHandler');

// Fix PATH for all platforms - merge bundled binaries (bun, uv, git, msys2) with user's PATH
// This ensures bundled binaries are available while preserving user's existing PATH entries
process.env.PATH = buildEnhancedPath();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // electron-vite uses different extensions in dev (.cjs) vs production (.cjs)
  const isDev = process.env.ELECTRON_RENDERER_URL !== undefined;
  const preloadPath = join(__dirname, '../preload/index.cjs');

  // Load saved window bounds or use defaults
  const savedBounds = loadWindowBounds();
  const defaultBounds = { width: 1200, height: 800 };

  // Use ICO on Windows to avoid any PNG→ICO conversion surprises, fallback to PNG otherwise.
  const winIconPath = join(__dirname, '../../static/icon.ico');
  const pngIconPath = join(__dirname, '../../static/icon.png');
  const icon =
    process.platform === 'win32' && existsSync(winIconPath) ? winIconPath
    : existsSync(pngIconPath) ? pngIconPath
    : undefined;

  // titleBarStyle is macOS-only - on Windows/Linux, use default frame
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    ...defaultBounds,
    ...(savedBounds || {}),
    icon,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true
    }
  };

  // Only set titleBarStyle on macOS
  if (process.platform === 'darwin') {
    windowOptions.titleBarStyle = 'hidden';
  }

  mainWindow = new BrowserWindow(windowOptions);

  // electron-vite provides ELECTRON_RENDERER_URL in dev mode
  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Save window bounds when resized or moved
  const saveBounds = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      saveWindowBounds(bounds);
    }
  };

  // Debounce the save to avoid excessive writes
  let saveBoundsTimeout: NodeJS.Timeout | null = null;
  const debouncedSaveBounds = () => {
    if (saveBoundsTimeout) {
      clearTimeout(saveBoundsTimeout);
    }
    saveBoundsTimeout = setTimeout(saveBounds, 500);
  };

  mainWindow.on('resize', debouncedSaveBounds);
  mainWindow.on('move', debouncedSaveBounds);

  mainWindow.on('closed', () => {
    // Save bounds one final time when closing
    saveBounds();
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Set app name to match productName in package.json
  app.name = 'Pi SDK Starter Kit';

  // Set About panel options
  app.setAboutPanelOptions({
    copyright: 'Copyright © 2025 Pi SDK Starter Kit'
  });

  // Register all IPC handlers
  registerConfigHandlers();
  registerChatHandlers(() => mainWindow);
  registerConversationHandlers();
  registerShellHandlers();
  registerUpdateHandlers();
  registerProjectHandlers();
  registerFilesystemHandlers(() => mainWindow);
  registerDevServerHandlers(() => mainWindow);
  registerExportHandlers();
  registerAppMessagingHandlers(() => mainWindow);
  registerAiNewsTweetHandlers(() => mainWindow);

  createWindow();

  // Initialize updater after window is created
  initializeUpdater(mainWindow);
  startPeriodicUpdateCheck();

  // Create and set application menu AFTER window is created
  const menu = createApplicationMenu(mainWindow);
  Menu.setApplicationMenu(menu);

  // Ensure workspace directory exists and sync skills
  // Note: Pre-warming disabled - it was causing intermittent hangs on first message
  // The session will start on-demand when the first message is sent
  ensureWorkspaceDir().catch((error) => {
    console.error('Failed to ensure workspace directory:', error);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      // Update updater window reference
      initializeUpdater(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
