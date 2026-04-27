import { spawn, spawnSync } from 'child_process';
import os from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function detectRunAsNodeLeak(env) {
  if (env.ELECTRON_RUN_AS_NODE && env.ELECTRON_RUN_AS_NODE !== '0') {
    return env.ELECTRON_RUN_AS_NODE;
  }

  const isWindowsHost = process.platform === 'win32';
  const isWsl = process.platform === 'linux' && /microsoft/i.test(os.release());

  if (isWindowsHost || isWsl) {
    try {
      const result = spawnSync('cmd.exe', ['/c', 'echo %ELECTRON_RUN_AS_NODE%'], {
        encoding: 'utf8'
      });
      const value = result.stdout?.trim();
      if (value && value !== '%ELECTRON_RUN_AS_NODE%') {
        return value;
      }
    } catch (error) {
      console.warn('Warning: unable to check Windows environment for ELECTRON_RUN_AS_NODE:', error);
    }
  }

  return null;
}

function ensureRunAsNodeCleared(env) {
  const leakValue = detectRunAsNodeLeak(env);
  const isWsl = process.platform === 'linux' && /microsoft/i.test(os.release());

  if (!leakValue) {
    return;
  }

  console.warn(
    `Detected ELECTRON_RUN_AS_NODE=${leakValue}, which forces Electron to run as plain Node and breaks startup.`
  );

  if (process.platform === 'win32') {
    delete env.ELECTRON_RUN_AS_NODE;
    console.warn('Temporarily clearing ELECTRON_RUN_AS_NODE for this dev session.');
    console.warn(
      'Remove it from your Windows environment variables to avoid future startup failures.'
    );
  } else if (isWsl) {
    console.error(
      'ELECTRON_RUN_AS_NODE is set in your Windows environment and cannot be overridden from WSL.'
    );
    console.error(
      'Remove it from Windows (System Properties -> Environment Variables) and rerun the dev server.'
    );
    process.exit(1);
  } else {
    delete env.ELECTRON_RUN_AS_NODE;
  }
}

function runPreDev(env) {
  const scriptPath = join(__dirname, 'preDev.js');
  const result = spawnSync('node', [scriptPath], {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
    env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runElectronVite(env) {
  const electronVitePath = join(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'electron-vite.cmd' : 'electron-vite'
  );

  const devProcess = spawn(electronVitePath, ['dev'], {
    stdio: 'inherit',
    cwd: join(__dirname, '..'),
    env,
    shell: process.platform === 'win32'
  });

  devProcess.on('close', (code) => {
    process.exit(code ?? 0);
  });

  devProcess.on('error', (error) => {
    console.error('Failed to start electron-vite:', error);
    process.exit(1);
  });
}

const sanitizedEnv = { ...process.env };
ensureRunAsNodeCleared(sanitizedEnv);
runPreDev(sanitizedEnv);
runElectronVite(sanitizedEnv);
