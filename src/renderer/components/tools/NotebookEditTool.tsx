import type { NotebookEditInput, ToolUseSimple } from '@/types/chat';

import { CollapsibleTool } from './CollapsibleTool';
import { FilePath, ToolHeader } from './utils';

interface NotebookEditToolProps {
  tool: ToolUseSimple;
}

export default function NotebookEditTool({ tool }: NotebookEditToolProps) {
  const input = tool.parsedInput as NotebookEditInput;

  if (!input) {
    return (
      <div className="my-0.5">
        <ToolHeader tool={tool} toolName={tool.name} />
      </div>
    );
  }

  const editMode = input.edit_mode || 'replace';
  const cellType = input.cell_type || 'code';

  const collapsedContent = (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToolHeader tool={tool} toolName={tool.name} />
      <FilePath path={input.notebook_path} />
      {input.cell_id && (
        <span className="text-[10px] text-neutral-500 dark:text-neutral-500">
          cell: {input.cell_id}
        </span>
      )}
    </div>
  );

  const expandedContent = (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="rounded border border-purple-200/50 bg-purple-50/50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
          {cellType}
        </span>
      </div>

      {editMode !== 'delete' && (
        <pre className="overflow-x-auto rounded bg-neutral-100/50 px-2 py-1 font-mono text-sm break-words whitespace-pre-wrap text-neutral-600 dark:bg-neutral-950/50 dark:text-neutral-300">
          {input.new_source || ''}
        </pre>
      )}
    </div>
  );

  return <CollapsibleTool collapsedContent={collapsedContent} expandedContent={expandedContent} />;
}
