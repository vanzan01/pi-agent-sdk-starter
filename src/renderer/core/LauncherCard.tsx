import { Box, Code2, FileCode, FolderTree, MessageSquare, Twitter, Users } from 'lucide-react';

import type { AppManifest } from '../../shared/apps';

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'message-square': MessageSquare,
  'code-2': Code2,
  'folder-tree': FolderTree,
  twitter: Twitter,
  users: Users,
  'file-code': FileCode
};

interface LauncherCardProps {
  app: AppManifest;
  onClick: () => void;
  isRecent?: boolean;
}

export default function LauncherCard({ app, onClick, isRecent }: LauncherCardProps) {
  const IconComponent = app.icon ? iconMap[app.icon] : Box;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:border-slate-300 hover:shadow-md focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:outline-none"
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-2xl transition group-hover:scale-105 ${
          app.layout?.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
        }`}
      >
        {IconComponent && <IconComponent className="h-8 w-8" />}
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold text-slate-900">{app.name}</h3>
        {app.description && (
          <p className="line-clamp-2 text-xs text-slate-500">{app.description}</p>
        )}
      </div>
      {isRecent && (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Recent
        </span>
      )}
      {app.category && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          {app.category}
        </span>
      )}
    </button>
  );
}
