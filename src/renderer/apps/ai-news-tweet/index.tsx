import { useState } from 'react';
import { Header } from './components/Header';
import { StatusCards } from './components/StatusCards';
import { AgentPanel } from './components/AgentPanel';
import { TweetPreview } from './components/TweetPreview';
import { SettingsPanel } from './components/SettingsPanel';
import { useAiNewsTweetRun } from './hooks/useAiNewsTweetRun';
import { useAiNewsTweetSettings } from './hooks/useAiNewsTweetSettings';
import { AGENT_META, getAgentColor } from './utils';

export default function AiNewsTweetApp() {
  const { stageModels, updateStageModel } = useAiNewsTweetSettings();
  const { agentStates, isRunning, error, handleGenerateTweet } = useAiNewsTweetRun(stageModels);
  const [showSettings, setShowSettings] = useState(false);

  const finalTweet = agentStates.writer.result;

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden rounded-3xl bg-[var(--bg-cream)] p-5">
      <Header
        isRunning={isRunning}
        showSettings={showSettings}
        onGenerate={handleGenerateTweet}
        onToggleSettings={() => setShowSettings(!showSettings)}
      />

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          stageModels={stageModels}
          onUpdateStageModel={updateStageModel}
          onClose={() => setShowSettings(false)}
        />
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      <TweetPreview tweet={finalTweet} />
      <StatusCards agentStates={agentStates} />

      <div className="grid flex-1 gap-4 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
        {AGENT_META.map((meta) => (
          <AgentPanel
            key={meta.id}
            meta={meta}
            state={agentStates[meta.id]}
            isActive={agentStates[meta.id].status === 'running'}
            agentColor={getAgentColor(meta.id)}
          />
        ))}
      </div>
    </div>
  );
}
