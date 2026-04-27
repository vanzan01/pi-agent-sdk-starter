import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

import { getAllApps } from '../../shared/apps';

type SkillInfo = {
  id: string;
  path: string;
};

const skillRoots = Array.from(
  new Set(
    [
      join(app.getAppPath(), 'out', '.claude', 'skills'),
      join(app.getAppPath(), '.claude', 'skills'), // fallback if running against source
      join(process.resourcesPath || process.cwd(), 'out', '.claude', 'skills'),
      join(process.cwd(), 'out', '.claude', 'skills')
    ].filter(Boolean)
  )
);

function discoverSkills(): SkillInfo[] {
  const skills: SkillInfo[] = [];
  for (const root of skillRoots) {
    if (!existsSync(root)) continue;
    const entries = readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      skills.push({
        id: entry.name,
        path: join(root, entry.name)
      });
    }
  }
  return skills;
}

function getDiscoveredSkills(): SkillInfo[] {
  // Discover on demand so dev/packaged changes are picked up without restart
  return discoverSkills();
}

export function getSkillsForApp(appId: string): string[] {
  const app = getAllApps().find((a) => a.id === appId);
  if (!app) return [];
  const discovered = getDiscoveredSkills();
  const allowed = app.skills.filter((s) => discovered.some((d) => d.id === s));
  const missing = app.skills.filter((s) => !allowed.includes(s));
  if (missing.length > 0) {
    console.warn(
      `App "${appId}" requested skills not built or missing in out/.claude/skills: ${missing.join(
        ', '
      )}`
    );
  }
  return allowed;
}

export function getSkillStatus(appId: string): {
  requested: string[];
  available: string[];
  missing: string[];
} {
  const app = getAllApps().find((a) => a.id === appId);
  if (!app) {
    return { requested: [], available: [], missing: [] };
  }
  const discovered = getDiscoveredSkills();
  const available = app.skills.filter((s) => discovered.some((d) => d.id === s));
  const missing = app.skills.filter((s) => !available.includes(s));
  return { requested: app.skills, available, missing };
}

export function getAllowedTools(appId: string): string[] {
  const skills = getSkillsForApp(appId);

  // ai-news-tweet: ONLY Skill tool - forces agent to load skill first
  // The skill's allowed-tools (WebSearch, Bash) grant access after Skill is called
  if (appId === 'ai-news-tweet') {
    return skills.length > 0 ? ['Skill'] : [];
  }

  const baseTools = ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch'];
  const skillTools = skills.length > 0 ? ['Skill'] : [];
  return [...baseTools, ...skillTools];
}
