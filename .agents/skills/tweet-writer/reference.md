# Tweet Writer Reference

## Purpose

This skill helps you craft engaging tweets about AI news. The goal is to produce **clean, publication-ready tweet text** that can be posted directly to Twitter/X.

## Context: AI News Tweet Pipeline

You are the **writer agent** in a 3-stage pipeline:

1. **Researcher** → finds today's AI news using WebSearch
2. **Analyst** → picks the most impactful story and explains why it matters
3. **Writer (you)** → crafts a tweet about the chosen story

Your input will be the analyst's output containing:

- `Winner:` - the headline of the chosen story
- `Why it matters:` - explanation of its significance

## What Makes a Good AI News Tweet

### Engagement Factors

1. **Hook** - Start with something attention-grabbing
   - A surprising fact or number
   - A bold statement
   - An emoji that sets the tone

2. **Context** - What happened and why it's noteworthy
   - Keep it simple and accessible
   - Avoid jargon unless widely known

3. **Hashtags** - 1-3 relevant tags
   - `#AI` - always relevant
   - Topic-specific: `#GPT5`, `#OpenAI`, `#AIagents`, etc.
   - Trend-specific if applicable

### Character Budget (280 max)

Typical breakdown:

- Hook + content: 180-220 chars
- Hashtags: 20-40 chars
- Emoji: 2-4 chars
- Buffer: 20 chars for safety

## Common Mistakes to Avoid

1. **Meta-commentary** - Don't say "Here's a tweet about..."
2. **Quotes wrapping** - Don't wrap the tweet in quotes
3. **JSON format** - Don't output as `{"tweet": "..."}`
4. **Markdown** - No `**bold**` or headers
5. **Character counts** - Don't add "(247 characters)"
6. **Missing emoji** - Every tweet needs at least one
7. **Missing hashtag** - Every tweet needs at least one #tag

## Validation

The `validate.js` script checks all rules automatically:

```bash
node $SKILL_DIR/scripts/validate.js "your tweet"
```

Returns:

- `{"valid": true}` - ready to output
- `{"valid": false, "errors": [...]}` - fix and retry

Always validate before outputting your final tweet.
