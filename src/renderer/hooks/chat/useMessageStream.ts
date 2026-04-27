import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type { Message } from '@/types/chat';
import { appendChunkToMessages } from '@/utils/chatMessageTransforms';

export interface ContextWindowInfo {
  model: string;
  contextWindow: number;
  tokensUsed: number;
}

interface UseMessageStreamProps {
  appId: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  isStreamingRef: MutableRefObject<boolean>;
  debugMessagesRef: MutableRefObject<string[]>;
  setContextWindowInfo?: Dispatch<SetStateAction<ContextWindowInfo | null>>;
}

// Handles assistant message chunks, completion, stop, error, and debug logs.
export function useMessageStream({
  appId,
  setMessages,
  setIsLoading,
  isStreamingRef,
  debugMessagesRef,
  setContextWindowInfo
}: UseMessageStreamProps) {
  useEffect(() => {
    const unsubscribeMessageChunk = window.electron.agent.onMessageChunk(appId, (chunk: string) => {
      setMessages((prev) => {
        const { messages: nextMessages, startedStreaming } = appendChunkToMessages(prev, chunk, {
          isStreaming: isStreamingRef.current
        });

        if (startedStreaming) {
          isStreamingRef.current = true;
          debugMessagesRef.current = [];
        }

        return nextMessages;
      });
    });

    const unsubscribeMessageComplete = window.electron.agent.onMessageComplete(appId, () => {
      isStreamingRef.current = false;
      setIsLoading(false);

      if (debugMessagesRef.current.length > 0) {
        const accumulatedDebug = debugMessagesRef.current.join('\n');
        debugMessagesRef.current = [];

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          const debugContent = `\n\n---\n**🛠 Debug Output:**\n\`\`\`\n${accumulatedDebug}\n\`\`\`\n`;

          if (lastMessage && lastMessage.role === 'assistant') {
            const content = lastMessage.content;
            if (typeof content === 'string') {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: content + debugContent
                }
              ];
            } else {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: [
                    ...content,
                    {
                      type: 'text' as const,
                      text: debugContent
                    }
                  ]
                }
              ];
            }
          }
          return [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: debugContent.trim(),
              timestamp: new Date()
            }
          ];
        });
      }
    });

    const unsubscribeMessageStopped = window.electron.agent.onMessageStopped(appId, () => {
      isStreamingRef.current = false;
      setIsLoading(false);

      const accumulatedDebug =
        debugMessagesRef.current.length > 0 ? debugMessagesRef.current.join('\n') : null;
      debugMessagesRef.current = [];

      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (
          lastMessage &&
          lastMessage.role === 'assistant' &&
          typeof lastMessage.content !== 'string'
        ) {
          let hasUpdates = false;
          let updatedContent = lastMessage.content.map((block) => {
            if (block.type === 'thinking' && !block.isComplete) {
              hasUpdates = true;
              return {
                ...block,
                isComplete: true,
                thinkingDurationMs:
                  block.thinkingStartedAt ? Date.now() - block.thinkingStartedAt : undefined
              };
            }
            return block;
          });

          if (accumulatedDebug) {
            const debugContent = `\n\n---\n**🛠 Debug Output:**\n\`\`\`\n${accumulatedDebug}\n\`\`\`\n`;
            updatedContent = [
              ...updatedContent,
              {
                type: 'text' as const,
                text: debugContent
              }
            ];
            hasUpdates = true;
          }

          if (hasUpdates) {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: updatedContent
              }
            ];
          }
        } else if (accumulatedDebug) {
          const debugContent = `\n\n---\n**🛠 Debug Output:**\n\`\`\`\n${accumulatedDebug}\n\`\`\`\n`;
          return [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: debugContent.trim(),
              timestamp: new Date()
            }
          ];
        }
        return prev;
      });
    });

    const unsubscribeMessageError = window.electron.agent.onMessageError(appId, (error: string) => {
      isStreamingRef.current = false;

      if (debugMessagesRef.current.length > 0) {
        const accumulatedDebug = debugMessagesRef.current.join('\n');
        debugMessagesRef.current = [];

        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          const debugContent = `\n\n---\n**🛠 Debug Output:**\n\`\`\`\n${accumulatedDebug}\n\`\`\`\n`;

          if (lastMessage && lastMessage.role === 'assistant') {
            const content = lastMessage.content;
            if (typeof content === 'string') {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: content + debugContent
                }
              ];
            } else {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMessage,
                  content: [
                    ...content,
                    {
                      type: 'text' as const,
                      text: debugContent
                    }
                  ]
                }
              ];
            }
          }
          return prev;
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error: ${error}`,
          timestamp: new Date()
        }
      ]);
      setIsLoading(false);
    });

    const unsubscribeDebugMessage = window.electron.agent.onDebugMessage(
      appId,
      (message: string) => {
        if (isStreamingRef.current) {
          debugMessagesRef.current.push(message);
        }
      }
    );

    const unsubscribeContextWindow = window.electron.agent.onContextWindowUpdate(
      appId,
      (data) => {
        setContextWindowInfo?.({
          model: data.model,
          contextWindow: data.contextWindow,
          tokensUsed: data.tokensUsed
        });
      }
    );

    return () => {
      unsubscribeMessageChunk();
      unsubscribeMessageComplete();
      unsubscribeMessageStopped();
      unsubscribeMessageError();
      unsubscribeDebugMessage();
      unsubscribeContextWindow();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs/setters, only re-subscribe on appId change
  }, [appId]);
}



