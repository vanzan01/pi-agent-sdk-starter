// Export framework types - used by main process exporter and renderer UI

/**
 * Configuration for an export operation
 */
export interface ExportConfig {
  /** Name for the exported project (used in package.json and output folder) */
  projectName: string;
  /** Directory where the export will be created */
  outputDir: string;
  /** List of app IDs to include in the export */
  selectedAppIds: string[];
  /** Whether to generate a README.md */
  includeReadme?: boolean;
}

/**
 * A single file entry in the export preview
 */
export interface ExportFileEntry {
  /** Relative path from project root */
  path: string;
  /** Type of file for categorization */
  type: 'core' | 'app' | 'skill' | 'config';
  /** File size in bytes */
  size: number;
}

/**
 * Preview of what will be exported
 */
export interface ExportPreview {
  /** List of files that will be copied */
  files: ExportFileEntry[];
  /** Total size of all files in bytes */
  totalSize: number;
  /** Skills that will be included (derived from selected apps) */
  skills: string[];
}

/**
 * Progress update during export operation
 */
export interface ExportProgress {
  /** Unique identifier for this export job */
  jobId: string;
  /** Current status of the export */
  status: 'preparing' | 'copying' | 'generating' | 'zipping' | 'complete' | 'error' | 'cancelled';
  /** Number of files processed so far */
  current: number;
  /** Total number of files to process */
  total: number;
  /** Current file being processed */
  currentFile?: string;
  /** Error message if status is 'error' */
  error?: string;
  /** Path to output directory when complete */
  outputPath?: string;
  /** Path to zip file when complete */
  zipPath?: string;
}

/**
 * Result of starting an export
 */
export interface ExportStartResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

/**
 * Result of getting exportable apps
 */
export interface ExportableApp {
  id: string;
  name: string;
  description?: string;
  skills: string[];
}

/**
 * IPC response types
 */
export interface ExportGetAppsResponse {
  apps: ExportableApp[];
  error?: string;
}

export interface ExportPreviewResponse {
  success: boolean;
  preview?: ExportPreview;
  error?: string;
}

export interface ExportBrowseResponse {
  path?: string;
  cancelled: boolean;
}

export interface ExportCancelResponse {
  success: boolean;
  error?: string;
}
