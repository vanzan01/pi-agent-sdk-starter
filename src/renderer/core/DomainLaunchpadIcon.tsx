import { Layers } from 'lucide-react';

import type { AppManifest } from '../../shared/apps';
import type { DomainConfig } from '../../shared/domains';

interface DomainLaunchpadIconProps {
  domain: DomainConfig;
  apps: AppManifest[];
  onClick: () => void;
}

export default function DomainLaunchpadIcon({ domain, apps, onClick }: DomainLaunchpadIconProps) {
  const primaryApp = apps.find((app) => app.id === domain.primaryAppId);
  const appCount = apps.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-3 rounded-2xl p-4 transition hover:bg-white/10 focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent focus:outline-none"
    >
      {/* Large icon container with color accent */}
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-[26px] shadow-lg transition-transform duration-200 group-hover:scale-105 group-hover:shadow-xl"
        style={{
          background: `linear-gradient(135deg, ${domain.color}30 0%, ${domain.color}10 100%)`,
          borderWidth: 2,
          borderColor: `${domain.color}50`
        }}
      >
        <Layers className="h-12 w-12" style={{ color: domain.color }} />

        {/* App count badge */}
        <span
          className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: domain.color }}
        >
          {appCount}
        </span>
      </div>

      {/* Domain name */}
      <div className="text-center">
        <span className="line-clamp-2 block max-w-[120px] text-sm leading-tight font-semibold text-white/90">
          {domain.name}
        </span>
        {primaryApp && (
          <span className="mt-1 block text-[10px] text-white/50">Opens: {primaryApp.name}</span>
        )}
      </div>
    </button>
  );
}
