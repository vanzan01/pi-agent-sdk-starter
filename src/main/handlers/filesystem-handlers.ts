import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
import { dirname, join, relative } from 'path';
import chokidar, { type FSWatcher } from 'chokidar';
import { ipcMain, type BrowserWindow } from 'electron';

import { getWorkspaceDir } from '../lib/config';

// Helper: Check if path is within workspace (case-insensitive on Windows)
function isPathWithinWorkspace(filePath: string, workspaceDir: string): boolean {
  if (process.platform === 'win32') {
    // Windows: case-insensitive comparison
    return filePath.toLowerCase().startsWith(workspaceDir.toLowerCase());
  }
  return filePath.startsWith(workspaceDir);
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

// File watcher instance
let fileWatcher: FSWatcher | null = null;

// Directories to ignore when listing files
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  '.cache',
  '.turbo',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'coverage',
  '.nyc_output'
]);

// Files to ignore
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', '.gitkeep']);

async function buildFileTree(
  dirPath: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<FileNode[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    // Sort entries: directories first, then alphabetically
    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sortedEntries) {
      const fullPath = join(dirPath, entry.name);

      // Skip ignored entries
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      if (!entry.isDirectory() && IGNORED_FILES.has(entry.name)) {
        continue;
      }
      // Skip hidden files/folders (starting with .)
      if (entry.name.startsWith('.') && entry.name !== '.claude') {
        continue;
      }

      const node: FileNode = {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory()
      };

      if (entry.isDirectory()) {
        // Recursively build children
        node.children = await buildFileTree(fullPath, maxDepth, currentDepth + 1);
      }

      nodes.push(node);
    }

    return nodes;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

export function registerFilesystemHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Read directory contents
  ipcMain.handle('fs:read-directory', async (_event, dirPath: string) => {
    try {
      // Security check: ensure path is within workspace
      const workspaceDir = getWorkspaceDir();
      const resolvedPath = dirPath || workspaceDir;

      if (!isPathWithinWorkspace(resolvedPath, workspaceDir)) {
        return { success: false, error: 'Access denied: path outside workspace' };
      }

      const entries = await buildFileTree(resolvedPath);
      return { success: true, entries };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read directory'
      };
    }
  });

  // Read file contents
  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    try {
      const workspaceDir = getWorkspaceDir();

      // Resolve relative .claude paths to workspace directory
      let resolvedPath = filePath;
      if (filePath.startsWith('.claude')) {
        resolvedPath = join(workspaceDir, filePath);
      }

      // Security check: ensure path is within workspace
      if (!isPathWithinWorkspace(resolvedPath, workspaceDir)) {
        return { success: false, error: 'Access denied: path outside workspace' };
      }

      // Check if file exists and is not too large
      const stats = await stat(resolvedPath);
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

      if (stats.size > MAX_FILE_SIZE) {
        return { success: false, error: 'File too large to open (>10MB)' };
      }

      const content = await readFile(resolvedPath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file'
      };
    }
  });

  // Write file contents
  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
    try {
      // Security check: ensure path is within workspace
      const workspaceDir = getWorkspaceDir();
      if (!isPathWithinWorkspace(filePath, workspaceDir)) {
        return { success: false, error: 'Access denied: path outside workspace' };
      }

      // Ensure parent directory exists
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });

      await writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to write file'
      };
    }
  });

  // Start watching directory for changes
  ipcMain.handle('fs:watch', async (_event, dirPath: string) => {
    try {
      const workspaceDir = getWorkspaceDir();
      const watchPath = dirPath || workspaceDir;

      // Close existing watcher if any
      if (fileWatcher) {
        await fileWatcher.close();
      }

      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return { success: false, error: 'No main window available' };
      }

      // Create new watcher
      fileWatcher = chokidar.watch(watchPath, {
        ignored: [
          /(^|[/\\])\../, // Hidden files
          /node_modules/,
          /\.git/,
          /dist/,
          /build/
        ],
        persistent: true,
        ignoreInitial: true,
        depth: 5
      });

      fileWatcher.on('add', (filePath: string) => {
        mainWindow.webContents.send('fs:file-changed', {
          type: 'add',
          path: filePath,
          relativePath: relative(workspaceDir, filePath)
        });
      });

      fileWatcher.on('change', (filePath: string) => {
        mainWindow.webContents.send('fs:file-changed', {
          type: 'change',
          path: filePath,
          relativePath: relative(workspaceDir, filePath)
        });
      });

      fileWatcher.on('unlink', (filePath: string) => {
        mainWindow.webContents.send('fs:file-changed', {
          type: 'unlink',
          path: filePath,
          relativePath: relative(workspaceDir, filePath)
        });
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start file watcher'
      };
    }
  });

  // Stop watching
  ipcMain.handle('fs:unwatch', async () => {
    if (fileWatcher) {
      await fileWatcher.close();
      fileWatcher = null;
    }
    return { success: true };
  });
}

// Cleanup function for app shutdown
export async function cleanupFilesystemHandlers(): Promise<void> {
  if (fileWatcher) {
    await fileWatcher.close();
    fileWatcher = null;
  }
}
