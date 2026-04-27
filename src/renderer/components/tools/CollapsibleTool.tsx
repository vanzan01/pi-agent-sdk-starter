import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface CollapsibleToolProps {
  collapsedContent: ReactNode;
  expandedContent: ReactNode | null;
  defaultExpanded?: boolean;
}

export function CollapsibleTool({
  collapsedContent,
  expandedContent,
  defaultExpanded = false
}: CollapsibleToolProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasExpandedContent = expandedContent !== null && expandedContent !== undefined;

  return (
    <div className="my-0.5">
      <button
        type="button"
        onClick={() => hasExpandedContent && setIsExpanded(!isExpanded)}
        disabled={!hasExpandedContent}
        aria-expanded={isExpanded}
        className={`flex w-full items-center gap-1.5 text-left transition-colors ${
          hasExpandedContent ?
            'cursor-pointer text-neutral-500 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-300'
          : 'cursor-default text-neutral-400 dark:text-neutral-500'
        }`}
      >
        <div className="flex-1">{collapsedContent}</div>
        {hasExpandedContent && (
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-neutral-400 transition-colors dark:text-neutral-500">
            {isExpanded ?
              <ChevronUp className="size-3" />
            : <ChevronDown className="size-3" />}
          </span>
        )}
      </button>
      {isExpanded && hasExpandedContent && (
        <div className="collapsible-tool-expanded mt-1 ml-3 border-l border-neutral-200/30 pl-2.5 dark:border-neutral-700/30">
          <div className="space-y-1.5">{expandedContent}</div>
        </div>
      )}
    </div>
  );
}
