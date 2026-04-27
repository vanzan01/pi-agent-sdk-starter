import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import type {
  ExportBrowseResponse,
  ExportCancelResponse,
  ExportConfig,
  ExportGetAppsResponse,
  ExportPreviewResponse,
  ExportStartResult
} from '../../shared/types/export';
import { cancelExport, generateExportPreview, getExportableApps, runExport } from '../lib/exporter';

/**
 * Register IPC handlers for export functionality.
 */
export function registerExportHandlers(): void {
  // Get list of exportable apps
  ipcMain.handle('export:get-apps', async (): Promise<ExportGetAppsResponse> => {
    try {
      const apps = getExportableApps();
      return { apps };
    } catch (error) {
      console.error('Failed to get exportable apps:', error);
      return {
        apps: [],
        error: error instanceof Error ? error.message : 'Failed to get apps'
      };
    }
  });

  // Generate preview of what will be exported
  ipcMain.handle(
    'export:preview',
    async (_event, config: ExportConfig): Promise<ExportPreviewResponse> => {
      try {
        // Validate config
        if (!config.selectedAppIds || config.selectedAppIds.length === 0) {
          return {
            success: false,
            error: 'No apps selected for export'
          };
        }

        const preview = await generateExportPreview(config);
        return {
          success: true,
          preview
        };
      } catch (error) {
        console.error('Failed to generate export preview:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate preview'
        };
      }
    }
  );

  // Browse for output directory
  ipcMain.handle('export:browse-directory', async (): Promise<ExportBrowseResponse> => {
    try {
      const options: Electron.OpenDialogOptions = {
        title: 'Select Export Directory',
        defaultPath: app.getPath('desktop'),
        properties: ['openDirectory', 'createDirectory']
      };

      const parentWindow = BrowserWindow.getFocusedWindow();
      const result =
        parentWindow ?
          await dialog.showOpenDialog(parentWindow, options)
        : await dialog.showOpenDialog(options);

      if (result.canceled || result.filePaths.length === 0) {
        return { cancelled: true };
      }

      return {
        path: result.filePaths[0],
        cancelled: false
      };
    } catch (error) {
      console.error('Failed to show directory picker:', error);
      return { cancelled: true };
    }
  });

  // Start export
  ipcMain.handle(
    'export:start',
    async (_event, config: ExportConfig): Promise<ExportStartResult> => {
      try {
        // Validate config
        if (!config.projectName?.trim()) {
          return {
            success: false,
            error: 'Project name is required'
          };
        }

        if (!config.outputDir?.trim()) {
          return {
            success: false,
            error: 'Output directory is required'
          };
        }

        if (!config.selectedAppIds || config.selectedAppIds.length === 0) {
          return {
            success: false,
            error: 'No apps selected for export'
          };
        }

        const result = await runExport(config);
        return {
          success: true,
          jobId: result.jobId
        };
      } catch (error) {
        console.error('Failed to start export:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start export'
        };
      }
    }
  );

  // Cancel export
  ipcMain.handle('export:cancel', async (_event, jobId: string): Promise<ExportCancelResponse> => {
    try {
      const success = cancelExport(jobId);
      return { success };
    } catch (error) {
      console.error('Failed to cancel export:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel export'
      };
    }
  });
}
