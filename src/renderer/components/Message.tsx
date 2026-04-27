import AttachmentPreviewList from '@/components/AttachmentPreviewList';
import BlockGroup from '@/components/BlockGroup';
import Markdown from '@/components/Markdown';
import type { ContentBlock, Message as MessageType } from '@/types/chat';

interface MessageProps {
  message: MessageType;
  isLoading?: boolean;
}

export default function Message({ message, isLoading = false }: MessageProps) {
  if (message.role === 'user') {
    const userContent = typeof message.content === 'string' ? message.content : '';
    const hasText = userContent.trim().length > 0;
    const hasAttachments = Boolean(message.attachments?.length);
    const attachmentItems =
      message.attachments?.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        size: attachment.size,
        isImage: attachment.isImage ?? attachment.mimeType.startsWith('image/'),
        previewUrl: attachment.previewUrl,
        footnoteLines: [attachment.relativePath ?? attachment.savedPath].filter(
          (line): line is string => Boolean(line)
        )
      })) ?? [];

    return (
      <div className="flex justify-end px-1">
        <article className="relative max-w-[85%] rounded-[20px] bg-[var(--user-bubble)] px-4 py-3 text-base leading-relaxed text-[var(--text-primary)]">
          {hasText && (
            <div className="prose prose-base max-w-none prose-neutral">
              <Markdown>{userContent}</Markdown>
            </div>
          )}
          {hasAttachments && (
            <div className={hasText ? 'mt-2' : ''}>
              <AttachmentPreviewList attachments={attachmentItems} />
            </div>
          )}
        </article>
      </div>
    );
  }

  // Assistant message
  if (typeof message.content === 'string') {
    return (
      <div className="flex justify-start">
        <article className="w-full px-3 py-2">
          <div className="prose prose-base max-w-none text-base leading-[1.7] prose-neutral text-[var(--text-primary)]">
            <Markdown>{message.content}</Markdown>
          </div>
        </article>
      </div>
    );
  }

  // Group consecutive thinking/tool blocks together
  const groupedBlocks: (ContentBlock | ContentBlock[])[] = [];
  let currentGroup: ContentBlock[] = [];

  for (const block of message.content) {
    if (block.type === 'text') {
      // If we have a group, add it before the text block
      if (currentGroup.length > 0) {
        groupedBlocks.push([...currentGroup]);
        currentGroup = [];
      }
      groupedBlocks.push(block);
    } else if (block.type === 'thinking' || block.type === 'tool_use') {
      // Add to current group
      currentGroup.push(block);
    }
  }

  // Add any remaining group
  if (currentGroup.length > 0) {
    groupedBlocks.push(currentGroup);
  }

  // Determine which BlockGroup is the latest active section
  // Find the last BlockGroup index
  const lastBlockGroupIndex = groupedBlocks.findLastIndex((item) => Array.isArray(item));

  // Check if there are any incomplete blocks (still streaming)
  const hasIncompleteBlocks = message.content.some((block) => {
    if (block.type === 'thinking') {
      return !block.isComplete;
    }
    if (block.type === 'tool_use') {
      // Tool is incomplete if it doesn't have a result yet
      return !block.tool?.result;
    }
    return false;
  });

  const isStreaming = isLoading && hasIncompleteBlocks;

  return (
    <div className="flex justify-start">
      <article className="w-full px-3 py-2">
        <div className="space-y-3">
          {groupedBlocks.map((item, index) => {
            // Single text block
            if (!Array.isArray(item)) {
              if (item.type === 'text' && item.text) {
                return (
                  <div
                    key={index}
                    className="prose prose-base max-w-none text-base leading-[1.7] prose-neutral text-[var(--text-primary)]"
                  >
                    <Markdown>{item.text}</Markdown>
                  </div>
                );
              }
              return null;
            }

            // Group of thinking/tool blocks
            const isLatestActiveSection = index === lastBlockGroupIndex;
            const hasTextAfter =
              index < groupedBlocks.length - 1 &&
              groupedBlocks
                .slice(index + 1)
                .some((nextItem) => !Array.isArray(nextItem) && nextItem.type === 'text');

            return (
              <BlockGroup
                key={`group-${index}`}
                blocks={item}
                isLatestActiveSection={isLatestActiveSection}
                isStreaming={isStreaming}
                hasTextAfter={hasTextAfter}
              />
            );
          })}
        </div>
      </article>
    </div>
  );
}
