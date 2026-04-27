import { app, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';

import { checkForUpdates } from './lib/updater';

export function showSettings(mainWindow: BrowserWindow | null): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('navigate', 'settings');
  }
}

export function showLauncher(mainWindow: BrowserWindow | null): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('navigate', 'launcher');
  }
}

export function reloadWindow(mainWindow: BrowserWindow | null): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.reload();
  }
}

export function createApplicationMenu(mainWindow: BrowserWindow | null): Menu {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ?
      ([
        {
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            {
              label: 'App Launcher',
              accelerator: 'Cmd+Shift+L',
              click: () => showLauncher(mainWindow)
            },
            {
              label: 'Settings',
              accelerator: 'Cmd+,',
              click: () => showSettings(mainWindow)
            },
            { type: 'separator' as const },
            {
              label: 'Check for Updates...',
              click: () => checkForUpdates()
            },
            { type: 'separator' as const },
            { role: 'quit' as const }
          ] as MenuItemConstructorOptions[]
        }
      ] as MenuItemConstructorOptions[])
      // Windows and Linux share the same File menu structure
    : [
        {
          label: 'File',
          submenu: [
            {
              label: 'App Launcher',
              accelerator: 'Ctrl+Shift+L',
              click: () => showLauncher(mainWindow)
            },
            {
              label: 'Settings',
              accelerator: 'Ctrl+,',
              click: () => showSettings(mainWindow)
            },
            { type: 'separator' as const },
            {
              label: 'Check for Updates...',
              click: () => checkForUpdates()
            },
            { type: 'separator' as const },
            { role: 'quit' as const }
          ] as MenuItemConstructorOptions[]
        }
      ]),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'pasteAndMatchStyle' as const },
        { role: 'delete' as const },
        { role: 'selectAll' as const }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => reloadWindow(mainWindow)
        },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'toggleDevTools' as const }
      ] as MenuItemConstructorOptions[]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        { role: 'close' as const }
      ] as MenuItemConstructorOptions[]
    }
  ];

  return Menu.buildFromTemplate(template);
}
