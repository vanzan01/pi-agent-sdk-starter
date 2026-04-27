import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import Markdown from '@/components/Markdown';
import {
  getThinkingBadgeConfig,
  getThinkingLabel,
  getToolBadgeConfig,
  getToolLabel
} from '@/components/tools/toolBadgeConfig';
import { ThinkingHeader } from '@/components/tools/utils';
import ToolUse from '@/components/ToolUse';
import type { ContentBlock, ToolUseSimple } from '@/types/chat';

import { THINKING_PRESETS, type ThinkingLevel } from '../../shared/core';

interface BlockGroupProps {
  blocks: ContentBlock[];
  isLatestActiveSection?: boolean;
  isStreaming?: boolean;
  hasTextAfter?: boolean;
}

interface ThinkingBadgeProps {
  content: string;
  isComplete?: boolean;
  durationMs?: number;
  isExpanded: boolean;
  onToggle: () => void;
  levelLabel?: string;
  budgetTokens?: number;
  usedTokens?: number;
}

function ThinkingBadge({
  content,
  isComplete = false,
  durationMs,
  isExpanded,
  onToggle,
  levelLabel,
  budgetTokens,
  usedTokens
}: ThinkingBadgeProps) {
  const hasContent = content?.trim().length > 0;
  const config = getThinkingBadgeConfig();
  const label = getThinkingLabel(isComplete, durationMs, levelLabel, budgetTokens, usedTokens);

  return (
    <button
      type="button"
      onClick={() => hasContent && onToggle()}
      disabled={!hasContent}
      className={`inline-flex items-center gap-1 rounded-md border ${config.colors.border} ${config.colors.bg} px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${config.colors.text} transition-colors ${config.colors.hoverBg} ${
        !hasContent ? 'cursor-default opacity-60' : 'cursor-pointer'
      }`}
    >
      {config.icon && <span className="shrink-0">{config.icon}</span>}
      <span>{label}</span>
      {hasContent && (
        <span className={config.colors.chevron}>
          {isExpanded ?
            <ChevronUp className="size-2.5" />
          : <ChevronDown className="size-2.5" />}
        </span>
      )}
    </button>
  );
}

interface ToolBadgeProps {
  tool: ToolUseSimple | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}

function ToolBadge({ tool, isExpanded, onToggle }: ToolBadgeProps) {
  if (!tool) return null;

  const config = getToolBadgeConfig(tool.name);
  const label = getToolLabel(tool);
  const hasDetails = tool.result || tool.inputJson || tool.parsedInput;

  return (
    <button
      type="button"
      onClick={() => hasDetails && onToggle()}
      disabled={!hasDetails}
      className={`inline-flex items-center gap-1 rounded-md border ${config.colors.border} ${config.colors.bg} px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${config.colors.text} transition-colors ${config.colors.hoverBg} ${
        !hasDetails ? 'cursor-default opacity-60' : 'cursor-pointer'
      }`}
    >
      {config.icon && <span className="shrink-0">{config.icon}</span>}
      <span>{label}</span>
      {hasDetails && (
        <span className={config.colors.chevron}>
          {isExpanded ?
            <ChevronUp className="size-2.5" />
          : <ChevronDown className="size-2.5" />}
        </span>
      )}
    </button>
  );
}

export default function BlockGroup({
  blocks,
  isLatestActiveSection = false,
  isStreaming = false,
  hasTextAfter = false
}: BlockGroupProps) {
  const [manualExpandedState, setManualExpandedState] = useState<boolean | null>(null);
  const [wasManuallyToggled, setWasManuallyToggled] = useState(false);
  const [thinkingLevelInfo, setThinkingLevelInfo] = useState<{
    label: string;
    tokens: number;
  } | null>(null);

  // Fetch thinking level on mount to display in thinking badges
  useEffect(() => {
    let isMounted = true;
    window.electron.config
      .getThinkingLevel()
      .then(({ level }) => {
        if (isMounted && level) {
          const preset = THINKING_PRESETS[level as ThinkingLevel];
          if (preset) {
            setThinkingLevelInfo({ label: preset.label, tokens: preset.tokens });
          }
        }
      })
      .catch((error) => {
        console.error('Error loading thinking level for badge:', error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Check if there's any expandable content
  const hasExpandableContent = blocks.some((block) => {
    if (block.type === 'thinking') {
      return block.thinking ? block.thinking.trim().length > 0 : false;
    }
    if (block.type === 'tool_use') {
      return block.tool?.result || block.tool?.inputJson || block.tool?.parsedInput || false;
    }
    return false;
  });

  // Compute auto-expanded state based on props
  const autoExpandedState =
    isLatestActiveSection && isStreaming && hasExpandableContent && !hasTextAfter;

  // Use manual state if user has toggled, otherwise use auto state
  const isExpanded = wasManuallyToggled ? (manualExpandedState ?? false) : autoExpandedState;

  const toggleGroup = () => {
    if (hasExpandableContent) {
      const newState = !isExpanded;
      setManualExpandedState(newState);
      setWasManuallyToggled(true);
    }
  };

  if (blocks.length === 0) return null;

  return (
    <div className="mt-1.5 mb-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {blocks.map((block, index) => {
          if (block.type === 'thinking') {
            return (
              <ThinkingBadge
                key={`thinking-${index}`}
                content={block.thinking || ''}
                isComplete={block.isComplete}
                durationMs={block.thinkingDurationMs}
                isExpanded={isExpanded}
                onToggle={toggleGroup}
                levelLabel={thinkingLevelInfo?.label}
                budgetTokens={thinkingLevelInfo?.tokens}
                usedTokens={block.thinkingTokensUsed}
              />
            );
          }
          if (block.type === 'tool_use' && block.tool) {
            return (
              <ToolBadge
                key={`tool-${index}`}
                tool={block.tool}
                isExpanded={isExpanded}
                onToggle={toggleGroup}
              />
            );
          }
          return null;
        })}
      </div>
      {isExpanded && hasExpandableContent && (
        <div className="expanded-block-section mt-3 ml-3 pl-2.5">
          <div className="space-y-4">
            {blocks.map((block, index) => {
              if (block.type === 'thinking') {
                const config = getThinkingBadgeConfig();
                // Use border color from config, adjusting opacity for expanded content
                const borderColor = config.colors.border
                  .replace('/60', '/50')
                  .replace('/30', '/50');
                return (
                  <div key={`thinking-expanded-${index}`} className="my-2">
                    <ThinkingHeader
                      isComplete={block.isComplete || false}
                      durationMs={block.thinkingDurationMs}
                      levelLabel={thinkingLevelInfo?.label}
                      budgetTokens={thinkingLevelInfo?.tokens}
                      usedTokens={block.thinkingTokensUsed}
                    />
                    {block.thinking && (
                      <div
                        className={`thinking-expanded-content mt-1.5 ml-3 border-l ${borderColor} pl-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400`}
                      >
                        <div className="prose prose-sm max-w-none prose-neutral dark:prose-invert">
                          <Markdown>{block.thinking}</Markdown>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              if (block.type === 'tool_use' && block.tool) {
                return (
                  <div key={`tool-expanded-${index}`} className="my-2">
                    <ToolUse tool={block.tool} />
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
