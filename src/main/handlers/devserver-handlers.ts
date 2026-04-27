import { ipcMain, type BrowserWindow } from 'electron';

import { getWorkspaceDir } from '../lib/config';
import { detectProjectType, DevServerManager } from '../lib/devserver';

let devServerManager: DevServerManager | null = null;

export function registerDevServerHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Start dev server
  ipcMain.handle('devserver:start', async (_event, projectPath?: string) => {
    try {
      const path = projectPath || getWorkspaceDir();
      const mainWindow = getMainWindow();

      if (!devServerManager) {
        devServerManager = new DevServerManager(mainWindow);
      }

      const result = await devServerManager.start(path);

      // Notify renderer of status change
      mainWindow?.webContents.send('devserver:status-changed', devServerManager.getStatus());

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start dev server'
      };
    }
  });

  // Stop dev server
  ipcMain.handle('devserver:stop', async () => {
    try {
      if (devServerManager) {
        await devServerManager.stop();
        const mainWindow = getMainWindow();
        mainWindow?.webContents.send('devserver:status-changed', devServerManager.getStatus());
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop dev server'
      };
    }
  });

  // Restart dev server
  ipcMain.handle('devserver:restart', async () => {
    try {
      if (devServerManager) {
        const result = await devServerManager.restart();
        const mainWindow = getMainWindow();
        mainWindow?.webContents.send('devserver:status-changed', devServerManager.getStatus());
        return result;
      }
      return { success: false, error: 'No server running' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restart dev server'
      };
    }
  });

  // Get current status
  ipcMain.handle('devserver:get-status', () => {
    if (devServerManager) {
      return devServerManager.getStatus();
    }
    return {
      running: false,
      url: null,
      port: null,
      projectType: null,
      error: null
    };
  });

  // Detect project type
  ipcMain.handle('devserver:detect-project', (_event, projectPath: string) => {
    const projectType = detectProjectType(projectPath);
    return { projectType };
  });
}

// Cleanup function for app shutdown
export async function cleanupDevServer(): Promise<void> {
  if (devServerManager) {
    await devServerManager.stop();
    devServerManager = null;
  }
}
