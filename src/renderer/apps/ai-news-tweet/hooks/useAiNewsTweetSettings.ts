import { useState, useCallback } from 'react';
import type { AgentId, StageModel, StageModels } from '../types';

const DEFAULT_MODELS: StageModels = {
  research: 'fast',
  analysis: 'fast',
  writer: 'fast'
};

export function useAiNewsTweetSettings() {
  const [stageModels, setStageModels] = useState<StageModels>(DEFAULT_MODELS);

  const updateStageModel = useCallback((stage: AgentId, model: StageModel) => {
    setStageModels((prev) => ({
      ...prev,
      [stage]: model
    }));
  }, []);

  return {
    stageModels,
    updateStageModel
  };
}
