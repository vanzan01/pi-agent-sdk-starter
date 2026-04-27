export type AgentId = 'research' | 'analysis' | 'writer';
export type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

export type AgentRuntime = {
  status: AgentStatus;
  streamingText: string;
  result: string | null;
  error?: string;
  incomingContext?: string;
  lastLog?: string;
};

export type AgentMeta = {
  id: AgentId;
  label: string;
  subtitle: string;
  mission: string;
  icon: string;
  accent: {
    border: string;
    gradient: string;
  };
};

export type StageModel = 'fast' | 'smart' | 'deep';

export type StageModels = {
  research: StageModel;
  analysis: StageModel;
  writer: StageModel;
};