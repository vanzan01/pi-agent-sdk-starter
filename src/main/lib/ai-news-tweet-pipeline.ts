import { readFile } from 'fs/promises';
import { join } from 'path';
import type { BrowserWindow } from 'electron';
import { runSingleAgentCall } from './claude-session';
import { getWorkspaceDir } from './config';
import { loadSkillYaml, type SkillMetadata } from './utils/load-skill';

const APP_ID = 'ai-news-tweet';

// ============================================================================
// Types & State
// ============================================================================

export type AiNewsTweetStage = 'idle' | 'research' | 'analysis' | 'writer';

export interface AiNewsTweetPipelineState {
  runId: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  currentStage: AiNewsTweetStage;
  logs: string[];
  tweetCandidate?: string;
  error?: string;
  agentResults: {
    research?: string;
    analysis?: string;
    writer?: string;
  };
}

const pipelineRuns = new Map<string, AiNewsTweetPipelineState>();

export function getPipelineStatus(runId: string): AiNewsTweetPipelineState | undefined {
  return pipelineRuns.get(runId);
}

// ============================================================================
// Constants & Configuration
// ============================================================================

const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelayMs: 2000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

const CLEANUP_DELAY_MS = 1000 * 60 * 60; // 1 hour

type AgentId = 'research' | 'analysis' | 'writer';

const MARKERS: Record<AgentId, { start: string; end: string }> = {
  research: { start: '<<<researcher>>>', end: '<<<end-researcher>>>' },
  analysis: { start: '<<<analysis>>>', end: '<<<end-analysis>>>' },
  writer: { start: '<<<writer>>>', end: '<<<end-writer>>>' }
};

// ============================================================================
// Helpers
// ============================================================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadAgentDefinition(agentId: string): Promise<string> {
  const workspaceDir = getWorkspaceDir();
  // Map generic id to file name: research -> researcher.md
  const fileName = agentId === 'research' ? 'researcher' : agentId;
  const agentPath = join(workspaceDir, '.agents', 'agents', 'ai-news-tweet', `${fileName}.md`);
  
  try {
    const content = await readFile(agentPath, 'utf-8');
    return content.replace(/^---[\s\S]*?---\n*/, '').trim();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load agent definition for ${agentId}: ${msg}`);
  }
}

function buildSkillPrompt(skillMeta: SkillMetadata): string {
  const skillDir = `.agents/skills/${skillMeta.name}`;
  return `--- AVAILABLE SKILL: ${skillMeta.name} ---
Description: ${skillMeta.description}
Documentation: ${skillDir}/SKILL.md
Reference: ${skillDir}/reference.md (if you need deeper detail)
${skillMeta.allowedTools ? `Allowed Tools: ${skillMeta.allowedTools.join(', ')}` : ''}

You MUST Read ${skillDir}/SKILL.md to understand how to use this skill.
--- END SKILL ---`;
}

function wrapWithMarkers(agentId: AgentId, basePrompt: string): string {
  const marker = MARKERS[agentId];
  return `${basePrompt}` +
`
CRITICAL OUTPUT REQUIREMENT - YOU MUST FOLLOW THIS:
Your ENTIRE final output MUST be wrapped in these exact markers:

${marker.start}
[your content here]
${marker.end}

WITHOUT these markers, your output will NOT be captured. This is NON-NEGOTIABLE.
Place markers OUTSIDE any JSON, text, or other content you produce.`;
}

function extractContentFromMarkers(output: string, agentId: AgentId): string | null {
  const marker = MARKERS[agentId];
  const startIdx = output.lastIndexOf(marker.start);
  const endIdx = output.lastIndexOf(marker.end);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return null;
  }

  return output.slice(startIdx + marker.start.length, endIdx).trim();
}

// ============================================================================
// Validation Logic (MATCHING TEST SCRIPT)
// ============================================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isValidDateString(dateStr: string): { valid: boolean; error?: string } {
  if (dateStr === 'unknown') {
    return { valid: true };
  }

  const formatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!formatRegex.test(dateStr)) {
    return {
      valid: false,
      error: `Invalid format "${dateStr}" (expected YYYY-MM-DD or "unknown")`
    };
  }

  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { valid: false, error: `Invalid calendar date "${dateStr}"` };
  }

  return { valid: true };
}

function validateResearch(researchOutput: string): ValidationResult {
  const jsonMatch = researchOutput.match(/```json\s*([\s\S]*?)\s*```/);
  let jsonStr = '';
  
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Fallback: try to find first { and last }
    const first = researchOutput.indexOf('{');
    const last = researchOutput.lastIndexOf('}');
    if (first !== -1 && last > first) {
      jsonStr = researchOutput.slice(first, last + 1);
    } else {
      return { valid: false, errors: ['No JSON block found in output'] };
    }
  }

  let research;
  try {
    research = JSON.parse(jsonStr);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { valid: false, errors: [`Invalid JSON: ${msg}`] };
  }

  const items = research.items || research.news_items;
  if (!items || !Array.isArray(items)) {
    return { valid: false, errors: ['Missing or invalid items/news_items array'] };
  }

  const errors: string[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const date = item.published_at;

    if (!date) {
      errors.push(`Item ${i + 1}: Missing published_at`);
      continue;
    }

    const dateVal = isValidDateString(date);
    if (!dateVal.valid) {
      errors.push(`Item ${i + 1}: ${dateVal.error}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

function validateAnalysis(analysisOutput: string): ValidationResult {
  const winnerMatch = analysisOutput.match(/Winner:\s*(.+)/);
  const whyMatch = analysisOutput.match(/Why it matters:\s*(.+)/);

  if (!winnerMatch || !whyMatch) {
    return { valid: false, errors: ['Analysis output missing required fields (Winner/Why it matters)'] };
  }

  return { valid: true, errors: [] };
}

function validateTweet(tweetOutput: string): ValidationResult {
  const tweet = tweetOutput.trim();

  if (tweet.length === 0) {
    return { valid: false, errors: ['Tweet is empty'] };
  }

  if (tweet.length > 280) {
    return { valid: false, errors: [`Tweet too long: ${tweet.length} characters (max 280)`] };
  }

  if (!tweet.match(/#\w+/)) {
    // Warning in test, but lets enforce it here or just log warning
    // Returning error to be safe/strict
    return { valid: false, errors: ['Tweet missing hashtag'] };
  }

  return { valid: true, errors: [] };
}

// ============================================================================
// Pipeline Logic
// ============================================================================

export type ModelType = 'fast' | 'smart' | 'deep';

export async function runAiNewsTweetPipeline(
  mainWindow: BrowserWindow | null,
  options: {
    runId: string;
    stageModels?: { research?: ModelType; analysis?: ModelType; writer?: ModelType };
  }
): Promise<void> {
  const { runId, stageModels } = options;
  const todayStr = new Date().toISOString().split('T')[0];

  // Initialize state
  pipelineRuns.set(runId, {
    runId,
    status: 'running',
    currentStage: 'research',
    logs: [`Pipeline started at ${new Date().toLocaleTimeString()}`],
    agentResults: {}
  });

  const state = pipelineRuns.get(runId)!;

  try {
    // -----------------------------------------------------------------------
    // STAGE 1: RESEARCH
    // -----------------------------------------------------------------------
    state.currentStage = 'research';
    state.logs.push('Starting Stage 1: Research...');

    const researchPromptBody = await loadAgentDefinition('research');
    const newsToolsSkillMeta = await loadSkillYaml('news-tools');

    // Retry logic for Stage 1
    let researchOutput = '';
    let researchSuccess = false;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
        state.logs.push(`Retry ${attempt}/${RETRY_CONFIG.maxRetries} after ${delay}ms...`);
        await sleep(delay);
      }

      const retryInstructions = attempt > 0
        ? `

RETRY ATTEMPT ${attempt + 1} - CRITICAL REQUIREMENTS:
1. Read the skill file if you haven't already - follow its instructions EXACTLY
2. You MUST wrap your output in <<<researcher>>>...<<<end-researcher>>> markers
3. You MUST return valid JSON matching the skill's format
4. Dates MUST be in YYYY-MM-DD format or "unknown"
5. Use WebSearch to get real news - do NOT fabricate`
        : '';

      const systemPrompt = wrapWithMarkers(
        'research',
        `${researchPromptBody}${retryInstructions}

${buildSkillPrompt(newsToolsSkillMeta)}`
      );

      const result = await runSingleAgentCall(
        mainWindow,
        APP_ID,
        {
          systemPrompt,
          allowedTools: ['WebSearch', 'Read'],
          model: stageModels?.research || 'fast'
        },
        `Find today's most interesting AI news. Today is ${todayStr}. Return JSON with the news items.`
      );

      if (!result.success) {
        state.logs.push(`Researcher error: ${result.error}`);
        continue;
      }

      const content = extractContentFromMarkers(result.response, 'research');
      if (!content) {
        state.logs.push('No output captured from markers');
        continue;
      }

      const validation = validateResearch(content);
      if (!validation.valid) {
        state.logs.push(`Validation failed: ${validation.errors.join(', ')}`);
        continue;
      }

      researchOutput = content;
      researchSuccess = true;
      break;
    }

    if (!researchSuccess) {
      throw new Error('Stage 1 failed after retries');
    }

    state.agentResults.research = researchOutput;
    state.logs.push('Stage 1 complete');

    // -----------------------------------------------------------------------
    // STAGE 2: ANALYSIS
    // -----------------------------------------------------------------------
    state.currentStage = 'analysis';
    state.logs.push('Starting Stage 2: Analysis...');

    const analysisPromptBody = await loadAgentDefinition('analysis');
    const analysisSkillMeta = await loadSkillYaml('analysis-helper');

    const analysisSystemPrompt = wrapWithMarkers(
      'analysis',
      `${analysisPromptBody}

${buildSkillPrompt(analysisSkillMeta)}`
    );

    // Retry logic for Stage 2
    let analysisOutput = '';
    let analysisSuccess = false;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(1000);
      }

      const result = await runSingleAgentCall(
        mainWindow,
        APP_ID,
        {
          systemPrompt: analysisSystemPrompt,
          allowedTools: ['Read'],
          model: stageModels?.analysis || 'fast'
        },
        `Analyze this research and pick the most impactful story:

${researchOutput}`
      );

      if (!result.success) {
        state.logs.push(`Analysis error: ${result.error}`);
        continue;
      }

      const content = extractContentFromMarkers(result.response, 'analysis');
      if (!content) {
        state.logs.push('No output captured from markers');
        continue;
      }

      const validation = validateAnalysis(content);
      if (!validation.valid) {
        state.logs.push(`Validation failed: ${validation.errors.join(', ')}`);
        continue;
      }

      analysisOutput = content;
      analysisSuccess = true;
      break;
    }

    if (!analysisSuccess) {
      throw new Error('Stage 2 failed after retries');
    }

    state.agentResults.analysis = analysisOutput;
    state.logs.push('Stage 2 complete');

    // -----------------------------------------------------------------------
    // STAGE 3: WRITER
    // -----------------------------------------------------------------------
    state.currentStage = 'writer';
    state.logs.push('Starting Stage 3: Writer...');

    const writerPromptBody = await loadAgentDefinition('writer');
    const writerSkillMeta = await loadSkillYaml('tweet-writer');

    const writerSystemPrompt = wrapWithMarkers(
      'writer',
      `${writerPromptBody}

${buildSkillPrompt(writerSkillMeta)}`
    );

    // Parse analysis to get title/why for the prompt (as per test script prompt construction)
    const winnerMatch = analysisOutput.match(/Winner:\s*(.+)/);
    const whyMatch = analysisOutput.match(/Why it matters:\s*(.+)/);
    const winnerTitle = winnerMatch ? winnerMatch[1].trim() : '';
    const whyItMatters = whyMatch ? whyMatch[1].trim() : '';

    // Retry logic for Stage 3
    let writerOutput = '';
    let writerSuccess = false;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(1000);
      }

      const result = await runSingleAgentCall(
        mainWindow,
        APP_ID,
        {
          systemPrompt: writerSystemPrompt,
          allowedTools: ['Read'],
          model: stageModels?.writer || 'fast'
        },
        `Write a tweet about this:

Title: ${winnerTitle}
Why it matters: ${whyItMatters}`
      );

      if (!result.success) {
        state.logs.push(`Writer error: ${result.error}`);
        continue;
      }

      const content = extractContentFromMarkers(result.response, 'writer');
      if (!content) {
        state.logs.push('No output captured from markers');
        continue;
      }

      const validation = validateTweet(content);
      if (!validation.valid) {
        state.logs.push(`Validation failed: ${validation.errors.join(', ')}`);
        continue;
      }

      writerOutput = content;
      writerSuccess = true;
      break;
    }

    if (!writerSuccess) {
      throw new Error('Stage 3 failed after retries');
    }

    state.agentResults.writer = writerOutput;
    state.tweetCandidate = writerOutput;
    state.logs.push('Stage 3 complete');

    // -----------------------------------------------------------------------
    // COMPLETION
    // -----------------------------------------------------------------------
    state.status = 'complete';
    state.currentStage = 'idle';
    state.logs.push('Pipeline complete!');

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    state.status = 'error';
    state.error = msg;
    state.logs.push(`Pipeline failed: ${msg}`);
    console.error(`[ai-news-tweet] Pipeline failed:`, error);
  } finally {
    // Schedule cleanup to prevent memory leaks
    setTimeout(() => {
      if (pipelineRuns.has(runId)) {
        pipelineRuns.delete(runId);
        console.log(`[ai-news-tweet] Cleaned up run ${runId}`);
      }
    }, CLEANUP_DELAY_MS);
  }
}
