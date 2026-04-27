import { join } from 'path';

const PI_AGENT_DIR_NAME = 'pi-agent';

export interface EmbeddedPiAgentPaths {
  agentDir: string;
  authPath: string;
  modelsPath: string;
  settingsPath: string;
}

export function buildEmbeddedPiAgentPaths(userDataPath: string): EmbeddedPiAgentPaths {
  const agentDir = join(userDataPath, PI_AGENT_DIR_NAME);
  return {
    agentDir,
    authPath: join(agentDir, 'auth.json'),
    modelsPath: join(agentDir, 'models.json'),
    settingsPath: join(agentDir, 'settings.json')
  };
}
