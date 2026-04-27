import { mkdirSync } from 'fs';
import { join } from 'path';

import { buildEmbeddedPiAgentPaths } from '../src/main/lib/pi-runtime-paths';

export function getPiSdkTestAgentPaths() {
  const userDataPath =
    process.env.PI_STARTER_TEST_USER_DATA_DIR ?? join(process.cwd(), '.pi-sdk', 'test-user-data');
  const paths = buildEmbeddedPiAgentPaths(userDataPath);
  mkdirSync(paths.agentDir, { recursive: true });
  return paths;
}
