import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { ModelProvider } from '../../../shared/core';
import { DEFAULT_GLM_BASE_URL } from '../../../shared/core';
import type { ConfigSource } from '@/electron';

type ModelConfig = {
  fast: string;
  smart: string;
  deep: string;
};

export interface ProviderSettingsState {
  provider: ModelProvider;
  providerSource: ConfigSource;
  isLoadingProvider: boolean;
  isSavingProvider: boolean;
  glmApiKey: string;
  glmApiKeyInput: string;
  glmBaseUrl: string;
  glmBaseUrlInput: string;
  isSavingGlmConfig: boolean;
  glmSaveState: 'idle' | 'success' | 'error';
  codexModels: ModelConfig;
  codexModelsInput: ModelConfig;
  glmModels: ModelConfig;
  glmModelsInput: ModelConfig;
  isSavingModels: boolean;
  modelsSaveState: 'idle' | 'success' | 'error';
}

export interface ProviderSettingsActions {
  setGlmApiKeyInput: Dispatch<SetStateAction<string>>;
  setGlmBaseUrlInput: Dispatch<SetStateAction<string>>;
  setCodexModelsInput: Dispatch<SetStateAction<ModelConfig>>;
  setGlmModelsInput: Dispatch<SetStateAction<ModelConfig>>;
  handleProviderChange: (newProvider: ModelProvider) => Promise<void>;
  handleSaveGlmApiKey: () => Promise<void>;
  handleClearGlmApiKey: () => Promise<void>;
  handleSaveGlmBaseUrl: () => Promise<void>;
  handleSaveCodexModels: () => Promise<void>;
  handleResetCodexModels: () => Promise<void>;
  handleSaveGlmModels: () => Promise<void>;
  handleResetGlmModels: () => Promise<void>;
}

export function useProviderSettings(): ProviderSettingsState & ProviderSettingsActions {
  const [provider, setProvider] = useState<ModelProvider>('codex');
  const [providerSource, setProviderSource] = useState<ConfigSource>('default');
  const [isLoadingProvider, setIsLoadingProvider] = useState(true);
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  const [glmApiKey, setGlmApiKey] = useState('');
  const [glmApiKeyInput, setGlmApiKeyInput] = useState('');
  const [glmBaseUrl, setGlmBaseUrl] = useState(DEFAULT_GLM_BASE_URL);
  const [glmBaseUrlInput, setGlmBaseUrlInput] = useState('');
  const [isSavingGlmConfig, setIsSavingGlmConfig] = useState(false);
  const [glmSaveState, setGlmSaveState] = useState<'idle' | 'success' | 'error'>('idle');

  const [codexModels, setCodexModels] = useState<ModelConfig>({
    fast: '',
    smart: '',
    deep: ''
  });
  const [codexModelsInput, setCodexModelsInput] = useState<ModelConfig>({
    fast: '',
    smart: '',
    deep: ''
  });

  const [glmModels, setGlmModelsState] = useState<ModelConfig>({
    fast: '',
    smart: '',
    deep: ''
  });
  const [glmModelsInput, setGlmModelsInput] = useState<ModelConfig>({
    fast: '',
    smart: '',
    deep: ''
  });

  const [isSavingModels, setIsSavingModels] = useState(false);
  const [modelsSaveState, setModelsSaveState] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    // Load provider settings
    window.electron.config
      .getProvider()
      .then((response) => {
        setProvider(response.provider);
        setProviderSource(response.source);
        setIsLoadingProvider(false);
      })
      .catch(() => {
        setIsLoadingProvider(false);
      });

    // Load GLM config
    window.electron.config
      .getGlmConfig()
      .then((response) => {
        setGlmApiKey(response.apiKey || '');
        setGlmBaseUrl(response.baseUrl);
      })
      .catch(() => {
        // ignore - will use defaults
      });

    // Load Codex model IDs
    window.electron.config
      .getCodexModels()
      .then((response) => {
        setCodexModels(response.models);
      })
      .catch(() => {
        // ignore - will use defaults
      });

    // Load GLM model IDs
    window.electron.config
      .getGlmModels()
      .then((response) => {
        setGlmModelsState(response.models);
      })
      .catch(() => {
        // ignore - will use defaults
      });
  }, []);

  const handleProviderChange = async (newProvider: ModelProvider) => {
    setIsSavingProvider(true);
    const previousProvider = provider;
    setProvider(newProvider);

    try {
      const response = await window.electron.config.setProvider(newProvider);
      if (response.success) {
        setProviderSource('project');
      } else {
        setProvider(previousProvider);
      }
    } catch {
      setProvider(previousProvider);
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleSaveGlmApiKey = async () => {
    setIsSavingGlmConfig(true);
    setGlmSaveState('idle');

    try {
      const response = await window.electron.config.setGlmApiKey(glmApiKeyInput || null);
      if (response.success) {
        setGlmApiKey(response.apiKey || '');
        setGlmApiKeyInput('');
        setGlmSaveState('success');
        setTimeout(() => setGlmSaveState('idle'), 2000);
      } else {
        setGlmSaveState('error');
        setTimeout(() => setGlmSaveState('idle'), 2500);
      }
    } catch {
      setGlmSaveState('error');
      setTimeout(() => setGlmSaveState('idle'), 2500);
    } finally {
      setIsSavingGlmConfig(false);
    }
  };

  const handleClearGlmApiKey = async () => {
    setIsSavingGlmConfig(true);
    setGlmSaveState('idle');

    try {
      const response = await window.electron.config.setGlmApiKey(null);
      if (response.success) {
        setGlmApiKey('');
        setGlmApiKeyInput('');
        setGlmSaveState('success');
        setTimeout(() => setGlmSaveState('idle'), 2000);
      }
    } catch {
      setGlmSaveState('error');
      setTimeout(() => setGlmSaveState('idle'), 2500);
    } finally {
      setIsSavingGlmConfig(false);
    }
  };

  const handleSaveGlmBaseUrl = async () => {
    setIsSavingGlmConfig(true);
    setGlmSaveState('idle');

    try {
      const response = await window.electron.config.setGlmBaseUrl(glmBaseUrlInput || null);
      if (response.success) {
        setGlmBaseUrl(response.baseUrl);
        setGlmBaseUrlInput('');
        setGlmSaveState('success');
        setTimeout(() => setGlmSaveState('idle'), 2000);
      }
    } catch {
      setGlmSaveState('error');
      setTimeout(() => setGlmSaveState('idle'), 2500);
    } finally {
      setIsSavingGlmConfig(false);
    }
  };

  const handleSaveCodexModels = async () => {
    setIsSavingModels(true);
    setModelsSaveState('idle');

    try {
      const modelsToSave: ModelConfig = {
        fast: codexModelsInput.fast.trim() || codexModels.fast,
        smart: codexModelsInput.smart.trim() || codexModels.smart,
        deep: codexModelsInput.deep.trim() || codexModels.deep
      };
      const response = await window.electron.config.setCodexModels(modelsToSave);
      if (response.success && response.models) {
        setCodexModels(response.models);
        setCodexModelsInput({ fast: '', smart: '', deep: '' });
        setModelsSaveState('success');
        setTimeout(() => setModelsSaveState('idle'), 2000);
      } else {
        setModelsSaveState('error');
        setTimeout(() => setModelsSaveState('idle'), 2500);
      }
    } catch {
      setModelsSaveState('error');
      setTimeout(() => setModelsSaveState('idle'), 2500);
    } finally {
      setIsSavingModels(false);
    }
  };

  const handleResetCodexModels = async () => {
    setIsSavingModels(true);
    setModelsSaveState('idle');

    try {
      const defaultsResponse = await window.electron.config.getDefaultCodexModels();
      const response = await window.electron.config.setCodexModels(defaultsResponse.models);
      if (response.success && response.models) {
        setCodexModels(response.models);
        setCodexModelsInput({ fast: '', smart: '', deep: '' });
        setModelsSaveState('success');
        setTimeout(() => setModelsSaveState('idle'), 2000);
      }
    } catch {
      setModelsSaveState('error');
      setTimeout(() => setModelsSaveState('idle'), 2500);
    } finally {
      setIsSavingModels(false);
    }
  };

  const handleSaveGlmModels = async () => {
    setIsSavingModels(true);
    setModelsSaveState('idle');

    try {
      const modelsToSave: ModelConfig = {
        fast: glmModelsInput.fast.trim() || glmModels.fast,
        smart: glmModelsInput.smart.trim() || glmModels.smart,
        deep: glmModelsInput.deep.trim() || glmModels.deep
      };
      const response = await window.electron.config.setGlmModels(modelsToSave);
      if (response.success && response.models) {
        setGlmModelsState(response.models);
        setGlmModelsInput({ fast: '', smart: '', deep: '' });
        setModelsSaveState('success');
        setTimeout(() => setModelsSaveState('idle'), 2000);
      } else {
        setModelsSaveState('error');
        setTimeout(() => setModelsSaveState('idle'), 2500);
      }
    } catch {
      setModelsSaveState('error');
      setTimeout(() => setModelsSaveState('idle'), 2500);
    } finally {
      setIsSavingModels(false);
    }
  };

  const handleResetGlmModels = async () => {
    setIsSavingModels(true);
    setModelsSaveState('idle');

    try {
      const defaultsResponse = await window.electron.config.getDefaultGlmModels();
      const response = await window.electron.config.setGlmModels(defaultsResponse.models);
      if (response.success && response.models) {
        setGlmModelsState(response.models);
        setGlmModelsInput({ fast: '', smart: '', deep: '' });
        setModelsSaveState('success');
        setTimeout(() => setModelsSaveState('idle'), 2000);
      }
    } catch {
      setModelsSaveState('error');
      setTimeout(() => setModelsSaveState('idle'), 2500);
    } finally {
      setIsSavingModels(false);
    }
  };

  return {
    provider,
    providerSource,
    isLoadingProvider,
    isSavingProvider,
    glmApiKey,
    glmApiKeyInput,
    glmBaseUrl,
    glmBaseUrlInput,
    isSavingGlmConfig,
    glmSaveState,
    codexModels,
    codexModelsInput,
    glmModels,
    glmModelsInput,
    isSavingModels,
    modelsSaveState,
    setGlmApiKeyInput,
    setGlmBaseUrlInput,
    setCodexModelsInput,
    setGlmModelsInput,
    handleProviderChange,
    handleSaveGlmApiKey,
    handleClearGlmApiKey,
    handleSaveGlmBaseUrl,
    handleSaveCodexModels,
    handleResetCodexModels,
    handleSaveGlmModels,
    handleResetGlmModels
  };
}

