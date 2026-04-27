import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type ProjectType =
  | 'vite-react'
  | 'vite-vue'
  | 'vite-svelte'
  | 'vite-vanilla'
  | 'create-react-app'
  | 'next'
  | 'nuxt'
  | 'static-html'
  | 'unknown';

export function detectProjectType(projectPath: string): ProjectType {
  // Check for Vite config files
  const viteConfigs = ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'];
  const hasViteConfig = viteConfigs.some((f) => existsSync(join(projectPath, f)));

  if (hasViteConfig) {
    return detectViteFramework(projectPath);
  }

  // Check for Next.js
  if (
    existsSync(join(projectPath, 'next.config.js')) ||
    existsSync(join(projectPath, 'next.config.mjs')) ||
    existsSync(join(projectPath, 'next.config.ts'))
  ) {
    return 'next';
  }

  // Check for Nuxt
  if (
    existsSync(join(projectPath, 'nuxt.config.js')) ||
    existsSync(join(projectPath, 'nuxt.config.ts'))
  ) {
    return 'nuxt';
  }

  // Check package.json for framework hints
  const packageJsonPath = join(projectPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['react-scripts']) return 'create-react-app';
      if (deps.vite) return detectViteFramework(projectPath);
      if (deps.next) return 'next';
      if (deps.nuxt) return 'nuxt';
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Check for static HTML
  if (existsSync(join(projectPath, 'index.html'))) {
    return 'static-html';
  }

  return 'unknown';
}

function detectViteFramework(projectPath: string): ProjectType {
  const packageJsonPath = join(projectPath, 'package.json');

  if (!existsSync(packageJsonPath)) {
    return 'vite-vanilla';
  }

  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.vue || deps['@vitejs/plugin-vue']) return 'vite-vue';
    if (deps.svelte || deps['@sveltejs/vite-plugin-svelte']) return 'vite-svelte';
    if (deps.react || deps['@vitejs/plugin-react']) return 'vite-react';

    return 'vite-vanilla';
  } catch {
    return 'vite-vanilla';
  }
}

export function getDefaultDevCommand(
  projectType: ProjectType
): { command: string; args: string[] } | null {
  switch (projectType) {
    case 'vite-react':
    case 'vite-vue':
    case 'vite-svelte':
    case 'vite-vanilla':
      return { command: 'npx', args: ['vite', '--port', '0'] };

    case 'create-react-app':
      return { command: 'npm', args: ['start'] };

    case 'next':
      return { command: 'npx', args: ['next', 'dev', '--port', '0'] };

    case 'nuxt':
      return { command: 'npx', args: ['nuxt', 'dev', '--port', '0'] };

    case 'static-html':
      return null; // Will use built-in static server

    case 'unknown':
    default:
      return null;
  }
}
