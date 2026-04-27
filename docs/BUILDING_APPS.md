# Building Apps

This guide walks through adding a new app to the Pi SDK Starter Kit.

## App Parts

Each app usually has four parts:

1. **Manifest** - ID, name, skills, route, and system prompt.
2. **UI component** - React frontend for the app shell.
3. **Skills** - Optional reusable instructions and scripts under `.agents/skills`.
4. **Agents** - Optional app-scoped role prompts under `.agents/agents/<app-id>`.

## Step 1: Copy the Template

```bash
Copy-Item src/shared/apps/_template.ts src/shared/apps/my-app.ts
Copy-Item src/renderer/apps/_template src/renderer/apps/my-app -Recurse
Copy-Item .agents/skills/_template .agents/skills/my-app -Recurse
```

## Step 2: Update the Manifest

Edit `src/shared/apps/my-app.ts`:

```typescript
import type { AppManifest } from './types';

export const myAppApp: AppManifest = {
  id: 'my-app',
  name: 'My Application',
  description: 'A brief description of what your app does',
  skills: ['my-app'],
  rootRoute: '/apps/my-app',
  systemPrompt: 'You are a specialized assistant for...'
};
```

## Step 3: Register the App

Add the manifest to `src/shared/apps/registry.ts`:

```typescript
import { myAppApp } from './my-app';

const apps: AppManifest[] = [
  chatApp,
  aiNewsTweetApp,
  myAppApp
];
```

Add the renderer to `src/renderer/apps/index.tsx`:

```typescript
import MyAppApp from './my-app';

export function getAppComponent(appId: string): React.ComponentType | null {
  switch (appId) {
    case 'my-app':
      return MyAppApp;
    default:
      return null;
  }
}
```

## Step 4: Create the UI

Edit `src/renderer/apps/my-app/index.tsx`:

```typescript
import { useState } from 'react';

import { usePiChat } from '@/hooks/usePiChat';

export default function MyAppApp() {
  const { messages, setMessages, isLoading, setIsLoading } = usePiChat('my-app');
  const [input, setInput] = useState('');

  return (
    <div className="flex h-full flex-col">
      {/* Build your app UI here. */}
    </div>
  );
}
```

## Step 5: Add Skills

Create `.agents/skills/my-app/SKILL.md`:

```markdown
---
name: my-app
description: Skills for my application
allowed-tools: Read, Write, Bash
---

# My App Skill

Instructions for the agent when using this skill.
```

Skills can include markdown instructions, reference files, examples, and scripts. TypeScript scripts under `scripts/` are compiled into `out/.agents/skills` by `scripts/buildSkills.js`.

## Step 6: Add Agents

For app-scoped agents, create `.agents/agents/my-app/reviewer.md`:

```markdown
---
name: reviewer
description: Reviews outputs for correctness
tools: Read, Grep
model: smart
---

You review the current app output and identify concrete issues.
```

Agent files are discovered from `.agents/agents/<app-id>/*.md`.

## Step 7: Run and Test

```bash
bun run dev
bun run typecheck
```

Verify the app appears in the launcher, messages stream correctly, requested skills are available, and any app-specific agents are discovered.

## Troubleshooting

- If the app does not appear, verify it is registered in `src/shared/apps/registry.ts`.
- If skills are missing, verify the manifest skill names match folders in `.agents/skills`.
- If agents are missing, verify markdown files exist under `.agents/agents/<app-id>`.
- If generated skills are stale, run `bun scripts/buildSkills.js`.
