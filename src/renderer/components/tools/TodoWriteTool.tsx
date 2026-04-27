import { CheckCircle2, ChevronRight, Circle } from 'lucide-react';

import type { TodoWriteInput, ToolUseSimple } from '@/types/chat';

import { CollapsibleTool } from './CollapsibleTool';
import { ToolHeader } from './utils';

interface TodoWriteToolProps {
  tool: ToolUseSimple;
}

export default function TodoWriteTool({ tool }: TodoWriteToolProps) {
  const input = tool.parsedInput as TodoWriteInput;

  if (!input || !input.todos) {
    return (
      <div className="my-0.5">
        <ToolHeader tool={tool} toolName={tool.name} />
      </div>
    );
  }

  const completedCount = input.todos.filter((t) => t.status === 'completed').length;
  const totalCount = input.todos.length;

  const collapsedContent = (
    <div className="flex items-center gap-1.5">
      <ToolHeader tool={tool} toolName={tool.name} />
      <span className="text-[10px] text-neutral-500 dark:text-neutral-500">
        {completedCount}/{totalCount} completed
      </span>
    </div>
  );

  const expandedContent = (
    <div className="rounded border border-neutral-200/40 bg-neutral-50/30 px-2 py-1.5 dark:border-neutral-700/40 dark:bg-neutral-900/30">
      <div className="space-y-1">
        {input.todos.map((todo, index) => (
          <div key={index} className="flex items-start gap-1.5 text-sm">
            <span className="mt-0.5 flex-shrink-0">
              {todo.status === 'completed' ?
                <CheckCircle2 className="size-3 text-green-600 dark:text-green-500" />
              : todo.status === 'in_progress' ?
                <ChevronRight className="size-3 text-blue-600 dark:text-blue-500" />
              : <Circle className="size-3 text-neutral-400 dark:text-neutral-600" />}
            </span>
            <span
              className={`${
                todo.status === 'completed' ?
                  'text-neutral-500 line-through dark:text-neutral-500'
                : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {todo.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return <CollapsibleTool collapsedContent={collapsedContent} expandedContent={expandedContent} />;
}
