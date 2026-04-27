import { ipcMain } from 'electron';

import { checkForUpdates, downloadUpdate, getUpdateStatus, installUpdate } from '../lib/updater';

export function registerUpdateHandlers(): void {
  // Get current update status
  ipcMain.handle('update:get-status', () => {
    return getUpdateStatus();
  });

  // Check for updates manually
  ipcMain.handle('update:check', () => {
    checkForUpdates();
    return { success: true };
  });

  // Download available update
  ipcMain.handle('update:download', () => {
    downloadUpdate();
    return { success: true };
  });

  // Install downloaded update
  ipcMain.handle('update:install', () => {
    installUpdate();
    return { success: true };
  });
}
