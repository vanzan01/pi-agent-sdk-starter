import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

import type { AgentDefinition } from '../../shared/apps';

type AgentInfo = {
  id: string;
  appId: string;
  path: string;
  definition: AgentDefinition;
};

// Look for agents in .agents/agents/{app-id}/ directories
const agentRoots = Array.from(
  new Set(
    [
      join(app.getAppPath(), '.agents', 'agents'),
      join(app.getAppPath(), 'out', '.agents', 'agents'),
      join(process.resourcesPath || process.cwd(), '.agents', 'agents'),
      join(process.cwd(), '.agents', 'agents')
    ].filter(Boolean)
  )
);

function parseAgentFile(filePath: string): AgentDefinition | null {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      console.warn(`Agent file missing frontmatter: ${filePath}`);
      return null;
    }

    const [, frontmatter, body] = frontmatterMatch;

    // Simple YAML parsing for our expected fields
    const lines = frontmatter.split(/\r?\n/);
    const config: Record<string, string> = {};

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        config[match[1]] = match[2].trim();
      }
    }

    if (!config.name || !config.description) {
      console.warn(`Agent file missing required fields (name, description): ${filePath}`);
      return null;
    }

    // Parse tools as comma-separated list
    // "none" = explicit empty array (no tools), undefined = inherit from session
    function parseTools(toolsConfig: string | undefined): string[] | undefined {
      if (!toolsConfig) {
        return undefined; // Inherits all tools from session
      }
      if (toolsConfig.toLowerCase() === 'none') {
        return []; // Explicit "no tools"
      }
      return toolsConfig
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const tools = parseTools(config.tools);

    // Parse model
    const validModels = ['smart', 'deep', 'fast', 'inherit'];
    const model =
      config.model && validModels.includes(config.model) ?
        (config.model as 'smart' | 'deep' | 'fast' | 'inherit')
      : undefined;

    return {
      description: config.description,
      tools,
      prompt: body.trim(),
      model
    };
  } catch (error) {
    console.error(`Failed to parse agent file ${filePath}:`, error);
    return null;
  }
}

/**
 * Discover agents from .agents/agents/{app-id}/*.md
 * Structure: .agents/agents/ai-news-tweet/researcher.md
 */
function discoverAgents(): AgentInfo[] {
  const agents: AgentInfo[] = [];
  const seenKeys = new Set<string>(); // app-id:agent-id

  for (const root of agentRoots) {
    if (!existsSync(root)) continue;

    // Look for app subdirectories
    const appDirs = readdirSync(root, { withFileTypes: true });
    for (const appDir of appDirs) {
      if (!appDir.isDirectory()) continue;

      const appId = appDir.name;
      const appAgentsPath = join(root, appId);

      // Look for .md files in app subdirectory
      const agentFiles = readdirSync(appAgentsPath, { withFileTypes: true });
      for (const entry of agentFiles) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

        const agentId = entry.name.replace(/\.md$/, '');
        const key = `${appId}:${agentId}`;

        // Skip if we've already seen this agent (first root wins)
        if (seenKeys.has(key)) continue;

        const filePath = join(appAgentsPath, entry.name);
        const definition = parseAgentFile(filePath);

        if (definition) {
          seenKeys.add(key);
          agents.push({
            id: agentId,
            appId,
            path: filePath,
            definition
          });
        }
      }
    }
  }

  return agents;
}

/**
 * Get agents for a specific app by discovering from .agents/agents/{app-id}/
 */
export function getAgentsForApp(appId: string): Record<string, AgentDefinition> {
  const allAgents = discoverAgents();
  const result: Record<string, AgentDefinition> = {};

  // Filter agents for this specific app
  for (const agent of allAgents) {
    if (agent.appId === appId) {
      result[agent.id] = agent.definition;
    }
  }

  return result;
}

/**
 * Get all discovered agents across all apps (for debugging)
 */
export function getAllDiscoveredAgents(): Record<string, Record<string, AgentDefinition>> {
  const allAgents = discoverAgents();
  const result: Record<string, Record<string, AgentDefinition>> = {};

  for (const agent of allAgents) {
    if (!result[agent.appId]) {
      result[agent.appId] = {};
    }
    result[agent.appId][agent.id] = agent.definition;
  }

  return result;
}
