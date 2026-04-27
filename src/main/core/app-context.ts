import {
  getAppById,
  getDefaultApp,
  type AgentDefinition,
  type AppManifest
} from '../../shared/apps';
import { setActiveAppContext } from '../lib/claude-session';
import { getAppSettings } from '../lib/config';
import { getAgentsForApp } from './agents';
import { buildSystemPromptAppend } from './ai-client';
import { getAllowedTools } from './skills';

export type AppContext = {
  manifest: AppManifest;
  allowedTools: string[];
  systemPrompt: string;
  agents?: Record<string, AgentDefinition>;
};

export function resolveApp(appId?: string | null): AppManifest {
  const manifest = appId ? getAppById(appId) : null;
  return manifest ?? getDefaultApp();
}

export function buildAppContext(appId?: string | null): AppContext {
  const manifest = resolveApp(appId);
  const allowedTools = getAllowedTools(manifest.id);
  const appSettings = getAppSettings(manifest.id);
  const combinedSystemPrompt = buildSystemPromptAppend(
    manifest.systemPrompt,
    appSettings.promptAppend ?? undefined
  );
  setActiveAppContext(manifest.id, combinedSystemPrompt);

  // Discover agents from .claude/agents/ folder, merging with manifest agents
  // Discovered agents take precedence over manifest-defined agents
  const discoveredAgents = getAgentsForApp(manifest.id);
  const agents = {
    ...manifest.agents, // Manifest agents as fallback
    ...discoveredAgents // Discovered agents override
  };

  return {
    manifest,
    allowedTools,
    systemPrompt: combinedSystemPrompt,
    agents: Object.keys(agents).length > 0 ? agents : undefined
  };
}
