/**
 * AI News Tweet Bridge
 * Exposes AI News Tweet pipeline operations to the renderer.
 */
import type { IpcRenderer } from 'electron';
import type { AiNewsTweetBridge } from '../../shared/types/electron-api';

export function createAiNewsTweetBridge(ipcRenderer: IpcRenderer): AiNewsTweetBridge {
  return {
    startPipeline: (options) => ipcRenderer.invoke('aiNewsTweet:startPipeline', options),
    getPipelineStatus: (runId: string) => ipcRenderer.invoke('aiNewsTweet:getPipelineStatus', runId)
  };
}
