import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { Message } from '@/types/chat';
import {
  DEFAULT_THINKING_LEVEL,
  type ChatModelPreference,
  type ModelProvider,
  type ThinkingLevel
} from '../../shared/core';

interface ChatPreferences {
  modelPreference: ChatModelPreference;
  isModelPreferenceUpdating: boolean;
  thinkingLevel: ThinkingLevel;
  isThinkingLevelUpdating: boolean;
  provider: ModelProvider;
  isProviderUpdating: boolean;
  missingSkills: string[];
}

interface ChatPreferenceActions {
  handleModelPreferenceChange: (preference: ChatModelPreference) => Promise<void>;
  handleThinkingLevelChange: (level: ThinkingLevel) => Promise<void>;
  handleProviderChange: (provider: ModelProvider) => Promise<void>;
  syncProvider: (provider: ModelProvider) => void;
}

interface ChatPreferenceDeps {
  appId: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setInputValue: Dispatch<SetStateAction<string>>;
  saveCurrentConversationIfNeeded: () => Promise<void>;
  clearPendingAttachments: () => void;
}

export function useChatPreferences({
  appId,
  setMessages,
  setInputValue,
  saveCurrentConversationIfNeeded,
  clearPendingAttachments
}: ChatPreferenceDeps): ChatPreferences & ChatPreferenceActions {
  const [modelPreference, setModelPreference] = useState<ChatModelPreference>('fast');
  const [isModelPreferenceUpdating, setIsModelPreferenceUpdating] = useState(false);
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>(DEFAULT_THINKING_LEVEL);
  const [isThinkingLevelUpdating, setIsThinkingLevelUpdating] = useState(false);
  const [provider, setProvider] = useState<ModelProvider>('codex');
  const [isProviderUpdating, setIsProviderUpdating] = useState(false);
  const [missingSkills, setMissingSkills] = useState<string[]>([]);

  // Initial loads
  useEffect(() => {
    let isMounted = true;
    window.electron.config
      .getSkillStatus(appId)
      .then((status) => {
        if (isMounted) {
          setMissingSkills(status.missing || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMissingSkills([]);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [appId]);

  useEffect(() => {
    let isMounted = true;
    window.electron.agent
      .getModelPreference()
      .then(({ preference }) => {
        if (isMounted && preference) {
          setModelPreference(preference);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    window.electron.config
      .getThinkingLevel()
      .then(({ level }) => {
        if (isMounted && level) {
          setThinkingLevel(level as ThinkingLevel);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    window.electron.config
      .getProvider()
      .then(({ provider: loadedProvider }) => {
        if (isMounted && loadedProvider) {
          setProvider(loadedProvider);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleModelPreferenceChange = async (preference: ChatModelPreference) => {
    if (preference === modelPreference) {
      return;
    }

    const previousPreference = modelPreference;
    setModelPreference(preference);
    setIsModelPreferenceUpdating(true);

    try {
      await saveCurrentConversationIfNeeded();

      const response = await window.electron.agent.setModelPreference(preference);
      if (!response.success) {
        setModelPreference(response.preference ?? previousPreference);
      } else if (response.preference) {
        setModelPreference(response.preference);
        setMessages([]);
        setInputValue('');
        clearPendingAttachments();
      }
    } catch {
      setModelPreference(previousPreference);
    } finally {
      setIsModelPreferenceUpdating(false);
    }
  };

  const handleThinkingLevelChange = async (level: ThinkingLevel) => {
    if (level === thinkingLevel) {
      return;
    }

    const previousLevel = thinkingLevel;
    setThinkingLevel(level);
    setIsThinkingLevelUpdating(true);

    try {
      const response = await window.electron.config.setThinkingLevel(level);
      if (!response.success) {
        setThinkingLevel(previousLevel);
      } else if (response.level) {
        setThinkingLevel(response.level as ThinkingLevel);
      }
    } catch {
      setThinkingLevel(previousLevel);
    } finally {
      setIsThinkingLevelUpdating(false);
    }
  };

  const handleProviderChange = async (newProvider: ModelProvider) => {
    if (newProvider === provider) {
      return;
    }

    const previousProvider = provider;
    setProvider(newProvider);
    setIsProviderUpdating(true);

    try {
      await saveCurrentConversationIfNeeded();

      const response = await window.electron.config.setProvider(newProvider);
      if (!response.success) {
        setProvider(previousProvider);
      } else if (response.provider) {
        setProvider(response.provider);
        setMessages([]);
        setInputValue('');
        clearPendingAttachments();
      }
    } catch {
      setProvider(previousProvider);
    } finally {
      setIsProviderUpdating(false);
    }
  };

  const syncProvider = useCallback((incomingProvider: ModelProvider) => {
    setProvider(incomingProvider);
  }, []);

  return {
    modelPreference,
    isModelPreferenceUpdating,
    thinkingLevel,
    isThinkingLevelUpdating,
    provider,
    isProviderUpdating,
    missingSkills,
    handleModelPreferenceChange,
    handleThinkingLevelChange,
    handleProviderChange,
    syncProvider
  };
}
