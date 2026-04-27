import type { AppManifest } from './types';

export const templateApp: AppManifest = {
  id: '_template',
  name: 'Template App',
  icon: 'file-code',
  skills: ['_template'],
  rootRoute: '/apps/_template',
  systemPrompt:
    'You are a minimal template agent. Provide succinct answers and demonstrate how to call runAgent for new apps.',
  description: 'Starting point for creating new apps',
  layout: {
    preferredMode: 'standard',
    theme: 'light'
  },
  category: 'demo',
  hidden: true,
  features: ['chat']
};
