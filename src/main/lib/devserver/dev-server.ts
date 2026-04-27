import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { createServer, type Server } from 'http';
import { extname, join } from 'path';
import type { BrowserWindow } from 'electron';
import getPort from 'get-port';

import { detectProjectType, type ProjectType } from './project-detector';

export interface DevServerStatus {
  running: boolean;
  url: string | null;
  port: number | null;
  projectType: ProjectType | null;
  error: string | null;
}

export interface DevServerStartResult {
  success: boolean;
  url?: string;
  port?: number;
  error?: string;
}

// MIME types for static file serving
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.jsx': 'application/javascript',
  '.ts': 'application/javascript',
  '.tsx': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.xml': 'application/xml'
};

export class DevServerManager {
  private server: Server | null = null;
  private port: number = 0;
  private projectPath: string = '';
  private projectType: ProjectType | null = null;
  private mainWindow: BrowserWindow | null = null;
  private status: DevServerStatus = {
    running: false,
    url: null,
    port: null,
    projectType: null,
    error: null
  };

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
  }

  private log(level: string, message: string): void {
    console.log(`[DevServer] ${level}: ${message}`);
    this.mainWindow?.webContents.send('devserver:log', { level, message });
  }

  async start(projectPath: string): Promise<DevServerStartResult> {
    // Stop existing server if running
    if (this.server) {
      await this.stop();
    }

    this.projectPath = projectPath;
    this.projectType = detectProjectType(projectPath);

    this.log('info', `Detected project type: ${this.projectType}`);
    this.log('info', `Starting server for: ${projectPath}`);

    try {
      // Get available port
      this.port = await getPort({ port: [3000, 3001, 3002, 3003, 3004, 3005] });

      // For now, use simple static file server
      // TODO: Integrate with Vite programmatic API for HMR support
      this.server = createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      return new Promise((resolve, reject) => {
        this.server!.listen(this.port, '127.0.0.1', () => {
          const url = `http://localhost:${this.port}`;
          this.status = {
            running: true,
            url,
            port: this.port,
            projectType: this.projectType,
            error: null
          };

          this.log('info', `Server started at ${url}`);
          resolve({ success: true, url, port: this.port });
        });

        this.server!.on('error', (error) => {
          this.status = {
            running: false,
            url: null,
            port: null,
            projectType: this.projectType,
            error: error.message
          };
          reject(error);
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.status = {
        running: false,
        url: null,
        port: null,
        projectType: this.projectType,
        error: errorMessage
      };
      return { success: false, error: errorMessage };
    }
  }

  private async handleRequest(
    req: import('http').IncomingMessage,
    res: import('http').ServerResponse
  ): Promise<void> {
    const url = new URL(req.url || '/', `http://localhost:${this.port}`);
    let filePath = join(this.projectPath, url.pathname);

    // Default to index.html for root and directories
    if (url.pathname === '/' || url.pathname.endsWith('/')) {
      filePath = join(this.projectPath, url.pathname, 'index.html');
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      // Try adding .html extension
      if (existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
      } else {
        // Fall back to index.html for SPA routing
        const indexPath = join(this.projectPath, 'index.html');
        if (existsSync(indexPath)) {
          filePath = indexPath;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
      }
    }

    try {
      const content = await readFile(filePath);
      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Add CORS headers for development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Cache control for development
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (error) {
      console.error('Error serving file:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.log('info', 'Server stopped');
          this.server = null;
          this.status = {
            running: false,
            url: null,
            port: null,
            projectType: this.projectType,
            error: null
          };
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async restart(): Promise<DevServerStartResult> {
    await this.stop();
    return this.start(this.projectPath);
  }

  getStatus(): DevServerStatus {
    return { ...this.status };
  }

  isRunning(): boolean {
    return this.status.running;
  }
}
