import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getWindowBoundsPath(): string {
  return join(app.getPath('userData'), 'window-bounds.json');
}

export function saveWindowBounds(bounds: WindowBounds): void {
  try {
    writeFileSync(getWindowBoundsPath(), JSON.stringify(bounds, null, 2));
  } catch (error) {
    console.error('Failed to save window bounds:', error);
  }
}

export function loadWindowBounds(): WindowBounds | null {
  try {
    const boundsPath = getWindowBoundsPath();
    if (existsSync(boundsPath)) {
      const data = readFileSync(boundsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load window bounds:', error);
  }
  return null;
}
