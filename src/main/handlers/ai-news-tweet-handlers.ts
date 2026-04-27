import { randomUUID } from 'crypto';
import { ipcMain, type BrowserWindow } from 'electron';
import { getPipelineStatus, runAiNewsTweetPipeline, type ModelType } from '../lib/ai-news-tweet-pipeline';

export function registerAiNewsTweetHandlers(getMainWindow: () => BrowserWindow | null): void {

  ipcMain.handle(
    'aiNewsTweet:startPipeline',
    async (
      _event,
      options?: {
        stageModels?: { research?: ModelType; analysis?: ModelType; writer?: ModelType };
      }
    ) => {
    try {
      const runId = randomUUID();
      const mainWindow = getMainWindow();

      // Fire and forget - run in background
      runAiNewsTweetPipeline(mainWindow, { 
        runId, 
        stageModels: options?.stageModels 
      }).catch(err => {
        console.error('[ai-news-tweet] Background pipeline error:', err);
      });

      return { success: true, runId };
    } catch (error) {
      console.error('[ai-news-tweet] Failed to start pipeline:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
    }
  );

  ipcMain.handle('aiNewsTweet:getPipelineStatus', async (_event, runId: string) => {
    try {
      const state = getPipelineStatus(runId);
      if (!state) {
        return { success: false, error: 'Run not found' };
      }
      return { success: true, state };
    } catch (error) {
      console.error('[ai-news-tweet] Failed to get status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
}
