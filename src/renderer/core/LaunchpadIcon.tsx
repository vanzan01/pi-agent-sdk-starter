import {
  Box,
  Code2,
  FileCode,
  FolderTree,
  Hammer,
  MessageSquare,
  Twitter,
  Users
} from 'lucide-react';

import type { AppManifest } from '../../shared/apps';

// Map icon names to Lucide components for Launchpad display
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'message-square': MessageSquare,
  'code-2': Code2,
  'folder-tree': FolderTree,
  twitter: Twitter,
  users: Users,
  'file-code': FileCode,
  hammer: Hammer
};

interface LaunchpadIconProps {
  app: AppManifest;
  onClick: () => void;
  isRecent?: boolean;
}

export default function LaunchpadIcon({ app, onClick, isRecent }: LaunchpadIconProps) {
  const IconComponent = app.icon ? iconMap[app.icon] || Box : Box;
  const isDark = app.layout?.theme === 'dark';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-2xl p-3 transition hover:bg-white/10 focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
    >
      {/* Large icon container */}
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-[22px] shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:shadow-xl ${
          isDark ?
            'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
          : 'bg-gradient-to-br from-white to-slate-100 text-slate-700'
        }`}
      >
        <IconComponent className="h-10 w-10" />

        {/* Recent indicator dot */}
        {isRecent && (
          <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
        )}
      </div>

      {/* App name */}
      <span className="line-clamp-2 max-w-[100px] text-center text-sm leading-tight font-medium text-white/90">
        {app.name}
      </span>
    </button>
  );
}
