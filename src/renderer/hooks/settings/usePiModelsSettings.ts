import { useEffect, useMemo, useState } from 'react';

import type { ChatModelPreference, PiModelsState, PiOAuthPromptRendererRequest } from '@/electron';

export function usePiModelsSettings() {
  const [state, setState] = useState<PiModelsState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [apiKeyDrafts, setApiKeyDrafts] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [oauthPrompt, setOauthPrompt] = useState<PiOAuthPromptRendererRequest | null>(null);
  const [oauthPromptValue, setOauthPromptValue] = useState('');

  const providers = useMemo(() => state?.providers ?? [], [state?.providers]);
  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === activeProviderId) ?? providers[0] ?? null,
    [activeProviderId, providers]
  );

  const load = async () => {
    setIsLoading(true);
    try {
      const next = await window.electron.config.getPiModelsState();
      setState(next);
      setActiveProviderId((current) => current ?? next.providers[0]?.id ?? null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    return window.electron.config.onPiOAuthPrompt((request) => {
      setOauthPrompt(request);
      setOauthPromptValue('');
    });
  }, []);

  const applyMutation = (result: { success: boolean; state?: PiModelsState; error?: string }) => {
    if (result.success && result.state) {
      setState(result.state);
      setMessage({ type: 'success', text: 'Pi SDK provider settings updated.' });
    } else {
      setMessage({
        type: 'error',
        text: result.error ?? 'Failed to update Pi SDK provider settings.'
      });
    }
  };

  const saveApiKey = async (provider: string) => {
    setBusyAction(`api-key:${provider}`);
    try {
      const result = await window.electron.config.setPiProviderApiKey(
        provider,
        apiKeyDrafts[provider] ?? null
      );
      applyMutation(result);
      if (result.success) setApiKeyDrafts((current) => ({ ...current, [provider]: '' }));
    } finally {
      setBusyAction(null);
    }
  };

  const clearAuth = async (provider: string) => {
    setBusyAction(`clear:${provider}`);
    try {
      applyMutation(await window.electron.config.clearPiProviderAuth(provider));
    } finally {
      setBusyAction(null);
    }
  };

  const loginOAuth = async (provider: string) => {
    setBusyAction(`oauth:${provider}`);
    setMessage({
      type: 'success',
      text: 'Opening browser for OAuth login. Complete the provider flow to continue.'
    });
    try {
      applyMutation(await window.electron.config.loginPiOAuthProvider(provider));
    } finally {
      setBusyAction(null);
    }
  };

  const selectModel = async (
    preference: ChatModelPreference,
    provider: string,
    modelId: string
  ) => {
    setBusyAction(`select:${preference}:${provider}:${modelId}`);
    try {
      applyMutation(
        await window.electron.config.selectPiModelPreference(preference, provider, modelId)
      );
    } finally {
      setBusyAction(null);
    }
  };

  const submitOAuthPrompt = () => {
    if (!oauthPrompt) return;
    window.electron.config.respondPiOAuthPrompt(oauthPrompt.requestId, {
      value: oauthPromptValue
    });
    setOauthPrompt(null);
    setOauthPromptValue('');
  };

  const cancelOAuthPrompt = () => {
    if (!oauthPrompt) return;
    window.electron.config.respondPiOAuthPrompt(oauthPrompt.requestId, {
      cancelled: true
    });
    setOauthPrompt(null);
    setOauthPromptValue('');
  };

  return {
    state,
    providers,
    activeProvider,
    activeProviderId,
    apiKeyDrafts,
    busyAction,
    isLoading,
    message,
    oauthPrompt,
    oauthPromptValue,
    setActiveProviderId,
    setApiKeyDrafts,
    setOauthPromptValue,
    saveApiKey,
    clearAuth,
    loginOAuth,
    selectModel,
    submitOAuthPrompt,
    cancelOAuthPrompt,
    reload: load
  };
}
