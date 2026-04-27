import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import type { ToolUse } from '@/electron';
import type { Message, ToolInput } from '@/types/chat';
import { parsePartialJson } from '@/utils/parsePartialJson';

interface UseToolStreamProps {
  appId: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  isStreamingRef: MutableRefObject<boolean>;
  debugMessagesRef: MutableRefObject<string[]>;
}

// Handles tool use lifecycle: start, input deltas, content stop, and result streams.
export function useToolStream({
  appId,
  setMessages,
  isStreamingRef,
  debugMessagesRef
}: UseToolStreamProps) {
  useEffect(() => {
    const unsubscribeToolUseStart = window.electron.agent.onToolUseStart(appId, (tool: ToolUse) => {
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        const toolBlock = {
          type: 'tool_use' as const,
          tool: {
            ...tool,
            inputJson: ''
          }
        };

        if (lastMessage && lastMessage.role === 'assistant') {
          const content = lastMessage.content;
          const contentArray =
            typeof content === 'string' ? [{ type: 'text' as const, text: content }] : content;
          return [
            ...prev.slice(0, -1),
            {
              ...lastMessage,
              content: [...contentArray, toolBlock]
            }
          ];
        }

        isStreamingRef.current = true;
        debugMessagesRef.current = [];
        return [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: [toolBlock],
            timestamp: new Date()
          }
        ];
      });
    });

    const unsubscribeToolInputDelta = window.electron.agent.onToolInputDelta(
      appId,
      (data) => {
        if (!data.toolId) return; // Skip if toolId is not provided
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (
            lastMessage &&
            lastMessage.role === 'assistant' &&
            typeof lastMessage.content !== 'string'
          ) {
            const contentArray = lastMessage.content;
            const toolBlockIndex = contentArray.findIndex(
              (block) => block.type === 'tool_use' && block.tool?.id === data.toolId
            );

            if (toolBlockIndex !== -1) {
              const toolBlock = contentArray[toolBlockIndex];
              if (toolBlock.type === 'tool_use' && toolBlock.tool) {
                const currentTool = toolBlock.tool;
                const newInputJson = (currentTool.inputJson || '') + data.delta;
                const parsedInput = parsePartialJson<ToolInput>(newInputJson);

                const updatedContent = [...contentArray];
                updatedContent[toolBlockIndex] = {
                  ...toolBlock,
                  tool: {
                    ...currentTool,
                    inputJson: newInputJson,
                    parsedInput: parsedInput || currentTool.parsedInput
                  }
                };

                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: updatedContent
                  }
                ];
              }
            }
          }
          return prev;
        });
      }
    );

    const unsubscribeContentBlockStop = window.electron.agent.onContentBlockStop(
      appId,
      (data: { index: number; toolId?: string }) => {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (
            lastMessage &&
            lastMessage.role === 'assistant' &&
            typeof lastMessage.content !== 'string'
          ) {
            const contentArray = lastMessage.content;

            const thinkingBlockIndex = contentArray.findIndex(
              (block) =>
                block.type === 'thinking' &&
                block.thinkingStreamIndex === data.index &&
                !block.isComplete
            );

            if (thinkingBlockIndex !== -1) {
              const thinkingBlock = contentArray[thinkingBlockIndex];
              if (thinkingBlock.type === 'thinking') {
                const thinkingContent = thinkingBlock.thinking || '';
                const estimatedTokens = Math.ceil(thinkingContent.length / 4);

                const updatedContent = [...contentArray];
                updatedContent[thinkingBlockIndex] = {
                  ...thinkingBlock,
                  isComplete: true,
                  thinkingDurationMs:
                    thinkingBlock.thinkingStartedAt ?
                      Date.now() - thinkingBlock.thinkingStartedAt
                    : undefined,
                  thinkingTokensUsed: estimatedTokens
                };

                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: updatedContent
                  }
                ];
              }
            }

            const toolBlockIndex =
              data.toolId ?
                contentArray.findIndex(
                  (block) => block.type === 'tool_use' && block.tool?.id === data.toolId
                )
              : contentArray.findIndex(
                  (block) => block.type === 'tool_use' && block.tool?.streamIndex === data.index
                );

            if (toolBlockIndex !== -1) {
              const toolBlock = contentArray[toolBlockIndex];
              if (toolBlock.type === 'tool_use' && toolBlock.tool) {
                const currentTool = toolBlock.tool;
                let parsedInput: ToolInput | undefined = currentTool.parsedInput;
                if (currentTool.inputJson) {
                  try {
                    parsedInput = JSON.parse(currentTool.inputJson) as ToolInput;
                  } catch {
                    const fallback = parsePartialJson<ToolInput>(currentTool.inputJson);
                    parsedInput = fallback ?? currentTool.parsedInput;
                  }
                }

                const updatedContent = [...contentArray];
                updatedContent[toolBlockIndex] = {
                  ...toolBlock,
                  tool: {
                    ...currentTool,
                    parsedInput
                  }
                };

                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: updatedContent
                  }
                ];
              }
            }
          }
          return prev;
        });
      }
    );

    const unsubscribeToolResultStart = window.electron.agent.onToolResultStart(
      appId,
      (data: { toolUseId: string; content: string; isError: boolean }) => {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (
            lastMessage &&
            lastMessage.role === 'assistant' &&
            typeof lastMessage.content !== 'string'
          ) {
            const contentArray = lastMessage.content;
            const toolBlockIndex = contentArray.findIndex(
              (block) => block.type === 'tool_use' && block.tool?.id === data.toolUseId
            );

            if (toolBlockIndex !== -1) {
              const toolBlock = contentArray[toolBlockIndex];
              if (toolBlock.type === 'tool_use' && toolBlock.tool) {
                const updatedContent = [...contentArray];
                updatedContent[toolBlockIndex] = {
                  ...toolBlock,
                  tool: {
                    ...toolBlock.tool,
                    result: data.content,
                    isError: data.isError
                  }
                };

                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: updatedContent
                  }
                ];
              }
            }
          }
          return prev;
        });
      }
    );

    const unsubscribeToolResultDelta = window.electron.agent.onToolResultDelta(
      appId,
      (data: { toolUseId: string; delta: string }) => {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (
            lastMessage &&
            lastMessage.role === 'assistant' &&
            typeof lastMessage.content !== 'string'
          ) {
            const contentArray = lastMessage.content;
            const toolBlockIndex = contentArray.findIndex(
              (block) => block.type === 'tool_use' && block.tool?.id === data.toolUseId
            );

            if (toolBlockIndex !== -1) {
              const toolBlock = contentArray[toolBlockIndex];
              if (toolBlock.type === 'tool_use' && toolBlock.tool) {
                const updatedContent = [...contentArray];
                updatedContent[toolBlockIndex] = {
                  ...toolBlock,
                  tool: {
                    ...toolBlock.tool,
                    result: (toolBlock.tool.result || '') + data.delta
                  }
                };

                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: updatedContent
                  }
                ];
              }
            }
          }
          return prev;
        });
      }
    );

    const unsubscribeToolResultComplete = window.electron.agent.onToolResultComplete(
      appId,
      (data: { toolUseId: string; content: string; isError?: boolean }) => {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (
            lastMessage &&
            lastMessage.role === 'assistant' &&
            typeof lastMessage.content !== 'string'
          ) {
            const contentArray = lastMessage.content;
            const toolBlockIndex = contentArray.findIndex(
              (block) => block.type === 'tool_use' && block.tool?.id === data.toolUseId
            );

            if (toolBlockIndex !== -1) {
              const toolBlock = contentArray[toolBlockIndex];
              if (toolBlock.type === 'tool_use' && toolBlock.tool) {
                const updatedContent = [...contentArray];
                updatedContent[toolBlockIndex] = {
                  ...toolBlock,
                  tool: {
                    ...toolBlock.tool,
                    result: data.content,
                    isError: data.isError
                  }
                };

                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMessage,
                    content: updatedContent
                  }
                ];
              }
            }
          }
          return prev;
        });
      }
    );

    return () => {
      unsubscribeToolUseStart();
      unsubscribeToolInputDelta();
      unsubscribeContentBlockStop();
      unsubscribeToolResultStart();
      unsubscribeToolResultDelta();
      unsubscribeToolResultComplete();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs/setters, only re-subscribe on appId change
  }, [appId]);
}
