import type { BashInput, ToolUseSimple } from '@/types/chat';

import { CollapsibleTool } from './CollapsibleTool';
import { ToolHeader } from './utils';

interface BashToolProps {
  tool: ToolUseSimple;
}

export default function BashTool({ tool }: BashToolProps) {
  const input = tool.parsedInput as BashInput;

  if (!input) {
    // Input not parsed yet - show minimal placeholder
    return (
      <div className="my-0.5">
        <ToolHeader tool={tool} toolName={tool.name} />
      </div>
    );
  }

  const collapsedContent = (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolHeader tool={tool} toolName={tool.name} />
      {input.run_in_background && (
        <span className="rounded border border-blue-200/50 bg-blue-50/50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-blue-600 uppercase dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          background
        </span>
      )}
    </div>
  );

  const expandedContent = (
    <div className="space-y-1.5">
      <code className="block font-mono text-sm break-words whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
        $ {input.command}
      </code>

      {tool.result && (
        <pre className="overflow-x-auto rounded bg-neutral-100/50 px-2 py-1 font-mono text-sm break-words whitespace-pre-wrap text-neutral-600 dark:bg-neutral-950/50 dark:text-neutral-300">
          {tool.result}
        </pre>
      )}

      {tool.isError && tool.result && (
        <pre className="overflow-x-auto rounded bg-red-100/50 px-2 py-1 font-mono text-sm break-words whitespace-pre-wrap text-red-700 dark:bg-red-950/50 dark:text-red-200">
          {tool.result}
        </pre>
      )}
    </div>
  );

  return <CollapsibleTool collapsedContent={collapsedContent} expandedContent={expandedContent} />;
}
