import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { Message } from '@/types/chat';

type PersistedMessage = Omit<Message, 'timestamp'> & { timestamp: string };

function serializeMessagesForStorage(messages: Message[]): PersistedMessage[] {
  return messages.map((msg) => ({
    ...msg,
    // Drop previewUrl so we don't persist blob URLs
    attachments: msg.attachments?.map(({ previewUrl: _previewUrl, ...attachmentRest }) => ({
      ...attachmentRest
    })),
    timestamp: msg.timestamp.toISOString()
  }));
}

interface UseChatPersistenceArgs {
  appId: string;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setInputValue: Dispatch<SetStateAction<string>>;
}

export interface UseChatPersistenceResult {
  currentConversationId: string | null;
  currentSessionId: string | null;
  newChat: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  saveCurrentConversationIfNeeded: () => Promise<void>;
}

export function useChatPersistence({
  appId,
  messages,
  setMessages,
  setInputValue
}: UseChatPersistenceArgs): UseChatPersistenceResult {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Auto-save conversation when messages change
  useEffect(() => {
    // Skip auto-save on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Don't save empty conversations
    if (messages.length === 0) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 2 seconds
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const messagesToSave = serializeMessagesForStorage(messages);

        if (currentConversationId) {
          // Update existing conversation
          await window.electron.conversation.update(
            currentConversationId,
            undefined,
            messagesToSave,
            currentSessionId ?? undefined
          );
        } else {
          // Create new conversation
          const response = await window.electron.conversation.create(
            messagesToSave,
            currentSessionId ?? undefined
          );
          if (response.success && response.conversation) {
            setCurrentConversationId(response.conversation.id);
          }
        }
      } catch (error) {
        console.error('Error saving conversation:', error);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, currentConversationId, currentSessionId]);

  // Listen for session updates from the main process (new or resumed sessions)
  useEffect(() => {
    const unsubscribe = window.electron.agent.onSessionUpdated(appId, ({ sessionId }) => {
      setCurrentSessionId((prev) => (prev === sessionId ? prev : sessionId));
    });
    return () => {
      unsubscribe();
    };
  }, [appId]);

  const saveCurrentConversationIfNeeded = async () => {
    if (!currentConversationId || messages.length === 0) {
      return;
    }

    try {
      const messagesToSave = serializeMessagesForStorage(messages);
      await window.electron.conversation.update(
        currentConversationId,
        undefined,
        messagesToSave,
        currentSessionId ?? undefined
      );
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const newChat = async () => {
    await saveCurrentConversationIfNeeded();

    try {
      // Reset the backend session
      await window.electron.agent.resetSession();
      // Clear frontend messages and input
      setMessages([]);
      setInputValue('');
      // Clear current conversation ID and session
      setCurrentConversationId(null);
      setCurrentSessionId(null);
      // Skip the first autosave after reset
      isInitialLoadRef.current = true;
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    await saveCurrentConversationIfNeeded();

    try {
      const response = await window.electron.conversation.get(conversationId);
      if (response.success && response.conversation) {
        // Parse messages from JSON string
        const parsedMessages: Message[] = JSON.parse(response.conversation.messages).map(
          (msg: Omit<Message, 'timestamp'> & { timestamp: string }) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })
        );

        // Reset session and load messages
        await window.electron.agent.resetSession(response.conversation.sessionId ?? null);
        setMessages(parsedMessages);
        setCurrentConversationId(conversationId);
        setCurrentSessionId(response.conversation.sessionId ?? null);
        // Skip the first autosave after reset
        isInitialLoadRef.current = true;
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  return {
    currentConversationId,
    currentSessionId,
    newChat,
    loadConversation,
    saveCurrentConversationIfNeeded
  };
}

