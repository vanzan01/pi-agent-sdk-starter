import { ipcMain, shell } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function registerShellHandlers(): void {
  // Handle opening external links
  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to open external URL:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Handle executing shell commands
  ipcMain.handle(
    'shell:execute',
    async (
      _event,
      command: string,
      options?: { cwd?: string; timeout?: number }
    ): Promise<{
      success: boolean;
      stdout: string;
      stderr: string;
      exitCode: number;
      error?: string;
    }> => {
      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: options?.cwd,
          timeout: options?.timeout ?? 60000, // Default 60 second timeout
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        });
        return {
          success: true,
          stdout,
          stderr,
          exitCode: 0
        };
      } catch (error) {
        const execError = error as { stdout?: string; stderr?: string; code?: number; message?: string };
        return {
          success: false,
          stdout: execError.stdout ?? '',
          stderr: execError.stderr ?? '',
          exitCode: execError.code ?? 1,
          error: execError.message ?? 'Unknown error'
        };
      }
    }
  );
}
