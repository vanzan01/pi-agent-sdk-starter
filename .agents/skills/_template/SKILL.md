---
name: template-skill
description: A minimal sample skill to demonstrate tool wiring for new apps.
license: MIT
---

# Tools

## summarize-file

- Purpose: Summarize a text/markdown file and extract TODO-style lines.
- Usage: `./scripts/summarize-file --path README.md --max-sentences 3`
- Output: JSON `{ file, summary: string[], todos: string[], stats: { words, characters, lines }, note? }`

# Build & Transparency

- This tool is compiled locally from `.Codex/skills/_template/scripts/summarize-file.ts` using Bun `--compile` into `out/.Codex/skills/_template/scripts/`.
- You can rebuild or run the TS directly with Bun to audit behavior.
