import type {
  ChatModelPreference,
  PiModelSummary,
  PiOAuthPromptRendererRequest,
  PiProviderSummary
} from '@/electron';

const TIERS: ChatModelPreference[] = ['fast', 'smart', 'deep'];

interface PiModelsSettingsPanelProps {
  providers: PiProviderSummary[];
  activeProvider: PiProviderSummary | null;
  activeProviderId: string | null;
  selected: Partial<Record<ChatModelPreference, { provider: string; modelId: string }>>;
  paths?: { authPath: string; modelsPath: string };
  registryError?: string | null;
  apiKeyDrafts: Record<string, string>;
  busyAction: string | null;
  isLoading: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  oauthPrompt: PiOAuthPromptRendererRequest | null;
  manualOAuthPrompt: PiOAuthPromptRendererRequest | null;
  oauthPromptValue: string;
  onSelectProvider: (providerId: string) => void;
  onApiKeyDraftChange: (provider: string, value: string) => void;
  onOAuthPromptValueChange: (value: string) => void;
  onOpenManualOAuthPrompt: () => void;
  onSubmitOAuthPrompt: () => void;
  onCancelOAuthPrompt: () => void;
  onSaveApiKey: (provider: string) => Promise<void>;
  onClearAuth: (provider: string) => Promise<void>;
  onLoginOAuth: (provider: string) => Promise<void>;
  onSelectModel: (tier: ChatModelPreference, provider: string, modelId: string) => Promise<void>;
}

export function PiModelsSettingsPanel({
  providers,
  activeProvider,
  activeProviderId,
  selected,
  paths,
  registryError,
  apiKeyDrafts,
  busyAction,
  isLoading,
  message,
  oauthPrompt,
  manualOAuthPrompt,
  oauthPromptValue,
  onSelectProvider,
  onApiKeyDraftChange,
  onOAuthPromptValueChange,
  onOpenManualOAuthPrompt,
  onSubmitOAuthPrompt,
  onCancelOAuthPrompt,
  onSaveApiKey,
  onClearAuth,
  onLoginOAuth,
  onSelectModel
}: PiModelsSettingsPanelProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading Pi SDK providers...</p>
    );
  }

  return (
    <section className="space-y-4">
      {oauthPrompt && (
        <OAuthPromptDialog
          request={oauthPrompt}
          value={oauthPromptValue}
          onValueChange={onOAuthPromptValueChange}
          onSubmit={onSubmitOAuthPrompt}
          onCancel={onCancelOAuthPrompt}
        />
      )}

      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Models & Providers
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Manage Pi SDK credentials, provider availability, and fast/smart/deep model routing.
        </p>
      </div>

      {paths && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300">
          <div>Auth: {paths.authPath}</div>
          <div>Models: {paths.modelsPath}</div>
        </div>
      )}

      {registryError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-200">
          {registryError}
        </div>
      )}

      {message && (
        <div
          className={`rounded-2xl border p-3 text-sm ${
            message.type === 'success' ?
              'border-green-200 bg-green-50 text-green-700 dark:border-green-500/50 dark:bg-green-500/10 dark:text-green-200'
            : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/50 dark:bg-red-500/10 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelectProvider(provider.id)}
              className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                activeProviderId === provider.id ?
                  'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-200 dark:hover:border-neutral-700'
              }`}
            >
              <div className="text-sm font-semibold">{provider.name}</div>
              <div className="mt-0.5 text-xs opacity-75">
                {provider.availableModelCount}/{provider.modelCount} available
              </div>
            </button>
          ))}
        </div>

        {activeProvider && (
          <div className="space-y-4">
            <ProviderAuthCard
              provider={activeProvider}
              apiKeyDraft={apiKeyDrafts[activeProvider.id] ?? ''}
              busyAction={busyAction}
              manualOAuthPrompt={manualOAuthPrompt}
              onApiKeyDraftChange={onApiKeyDraftChange}
              onOpenManualOAuthPrompt={onOpenManualOAuthPrompt}
              onSaveApiKey={onSaveApiKey}
              onClearAuth={onClearAuth}
              onLoginOAuth={onLoginOAuth}
            />

            <div className="space-y-2">
              {activeProvider.models.map((model) => (
                <ModelRow
                  key={`${model.provider}/${model.id}`}
                  model={model}
                  selected={selected}
                  busyAction={busyAction}
                  onSelectModel={onSelectModel}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function OAuthPromptDialog({
  request,
  value,
  onValueChange,
  onSubmit,
  onCancel
}: {
  request: PiOAuthPromptRendererRequest;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 [-webkit-app-region:no-drag]">
      <div className="w-full max-w-lg space-y-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <div>
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
            Pi SDK OAuth
          </p>
          <h3 className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {request.type === 'manual-code' ? 'Complete manual login' : 'OAuth input required'}
          </h3>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{request.message}</p>
          <p className="mt-1 font-mono text-xs text-neutral-400">Provider: {request.provider}</p>
        </div>

        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={request.allowEmpty ? 'Optional' : 'Required'}
          rows={4}
          className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!request.allowEmpty && !value.trim()}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderAuthCard({
  provider,
  apiKeyDraft,
  busyAction,
  manualOAuthPrompt,
  onApiKeyDraftChange,
  onOpenManualOAuthPrompt,
  onSaveApiKey,
  onClearAuth,
  onLoginOAuth
}: {
  provider: PiProviderSummary;
  apiKeyDraft: string;
  busyAction: string | null;
  manualOAuthPrompt: PiOAuthPromptRendererRequest | null;
  onApiKeyDraftChange: (provider: string, value: string) => void;
  onOpenManualOAuthPrompt: () => void;
  onSaveApiKey: (provider: string) => Promise<void>;
  onClearAuth: (provider: string) => Promise<void>;
  onLoginOAuth: (provider: string) => Promise<void>;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {provider.name}
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Provider ID: <span className="font-mono">{provider.id}</span>
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            provider.authConfigured ?
              'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-200'
            : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
          }`}
        >
          {provider.authConfigured ? (provider.authSource ?? 'configured') : 'not configured'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {provider.supportsOAuth && (
          <button
            type="button"
            onClick={() => onLoginOAuth(provider.id)}
            disabled={busyAction === `oauth:${provider.id}`}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {busyAction === `oauth:${provider.id}` ? 'Waiting for OAuth...' : 'Login with OAuth'}
          </button>
        )}
        {busyAction === `oauth:${provider.id}` && manualOAuthPrompt?.provider === provider.id && (
          <button
            type="button"
            onClick={onOpenManualOAuthPrompt}
            className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-200"
          >
            Paste callback manually
          </button>
        )}
        {provider.authConfigured && (
          <button
            type="button"
            onClick={() => onClearAuth(provider.id)}
            disabled={busyAction === `clear:${provider.id}`}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50 dark:border-red-500/60 dark:text-red-200"
          >
            Clear credentials
          </button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          type="password"
          value={apiKeyDraft}
          onChange={(event) => onApiKeyDraftChange(provider.id, event.target.value)}
          placeholder="Store API key for this provider"
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-950/40"
        />
        <button
          type="button"
          onClick={() => onSaveApiKey(provider.id)}
          disabled={!apiKeyDraft.trim() || busyAction === `api-key:${provider.id}`}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          Save key
        </button>
      </div>
    </div>
  );
}

function ModelRow({
  model,
  selected,
  busyAction,
  onSelectModel
}: {
  model: PiModelSummary;
  selected: Partial<Record<ChatModelPreference, { provider: string; modelId: string }>>;
  busyAction: string | null;
  onSelectModel: (tier: ChatModelPreference, provider: string, modelId: string) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-neutral-900 dark:text-neutral-50">{model.name}</div>
          <div className="mt-0.5 font-mono text-xs text-neutral-500">
            {model.provider}/{model.id}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {model.contextWindow.toLocaleString()} context -{' '}
            {model.reasoning ? 'reasoning' : 'no reasoning'}
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
            model.available ?
              'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-200'
            : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
          }`}
        >
          {model.available ? 'available' : 'needs auth'}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {TIERS.map((tier) => {
          const isSelected =
            selected[tier]?.provider === model.provider && selected[tier]?.modelId === model.id;
          const actionKey = `select:${tier}:${model.provider}:${model.id}`;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => onSelectModel(tier, model.provider, model.id)}
              disabled={busyAction === actionKey}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                isSelected ?
                  'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              {isSelected ? `${tier} selected` : `Use for ${tier}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
