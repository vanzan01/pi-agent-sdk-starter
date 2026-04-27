const BACKGROUND_APPS_STORAGE_KEY = 'app-background-enabled';

export function getStoredBackgroundEnabled(appId: string): boolean {
  try {
    const stored = localStorage.getItem(BACKGROUND_APPS_STORAGE_KEY);
    const prefs = stored ? JSON.parse(stored) : {};
    return prefs[appId] ?? false;
  } catch {
    return false;
  }
}

export function setStoredBackgroundEnabled(appId: string, enabled: boolean) {
  try {
    const stored = localStorage.getItem(BACKGROUND_APPS_STORAGE_KEY);
    const prefs = stored ? JSON.parse(stored) : {};
    prefs[appId] = enabled;
    localStorage.setItem(BACKGROUND_APPS_STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent('background-apps-changed'));
  } catch {
    // localStorage might not be available
  }
}

