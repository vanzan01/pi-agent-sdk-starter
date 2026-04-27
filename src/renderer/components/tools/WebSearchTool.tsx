import type { ToolUseSimple, WebSearchInput } from '@/types/chat';

import { CollapsibleTool } from './CollapsibleTool';
import { InlineCode, ToolHeader } from './utils';

interface WebSearchToolProps {
  tool: ToolUseSimple;
}

export default function WebSearchTool({ tool }: WebSearchToolProps) {
  const input = tool.parsedInput as WebSearchInput;

  if (!input) {
    return (
      <div className="my-0.5">
        <ToolHeader tool={tool} toolName={tool.name} />
      </div>
    );
  }

  const collapsedContent = (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolHeader tool={tool} toolName={tool.name} />
      <InlineCode>{input.query}</InlineCode>
    </div>
  );

  const expandedContent = (
    <div className="space-y-1.5">
      {(input.allowed_domains || input.blocked_domains) && (
        <div className="text-[10px] text-neutral-600 dark:text-neutral-400">
          {input.allowed_domains && <div>Allowed: {input.allowed_domains.join(', ')}</div>}
          {input.blocked_domains && <div>Blocked: {input.blocked_domains.join(', ')}</div>}
        </div>
      )}

      {tool.result && (
        <pre className="overflow-x-auto rounded bg-neutral-100/50 px-2 py-1 font-mono text-sm break-words whitespace-pre-wrap text-neutral-600 dark:bg-neutral-950/50 dark:text-neutral-300">
          {tool.result}
        </pre>
      )}
    </div>
  );

  return <CollapsibleTool collapsedContent={collapsedContent} expandedContent={expandedContent} />;
}
