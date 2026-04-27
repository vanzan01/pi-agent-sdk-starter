import type { AppManifest } from './types';

export const chatApp: AppManifest = {
  id: 'chat',
  name: 'Pi Codex Playground',
  icon: 'message-square',
  skills: ['workspace-tools'],
  rootRoute: '/apps/chat',
  systemPrompt:
    'You are a Pi Codex playground assistant focused on CLI-friendly coding and tool use. Prefer concise answers, invoke tools when they help, and keep responses actionable.',
  description: 'CLI-friendly coding and tool use assistant',
  layout: {
    preferredMode: 'standard',
    theme: 'light'
  },
  category: 'utility',
  features: ['chat', 'filesystem', 'shell']
};
