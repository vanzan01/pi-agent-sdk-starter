export function useApiKeySettings() {
  return {
    apiKeyStatus: { configured: false, source: null, lastFour: null },
    apiKeyInput: '',
    apiKeyPlaceholder: '',
    isSavingApiKey: false,
    apiKeySaveState: 'idle' as const,
    setApiKeyInput: () => undefined,
    handleSaveApiKey: async () => undefined,
    handleClearStoredApiKey: async () => undefined
  };
}
