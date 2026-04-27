import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { ConfigSource } from '@/electron';

type PathInfo = {
  platform: string;
  pathSeparator: string;
  pathEntries: string[];
  pathCount: number;
  fullPath: string;
};

type EnvVar = { key: string; value: string };

type DiagnosticMetadata = {
  appVersion: string;
  electronVersion: string;
  chromiumVersion: string;
  v8Version: string;
  nodeVersion: string;
  claudeAgentSdkVersion: string;
  platform: string;
  arch: string;
  osRelease: string;
  osType: string;
  osVersion: string;
};

export interface DebugSettingsState {
  debugMode: boolean;
  debugModeSource: ConfigSource;
  isLoadingDebugMode: boolean;
  isSavingDebugMode: boolean;
  floatingNavEnabled: boolean;
  floatingNavSource: ConfigSource;
  isSavingFloatingNav: boolean;
  isDebugExpanded: boolean;
  pathInfo: PathInfo | null;
  isLoadingPathInfo: boolean;
  envVars: EnvVar[] | null;
  isLoadingEnvVars: boolean;
  diagnosticMetadata: DiagnosticMetadata | null;
  isLoadingDiagnosticMetadata: boolean;
}

export interface DebugSettingsActions {
  setIsDebugExpanded: Dispatch<SetStateAction<boolean>>;
  handleToggleDebugMode: () => Promise<void>;
  handleToggleFloatingNav: () => Promise<void>;
  loadPathInfo: () => Promise<void>;
  loadEnvVars: () => Promise<void>;
  loadDiagnosticMetadata: () => Promise<void>;
}

export function useDebugSettings(): DebugSettingsState & DebugSettingsActions {
  const [debugMode, setDebugMode] = useState(false);
  const [debugModeSource, setDebugModeSource] = useState<ConfigSource>('default');
  const [isLoadingDebugMode, setIsLoadingDebugMode] = useState(true);
  const [isSavingDebugMode, setIsSavingDebugMode] = useState(false);

  const [floatingNavEnabled, setFloatingNavEnabled] = useState(true);
  const [floatingNavSource, setFloatingNavSource] = useState<ConfigSource>('default');
  const [, setIsLoadingFloatingNav] = useState(true);
  const [isSavingFloatingNav, setIsSavingFloatingNav] = useState(false);

  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [pathInfo, setPathInfo] = useState<PathInfo | null>(null);
  const [isLoadingPathInfo, setIsLoadingPathInfo] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[] | null>(null);
  const [isLoadingEnvVars, setIsLoadingEnvVars] = useState(false);
  const [diagnosticMetadata, setDiagnosticMetadata] = useState<DiagnosticMetadata | null>(null);
  const [isLoadingDiagnosticMetadata, setIsLoadingDiagnosticMetadata] = useState(false);

  useEffect(() => {
    // Load current debug mode with source
    window.electron.config
      .getDebugMode()
      .then((response) => {
        setDebugMode(response.debugMode);
        setDebugModeSource(response.source);
        setIsLoadingDebugMode(false);
      })
      .catch(() => {
        setIsLoadingDebugMode(false);
      });

    // Load floating nav setting with source
    window.electron.config
      .getFloatingNav()
      .then((response) => {
        setFloatingNavEnabled(response.enabled);
        setFloatingNavSource(response.source);
        setIsLoadingFloatingNav(false);
      })
      .catch(() => {
        setIsLoadingFloatingNav(false);
      });
  }, []);

  const loadPathInfo = async () => {
    setIsLoadingPathInfo(true);
    try {
      const info = await window.electron.config.getPathInfo();
      setPathInfo(info);
    } catch {
      // Ignore errors
    } finally {
      setIsLoadingPathInfo(false);
    }
  };

  const loadEnvVars = async () => {
    setIsLoadingEnvVars(true);
    try {
      const response = await window.electron.config.getEnvVars();
      setEnvVars(response.envVars);
    } catch {
      // Ignore errors
    } finally {
      setIsLoadingEnvVars(false);
    }
  };

  const loadDiagnosticMetadata = async () => {
    setIsLoadingDiagnosticMetadata(true);
    try {
      const metadata = await window.electron.config.getDiagnosticMetadata();
      setDiagnosticMetadata(metadata);
    } catch {
      // Ignore errors
    } finally {
      setIsLoadingDiagnosticMetadata(false);
    }
  };

  useEffect(() => {
    // Load path info, env vars, and diagnostic metadata when debug section is expanded
    if (isDebugExpanded) {
      if (!pathInfo) {
        void loadPathInfo();
      }
      if (!envVars) {
        void loadEnvVars();
      }
      if (!diagnosticMetadata) {
        void loadDiagnosticMetadata();
      }
    }
  }, [isDebugExpanded, pathInfo, envVars, diagnosticMetadata]);

  const handleToggleDebugMode = async () => {
    setIsSavingDebugMode(true);
    const newValue = !debugMode;
    const previousValue = debugMode;

    try {
      const response = await window.electron.config.setDebugMode(newValue);
      if (response.success) {
        setDebugMode(newValue);
        setDebugModeSource('project');
      } else {
        setDebugMode(previousValue);
      }
    } catch {
      setDebugMode(previousValue);
    } finally {
      setIsSavingDebugMode(false);
    }
  };

  const handleToggleFloatingNav = async () => {
    setIsSavingFloatingNav(true);
    const newValue = !floatingNavEnabled;
    const previousValue = floatingNavEnabled;

    try {
      const response = await window.electron.config.setFloatingNav(newValue);
      if (response.success) {
        setFloatingNavEnabled(newValue);
        setFloatingNavSource('project');
      } else {
        setFloatingNavEnabled(previousValue);
      }
    } catch {
      setFloatingNavEnabled(previousValue);
    } finally {
      setIsSavingFloatingNav(false);
    }
  };

  return {
    debugMode,
    debugModeSource,
    isLoadingDebugMode,
    isSavingDebugMode,
    floatingNavEnabled,
    floatingNavSource,
    isSavingFloatingNav,
    isDebugExpanded,
    pathInfo,
    isLoadingPathInfo,
    envVars,
    isLoadingEnvVars,
    diagnosticMetadata,
    isLoadingDiagnosticMetadata,
    setIsDebugExpanded,
    handleToggleDebugMode,
    handleToggleFloatingNav,
    loadPathInfo,
    loadEnvVars,
    loadDiagnosticMetadata
  };
}

