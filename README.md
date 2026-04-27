# Pi SDK Starter Kit

[![Built with Pi SDK](https://img.shields.io/badge/Pi%20SDK-Starter%20Kit-00bcd4)](https://www.npmjs.com/package/@mariozechner/pi-coding-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> A batteries-included starter for building agentic desktop apps with Pi SDK, Codex, and OpenAI-compatible providers.

![Pi Starter SDK Overview](static/hero.jpg)

## Why This Exists

This starter demonstrates how to build real desktop agent apps without mixing the agent runtime, provider routing, and UI shell into one hard-to-change layer.

1. **Separate agent runtime from UI** - Pi SDK handles agents, tools, skills, streaming, state, and model routing.
2. **Support provider flexibility** - Use Codex OAuth or OpenAI-compatible API providers such as GLM.
3. **Ship useful app patterns** - The demo app shows a multi-stage agent workflow with scoped skills.
4. **Keep the starter practical** - Electron and React are the app shell, not the agent runtime.

## Demo: AI News Tweet Pipeline

The demo app runs a three-stage workflow: researcher -> analyst -> writer. Each stage has a focused prompt and the pipeline verifies marked outputs instead of trusting informal model claims.

![Pipeline Flow](static/pipeline_flow.png)

```bash
bun run test:ai-news-tweet
```

## Quick Start

**Prerequisites:**
- Node.js v18+
- Bun available on PATH, or use the bundled runtime after first setup
- Pi/Codex authentication for Codex, or a provider API key for OpenAI-compatible providers

```bash
bun install
bun run dev
```

For Codex, sign in through Pi:

```bash
pi
/login
```

Choose the Codex/OpenAI login path. For GLM or another OpenAI-compatible provider, configure the provider in Settings and add the required API key.

## Project Structure

```text
.agents/
  agents/ai-news-tweet/     # Agent definitions
  skills/                   # Skill definitions with scripts
docs/                       # Developer docs
scripts/                    # Build, test, and runtime setup scripts
src/
  main/                     # Electron main process and Pi SDK session runner
  renderer/                 # React frontend
  preload/                  # IPC bridge
  shared/apps/              # App manifests and registry
resources/                  # Runtime binaries downloaded on demand
```

Project-local settings are stored in `.pi-sdk/config.json`. Secrets stay in `.env`.

## Building Your Own App

1. Copy the `_template` app.
2. Add or reuse skills under `.agents/skills`.
3. Add app-specific agents under `.agents/agents/<app-id>` when needed.
4. Register the app manifest and route.
5. Run `bun run dev`.

See [docs/BUILDING_APPS.md](docs/BUILDING_APPS.md) for the full guide.

## Providers

The default provider path is Codex through Pi SDK OAuth. The starter also includes GLM/Z.AI as an OpenAI-compatible API-key provider example.

| Provider | Auth |
| --- | --- |
| Codex | Pi OAuth login |
| GLM/Z.AI | `GLM_API_KEY` in project `.env` or Settings |
| Other compatible providers | Add provider wiring and API-key settings |

Model IDs are configurable in Settings. Codex defaults use `gpt-5.4` for fast/smart and `gpt-5.5` for deep.

## Runtime Binaries

The app downloads local tooling on demand:

- **bun** - JavaScript runtime for skill scripts
- **uv** - Python package/runtime helper for Python-based skills
- **jq** - JSON utility
- **git + msys2** on Windows - Shell utilities used by agent tools

No global runtime install is required for packaged apps.

## Commands

```bash
bun run dev                    # Start dev mode
bun run build                  # Build for production
bun run typecheck              # Type check
bun run lint                   # Lint code
bun run test:ai-news-tweet     # Run pipeline smoke test
bun run test:bypass-auth       # Verify Pi/Codex auth
bun run test:context-window    # Verify expected context windows
bun run test:export            # Verify standalone export flow
```

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## License

MIT
