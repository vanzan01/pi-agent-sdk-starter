import { useEffect } from 'react';

interface SettingsShortcutsProps {
  onBack: () => void;
}

// Handles keyboard shortcuts (e.g., Escape to close) for the Settings page.
export function useSettingsShortcuts({ onBack }: SettingsShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onBack]);
}
