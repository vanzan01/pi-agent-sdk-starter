import type { AppManifest } from './types';

export const aiNewsTweetApp: AppManifest = {
  id: 'ai-news-tweet',
  name: 'AI News Tweet',
  icon: 'twitter',
  skills: ['news-tools', 'analysis-helper', 'tweet-writer'],
  rootRoute: '/apps/ai-news-tweet',
  description: 'Generate tweets from AI news using multi-agent pipeline',
  layout: {
    preferredMode: 'standard',
    theme: 'light'
  },
  category: 'demo',
  canRunInBackground: true, // Keep mounted for inter-app messaging & state persistence
  systemPrompt: [
    'You are a coordinator for a multi-agent news-to-tweet pipeline.',
    'Use the subagents researcher, analysis, and writer in strict sequence.',
    'The researcher uses WebSearch to find real, current AI news. Do not invent headlines.',
    'The analysis agent picks the most interesting item and explains why it matters.',
    'The writer produces the final tweet under 280 characters.',
    'If tools are unavailable or fail, explicitly say so and stop the pipeline instead of fabricating results.',
    'Stream output as soon as each subagent finishes, using the markers:',
    '<<<researcher>>> ... <<<end-researcher>>>',
    '<<<analysis>>> ... <<<end-analysis>>>',
    '<<<writer>>> ... <<<end-writer>>>',
    'Do not wait for all agents to finish before streaming; send each block as it is ready.',
    'Keep responses concise and factual.'
  ].join(' '),
  // Agents are loaded from .claude/agents/ai-news-tweet/*.md files
  features: ['chat', 'filesystem']
};
