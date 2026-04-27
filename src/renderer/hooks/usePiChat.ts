import { useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { Message } from '@/types/chat';

import { useAgentStreams } from './chat/useAgentStreams';
import type { ContextWindowInfo } from './chat/useMessageStream';

export function usePiChat(appId = 'chat'): {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  contextWindowInfo: ContextWindowInfo | null;
} {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contextWindowInfo, setContextWindowInfo] = useState<ContextWindowInfo | null>(null);
  const isStreamingRef = useRef(false);
  const debugMessagesRef = useRef<string[]>([]);

  useAgentStreams({
    appId,
    setMessages,
    setIsLoading,
    isStreamingRef,
    debugMessagesRef,
    setContextWindowInfo
  });

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    contextWindowInfo
  };
}
