import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import type { CSSProperties, RefObject } from 'react';

import Message from '@/components/Message';
import { getRandomSuggestion } from '@/constants/chatSuggestions';
import type { Message as MessageType } from '@/types/chat';

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  bottomPadding?: number;
  tone?: 'light' | 'dark';
}

const containerClasses = 'flex-1 overflow-y-auto px-3 py-3 bg-transparent';

export default function MessageList({
  messages,
  isLoading,
  containerRef,
  bottomPadding,
  tone = 'light'
}: MessageListProps) {
  const containerStyle: CSSProperties | undefined =
    bottomPadding ? { paddingBottom: bottomPadding } : undefined;

  // Get a random suggestion when there are no messages
  // This will change each time messages.length changes (including when it becomes 0)
  const suggestion = useMemo(() => {
    if (messages.length === 0) {
      return getRandomSuggestion();
    }
    return '';
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`relative flex ${containerClasses}`}
        style={containerStyle}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4">
          <div
            className={`w-full rounded-3xl px-6 py-8 text-center shadow-md ${
              tone === 'dark' ?
                'border border-white/10 bg-white/[0.03] text-slate-100 shadow-black/40'
              : 'border border-[var(--border-light)] bg-[var(--user-bubble)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]'
            }`}
          >
            <p
              className={`text-[11px] font-semibold tracking-[0.35em] uppercase ${
                tone === 'dark' ? 'text-slate-400' : 'text-[var(--text-tertiary)]'
              }`}
            >
              Pi SDK Starter Kit
            </p>
            <h2
              className={`mt-2 text-xl font-semibold ${
                tone === 'dark' ? 'text-slate-50' : 'text-[var(--text-primary)]'
              }`}
            >
              {suggestion}
            </h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${containerClasses}`} style={containerStyle}>
      <div className="mx-auto max-w-3xl space-y-1.5">
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            isLoading={isLoading && index === messages.length - 1}
          />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-tertiary)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Streaming response...</span>
          </div>
        )}
      </div>
    </div>
  );
}
