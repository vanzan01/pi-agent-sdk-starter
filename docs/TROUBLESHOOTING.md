# Troubleshooting

## Skills Do Not Compile

Run the asset build directly:

```bash
bun scripts/buildSkills.js
```

If runtime binaries are missing, run:

```bash
bun scripts/downloadRuntimeBinaries.js
```

## Native Module Errors

Rebuild native Electron modules:

```bash
bun run postinstall
```

## Pi/Codex Auth Fails

Confirm Pi can authenticate outside the app:

```bash
pi
/login
```

Choose the Codex/OpenAI login path. Then run:

```bash
bun run test:bypass-auth
```

## GLM Provider Fails

Set `GLM_API_KEY` in the project `.env` file or through Settings. If you changed provider settings while the app was running, start a new session so the Pi SDK runner uses the latest configuration.

## App Cannot Find Skills Or Agents

Check the source tree:

```bash
Get-ChildItem .agents -Recurse
```

Then rebuild generated assets:

```bash
bun scripts/buildSkills.js
```

The generated runtime assets should appear under `out/.agents`.

## Build Fails On Windows

Enable Windows Developer Mode or run the terminal with the permissions required by Electron Builder. Also verify the downloaded binaries exist under `resources/`.

## Runtime Binaries Do Not Download

Download the required binaries manually and place them in `resources/`:

- Windows: `bun.exe`, `uv.exe`, `jq.exe`, `git-portable/`, `msys2/`
- macOS/Linux: `bun`, `uv`, `jq`

## ELECTRON_RUN_AS_NODE Error

Remove the environment variable from the shell or system environment, then restart the terminal.
