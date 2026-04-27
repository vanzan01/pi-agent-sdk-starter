import type { ReadInput, ToolUseSimple } from '@/types/chat';

import { CollapsibleTool } from './CollapsibleTool';
import { FilePath, ToolHeader } from './utils';

interface ReadToolProps {
  tool: ToolUseSimple;
}

export default function ReadTool({ tool }: ReadToolProps) {
  const input = tool.parsedInput as ReadInput;

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
      <FilePath path={input.file_path} />
      {input.offset !== undefined && (
        <span className="rounded border border-neutral-200/50 bg-neutral-50/50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-neutral-500 uppercase dark:border-neutral-700/50 dark:bg-neutral-900/50 dark:text-neutral-400">
          offset {input.offset}
        </span>
      )}
      {input.limit !== undefined && (
        <span className="rounded border border-neutral-200/50 bg-neutral-50/50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-neutral-500 uppercase dark:border-neutral-700/50 dark:bg-neutral-900/50 dark:text-neutral-400">
          limit {input.limit}
        </span>
      )}
    </div>
  );

  const expandedContent =
    tool.result ?
      <pre className="max-h-72 overflow-x-auto rounded bg-neutral-100/50 px-2 py-1 font-mono text-sm wrap-break-word whitespace-pre-wrap text-neutral-600 dark:bg-neutral-950/50 dark:text-neutral-300">
        {tool.result}
      </pre>
    : null;

  return <CollapsibleTool collapsedContent={collapsedContent} expandedContent={expandedContent} />;
}
