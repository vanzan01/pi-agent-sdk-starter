---
name: news-tools
description: Utilities for fetching and structuring AI news items for multi-agent pipelines. Use when gathering AI headlines, analyzing news, or crafting tweets in the ai-news-tweet app.
allowed-tools: WebSearch
license: MIT
---

# Overview

`news-tools` is the **AI news skill** for the `ai-news-tweet` app.
It provides the capability to fetch **real, current AI news** using WebSearch.

- Primary user: the **researcher** subagent in `ai-news-tweet`.
- Primary output: structured JSON with AI news items that downstream agents can analyse and rephrase.

When you need AI news in this app, you should **always use WebSearch to get real news from TODAY ONLY.**

# CRITICAL: Today's Date Only

**ONLY include news published TODAY.** Do NOT include articles from yesterday or earlier.

- If the search returns older articles, REJECT them
- Only articles with `published_at` matching today's date are valid
- If no news from today is found, say so - do NOT use older articles

# How the Agent Should Use This Skill

When the user asks for AI news or when you are running inside the `ai-news-tweet` pipeline:

1. **Use WebSearch to get TODAY's news ONLY.**
   - Search for: "AI news today [current date]" or "AI news [YYYY-MM-DD]"
   - Get actual headlines from real sources
   - REJECT any articles not published today
   - Do NOT use your world knowledge or make up headlines

2. **Structure the results as JSON using this EXACT format:**

   ```json
   {
     "topic": "ai",
     "items": [
       {
         "title": "Google launches Gemini 3 and Ironwood TPU for AI infrastructure",
         "summary": "Google unveiled Gemini 3 (requiring less prompting) and Ironwood, 7th gen TPU for scaling massive models",
         "source": "CNBC",
         "url": "https://www.cnbc.com/2025/11/27/example-article.html",
         "published_at": "2025-11-27"
       }
     ]
   }
   ```

3. **Return 3-5 news items from TODAY.**
   - Focus on the most significant/interesting AI developments
   - `published_at` MUST be today's date in YYYY-MM-DD format
   - Use real URLs from the search

4. **IMPORTANT: Output Markers**
   - If your system prompt specifies output markers (like `<<<researcher>>>...<<<end-researcher>>>`), wrap your JSON output in those markers
   - The markers go OUTSIDE your JSON content

5. **If WebSearch fails or no news from today:**
   - Report the error clearly
   - Do NOT fabricate news as a fallback
   - Do NOT fall back to older articles

# Tools

## WebSearch

- Purpose: Fetch real AI news from TODAY
- Usage: Use the WebSearch tool with queries like:
  - "AI news today December 7 2025"
  - "artificial intelligence news 2025-12-07"
  - "latest AI developments today"
- Output: Real news articles with titles, summaries, sources, and URLs
- CRITICAL: Only include results published TODAY

# Pipeline Architecture

The `ai-news-tweet` app uses a 3-stage agent pipeline, each with its own specialized skill:

| Stage | Agent | Skill | Purpose |
|-------|-------|-------|---------|
| 1 | researcher | `news-tools` (this skill) | Fetch real AI news via WebSearch |
| 2 | analysis | `analysis-helper` | Pick most impactful story |
| 3 | writer | `tweet-writer` | Craft engaging tweet |

Each stage passes its output to the next via structured markers.
