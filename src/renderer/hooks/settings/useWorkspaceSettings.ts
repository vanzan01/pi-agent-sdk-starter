import { useEffect, useState } from 'react';

import type { ConfigStatusResponse } from '@/electron';

export interface WorkspaceSettingsState {
  configStatus: ConfigStatusResponse | null;
  currentWorkspaceDir: string;
  workspaceDir: string;
  isLoadingWorkspace: boolean;
  isSavingWorkspace: boolean;
  workspaceSaveStatus: 'idle' | 'success' | 'error';
}

export interface WorkspaceSettingsActions {
  setWorkspaceDir: (value: string) => void;
  handleSaveWorkspace: () => Promise<void>;
  handleBrowseWorkspace: () => Promise<void>;
  reloadWorkspaceStatus: () => Promise<void>;
}

export function useWorkspaceSettings(): WorkspaceSettingsState & WorkspaceSettingsActions {
  const [configStatus, setConfigStatus] = useState<ConfigStatusResponse | null>(null);
  const [workspaceDir, setWorkspaceDir] = useState('');
  const [currentWorkspaceDir, setCurrentWorkspaceDir] = useState('');
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [workspaceSaveStatus, setWorkspaceSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );

  const reloadWorkspaceStatus = async () => {
    try {
      const workspaceResponse = await window.electron.config.getWorkspaceDir();
      setCurrentWorkspaceDir(workspaceResponse.workspaceDir);
      const configStatusResponse = await window.electron.config.getConfigStatus();
      setConfigStatus(configStatusResponse);
    } catch {
      // Ignore errors; caller will keep previous state
    }
  };

  useEffect(() => {
    // Load config status (project config info)
    window.electron.config
      .getConfigStatus()
      .then((response) => {
        setConfigStatus(response);
      })
      .catch(() => {
        // ignore - will use defaults
      });

    // Load current workspace directory
    window.electron.config
      .getWorkspaceDir()
      .then((response) => {
        setCurrentWorkspaceDir(response.workspaceDir);
        setIsLoadingWorkspace(false);
      })
      .catch(() => {
        setIsLoadingWorkspace(false);
      });
  }, []);

  const handleSaveWorkspace = async () => {
    setIsSavingWorkspace(true);
    setWorkspaceSaveStatus('idle');

    try {
      const response = await window.electron.config.setWorkspaceDir(workspaceDir);
      if (response.success) {
        setWorkspaceSaveStatus('success');
        setWorkspaceDir('');
        await reloadWorkspaceStatus();
        setTimeout(() => setWorkspaceSaveStatus('idle'), 2000);
      } else {
        setWorkspaceSaveStatus('error');
        setTimeout(() => setWorkspaceSaveStatus('idle'), 3000);
      }
    } catch {
      setWorkspaceSaveStatus('error');
      setTimeout(() => setWorkspaceSaveStatus('idle'), 3000);
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const handleBrowseWorkspace = async () => {
    try {
      const result = await window.electron.config.selectWorkspaceDir();
      if (result.success && result.path) {
        setWorkspaceDir(result.path);
      }
    } catch {
      // User canceled or error - ignore
    }
  };

  return {
    configStatus,
    currentWorkspaceDir,
    workspaceDir,
    isLoadingWorkspace,
    isSavingWorkspace,
    workspaceSaveStatus,
    setWorkspaceDir,
    handleSaveWorkspace,
    handleBrowseWorkspace,
    reloadWorkspaceStatus
  };
}

