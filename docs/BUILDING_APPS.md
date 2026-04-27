# Building Your Own App

This guide walks you through creating a new app in the Claude Agent SDK Starter.

## Overview

Each app consists of three parts:
1. **Manifest** - Defines the app's ID, name, skills, and system prompt
2. **UI Component** - React component for the frontend
3. **Skills** - Optional skill definitions for the agent

## Step 1: Copy the Template

```bash
# Copy the app manifest
cp src/shared/apps/_template.ts src/shared/apps/my-app.ts

# Copy the UI component
cp -r src/renderer/apps/_template src/renderer/apps/my-app

# Copy the skills (optional)
cp -r .claude/skills/_template .claude/skills/my-app
```

## Step 2: Update the Manifest

Edit `src/shared/apps/my-app.ts`:

```typescript
import type { AppManifest } from './types';

export const myAppApp: AppManifest = {
  id: 'my-app',
  name: 'My Application',
  description: 'A brief description of what your app does',
  skills: ['my-app'],  // Skills this app can use
  rootRoute: '/apps/my-app',
  systemPrompt: 'You are a specialized assistant for...'
};
```

### Manifest Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier (lowercase, hyphens) |
| `name` | Yes | Display name shown in UI |
| `description` | No | Brief description |
| `skills` | No | Array of skill names to load |
| `rootRoute` | Yes | URL path for the app |
| `systemPrompt` | No | Custom system prompt for the agent |

## Step 3: Register the App

### Add to the Registry

Edit `src/shared/apps/registry.ts`:

```typescript
import { myAppApp } from './my-app';

const apps: AppManifest[] = [
  chatApp,
  aiNewsTweetApp,
  // Add your app here
  myAppApp,
];
```

### Add to the Router

Edit `src/renderer/apps/index.tsx`:

```typescript
import MyAppApp from './my-app';

// In getAppComponent():
export function getAppComponent(appId: string): React.ComponentType | null {
  switch (appId) {
    case 'chat':
      return ChatApp;
    case 'ai-news-tweet':
      return AiNewsTweetApp;
    case 'my-app':
      return MyAppApp;
    default:
      return null;
  }
}

// In AppRenderer():
export function AppRenderer({ appId }: { appId: string }) {
  switch (appId) {
    case 'chat':
      return <ChatApp />;
    case 'ai-news-tweet':
      return <AiNewsTweetApp />;
    case 'my-app':
      return <MyAppApp />;
    default:
      return <div>App not found</div>;
  }
}
```

## Step 4: Create the UI Component

Edit `src/renderer/apps/my-app/index.tsx`:

```typescript
import React from 'react';
import { useChat } from '@/hooks/useChat';

export default function MyAppApp() {
  const { messages, sendMessage, isLoading } = useChat('my-app');

  return (
    <div className="flex flex-col h-full">
      {/* Your UI here */}
    </div>
  );
}
```

The `useChat` hook provides:
- `messages` - Array of chat messages
- `sendMessage(text)` - Send a message to the agent
- `isLoading` - Whether the agent is processing
- `stopMessage()` - Stop the current response

## Step 5: Add Skills (Optional)

Create `.claude/skills/my-app/skill.md`:

```markdown
---
name: my-app
description: Skills for my application
tools: [Read, Write, Bash]
---

# My App Skill

Instructions for the agent when using this skill...
```

Skills can include:
- Custom instructions
- Allowed tools
- Script files (JavaScript or Python)

## Step 6: Run and Test

```bash
npm run dev
```

Navigate to your app in the sidebar. Test that:
1. The app loads without errors
2. Messages send and receive correctly
3. Skills work as expected

## Example: Minimal Chat App

Here's a complete minimal example:

**`src/shared/apps/hello-world.ts`:**
```typescript
import type { AppManifest } from './types';

export const helloWorldApp: AppManifest = {
  id: 'hello-world',
  name: 'Hello World',
  rootRoute: '/apps/hello-world',
  systemPrompt: 'You are a friendly assistant. Always greet the user warmly.'
};
```

**`src/renderer/apps/hello-world/index.tsx`:**
```typescript
import React, { useState } from 'react';
import { useChat } from '@/hooks/useChat';

export default function HelloWorldApp() {
  const { messages, sendMessage, isLoading } = useChat('hello-world');
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="p-4">
      <div className="space-y-4 mb-4">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === 'user' ? 'text-right' : ''}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say hello..."
          disabled={isLoading}
          className="border p-2 w-full"
        />
      </form>
    </div>
  );
}
```

## Tips

- **Keep manifests simple** - Start with just `id`, `name`, `rootRoute`
- **Use existing hooks** - `useChat` handles most agent communication
- **Copy working examples** - The `chat` app is a good reference
- **Test incrementally** - Add features one at a time

## Troubleshooting

### App doesn't appear in sidebar
- Check that you added it to `registry.ts`
- Verify the `id` matches everywhere

### Skills not loading
- Ensure skill name in manifest matches folder name
- Check `.claude/skills/your-skill/skill.md` exists

### TypeScript errors
- Run `npm run typecheck` to see detailed errors
- Check import paths are correct
