import type { AgentInput, ToolUseSimple } from '@/types/chat';

import { CollapsibleTool } from './CollapsibleTool';
import { ToolHeader } from './utils';

interface TaskToolProps {
  tool: ToolUseSimple;
}

export default function TaskTool({ tool }: TaskToolProps) {
  const input = tool.parsedInput as AgentInput;

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
      <span className="rounded border border-purple-200/50 bg-purple-50/50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
        {input.subagent_type}
      </span>
      {input.model && (
        <span className="rounded border border-blue-200/50 bg-blue-50/50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          {input.model}
        </span>
      )}
    </div>
  );

  const expandedContent = (
    <div className="space-y-1.5">
      {input.prompt && (
        <pre className="overflow-x-auto rounded bg-neutral-100/50 px-2 py-1 font-mono text-sm break-words whitespace-pre-wrap text-neutral-600 dark:bg-neutral-950/50 dark:text-neutral-300">
          {input.prompt}
        </pre>
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
