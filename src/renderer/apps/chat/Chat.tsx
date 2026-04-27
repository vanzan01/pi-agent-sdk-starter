import { useState } from 'react';

import { ChatLayout } from '@/components/chat/ChatLayout';
import { ConversationPanel } from '@/components/chat/ConversationPanel';
import ChatHistoryDrawer from '@/components/ChatHistoryDrawer';
import { useChatComposer } from '@/hooks/chat/useChatComposer';
import { useChatWorkspace } from '@/hooks/chat/useChatWorkspace';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useChatAttachments } from '@/hooks/useChatAttachments';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { useChatPreferences } from '@/hooks/useChatPreferences';
import { usePiChat } from '@/hooks/usePiChat';

import { MAX_ATTACHMENT_BYTES } from '../../../shared/core';

export default function Chat() {
  const [inputValue, setInputValue] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [chatInputHeight, setChatInputHeight] = useState(0);
  const appId = 'chat';
  const { messages, setMessages, isLoading, setIsLoading, contextWindowInfo } = usePiChat(appId);
  const messagesContainerRef = useAutoScroll(isLoading, messages);
  const { workspaceDir } = useChatWorkspace({
    onWorkspaceReset: () => {
      setMessages([]);
      setInputValue('');
    }
  });
  const {
    pendingAttachments,
    attachmentError,
    handleFilesSelected,
    handleRemoveAttachment,
    clearPendingAttachments,
    consumePendingAttachments
  } = useChatAttachments({ workspaceDir, maxAttachmentBytes: MAX_ATTACHMENT_BYTES });
  const {
    currentConversationId,
    currentSessionId,
    newChat,
    loadConversation,
    saveCurrentConversationIfNeeded
  } = useChatPersistence({
    appId,
    messages,
    setMessages,
    setInputValue
  });
  const {
    modelPreference,
    isModelPreferenceUpdating,
    thinkingLevel,
    isThinkingLevelUpdating,
    missingSkills,
    handleModelPreferenceChange,
    handleThinkingLevelChange
  } = useChatPreferences({
    appId,
    setMessages,
    setInputValue,
    saveCurrentConversationIfNeeded,
    clearPendingAttachments
  });

  const { handleSendMessage, handleStopStreaming } = useChatComposer({
    appId,
    currentSessionId,
    inputValue,
    setInputValue,
    isLoading,
    setIsLoading,
    setMessages,
    pendingAttachments,
    consumePendingAttachments,
    clearPendingAttachments
  });

  const handleNewChat = async () => {
    if (isLoading) return;

    await newChat();
  };

  const handleLoadConversation = async (conversationId: string) => {
    if (isLoading) return;

    await loadConversation(conversationId);
  };

  const messageListBottomPadding = chatInputHeight > 0 ? chatInputHeight + 48 : 160;

  const handleNewChatFromTitleBar = async () => {
    await handleNewChat();
    setIsHistoryOpen(false);
  };

  return (
    <>
      <ChatLayout
        onOpenHistory={() => setIsHistoryOpen(true)}
        onNewChat={handleNewChatFromTitleBar}
        missingSkills={missingSkills}
      >
        <ConversationPanel
          messages={messages}
          isLoading={isLoading}
          containerRef={messagesContainerRef}
          bottomPadding={messageListBottomPadding}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          autoFocus
          onInputHeightChange={setChatInputHeight}
          attachments={pendingAttachments}
          onFilesSelected={handleFilesSelected}
          onRemoveAttachment={handleRemoveAttachment}
          canSend={Boolean(inputValue.trim()) || pendingAttachments.length > 0}
          attachmentError={attachmentError}
          modelPreference={modelPreference}
          onModelPreferenceChange={handleModelPreferenceChange}
          isModelPreferenceUpdating={isModelPreferenceUpdating}
          thinkingLevel={thinkingLevel}
          onThinkingLevelChange={handleThinkingLevelChange}
          isThinkingLevelUpdating={isThinkingLevelUpdating}
          contextWindowInfo={contextWindowInfo}
        />
      </ChatLayout>

      <ChatHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadConversation={handleLoadConversation}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
      />
    </>
  );
}
