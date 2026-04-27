import { getSystemPromptAppend } from '../lib/config';

export type ModelTier = 'fast' | 'smart' | 'deep';

export function resolveModelForTier(tier: ModelTier): string {
  // Map tier to model id; keep in sync with provider config
  const map: Record<ModelTier, string> = {
    fast: 'fast',
    smart: 'smart',
    deep: 'deep'
  };
  return map[tier];
}

export function buildSystemPromptAppend(...appends: (string | null | undefined)[]): string {
  const baseAppend = getSystemPromptAppend();
  const pieces = [baseAppend, ...appends].filter(
    (text) => typeof text === 'string' && text.trim().length > 0
  );
  return pieces.join('\n\n');
}
