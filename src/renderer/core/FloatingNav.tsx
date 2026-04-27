import { Home, Maximize2, Minimize2, Package, Settings } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { LayoutMode } from '../../shared/apps';

interface FloatingNavProps {
  appName: string;
  onHome: () => void;
  onSettings: () => void;
  onExport?: () => void;
  onToggleMode?: () => void;
  layoutMode: LayoutMode;
  hoverEnabled?: boolean; // Default: true - when false, only keyboard shortcut works
}

export default function FloatingNav({
  appName,
  onHome,
  onSettings,
  onExport,
  onToggleMode,
  layoutMode,
  hoverEnabled = true
}: FloatingNavProps) {
  const [visible, setVisible] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Show nav when mouse is near top edge (only if hover is enabled)
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (pinned) return;
      if (!hoverEnabled) return; // Skip hover detection if disabled
      const nearTop = e.clientY < 20;
      setVisible(nearTop);
    },
    [pinned, hoverEnabled]
  );

  // Keyboard shortcut: Ctrl+H to toggle nav visibility
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'h') {
      e.preventDefault();
      setPinned((prev) => !prev);
      setVisible((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMouseMove, handleKeyDown]);

  // Compute displayed state: visible when either hovering or pinned
  const isDisplayed = visible || pinned;

  return (
    <div
      className={`fixed top-0 right-0 left-0 z-50 transition-transform duration-200 ${
        isDisplayed ? 'translate-y-0' : '-translate-y-full'
      }`}
      onMouseEnter={() => hoverEnabled && setVisible(true)}
      onMouseLeave={() => hoverEnabled && !pinned && setVisible(false)}
    >
      <div className="flex items-center justify-between bg-black/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onHome}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            title="Go to Home (Ctrl+H to toggle nav)"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </button>
        </div>

        <span className="text-sm font-medium text-white/70">{appName}</span>

        <div className="flex items-center gap-1">
          {onExport && (
            <button
              type="button"
              onClick={onExport}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              title="Export app"
            >
              <Package className="h-4 w-4" />
            </button>
          )}
          {onToggleMode && (
            <button
              type="button"
              onClick={onToggleMode}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              title={layoutMode === 'full-ui' ? 'Exit Full UI' : 'Enter Full UI'}
            >
              {layoutMode === 'full-ui' ?
                <Minimize2 className="h-4 w-4" />
              : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={onSettings}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
