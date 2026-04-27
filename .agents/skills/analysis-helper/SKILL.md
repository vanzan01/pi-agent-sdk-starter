---
name: analysis-helper
description: Format instructions for news analysis output.
---

# Analysis Helper

## CRITICAL: Output Format

You receive JSON input, but you MUST output PLAIN TEXT (not JSON).

Your output MUST look EXACTLY like this:

```
Winner: [copy the exact title from input]
Why it matters: [2-3 sentences explaining significance]
```

## WRONG vs CORRECT

WRONG - JSON output (DO NOT DO THIS):

```json
{ "winner": { "title": "...", "why_it_matters": "..." } }
```

WRONG - Markdown:

```
**Winner:** Some headline
```

CORRECT - Plain text only:

```
Winner: OpenAI releases GPT-5
Why it matters: This is significant because it represents a major leap in AI capabilities.
```

## Rules

1. Output starts with `Winner:` (plain text, no asterisks)
2. Then `Why it matters:` (plain text, no asterisks)
3. NO JSON - do not output curly braces {} or square brackets []
4. NO markdown - do not use \*\* or ## or ` or \_
5. NO code blocks - do not wrap output in ```
6. Just two lines of plain text

## BEFORE YOU OUTPUT - CHECK:

❌ Does my output contain { or } or [ or ]? → REMOVE THEM
❌ Does my output contain \*\* or ## or ``? → REMOVE THEM
❌ Does my output start with anything other than "Winner:"? → FIX IT
❌ Is my output wrapped in code blocks ```? → REMOVE THE BLOCKS
✅ Is it EXACTLY: "Winner: [title]\nWhy it matters: [explanation]"? → GOOD!
