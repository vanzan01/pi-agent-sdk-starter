# Troubleshooting

## Skills not compiling

Ensure runtimes are downloaded:

```bash
node scripts/downloadRuntimeBinaries.js
```

## SQLite/native module errors

Rebuild native modules:

```bash
npm run postinstall
```

## ELECTRON_RUN_AS_NODE error

Remove the environment variable:

- Windows: System Properties → Environment Variables → Delete ELECTRON_RUN_AS_NODE
- Or run: `setx ELECTRON_RUN_AS_NODE ""`

## Build fails on Windows

Run as Administrator or enable Developer Mode.

## Runtime binaries won't download

Download manually from GitHub and place in `resources/`:

- Windows: `bun.exe`, `uv.exe`, `git-portable/`, `msys2/`
- macOS/Linux: `bun`, `uv`

## Claude Code CLI not authenticated

Run:

```bash
claude-code auth
```

Then follow the prompts to log in.

## Agent not responding

1. Check Claude Code CLI is working: `claude-code --version`
2. Verify your subscription is active
3. Check network connectivity
