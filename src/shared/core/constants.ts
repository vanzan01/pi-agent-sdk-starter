export const MAX_ATTACHMENT_BYTES = 32 * 1024 * 1024; // 32 MB
export const ATTACHMENTS_DIR_NAME = 'attachments';

// Thinking token presets for extended thinking configuration
export const THINKING_LEVELS = ['off', 'light', 'balanced', 'deep'] as const;
export type ThinkingLevel = (typeof THINKING_LEVELS)[number];

export const THINKING_PRESETS: Record<
  ThinkingLevel,
  { label: string; tokens: number; description: string }
> = {
  off: { label: 'Off', tokens: 0, description: 'Fast responses, no reasoning' },
  light: { label: 'Light', tokens: 5_000, description: 'Simple questions' },
  balanced: { label: 'Balanced', tokens: 16_000, description: 'General tasks' },
  deep: { label: 'Deep', tokens: 32_000, description: 'Complex problems' }
};

export const DEFAULT_THINKING_LEVEL: ThinkingLevel = 'balanced';
