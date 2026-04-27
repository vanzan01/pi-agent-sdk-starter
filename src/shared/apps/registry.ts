import { templateApp } from './_template';
import { aiNewsTweetApp } from './ai-news-tweet';
import { chatApp } from './chat';
import type { AppManifest } from './types';

const apps: AppManifest[] = [
  chatApp,
  aiNewsTweetApp,
  templateApp
];

export function getAllApps(): AppManifest[] {
  return apps;
}

function normalizeRoute(route: string | undefined | null): string {
  return (route ?? '').replace(/^#/, '').replace(/\/+$/, '').toLowerCase();
}

export function getAppById(id: string): AppManifest | undefined {
  return apps.find((app) => app.id === id);
}

export function getAppByRoute(route: string): AppManifest | undefined {
  const normalized = normalizeRoute(route);
  return apps.find((app) => normalizeRoute(app.rootRoute) === normalized);
}

export function getDefaultApp(): AppManifest {
  return chatApp;
}
