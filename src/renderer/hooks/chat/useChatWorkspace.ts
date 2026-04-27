import { useEffect, useState } from 'react';

import type { ModelProvider } from '../../../shared/core';

interface UseChatWorkspaceOptions {
  onWorkspaceReset: () => void;
}

/**
 * Handles workspace directory loading and change notifications for Chat.
 * Keeps Chat.tsx focused on orchestration instead of IPC wiring.
 */
export function useChatWorkspace({
  onWorkspaceReset
}: UseChatWorkspaceOptions): { workspaceDir: string | null; provider: ModelProvider | null } {
  const [workspaceDir, setWorkspaceDir] = useState<string | null>(null);
  const [provider, setProvider] = useState<ModelProvider | null>(null);

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
      ({ workspaceDir: newWorkspaceDir, provider: newProvider }) => {
        setWorkspaceDir(newWorkspaceDir);
        setProvider(newProvider);
        onWorkspaceReset();
      }
    );
    return () => unsubscribe();
  }, [onWorkspaceReset]);

  useEffect(() => {
    let isMounted = true;
    window.electron.config
      .getProvider()
      .then(({ provider: loadedProvider }) => {
        if (isMounted && loadedProvider) {
          setProvider(loadedProvider);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return { workspaceDir, provider };
}
