import { shell } from 'electron';

import type { ChatModelPreference } from '../../shared/core';
import { getPiModelPreferences, setPiModelPreference } from './config';
import {
  createEmbeddedPiAuthStorage,
  createEmbeddedPiModelRegistry,
  ensurePiRuntimePaths
} from './pi-runtime';
import { resetSession } from './pi-session';

export interface PiModelSummary {
  provider: string;
  id: string;
  name: string;
  reasoning: boolean;
  input: string[];
  contextWindow: number;
  maxTokens: number;
  available: boolean;
}

export interface PiProviderSummary {
  id: string;
  name: string;
  authConfigured: boolean;
  authSource?: string;
  authLabel?: string;
  supportsOAuth: boolean;
  usesCallbackServer?: boolean;
  modelCount: number;
  availableModelCount: number;
  models: PiModelSummary[];
}

export interface PiOAuthPromptRequest {
  provider: string;
  type: 'prompt' | 'manual-code';
  message: string;
  allowEmpty?: boolean;
}

export interface PiOAuthLoginUi {
  requestInput: (request: PiOAuthPromptRequest) => Promise<string>;
}

export function getPiModelsState() {
  const paths = ensurePiRuntimePaths();
  const authStorage = createEmbeddedPiAuthStorage();
  const modelRegistry = createEmbeddedPiModelRegistry(authStorage, paths);
  const allModels = modelRegistry.getAll();
  const availableKeys = new Set(
    modelRegistry.getAvailable().map((model) => `${model.provider}/${model.id}`)
  );
  const oauthProviders = new Map(
    authStorage.getOAuthProviders().map((provider) => [provider.id, provider])
  );

  const providerIds = Array.from(new Set(allModels.map((model) => model.provider)));
  const providers: PiProviderSummary[] = providerIds.map((providerId) => {
    const models = allModels
      .filter((model) => model.provider === providerId)
      .map(
        (model): PiModelSummary => ({
          provider: model.provider,
          id: model.id,
          name: model.name,
          reasoning: model.reasoning,
          input: [...model.input],
          contextWindow: model.contextWindow,
          maxTokens: model.maxTokens,
          available: availableKeys.has(`${model.provider}/${model.id}`)
        })
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    const authStatus = authStorage.getAuthStatus(providerId);
    const oauthProvider = oauthProviders.get(providerId);

    return {
      id: providerId,
      name: oauthProvider?.name ?? providerId,
      authConfigured: authStatus.configured,
      authSource: authStatus.source,
      authLabel: authStatus.label,
      supportsOAuth: Boolean(oauthProvider),
      usesCallbackServer: oauthProvider?.usesCallbackServer,
      modelCount: models.length,
      availableModelCount: models.filter((model) => model.available).length,
      models
    };
  });

  providers.sort((a, b) => {
    if (a.authConfigured !== b.authConfigured) return a.authConfigured ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    paths,
    providers,
    selected: getPiModelPreferences(),
    registryError: modelRegistry.getError() ?? null
  };
}

export async function setPiProviderApiKey(provider: string, apiKey: string | null) {
  const authStorage = createEmbeddedPiAuthStorage();
  if (apiKey?.trim()) {
    authStorage.set(provider, { type: 'api_key', key: apiKey.trim() });
  } else {
    authStorage.remove(provider);
  }
  await resetSession();
  return getPiModelsState();
}

export async function clearPiProviderAuth(provider: string) {
  const authStorage = createEmbeddedPiAuthStorage();
  authStorage.remove(provider);
  await resetSession();
  return getPiModelsState();
}

export async function loginPiOAuthProvider(provider: string, ui?: PiOAuthLoginUi) {
  const authStorage = createEmbeddedPiAuthStorage();
  const oauthProvider = authStorage
    .getOAuthProviders()
    .find((candidate) => candidate.id === provider);
  if (!oauthProvider) {
    throw new Error(`Provider ${provider} does not support Pi OAuth login.`);
  }

  await authStorage.login(provider, {
    onAuth: (info) => {
      void shell.openExternal(info.url);
    },
    onPrompt: async (prompt) => {
      if (!ui && prompt.allowEmpty) return '';
      if (ui) {
        return ui.requestInput({
          provider,
          type: 'prompt',
          message: prompt.message,
          allowEmpty: prompt.allowEmpty
        });
      }
      throw new Error(`${prompt.message} Manual OAuth input is not available in the Settings UI.`);
    },
    onManualCodeInput: async () => {
      if (!ui) return '';
      return ui.requestInput({
        provider,
        type: 'manual-code',
        message: 'Paste the OAuth callback URL or authorization code from the browser.',
        allowEmpty: true
      });
    },
    onProgress: (message) => {
      console.log(`[Pi OAuth:${provider}] ${message}`);
    }
  });
  await resetSession();
  return getPiModelsState();
}

export async function selectPiModelPreference(
  preference: ChatModelPreference,
  provider: string,
  modelId: string
) {
  await setPiModelPreference(preference, { provider, modelId });
  await resetSession();
  return getPiModelsState();
}
