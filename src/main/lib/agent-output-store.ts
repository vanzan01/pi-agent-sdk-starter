/**
 * Agent Output Store
 *
 * Stores agent outputs extracted from transcript stream in main process.
 * Keyed by "appId:agentId" for easy lookup.
 *
 * Enables apps to query stored agent data without interfering with source apps.
 */

interface StoredOutput {
  output: string;
  timestamp: number;
  appId: string;
  agentId: string;
}

const agentOutputStore = new Map<string, StoredOutput>();

// Track which markers we've already processed to avoid duplicates
const processedMarkers = new Set<string>();

/**
 * Store an agent output and return the data key.
 * @param appId - The app that produced the output (e.g., 'ai-news-tweet')
 * @param agentId - The agent/step identifier (e.g., 'researcher', 'analysis', 'writer')
 * @param output - The raw output content
 * @returns The data key for retrieving this output
 */
export function storeAgentOutput(appId: string, agentId: string, output: string): string {
  const dataKey = `${appId}:${agentId}`;
  agentOutputStore.set(dataKey, {
    output,
    timestamp: Date.now(),
    appId,
    agentId
  });
  console.log(`[agent-output-store] Stored output for ${dataKey} (${output.length} chars)`);
  return dataKey;
}

/**
 * Retrieve stored agent output by data key.
 * @param dataKey - The key in format "appId:agentId"
 * @returns The stored output or null if not found
 */
export function getAgentOutput(dataKey: string): string | null {
  const stored = agentOutputStore.get(dataKey);
  if (stored) {
    console.log(`[agent-output-store] Retrieved output for ${dataKey}`);
    return stored.output;
  }
  console.log(`[agent-output-store] No output found for ${dataKey}`);
  return null;
}

/**
 * Check if a marker has already been processed.
 * Used to avoid duplicate emissions when the same text appears in accumulator.
 */
export function isMarkerProcessed(markerHash: string): boolean {
  return processedMarkers.has(markerHash);
}

/**
 * Mark a marker as processed.
 */
export function markAsProcessed(markerHash: string): void {
  processedMarkers.add(markerHash);
}

/**
 * Clear processed markers (call when session resets).
 */
export function clearProcessedMarkers(): void {
  processedMarkers.clear();
}

/**
 * Get all stored outputs for an app.
 * @param appId - The app ID
 * @returns Array of stored outputs for that app
 */
export function getOutputsForApp(appId: string): StoredOutput[] {
  const results: StoredOutput[] = [];
  for (const [key, value] of agentOutputStore) {
    if (key.startsWith(`${appId}:`)) {
      results.push(value);
    }
  }
  return results;
}

/**
 * Clear old outputs to prevent memory growth.
 * @param maxAgeMs - Maximum age in milliseconds (default: 1 hour)
 */
export function clearOldOutputs(maxAgeMs: number = 3600000): void {
  const now = Date.now();
  let cleared = 0;
  for (const [key, value] of agentOutputStore) {
    if (now - value.timestamp > maxAgeMs) {
      agentOutputStore.delete(key);
      cleared++;
    }
  }
  if (cleared > 0) {
    console.log(`[agent-output-store] Cleared ${cleared} old outputs`);
  }
}

/**
 * Clear all outputs (call when session resets).
 */
export function clearAllOutputs(): void {
  agentOutputStore.clear();
  processedMarkers.clear();
  console.log('[agent-output-store] Cleared all outputs');
}
