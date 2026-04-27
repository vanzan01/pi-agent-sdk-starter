# Pi SDK Starter Kit

## Quick Start

```bash
bun run dev
bun run build
```

## Test Pipelines

```bash
bun run test:ai-news-tweet
bun run test:bypass-auth
bun run test:context-window
bun run test:context-window:bug
bun run test:export
```

## Project Structure

```text
.agents/
  agents/           # App-scoped agent definitions
  skills/           # Skill definitions with scripts
docs/               # Developer docs
scripts/            # Build, test, and runtime setup
src/
  main/             # Electron main process and Pi SDK session runner
  renderer/         # React frontend
  preload/          # IPC bridge
  shared/apps/      # App manifests
```

## Demo App: ai-news-tweet

Three-stage pipeline: researcher -> analyst -> writer.

| Component | Path |
| --- | --- |
| Agents | `.agents/agents/ai-news-tweet/` |
| Skills | `.agents/skills/news-tools/`, `.agents/skills/analysis-helper/`, `.agents/skills/tweet-writer/` |
| Test | `scripts/test-ai-news-tweet.ts` |

## Runtime Notes

- Pi SDK owns the agent runtime, tool execution, streaming, state, and provider routing.
- Codex is the default OAuth provider path.
- GLM/Z.AI is included as an OpenAI-compatible API-key provider example.
- Electron and React are the starter app shell, not the agent runtime.
- Project-local non-secret settings live in `.pi-sdk/config.json`.
- Provider secrets live in `.env`.

## Verification

```bash
bun run typecheck
bun run lint
bun run build
```
