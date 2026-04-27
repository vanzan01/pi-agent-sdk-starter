import type { ReactNode } from 'react';

import TitleBar from '@/components/TitleBar';

import { MissingSkillsBanner } from './MissingSkillsBanner';

interface ChatLayoutProps {
  onOpenHistory: () => void;
  onNewChat: () => void;
  missingSkills: string[];
  children: ReactNode;
}

/**
 * Chat screen layout that keeps styling and header concerns out of the page component.
 */
export function ChatLayout({
  onOpenHistory,
  onNewChat,
  missingSkills,
  children
}: ChatLayoutProps) {
  return (
    <div className="flex h-full flex-col gap-5 rounded-3xl bg-[var(--bg-cream)] p-5 text-[var(--text-primary)] shadow-[var(--shadow-soft)]">
      <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-white)] shadow-sm">
        <TitleBar
          variant="inline"
          tone="light"
          onOpenHistory={onOpenHistory}
          onNewChat={onNewChat}
        />
      </div>

      <MissingSkillsBanner missingSkills={missingSkills} />

      {children}
    </div>
  );
}
