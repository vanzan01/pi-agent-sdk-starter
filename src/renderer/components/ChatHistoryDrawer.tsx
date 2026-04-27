import { Clock, FolderOpen, MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { Conversation, DatabaseStats, DatabaseStatus } from '@/electron';

const truncateText = (text: string, maxLength: number = 90) => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}...`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadConversation: (conversationId: string) => void;
  currentConversationId: string | null;
  onNewChat: () => void | Promise<void>;
}

export default function ChatHistoryDrawer({
  isOpen,
  onClose,
  onLoadConversation,
  currentConversationId,
  onNewChat
}: ChatHistoryDrawerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const response = await window.electron.conversation.list();
      if (response.success && response.conversations) {
        setConversations(response.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDbStatus = async () => {
    try {
      const response = await window.electron.conversation.dbStatus();
      if (response.success && response.status) {
        setDbStatus(response.status);
      }
    } catch (error) {
      console.error('Error loading database status:', error);
    }
  };

  const loadDbStats = async () => {
    try {
      const response = await window.electron.conversation.dbStats();
      if (response.success && response.stats) {
        setDbStats(response.stats);
      }
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      loadDbStatus();
      loadDbStats();
    }
  }, [isOpen]);

  const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        const response = await window.electron.conversation.delete(conversationId);
        if (response.success) {
          await loadConversations();
          await loadDbStats(); // Refresh stats after delete
          // If the deleted conversation is the currently active one, reset to blank page and close drawer
          if (conversationId === currentConversationId) {
            await onNewChat();
            onClose();
          }
        }
      } catch (error) {
        console.error('Error deleting conversation:', error);
      }
    }
  };

  const handleNewChat = async () => {
    await onNewChat();
    onClose();
  };

  const conversationPreviews = useMemo(() => {
    return conversations.reduce<Record<string, string>>((acc, conversation) => {
      try {
        const parsed = JSON.parse(conversation.messages) as Array<{
          role: string;
          content: string | { type: string; text?: string }[];
        }>;
        // Find the last user message (iterate in reverse)
        let lastUserMessage: (typeof parsed)[0] | undefined;
        for (let i = parsed.length - 1; i >= 0; i--) {
          if (parsed[i].role === 'user') {
            lastUserMessage = parsed[i];
            break;
          }
        }
        if (lastUserMessage) {
          if (typeof lastUserMessage.content === 'string') {
            acc[conversation.id] = truncateText(lastUserMessage.content);
          } else if (Array.isArray(lastUserMessage.content)) {
            const textBlock = lastUserMessage.content.find(
              (block) => typeof block === 'object' && block !== null && 'text' in block
            );
            if (textBlock && typeof textBlock === 'object' && textBlock !== null) {
              acc[conversation.id] =
                'text' in textBlock && typeof textBlock.text === 'string' ?
                  truncateText(textBlock.text)
                : '';
            }
          }
        }
      } catch {
        acc[conversation.id] = '';
      }
      acc[conversation.id] =
        acc[conversation.id] || 'Tap to resume this conversation from where you left off.';
      return acc;
    }, {});
  }, [conversations]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed top-12 right-0 bottom-0 left-0 z-40 bg-black/20 dark:bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-12 left-0 z-50 h-[calc(100vh-3rem)] w-80 transform border-r border-[var(--border-light)] bg-[var(--bg-white)] shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-[var(--border-light)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-medium text-[var(--text-primary)]">
                  Resume a session
                </h2>
                <p className="text-sm text-[var(--text-tertiary)]">
                  Resume a thread or start fresh
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-light)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--user-bubble)] hover:text-[var(--text-secondary)]"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleNewChat}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-coral)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-coral-dark)]"
            >
              <Plus className="h-4 w-4" />
              Start new chat
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ?
              <div className="flex items-center justify-center p-8">
                <div className="text-sm text-[var(--text-tertiary)]">Loading...</div>
              </div>
            : conversations.length === 0 ?
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare className="mb-4 h-12 w-12 text-[var(--border-light)]" />
                <p className="text-sm text-[var(--text-tertiary)]">
                  No conversations yet
                </p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  Start a new chat to see it here
                </p>
              </div>
            : <div className="p-2">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === currentConversationId;
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        onLoadConversation(conversation.id);
                        onClose();
                      }}
                      className={`group relative mb-2 cursor-pointer rounded-xl border px-3 py-3 transition-colors ${
                        isActive ?
                          'border-[var(--accent-coral)] bg-[var(--accent-coral)]/5'
                        : 'border-transparent hover:border-[var(--border-light)] hover:bg-[var(--user-bubble)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {conversation.title}
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                            {conversationPreviews[conversation.id]}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(conversation.updatedAt)}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, conversation.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent text-[var(--text-tertiary)] opacity-0 transition-colors group-hover:opacity-100 hover:border-[var(--border-light)] hover:text-[var(--text-secondary)]"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </div>

          {/* Database Status Footer - Terminal Style */}
          {dbStatus && dbStats && (
            <div className="border-t border-neutral-200/70 bg-neutral-950 px-3 py-2 font-mono dark:border-neutral-800/80">
              <div className="flex items-center gap-3 text-[10px]">
                {/* Status indicator */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      dbStatus.connected ?
                        'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]'
                      : 'bg-red-500'
                    }`}
                  />
                  <span className="text-green-500">SQLite</span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 text-green-500/70">
                  <span>{dbStats.conversationCount} rows</span>
                  <span className="text-green-500/40">•</span>
                  <span>{formatFileSize(dbStats.fileSizeBytes)}</span>
                </div>

                {/* Open folder button */}
                <button
                  onClick={() => {
                    const folderPath = dbStats.path.substring(
                      0,
                      dbStats.path.lastIndexOf(dbStats.path.includes('/') ? '/' : '\\')
                    );
                    window.electron.shell.openExternal(`file://${folderPath}`);
                  }}
                  className="ml-auto flex items-center gap-1 rounded border border-green-500/30 px-1.5 py-0.5 text-green-500/70 transition-all hover:border-green-500/60 hover:bg-green-500/10 hover:text-green-400"
                  title={dbStats.path}
                >
                  <FolderOpen className="h-2.5 w-2.5" />
                  <span>cd</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
