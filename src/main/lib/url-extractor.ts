/**
 * URL Extraction Utility
 * Parses localhost URLs from agent's bash tool output
 */

export interface UrlExtractionResult {
  primaryUrl: string | null;
  allUrls: string[];
}

// Common dev server output patterns that indicate the primary URL
const PRIMARY_URL_INDICATORS = [
  // Vite
  /Local:\s*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  /Local:\s*(https?:\/\/127\.0\.0\.1[:\d]*[^\s]*)/i,
  // Next.js
  /Ready on\s*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  /started server on[^,]*,\s*url:\s*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  // Create React App / react-scripts
  /Local:\s*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  // Webpack Dev Server
  /Project is running at\s*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  /Loopback:\s*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  // Generic patterns
  /running at[:\s]*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  /listening on[:\s]*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  /listening at[:\s]*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  /server started[:\s]*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  /available at[:\s]*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  /open[:\s]*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  // Express / Node
  /Server running on[:\s]*(https?:\/\/localhost[:\d]*[^\s]*)/i,
  /Express server listening on port (\d+)/i,
  // Python
  /Running on[:\s]*(https?:\/\/127\.0\.0\.1[:\d]*[^\s]*)/i,
  /Serving Flask app/i,
  // 0.0.0.0 variants (convert to localhost)
  /Local:\s*(https?:\/\/0\.0\.0\.0[:\d]*[^\s]*)/i,
  /running at[:\s]*(https?:\/\/0\.0\.0\.0[:\d]*[^\s]*)/i
];

// General localhost URL pattern
const LOCALHOST_URL_PATTERN = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+[^\s)}\]"']*/gi;

// Express port pattern (special case - no full URL in output)
const EXPRESS_PORT_PATTERN = /(?:listening on|server running on|started on) port (\d+)/i;

/**
 * Normalize URL - convert 0.0.0.0 to localhost and clean up trailing characters
 */
function normalizeUrl(url: string): string {
  return url
    .replace(/0\.0\.0\.0/, 'localhost')
    .replace(/127\.0\.0\.1/, 'localhost')
    .replace(/[,;:]+$/, '') // Remove trailing punctuation
    .replace(/\)$/, ''); // Remove trailing parenthesis
}

/**
 * Extract localhost URLs from bash output
 * Returns the most likely primary URL and all found URLs
 */
export function extractLocalhostUrls(output: string): UrlExtractionResult {
  const allUrls: string[] = [];
  let primaryUrl: string | null = null;

  // First, try to find URLs with primary indicators (more specific patterns)
  for (const pattern of PRIMARY_URL_INDICATORS) {
    const match = output.match(pattern);
    if (match) {
      // Check if this is the Express port pattern (no URL, just port)
      if (pattern.source.includes('Express server listening on port')) {
        const port = match[1];
        primaryUrl = `http://localhost:${port}`;
      } else if (match[1]) {
        primaryUrl = normalizeUrl(match[1]);
      }
      break;
    }
  }

  // Check for Express-style port-only output
  if (!primaryUrl) {
    const portMatch = output.match(EXPRESS_PORT_PATTERN);
    if (portMatch && portMatch[1]) {
      primaryUrl = `http://localhost:${portMatch[1]}`;
    }
  }

  // Extract all localhost URLs from the output
  const urlMatches = output.match(LOCALHOST_URL_PATTERN);
  if (urlMatches) {
    for (const url of urlMatches) {
      const normalized = normalizeUrl(url);
      if (!allUrls.includes(normalized)) {
        allUrls.push(normalized);
      }
    }
  }

  // If we found URLs but no primary, use the first one
  if (!primaryUrl && allUrls.length > 0) {
    primaryUrl = allUrls[0];
  }

  // Ensure primary URL is in allUrls
  if (primaryUrl && !allUrls.includes(primaryUrl)) {
    allUrls.unshift(primaryUrl);
  }

  return { primaryUrl, allUrls };
}

/**
 * Check if output indicates a server has stopped/crashed
 */
export function detectServerStopped(output: string): boolean {
  const stopIndicators = [
    /server stopped/i,
    /server terminated/i,
    /SIGTERM/i,
    /SIGINT/i,
    /process exited/i,
    /killed/i,
    /shutting down/i,
    /goodbye/i,
    /server closed/i
  ];

  return stopIndicators.some((pattern) => pattern.test(output));
}
