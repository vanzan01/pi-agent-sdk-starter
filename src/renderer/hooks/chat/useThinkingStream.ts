import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type { Message } from '@/types/chat';
import { startThinkingBlock, updateThinkingBlock } from '@/utils/chatMessageTransforms';

interface UseThinkingStreamProps {
  appId: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  isStreamingRef: MutableRefObject<boolean>;
  debugMessagesRef: MutableRefObject<string[]>;
}

// Handles thinking start/delta events.
export function useThinkingStream({
  appId,
  setMessages,
  isStreamingRef,
  debugMessagesRef
}: UseThinkingStreamProps) {
  useEffect(() => {
    const unsubscribeThinkingStart = window.electron.agent.onThinkingStart(
      appId,
      (data: { index: number }) => {
        setMessages((prev) => {
          const { messages, startedStreaming } = startThinkingBlock(prev, data.index, Date.now());
          if (startedStreaming) {
            isStreamingRef.current = true;
            debugMessagesRef.current = [];
          }
          return messages;
        });
      }
    );

    const unsubscribeThinkingChunk = window.electron.agent.onThinkingChunk(
      appId,
      (data: { index: number; delta: string }) => {
        setMessages((prev) => updateThinkingBlock(prev, data));
      }
    );

    return () => {
      unsubscribeThinkingStart();
      unsubscribeThinkingChunk();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs/setters, only re-subscribe on appId change
  }, [appId]);
}
