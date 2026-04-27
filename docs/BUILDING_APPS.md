# Building Apps

This guide walks through adding a new app to the Pi SDK Starter Kit.

## App Parts

Each app usually has four parts:

1. **Manifest** - ID, name, route, system prompt, display metadata, and requested skills.
2. **UI component** - React frontend for the app shell.
3. **Skills** - Optional reusable instructions and scripts under `.agents/skills`.
4. **Agents** - Optional app-scoped role prompts under `.agents/agents/<app-id>`.

The `_template` app is the current reference implementation for a simple Pi SDK-backed app.

## Step 1: Copy the Template

```powershell
Copy-Item src/shared/apps/_template.ts src/shared/apps/my-app.ts
Copy-Item src/renderer/apps/_template src/renderer/apps/my-app -Recurse
Copy-Item .agents/skills/_template .agents/skills/my-app -Recurse
```

If the app needs app-scoped agent prompt files, create the agent directory:

```powershell
New-Item -ItemType Directory .agents/agents/my-app
```

## Step 2: Update the Manifest

Edit `src/shared/apps/my-app.ts`:

```typescript
import type { AppManifest } from './types';

export const myAppApp: AppManifest = {
  id: 'my-app',
  name: 'My Application',
  icon: 'file-code',
  skills: ['my-app'],
  rootRoute: '/apps/my-app',
  systemPrompt: 'You are a specialized assistant for My Application.',
  description: 'A brief description of what your app does',
  layout: {
    preferredMode: 'standard',
    theme: 'light'
  },
  category: 'demo',
  features: ['chat']
};
```

Common manifest fields are defined in `src/shared/apps/types.ts`. `hidden: true` keeps an app out of the launcher. `canRunInBackground` is manifest metadata for apps that support background behavior; it does not change renderer mounting by itself.

## Step 3: Register the App

Add the manifest to `src/shared/apps/registry.ts`:

```typescript
import { myAppApp } from './my-app';

const apps: AppManifest[] = [
  chatApp,
  aiNewsTweetApp,
  templateApp,
  myAppApp
];
```

Add the renderer to both switches in `src/renderer/apps/index.tsx`:

```tsx
import MyAppApp from './my-app';

export function getAppComponent(appId: string) {
  switch (appId) {
    case 'my-app':
      return MyAppApp;
    // existing cases...
    default:
      return null;
  }
}

export function AppRenderer({ appId, isPopout: _isPopout }: { appId: string; isPopout?: boolean }) {
  switch (appId) {
    case 'my-app':
      return <MyAppApp />;
    // existing cases...
    default:
      return null;
  }
}
```

`AppRenderer` is what the shell currently renders. If it does not include the new app, the route can resolve but the app body will be blank.

## Step 4: Create the UI

Edit `src/renderer/apps/my-app/index.tsx`.

For a custom app UI, wire directly to `window.electron.agent` so the component can send messages and receive Pi SDK stream events:

```tsx
import { useEffect, useState } from 'react';

const APP_ID = 'my-app';

type StreamEvent = { type: 'text' | 'thinking'; value: string };

export default function MyAppApp() {
  const [status, setStatus] = useState('Idle');
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);

  useEffect(() => {
    const appendEvent = (type: StreamEvent['type'], value: string) => {
      setStreamEvents((prev) => [...prev, { type, value }]);
    };

    const cleanups = [
      window.electron.agent.onMessageChunk(APP_ID, (chunk) => {
        setStatus('Streaming response');
        appendEvent('text', chunk);
      }),
      window.electron.agent.onThinkingChunk(APP_ID, ({ delta }) => {
        setStatus('Thinking');
        appendEvent('thinking', delta);
      }),
      window.electron.agent.onMessageComplete(APP_ID, () => setStatus('Response complete')),
      window.electron.agent.onMessageError(APP_ID, (error) => setStatus(`Error: ${error}`))
    ];

    return () => cleanups.forEach((cleanup) => cleanup?.());
  }, []);

  const sendMessage = async () => {
    setStatus('Sending message');
    setStreamEvents([]);

    await window.electron.agent.runConversation(APP_ID, {
      messages: [
        {
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'Hello from my new app.' }]
          },
          parent_tool_use_id: null,
          session_id: undefined
        }
      ]
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="text-sm text-slate-600">{status}</div>
      <button type="button" onClick={sendMessage} className="rounded-md bg-slate-900 px-3 py-2 text-white">
        Send
      </button>
      <div className="flex-1 overflow-auto rounded-md border border-slate-200 p-4">
        {streamEvents.map((event, index) => (
          <p key={`${event.type}-${index}`} className="text-sm">
            {event.value}
          </p>
        ))}
      </div>
    </div>
  );
}
```

`usePiChat` is only a stream-state helper. It does not send messages by itself, so a new custom app still needs to call `window.electron.agent.sendMessage`, `runConversation`, or `runSingleAgent`.

## Step 5: Add Skills

Create `.agents/skills/my-app/SKILL.md`:

```markdown
---
name: my-app
description: Skills for my application
allowed-tools: Read Write Bash
---

# My App Skill

Instructions for the agent when using this skill.
```

Skills can include markdown instructions, reference files, examples, assets, and scripts. TypeScript scripts under `scripts/` are compiled into `out/.agents/skills` by `scripts/buildSkills.js`.

At startup, the app syncs `out/.agents` into the configured workspace. Pi SDK skill discovery then happens from the workspace copy. The manifest `skills` list is used by the starter app to report requested/available/missing skill status. It does not, by itself, enforce Pi SDK tool availability.

## Step 6: Add Agents

For app-scoped agent prompt files, create `.agents/agents/my-app/reviewer.md`:

```markdown
---
name: reviewer
description: Reviews outputs for correctness
tools: Read, Grep
model: smart
---

You review the current app output and identify concrete issues.
```

Agent files are copied into `out/.agents/agents` by `scripts/buildSkills.js` and discovered from `.agents/agents/<app-id>/*.md`.

Discovery does not automatically execute these agents in a generic app. If an app needs a multi-agent workflow, add orchestration code that loads the prompt files and calls `window.electron.agent.runSingleAgent` or a main-process pipeline. The `ai-news-tweet` app is the current example of explicit multi-agent orchestration.

## Step 7: Run and Test

```powershell
bun run dev
bun run typecheck
bun run lint
```

Verify the app appears in the launcher, the app route renders a nonblank UI, messages stream through the Pi SDK bridge, requested skills are available in Settings, and any app-specific agent prompt files are copied into the workspace `.agents/agents/<app-id>` directory.

## Troubleshooting

- If the app does not appear, verify it is registered in `src/shared/apps/registry.ts` and is not marked `hidden: true`.
- If the route opens but the app body is blank, verify `src/renderer/apps/index.tsx` includes the app in `AppRenderer`.
- If messages do not stream, verify the listener `APP_ID` exactly matches the manifest `id`.
- If skills are missing, verify the manifest skill names match folders in `.agents/skills`, then run `bun run dev` or `bun scripts/buildSkills.js`.
- If agents are missing, verify markdown files exist under `.agents/agents/<app-id>` and rerun the build step that copies `.agents` into `out`.
