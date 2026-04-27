import { useEffect, useState } from 'react';

import type { ConfigSource } from '@/electron';

export interface PromptSettingsState {
  systemPromptAppend: string;
  isDefaultPrompt: boolean;
  systemPromptSource: ConfigSource;
  isLoadingPrompt: boolean;
  isSavingPrompt: boolean;
  promptSaveState: 'idle' | 'success' | 'error';
}

export interface PromptSettingsActions {
  setSystemPromptAppend: (value: string) => void;
  handleSaveSystemPrompt: () => Promise<void>;
  handleResetSystemPrompt: () => Promise<void>;
}

export function usePromptSettings(): PromptSettingsState & PromptSettingsActions {
  const [systemPromptAppend, setSystemPromptAppend] = useState('');
  const [isDefaultPrompt, setIsDefaultPrompt] = useState(true);
  const [systemPromptSource, setSystemPromptSource] = useState<ConfigSource>('default');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveState, setPromptSaveState] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    window.electron.config
      .getSystemPromptAppend()
      .then((response) => {
        setSystemPromptAppend(response.text);
        setIsDefaultPrompt(response.isDefault);
        setSystemPromptSource(response.source);
        setIsLoadingPrompt(false);
      })
      .catch(() => {
        setIsLoadingPrompt(false);
      });
  }, []);

  const handleSaveSystemPrompt = async () => {
    setIsSavingPrompt(true);
    setPromptSaveState('idle');
    try {
      const response = await window.electron.config.setSystemPromptAppend(systemPromptAppend);
      setSystemPromptAppend(response.text);
      setIsDefaultPrompt(response.isDefault);
      if (response.source) {
        setSystemPromptSource(response.source);
      }
      setPromptSaveState('success');
      setTimeout(() => setPromptSaveState('idle'), 2000);
    } catch {
      setPromptSaveState('error');
      setTimeout(() => setPromptSaveState('idle'), 2500);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleResetSystemPrompt = async () => {
    setIsSavingPrompt(true);
    setPromptSaveState('idle');
    try {
      const response = await window.electron.config.setSystemPromptAppend(null);
      setSystemPromptAppend(response.text);
      setIsDefaultPrompt(response.isDefault);
      if (response.source) {
        setSystemPromptSource(response.source);
      }
      setPromptSaveState('success');
      setTimeout(() => setPromptSaveState('idle'), 2000);
    } catch {
      setPromptSaveState('error');
      setTimeout(() => setPromptSaveState('idle'), 2500);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  return {
    systemPromptAppend,
    isDefaultPrompt,
    systemPromptSource,
    isLoadingPrompt,
    isSavingPrompt,
    promptSaveState,
    setSystemPromptAppend,
    handleSaveSystemPrompt,
    handleResetSystemPrompt
  };
}
