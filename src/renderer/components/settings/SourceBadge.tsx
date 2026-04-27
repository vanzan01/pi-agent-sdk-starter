import type { ConfigSource } from '@/electron';
import { Folder, Settings2 } from 'lucide-react';

interface SourceBadgeProps {
  source: ConfigSource;
}

// Small badge indicating where a setting comes from (default, project, env)
export function SourceBadge({ source }: SourceBadgeProps) {
  const config = {
    default: {
      label: 'Default',
      className: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
    },
    project: {
      label: 'Project',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    },
    env: {
      label: 'Environment',
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    }
  };

  const { label, className } = config[source];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${className}`}
    >
      {source === 'project' && <Folder className="h-2.5 w-2.5" />}
      {source === 'env' && <Settings2 className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}
