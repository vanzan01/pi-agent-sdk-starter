import type { EmbeddedPiAgentPaths } from './pi-runtime-paths';

const PI_LOGIN_GUIDANCE_MARKER = 'Use /login to log into a provider via OAuth or API key.';

function getErrorText(error: unknown, fallback: string): string {
  return (
    error instanceof Error ? error.message
    : typeof error === 'string' ? error
    : fallback
  );
}

export function normalizePiSdkError(
  error: unknown,
  fallback: string,
  paths: EmbeddedPiAgentPaths
): string {
  const message = getErrorText(error, fallback);

  if (message.includes('No API key found for')) {
    const providerMatch = message.match(/No API key found for\s+"?([^".\n]+)"?/);
    const provider = providerMatch?.[1]?.trim() || 'the selected provider';
    return [
      `No credentials found for ${provider}.`,
      '',
      'This app uses its own embedded Pi runtime, so it does not read credentials from a global Pi CLI install.',
      `Auth file: ${paths.authPath}`,
      `Models file: ${paths.modelsPath}`,
      '',
      'Configure this provider through the app-owned models/provider flow before starting a session.'
    ].join('\n');
  }

  if (message.includes('No model selected') || message.includes('No models available')) {
    return [
      'No usable Pi model is configured for this app.',
      '',
      'This app uses its own embedded Pi runtime, so it needs credentials and model selection in the app-owned Pi store.',
      `Auth file: ${paths.authPath}`,
      `Models file: ${paths.modelsPath}`
    ].join('\n');
  }

  if (message.includes(PI_LOGIN_GUIDANCE_MARKER)) {
    return message
      .split(PI_LOGIN_GUIDANCE_MARKER)[0]
      .trim()
      .concat(
        '\n\n',
        'Configure providers through this app. The embedded Pi runtime uses:',
        '\n',
        `Auth file: ${paths.authPath}`,
        '\n',
        `Models file: ${paths.modelsPath}`
      );
  }

  return message;
}
