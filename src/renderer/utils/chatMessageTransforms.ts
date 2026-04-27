import type { Message, ContentBlock } from '@/types/chat';

export type AppendChunkResult = {
  messages: Message[];
  startedStreaming: boolean;
};

export function appendChunkToMessages(
  prev: Message[],
  chunk: string,
  options: { isStreaming: boolean }
): AppendChunkResult {
  const lastMessage = prev[prev.length - 1];

  if (lastMessage && lastMessage.role === 'assistant' && options.isStreaming) {
    const content = lastMessage.content;

    if (typeof content === 'string') {
      return {
        messages: [
          ...prev.slice(0, -1),
          {
            ...lastMessage,
            content: content + chunk
          }
        ],
        startedStreaming: false
      };
    }

    const contentArray = content;
    const lastBlock = contentArray[contentArray.length - 1];

    if (lastBlock && lastBlock.type === 'text') {
      const updatedBlocks: ContentBlock[] = [
        ...contentArray.slice(0, -1),
        {
          ...lastBlock,
          text: (lastBlock.text || '') + chunk
        }
      ];

      return {
        messages: [
          ...prev.slice(0, -1),
          {
            ...lastMessage,
            content: updatedBlocks
          }
        ],
        startedStreaming: false
      };
    }

    return {
      messages: [
        ...prev.slice(0, -1),
        {
          ...lastMessage,
          content: [...contentArray, { type: 'text', text: chunk }]
        }
      ],
      startedStreaming: false
    };
  }

  const newMessage: Message = {
    id: Date.now().toString(),
    role: 'assistant',
    content: chunk,
    timestamp: new Date()
  };

  return {
    messages: [...prev, newMessage],
    startedStreaming: true
  };
}

export type StartThinkingResult = {
  messages: Message[];
  startedStreaming: boolean;
};

export function startThinkingBlock(
  prev: Message[],
  index: number,
  now: number
): StartThinkingResult {
  const lastMessage = prev[prev.length - 1];
  const thinkingBlock: ContentBlock = {
    type: 'thinking',
    thinking: '',
    thinkingStreamIndex: index,
    thinkingStartedAt: now
  };

  if (lastMessage && lastMessage.role === 'assistant') {
    const content = lastMessage.content;
    const contentArray: ContentBlock[] =
      typeof content === 'string' ? [{ type: 'text', text: content }] : content;

    return {
      messages: [
        ...prev.slice(0, -1),
        {
          ...lastMessage,
          content: [...contentArray, thinkingBlock]
        }
      ],
      startedStreaming: false
    };
  }

  const newMessage: Message = {
    id: Date.now().toString(),
    role: 'assistant',
    content: [thinkingBlock],
    timestamp: new Date()
  };

  return {
    messages: [...prev, newMessage],
    startedStreaming: true
  };
}

export function updateThinkingBlock(
  prev: Message[],
  data: { index: number; delta: string }
): Message[] {
  const lastMessage = prev[prev.length - 1];

  if (!lastMessage || lastMessage.role !== 'assistant' || typeof lastMessage.content === 'string') {
    return prev;
  }

  const contentArray = lastMessage.content;
  const thinkingBlockIndex = contentArray.findIndex(
    (block) =>
      block.type === 'thinking' &&
      block.thinkingStreamIndex === data.index &&
      !block.isComplete
  );

  if (thinkingBlockIndex === -1) {
    return prev;
  }

  const thinkingBlock = contentArray[thinkingBlockIndex];
  if (thinkingBlock.type !== 'thinking') {
    return prev;
  }

  const updatedContent: ContentBlock[] = [...contentArray];
  updatedContent[thinkingBlockIndex] = {
    ...thinkingBlock,
    thinking: (thinkingBlock.thinking || '') + data.delta,
    thinkingStreamIndex: thinkingBlock.thinkingStreamIndex,
    isComplete: thinkingBlock.isComplete
  };

  return [
    ...prev.slice(0, -1),
    {
      ...lastMessage,
      content: updatedContent
    }
  ];
}
