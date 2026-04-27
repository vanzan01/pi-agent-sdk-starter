import { describe, expect, test } from 'bun:test';

import type { Message } from '@/types/chat';
import {
  appendChunkToMessages,
  startThinkingBlock,
  updateThinkingBlock
} from './chatMessageTransforms';

const createAssistantMessage = (content: Message['content']): Message => ({
  id: '1',
  role: 'assistant',
  content,
  timestamp: new Date(0)
});

describe('chatMessageTransforms', () => {
  describe('appendChunkToMessages', () => {
    test('appends to last assistant string content when streaming', () => {
      const prev: Message[] = [createAssistantMessage('hello')];

      const { messages, startedStreaming } = appendChunkToMessages(prev, ' world', {
        isStreaming: true
      });

      expect(startedStreaming).toBe(false);
      expect(messages[0].content).toBe('hello world');
    });

    test('creates new assistant message when not streaming', () => {
      const prev: Message[] = [];

      const { messages, startedStreaming } = appendChunkToMessages(prev, 'hello', {
        isStreaming: false
      });

      expect(startedStreaming).toBe(true);
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
      expect(messages[0].content).toBe('hello');
    });

    test('appends to last text block in structured content', () => {
      const prev: Message[] = [
        createAssistantMessage([{ type: 'text', text: 'hello' }])
      ];

      const { messages } = appendChunkToMessages(prev, ' world', { isStreaming: true });

      const content = messages[0].content;
      if (typeof content === 'string') {
        throw new Error('expected structured content');
      }
      expect(content[0].text).toBe('hello world');
    });
  });

  describe('startThinkingBlock', () => {
    test('adds thinking block to existing assistant message', () => {
      const prev: Message[] = [createAssistantMessage('hello')];

      const { messages, startedStreaming } = startThinkingBlock(prev, 1, 123);

      expect(startedStreaming).toBe(false);
      const content = messages[0].content;
      if (typeof content === 'string') {
        throw new Error('expected structured content');
      }
      expect(content).toHaveLength(2);
      expect(content[1].type).toBe('thinking');
      expect(content[1].thinkingStreamIndex).toBe(1);
    });

    test('creates new assistant message when none exists', () => {
      const prev: Message[] = [];

      const { messages, startedStreaming } = startThinkingBlock(prev, 2, 123);

      expect(startedStreaming).toBe(true);
      expect(messages).toHaveLength(1);
      const content = messages[0].content;
      expect(typeof content).not.toBe('string');
    });
  });

  describe('updateThinkingBlock', () => {
    test('appends delta to matching thinking block', () => {
      const prev: Message[] = [
        createAssistantMessage([
          {
            type: 'thinking',
            thinking: 'foo',
            thinkingStreamIndex: 3,
            isComplete: false
          }
        ])
      ];

      const messages = updateThinkingBlock(prev, { index: 3, delta: ' bar' });
      const content = messages[0].content;
      if (typeof content === 'string') {
        throw new Error('expected structured content');
      }
      expect(content[0].thinking).toBe('foo bar');
      expect(content[0].isComplete).toBe(false);
    });

    test('returns original messages when no matching block', () => {
      const prev: Message[] = [
        createAssistantMessage([
          {
            type: 'thinking',
            thinking: 'foo',
            thinkingStreamIndex: 1,
            isComplete: true
          }
        ])
      ];

      const messages = updateThinkingBlock(prev, { index: 2, delta: ' bar' });
      expect(messages).toBe(prev);
    });
  });
});
