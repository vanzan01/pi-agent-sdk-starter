/* eslint-disable react-hooks/static-components */
import { ArrowLeft, Layers } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { AppManifest } from '../../shared/apps';
import { getAppSettingsPanel } from '../apps/settingsRegistry';
import { DomainConfigPanel } from '../components/DomainConfigPanel';
import { DebugSettingsPanel } from '../components/settings/DebugSettingsPanel';
import { ConfigStatusBanner } from '../components/settings/ConfigStatusBanner';
import { ProviderSettingsPanel } from '../components/settings/ProviderSettingsPanel';
import { ModelsSettingsPanel } from '../components/settings/ModelsSettingsPanel';
import { PromptsSettingsPanel } from '../components/settings/PromptsSettingsPanel';
import { UiPreferencesPanel } from '../components/settings/UiPreferencesPanel';
import { WorkspaceSettingsPanel } from '../components/settings/WorkspaceSettingsPanel';
import { useDebugSettings } from '../hooks/settings/useDebugSettings';
import { useProviderSettings } from '../hooks/settings/useProviderSettings';
import { usePromptSettings } from '../hooks/settings/usePromptSettings';
import { useSettingsShortcuts } from '../hooks/settings/useSettingsShortcuts';
import { useWorkspaceSettings } from '../hooks/settings/useWorkspaceSettings';

interface SettingsProps {
  onBack: () => void;
  apps: AppManifest[];
  activeAppId?: string;
  initialTab?: string | null;
  onSelectApp?: (appId: string) => void;
}


function Settings({ onBack, apps, activeAppId, initialTab, onSelectApp }: SettingsProps) {
  const {
    configStatus,
    currentWorkspaceDir,
    workspaceDir,
    isLoadingWorkspace,
    isSavingWorkspace,
    workspaceSaveStatus,
    setWorkspaceDir,
    handleSaveWorkspace,
    handleBrowseWorkspace
  } = useWorkspaceSettings();
  const [selectedTab, setSelectedTab] = useState<string>(initialTab ?? activeAppId ?? 'global');

  const {
    debugMode,
    debugModeSource,
    isLoadingDebugMode,
    isSavingDebugMode,
    floatingNavEnabled,
    floatingNavSource,
    isSavingFloatingNav,
    isDebugExpanded,
    pathInfo,
    isLoadingPathInfo,
    envVars,
    isLoadingEnvVars,
    diagnosticMetadata,
    isLoadingDiagnosticMetadata,
    setIsDebugExpanded,
    handleToggleDebugMode,
    handleToggleFloatingNav,
    loadPathInfo,
    loadEnvVars,
    loadDiagnosticMetadata
  } = useDebugSettings();
  const {
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
  } = useProviderSettings();

  const {
    systemPromptAppend,
    isDefaultPrompt,
    systemPromptSource,
    isLoadingPrompt,
    isSavingPrompt,
    promptSaveState,
    setSystemPromptAppend,
    handleSaveSystemPrompt,
    handleResetSystemPrompt
  } = usePromptSettings();

  const selectedApp = useMemo(
    () => apps.find((app) => app.id === selectedTab),
    [apps, selectedTab]
  );
  const AppSettingsPanel = useMemo(
    () => getAppSettingsPanel(selectedApp),
    [selectedApp]
  );

  // Check if any app has the 'chat' feature - used to show/hide chat-related global settings
  const hasAnyChatApp = useMemo(() => apps.some((app) => app.features?.includes('chat')), [apps]);

  useSettingsShortcuts({ onBack });

  const isFormLoading =
    isLoadingWorkspace || isLoadingDebugMode || isLoadingPrompt || isLoadingProvider;

  return (
    <div className="flex h-screen flex-col bg-linear-to-b from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="fixed top-0 right-0 left-0 z-50 h-12 [-webkit-app-region:drag]" />

      <div className="flex flex-1 flex-col overflow-hidden pt-12">
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-16">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
                  Settings
                </h1>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  Configure API access and workspace directory.
                </p>
              </div>
              <button
                onClick={onBack}
                className="flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors [-webkit-app-region:no-drag] hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:text-neutral-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTab('global')}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  selectedTab === 'global' ?
                    'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                Global
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('domains')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  selectedTab === 'domains' ?
                    'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Domains
              </button>
              {apps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    setSelectedTab(app.id);
                    onSelectApp?.(app.id);
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    selectedTab === app.id ?
                      'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                  }`}
                >
                  {app.name}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-neutral-200/80 bg-white/95 p-6 shadow-2xl shadow-neutral-200/60 [-webkit-app-region:no-drag] dark:border-neutral-800 dark:bg-neutral-900/70 dark:shadow-black/40">
              {isFormLoading ?
                <div className="flex items-center justify-center py-12 text-sm text-neutral-500 dark:text-neutral-400">
                  Loading settings...
                </div>
              : selectedTab === 'global' ?
                <div className="space-y-8">
                  <ConfigStatusBanner configStatus={configStatus} />

                  {hasAnyChatApp && (
                    <>
                      <ProviderSettingsPanel
                        hasAnyChatApp={hasAnyChatApp}
                        provider={provider}
                        providerSource={providerSource}
                        isSavingProvider={isSavingProvider}
                        glmApiKey={glmApiKey}
                        glmApiKeyInput={glmApiKeyInput}
                        glmBaseUrl={glmBaseUrl}
                        glmBaseUrlInput={glmBaseUrlInput}
                        isSavingGlmConfig={isSavingGlmConfig}
                        glmSaveState={glmSaveState}
                        onProviderChange={handleProviderChange}
                        onGlmApiKeyInputChange={setGlmApiKeyInput}
                        onGlmBaseUrlInputChange={setGlmBaseUrlInput}
                        onSaveGlmApiKey={handleSaveGlmApiKey}
                        onClearGlmApiKey={handleClearGlmApiKey}
                        onSaveGlmBaseUrl={handleSaveGlmBaseUrl}
                      />

                      <div className="border-t border-neutral-200/80 dark:border-neutral-800" />

                      <ModelsSettingsPanel
                        provider={provider}
                        providerSource={providerSource}
                        codexModels={codexModels}
                        codexModelsInput={codexModelsInput}
                        glmModels={glmModels}
                        glmModelsInput={glmModelsInput}
                        isSavingModels={isSavingModels}
                        modelsSaveState={modelsSaveState}
                        onCodexModelsInputChange={setCodexModelsInput}
                        onGlmModelsInputChange={setGlmModelsInput}
                        onSaveCodexModels={handleSaveCodexModels}
                        onResetCodexModels={handleResetCodexModels}
                        onSaveGlmModels={handleSaveGlmModels}
                        onResetGlmModels={handleResetGlmModels}
                      />

                      <div className="border-t border-neutral-200/80 dark:border-neutral-800" />
                    </>
                  )}

                  <WorkspaceSettingsPanel
                    currentWorkspaceDir={currentWorkspaceDir}
                    workspaceDir={workspaceDir}
                    isLoadingWorkspace={isLoadingWorkspace}
                    isSavingWorkspace={isSavingWorkspace}
                    workspaceSaveStatus={workspaceSaveStatus}
                    isFormLoading={isFormLoading}
                    setWorkspaceDir={setWorkspaceDir}
                    handleBrowseWorkspace={handleBrowseWorkspace}
                    handleSaveWorkspace={handleSaveWorkspace}
                    configStatus={configStatus}
                  />

                  <PromptsSettingsPanel
                    hasAnyChatApp={hasAnyChatApp}
                    systemPromptAppend={systemPromptAppend}
                    isDefaultPrompt={isDefaultPrompt}
                    systemPromptSource={systemPromptSource}
                    isSavingPrompt={isSavingPrompt}
                    isLoadingPrompt={isLoadingPrompt}
                    promptSaveState={promptSaveState}
                    onSystemPromptChange={setSystemPromptAppend}
                    onSaveSystemPrompt={handleSaveSystemPrompt}
                    onResetSystemPrompt={handleResetSystemPrompt}
                  />

                  <UiPreferencesPanel
                    floatingNavEnabled={floatingNavEnabled}
                    floatingNavSource={floatingNavSource}
                    isSavingFloatingNav={isSavingFloatingNav}
                    onToggleFloatingNav={handleToggleFloatingNav}
                  />

                  <DebugSettingsPanel
                    debugMode={debugMode}
                    debugModeSource={debugModeSource}
                    isSavingDebugMode={isSavingDebugMode}
                    isDebugExpanded={isDebugExpanded}
                    pathInfo={pathInfo}
                    isLoadingPathInfo={isLoadingPathInfo}
                    envVars={envVars}
                    isLoadingEnvVars={isLoadingEnvVars}
                    diagnosticMetadata={diagnosticMetadata}
                    isLoadingDiagnosticMetadata={isLoadingDiagnosticMetadata}
                    onToggleDebugMode={handleToggleDebugMode}
                    onToggleExpanded={setIsDebugExpanded}
                    onLoadPathInfo={loadPathInfo}
                    onLoadEnvVars={loadEnvVars}
                    onLoadDiagnosticMetadata={loadDiagnosticMetadata}
                  />
                </div>
              : selectedTab === 'domains' ?
                <DomainConfigPanel />
              : (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                      App settings
                    </p>
                    <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                      {selectedApp?.name ?? 'App'}
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      These settings apply only to this app. Global options (API keys, workspace,
                      system prompt append) stay in the Global tab.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 p-6 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/50 dark:text-neutral-300">
                    {selectedApp && AppSettingsPanel ?
                      <AppSettingsPanel app={selectedApp} />
                    : <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        No app-specific settings for this app.
                      </div>
                    }
                  </div>
                </div>
              )
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
