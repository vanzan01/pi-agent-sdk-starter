import type { AgentId, AgentMeta, AgentRuntime, AgentStatus } from './types';

export const AGENT_META: AgentMeta[] = [
  {
    id: 'research',
    label: 'RECON',
    subtitle: 'Data acquisition',
    mission: 'Scans the digital frontier for AI intelligence.',
    icon: '◈',
    accent: {
      border: 'synth-card synth-glow-cyan',
      gradient: ''
    },
  },
  {
    id: 'analysis',
    label: 'NEURAL',
    subtitle: 'Signal processing',
    mission: 'Filters noise. Amplifies signal. Identifies impact.',
    icon: '◉',
    accent: {
      border: 'synth-card synth-glow-purple',
      gradient: ''
    },
  },
  {
    id: 'writer',
    label: 'SYNTH',
    subtitle: 'Output generation',
    mission: 'Transforms analysis into viral transmission.',
    icon: '◎',
    accent: {
      border: 'synth-card synth-glow-pink',
      gradient: ''
    },
  }
];

export const STATUS_STYLES: Record<
  AgentStatus,
  { text: string; badge: string; progress: string; bar: string }
> = {
  pending: {
    text: 'STANDBY',
    badge: 'synth-badge border border-white/20 text-white/50',
    progress: '0%',
    bar: 'bg-white/10'
  },
  running: {
    text: 'ACTIVE',
    badge: 'synth-badge border text-[var(--neon-cyan)] border-[var(--neon-cyan)]/50 synth-pulse',
    progress: '60%',
    bar: 'bg-[var(--neon-cyan)]'
  },
  complete: {
    text: 'COMPLETE',
    badge: 'synth-badge border text-[var(--neon-pink)] border-[var(--neon-pink)]/50',
    progress: '100%',
    bar: 'bg-[var(--neon-pink)]'
  },
  error: {
    text: 'ERROR',
    badge: 'synth-badge border text-red-400 border-red-400/50',
    progress: '100%',
    bar: 'bg-red-500'
  }
};

export const formatSnippet = (text?: string, limit = 700): string => {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit)}…`;
};

export const getAgentColor = (id: AgentId) => {
  switch (id) {
    case 'research': return 'var(--neon-cyan)';
    case 'analysis': return 'var(--neon-purple)';
    case 'writer': return 'var(--neon-pink)';
  }
};

export const createInitialAgentStates = (): Record<AgentId, AgentRuntime> => ({
  research: {
    status: 'pending',
    streamingText: '',
    result: null,
  },
  analysis: {
    status: 'pending',
    streamingText: '',
    result: null,
  },
  writer: {
    status: 'pending',
    streamingText: '',
    result: null,
  }
});