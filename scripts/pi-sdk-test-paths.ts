import { mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { buildPiRuntimePaths } from '../src/main/lib/pi-runtime-paths';

export function getPiSdkTestAgentPaths() {
  const homePath = process.env.PI_STARTER_TEST_HOME_DIR ?? homedir();
  const projectPath =
    process.env.PI_STARTER_TEST_PROJECT_DIR ?? join(process.cwd(), '.pi-sdk', 'test-project');
  const paths = buildPiRuntimePaths(homePath, projectPath);
  mkdirSync(paths.sdkDir, { recursive: true });
  mkdirSync(paths.projectConfigDir, { recursive: true });
  return paths;
}
