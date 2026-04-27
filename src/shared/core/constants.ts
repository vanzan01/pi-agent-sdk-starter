export const MAX_ATTACHMENT_BYTES = 32 * 1024 * 1024; // 32 MB
export const ATTACHMENTS_DIR_NAME = 'attachments';

// Reasoning-effort presets map directly to Pi SDK thinking levels.
export const THINKING_LEVELS = ['low', 'medium', 'high', 'xhigh'] as const;
export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

export const THINKING_PRESETS: Record<
  ThinkingLevel,
  { label: string; tokens: number; description: string }
> = {
  low: { label: 'Low', tokens: 5_000, description: 'Light reasoning' },
  medium: { label: 'Medium', tokens: 16_000, description: 'Balanced reasoning' },
  high: { label: 'High', tokens: 32_000, description: 'Deep reasoning' },
  xhigh: { label: 'XHigh', tokens: 64_000, description: 'Maximum reasoning' }
};

export const DEFAULT_THINKING_LEVEL: ThinkingLevel = 'medium';
