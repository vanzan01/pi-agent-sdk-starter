import type { ComponentType } from 'react';

import type { AppManifest } from '../../shared/apps';
import type { AppSettingsPanelProps } from './shared/settingsTypes';
import { ChatAppSettingsPanel } from './chat/AppSettingsPanel';
import { TemplateAppSettingsPanel } from './_template/AppSettingsPanel';

type PanelComponent = ComponentType<AppSettingsPanelProps>;

const registry: Record<string, PanelComponent> = {
  chat: ChatAppSettingsPanel,
  _template: TemplateAppSettingsPanel
};

export function getAppSettingsPanel(app: AppManifest | undefined): PanelComponent | null {
  if (!app) return null;
  return registry[app.id] ?? null;
}
