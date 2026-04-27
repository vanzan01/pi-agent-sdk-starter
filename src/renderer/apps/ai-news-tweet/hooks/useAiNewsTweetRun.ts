import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentId, AgentRuntime, StageModels } from '../types';
import { createInitialAgentStates } from '../utils';

// Pipeline state type (mirrors main process type)
interface PipelineState {
  runId: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  currentStage: 'idle' | 'research' | 'analysis' | 'writer';
  logs: string[];
  tweetCandidate?: string;
  error?: string;
  agentResults: {
    research?: string;
    analysis?: string;
    writer?: string;
  };
}

export function useAiNewsTweetRun(stageModels: StageModels) {
  const [agentStates, setAgentStates] = useState<Record<AgentId, AgentRuntime>>(() =>
    createInitialAgentStates()
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleGenerateTweet = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setAgentStates(createInitialAgentStates());
    setError(null);

    try {
      const result = await window.electron.aiNewsTweet.startPipeline({ stageModels });
      if (result.success && result.runId) {
        setRunId(result.runId);
      } else {
        setError(result.error || 'Failed to start pipeline');
        setIsRunning(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsRunning(false);
    }
  }, [isRunning, stageModels]);

  // Polling effect
  useEffect(() => {
    if (!runId || !isRunning) return;

    const poll = async () => {
      try {
        const result = await window.electron.aiNewsTweet.getPipelineStatus(runId);
        if (result.success && result.state) {
          const state = result.state as PipelineState;
          const lastLog = state.logs.length > 0 ? state.logs[state.logs.length - 1] : undefined;
          
          // Update agent states based on pipeline state
          setAgentStates(prev => {
            const next = { ...prev };
            
            // Update Research
            if (state.currentStage === 'research' && state.status === 'running') {
              next.research.status = 'running';
              next.research.lastLog = lastLog;
            } else if (state.agentResults?.research) {
              next.research.status = 'complete';
              next.research.result = state.agentResults.research;
              next.research.streamingText = state.agentResults.research;
              next.research.lastLog = undefined;
            }

            // Update Analysis
            if (state.currentStage === 'analysis' && state.status === 'running') {
              next.analysis.status = 'running';
              next.analysis.incomingContext = state.agentResults?.research;
              next.analysis.lastLog = lastLog;
            } else if (state.agentResults?.analysis) {
              next.analysis.status = 'complete';
              next.analysis.result = state.agentResults.analysis;
              next.analysis.streamingText = state.agentResults.analysis;
              next.analysis.incomingContext = state.agentResults?.research;
              next.analysis.lastLog = undefined;
            }

            // Update Writer
            if (state.currentStage === 'writer' && state.status === 'running') {
              next.writer.status = 'running';
              next.writer.incomingContext = state.agentResults?.analysis;
              next.writer.lastLog = lastLog;
            } else if (state.agentResults?.writer) {
              next.writer.status = 'complete';
              next.writer.result = state.agentResults.writer;
              next.writer.streamingText = state.agentResults.writer;
              next.writer.incomingContext = state.agentResults?.analysis;
              next.writer.lastLog = undefined;
            }

            // Handle global error
            if (state.status === 'error') {
              const current = state.currentStage as AgentId;
              if (current && next[current]) {
                next[current].status = 'error';
                next[current].error = state.error;
                next[current].lastLog = lastLog;
              }
              setIsRunning(false);
            }

            // Handle completion
            if (state.status === 'complete') {
              setIsRunning(false);
            }

            return next;
          });

        } else if (result.error) {
          console.error('Poll error:', result.error);
        }
      } catch (err) {
        console.error('Poll exception:', err);
      }
    };

    // Poll immediately and then every 1s
    poll();
    pollIntervalRef.current = setInterval(poll, 1000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [runId, isRunning]);

  return {
    agentStates,
    isRunning,
    error,
    handleGenerateTweet
  };
}
