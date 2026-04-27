import { useEffect, useState } from 'react';

interface UseChatWorkspaceOptions {
  onWorkspaceReset: () => void;
}

/**
 * Handles workspace directory loading and change notifications for Chat.
 * Keeps Chat.tsx focused on orchestration instead of IPC wiring.
 */
export function useChatWorkspace({ onWorkspaceReset }: UseChatWorkspaceOptions): {
  workspaceDir: string | null;
} {
  const [workspaceDir, setWorkspaceDir] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    window.electron.config
      .getWorkspaceDir()
      .then(({ workspaceDir: loadedDir }) => {
        if (isMounted) {
          setWorkspaceDir(loadedDir);
        }
      })
      .catch((error) => {
        console.error('Error loading workspace directory:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to workspace changes so UI state stays aligned
  useEffect(() => {
    const unsubscribe = window.electron.config.onWorkspaceChanged(
      ({ workspaceDir: newWorkspaceDir }) => {
        setWorkspaceDir(newWorkspaceDir);
        onWorkspaceReset();
      }
    );
    return () => unsubscribe();
  }, [onWorkspaceReset]);

  return { workspaceDir };
}
