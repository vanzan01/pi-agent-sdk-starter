import type { RefObject } from 'react';

import MessageList from '@/components/MessageList';
import ChatInput from '@/components/ChatInput';
import type { PendingAttachment } from '@/hooks/useChatAttachments';
import type { ContextWindowInfo } from '@/hooks/chat/useMessageStream';
import type { Message } from '@/types/chat';
import type { ChatModelPreference, ModelProvider, ThinkingLevel } from '../../../shared/core';

interface ConversationPanelProps {
  messages: Message[];
  isLoading: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  bottomPadding: number;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStopStreaming: () => void;
  autoFocus?: boolean;
  onInputHeightChange: (height: number) => void;
  attachments: PendingAttachment[];
  onFilesSelected: (files: File[] | FileList) => void;
  onRemoveAttachment: (id: string) => void;
  canSend: boolean;
  attachmentError?: string | null;
  modelPreference: ChatModelPreference;
  onModelPreferenceChange: (preference: ChatModelPreference) => void;
  isModelPreferenceUpdating: boolean;
  thinkingLevel: ThinkingLevel;
  onThinkingLevelChange: (level: ThinkingLevel) => void;
  isThinkingLevelUpdating: boolean;
  provider: ModelProvider;
  onProviderChange: (provider: ModelProvider) => void;
  isProviderUpdating: boolean;
  contextWindowInfo?: ContextWindowInfo | null;
}

export function ConversationPanel({
  messages,
  isLoading,
  containerRef,
  bottomPadding,
  inputValue,
  onInputChange,
  onSend,
  onStopStreaming,
  autoFocus,
  onInputHeightChange,
  attachments,
  onFilesSelected,
  onRemoveAttachment,
  canSend,
  attachmentError,
  modelPreference,
  onModelPreferenceChange,
  isModelPreferenceUpdating,
  thinkingLevel,
  onThinkingLevelChange,
  isThinkingLevelUpdating,
  provider,
  onProviderChange,
  isProviderUpdating,
  contextWindowInfo
}: ConversationPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--border-light)] bg-[var(--bg-white)] p-3 shadow-sm">
      <div className="flex min-h-0 flex-1 flex-col">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          containerRef={containerRef}
          bottomPadding={bottomPadding}
          tone="light"
        />

        <ChatInput
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          isLoading={isLoading}
          onStopStreaming={onStopStreaming}
          autoFocus={autoFocus}
          onHeightChange={onInputHeightChange}
          attachments={attachments}
          onFilesSelected={onFilesSelected}
          onRemoveAttachment={onRemoveAttachment}
          canSend={canSend}
          attachmentError={attachmentError || undefined}
          modelPreference={modelPreference}
          onModelPreferenceChange={onModelPreferenceChange}
          isModelPreferenceUpdating={isModelPreferenceUpdating}
          thinkingLevel={thinkingLevel}
          onThinkingLevelChange={onThinkingLevelChange}
          isThinkingLevelUpdating={isThinkingLevelUpdating}
          provider={provider}
          onProviderChange={onProviderChange}
          isProviderUpdating={isProviderUpdating}
          contextWindowInfo={contextWindowInfo}
        />
      </div>
    </div>
  );
}
