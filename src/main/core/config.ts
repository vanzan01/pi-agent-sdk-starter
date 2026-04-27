import { buildPiSessionEnv, getSystemPromptAppend } from '../lib/config';

export function buildSessionEnv() {
  return buildPiSessionEnv();
}

export function getGlobalSystemAppend(): string {
  return getSystemPromptAppend();
}
