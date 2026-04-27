/**
 * Skill Loading Utilities
 *
 * Provides functions for loading skill content with different levels of disclosure:
 * - loadSkillYaml(): Level 1 - YAML frontmatter only (~50-100 tokens)
 * - loadSkillContent(): Level 2 - Full SKILL.md body (strips YAML, ~800-1500 tokens)
 *
 * Progressive disclosure pattern: Start with YAML metadata at startup,
 * let agent read SKILL.md and supporting files on demand.
 */

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { getWorkspaceDir } from '../config';

export interface SkillMetadata {
  name: string;
  description: string;
  allowedTools?: string[];
  license?: string;
}

/**
 * Load only the YAML frontmatter from a skill file.
 * This implements Level 1 progressive disclosure (~50-100 tokens).
 *
 * Use this for system prompts to minimize token usage at startup.
 * agent will read the full SKILL.md on demand when needed.
 */
export async function loadSkillYaml(skillName: string): Promise<SkillMetadata> {
  const workspaceDir = getWorkspaceDir();
  const skillPath = join(workspaceDir, '.agents', 'skills', skillName, 'SKILL.md');

  const content = await readFile(skillPath, 'utf-8').catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'Unknown error while loading skill definition';
    throw new Error(`Failed to load skill YAML: ${skillName} at ${skillPath}\n\nDetails: ${message}`);
  });

  // Extract YAML frontmatter only
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    throw new Error(`Skill ${skillName} missing YAML frontmatter in ${skillPath}`);
  }

  const yamlLines = frontmatterMatch[1].split(/\r?\n/);
  const metadata: Record<string, string> = {};

  for (const line of yamlLines) {
    const match = line.match(/^([\w-]+):\s*(.*)$/);
    if (match) {
      metadata[match[1]] = match[2].trim();
    }
  }

  return {
    name: metadata.name || skillName,
    description: metadata.description || '',
    allowedTools: metadata['allowed-tools']?.split(',').map(t => t.trim()),
    license: metadata.license
  };
}

/**
 * Load the full SKILL.md content, stripping the YAML frontmatter.
 * This implements Level 2 disclosure (~800-1500 tokens).
 *
 * Use this when you need to inject the full skill instructions into a prompt.
 * For progressive disclosure, prefer loadSkillYaml() and let agent read files.
 */
export async function loadSkillContent(skillName: string): Promise<string> {
  const workspaceDir = getWorkspaceDir();
  const skillPath = join(workspaceDir, '.agents', 'skills', skillName, 'SKILL.md');

  const content = await readFile(skillPath, 'utf-8').catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load skill ${skillName}: ${message}`);
  });

  // Strip YAML frontmatter, return body only
  return content.replace(/^---[\s\S]*?---\n*/, '').trim();
}

/**
 * Build a system prompt snippet with skill metadata for progressive disclosure.
 * agent will read the full SKILL.md and supporting files on demand.
 */
export function buildSkillPromptSnippet(skillMeta: SkillMetadata): string {
  const skillDir = `.agents/skills/${skillMeta.name}`;

  return `--- AVAILABLE SKILL: ${skillMeta.name} ---
Description: ${skillMeta.description}
Documentation: ${skillDir}/SKILL.md
Reference: ${skillDir}/reference.md (if you need deeper detail)
Examples: ${skillDir}/examples.md (if you need examples)
${skillMeta.allowedTools ? `Allowed Tools (informational): ${skillMeta.allowedTools.join(', ')}` : ''}

You can Read these files when you need them. Start with SKILL.md.
--- END SKILL ---`;
}
