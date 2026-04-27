import type { ToolUseSimple } from '@/types/chat';

import { CollapsibleTool } from './CollapsibleTool';
import { ToolHeader } from './utils';

interface KillShellToolProps {
  tool: ToolUseSimple;
}

export default function KillShellTool({ tool }: KillShellToolProps) {
  const collapsedContent = <ToolHeader tool={tool} toolName={tool.name} />;

  const expandedContent =
    tool.result ?
      <pre className="overflow-x-auto rounded bg-neutral-100/50 px-2 py-1 font-mono text-sm break-words whitespace-pre-wrap text-neutral-600 dark:bg-neutral-950/50 dark:text-neutral-300">
        {tool.result}
      </pre>
    : null;

  return <CollapsibleTool collapsedContent={collapsedContent} expandedContent={expandedContent} />;
}
