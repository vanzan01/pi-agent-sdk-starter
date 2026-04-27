import { buildagentSessionEnv, getSystemPromptAppend } from '../lib/config';

export function buildSessionEnv() {
  return buildagentSessionEnv();
}

export function getGlobalSystemAppend(): string {
  return getSystemPromptAppend();
}
