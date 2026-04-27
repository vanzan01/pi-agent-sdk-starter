// AgentDefinition type from SDK - define locally to avoid import issues in shared code
export type AgentDefinition = {
  description: string;
  tools?: string[];
  prompt: string;
  model?: 'smart' | 'deep' | 'fast' | 'inherit';
};

// Layout mode: 'standard' shows sidebar, 'full-ui' hides sidebar for full window apps
export type LayoutMode = 'standard' | 'full-ui';

export type LayoutConfig = {
  preferredMode: LayoutMode; // Default layout when app opens
  allowModeToggle?: boolean; // User can toggle modes (default: true)
  providesOwnChrome?: boolean; // App handles own navigation (for full-ui apps)
  theme?: 'light' | 'dark' | 'system'; // App's theme preference
};

export type AppCategory = 'utility' | 'productivity' | 'development' | 'demo' | 'finance';

/**
 * Feature modules that can be included/excluded during export.
 * Apps declare which features they need, and the exporter only includes
 * the handlers, libs, components, and settings for those features.
 */
export type AppFeature =
  | 'chat' // Chat UI, conversation history, message handling
  | 'filesystem' // File system operations
  | 'shell' // Shell/terminal execution
  | 'project' // Project management
  | 'usage'; // Usage monitoring

export type AppManifest = {
  // Core fields
  id: string;
  name: string;
  icon?: string; // Icon name (lucide) or image path
  skills: string[];
  rootRoute: string;
  systemPrompt: string;
  agents?: Record<string, AgentDefinition>;

  // Layout and display
  description?: string; // Short description for launcher card
  coverImage?: string; // Hero image for launcher card (optional)
  layout?: LayoutConfig; // Layout preferences
  category?: AppCategory; // App category for grouping

  // Export and visibility
  exportable?: boolean; // Can be exported as standalone app
  hidden?: boolean; // Hide from launcher (e.g. _template)
  features?: AppFeature[]; // Required features for export optimization
  sharedDirs?: string[]; // Additional directories to include in export (e.g. ['src/shared/finance'])
  claudeAssets?: string[]; // Additional .agents assets to include (e.g. ['templates/my-template'])

  // Background behavior
  canRunInBackground?: boolean; // App CAN run in background (user must enable in Settings)
};
