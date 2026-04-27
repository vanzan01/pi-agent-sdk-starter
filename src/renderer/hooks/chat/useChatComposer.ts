import type { Dispatch, SetStateAction } from 'react';

import { releaseAttachmentPreviews, type PendingAttachment } from '@/hooks/useChatAttachments';
import type { Message, MessageAttachment } from '@/types/chat';

import { type SerializedAttachmentPayload } from '../../../shared/core';

interface UseChatComposerDeps {
  appId: string;
  currentSessionId: string | null;
  inputValue: string;
  setInputValue: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  pendingAttachments: PendingAttachment[];
  consumePendingAttachments: () => PendingAttachment[];
  clearPendingAttachments: () => void;
}

/**
 * Encapsulates message send/stop logic for Chat to keep the page focused on orchestration.
 */
export function useChatComposer({
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
}: UseChatComposerDeps) {
  const handleSendMessage = async () => {
    const trimmedMessage = inputValue.trim();
    const hasSendableContent = trimmedMessage.length > 0 || pendingAttachments.length > 0;
    if (!hasSendableContent || isLoading) return;

    const attachmentsToSend = consumePendingAttachments();

    // Add user message
    const messageAttachments: MessageAttachment[] = attachmentsToSend.map((attachment) => ({
      id: attachment.id,
      name: attachment.file.name,
      size: attachment.file.size,
      mimeType: attachment.file.type || 'application/octet-stream',
      previewUrl: attachment.previewIsBlobUrl ? undefined : attachment.previewUrl,
      isImage: attachment.isImage
    }));

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: trimmedMessage,
      timestamp: new Date(),
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    clearPendingAttachments();
    setIsLoading(true);

    let serializedAttachments: SerializedAttachmentPayload[] = [];
    try {
      serializedAttachments = await Promise.all(
        attachmentsToSend.map(async (attachment) => ({
          name: attachment.file.name,
          mimeType: attachment.file.type || 'application/octet-stream',
          size: attachment.file.size,
          data: await attachment.file.arrayBuffer()
        }))
      );
    } catch (error) {
      releaseAttachmentPreviews(attachmentsToSend);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: `Error preparing attachments: ${
          error instanceof Error ? error.message : 'Unknown error occurred'
        }`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      return;
    }

    releaseAttachmentPreviews(attachmentsToSend);

    try {
      // Send message to streaming session
      const response = await window.electron.agent.runConversation(appId, {
        systemPrompt: undefined,
        messages: [
          {
            type: 'user',
            message: {
              role: 'user',
              content: [{ type: 'text', text: trimmedMessage }]
            },
            parent_tool_use_id: null,
            session_id: currentSessionId ?? undefined
          }
        ],
        attachments: serializedAttachments.length > 0 ? serializedAttachments : undefined
      });
      if (!response.success && (response as { error?: string }).error) {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: `Error: ${(response as { error?: string }).error}`,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
      }
      // Otherwise, streaming events will handle the response
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleStopStreaming = async () => {
    if (!isLoading) return;

    try {
      const response = await window.electron.agent.stopMessage();
      if (!response.success && response.error) {
        console.error('Error stopping response:', response.error);
      }
    } catch (error) {
      console.error('Error stopping response:', error);
    }
  };

  return { handleSendMessage, handleStopStreaming };
}
