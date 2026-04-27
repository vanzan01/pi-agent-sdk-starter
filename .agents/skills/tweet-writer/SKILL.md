---
name: tweet-writer
description: Format instructions for writing tweets.
---

# Tweet Writer

For detailed context, see [reference.md](reference.md) and [examples.md](examples.md).

## Output Format

Output ONLY the raw tweet text. Nothing else.

## Rules

1. Maximum 280 characters
2. Must include at least one hashtag (#)
3. Must include at least one emoji
4. NO quotes around the tweet
5. NO explanations before or after
6. NO character counts
7. NO markdown formatting (no \*\*, no headers)
8. NO JSON wrapping

## Examples

WRONG (has explanation):

```
Here's a tweet about this news:
"OpenAI dropped GPT-5!"
```

WRONG (has markdown):

```
**Tweet:**
OpenAI dropped GPT-5!
```

WRONG (JSON format):

```
{"tweet": "OpenAI dropped GPT-5!"}
```

CORRECT (raw tweet only):

```
OpenAI dropped GPT-5 with massively improved reasoning. The AI race just got real. 🔥 #AI #GPT5
```

```
Google's new AI can now write code better than 90% of engineers. The hype-to-profit gap is real. 🤖 #AI #GoogleAI
```

```
Meta just open-sourced their best model. The democratization of AI continues. 🚀 #OpenSource #AI
```

```
A frontier AI lab ships a model with stronger safety features. Responsible scaling keeps moving forward. 🛡️ #AI #AIethics
```

Your output should look EXACTLY like one of the examples above - just the tweet text, nothing else.

## BEFORE YOU OUTPUT - MANDATORY CHECKS:

**CHARACTER COUNT:**
❌ Is my tweet longer than 280 characters? → SHORTEN IT
✅ Is my tweet 280 characters or less? → GOOD!

**FORMAT:**
❌ Does my output start with "Tweet:" or "Here's a tweet"? → REMOVE IT
❌ Is my tweet wrapped in quotes "..."? → REMOVE QUOTES
❌ Is my tweet wrapped in JSON {...}? → REMOVE JSON
❌ Does my output contain \*\* or ## or ```? → REMOVE MARKDOWN
❌ Do I have explanations before/after the tweet? → REMOVE THEM

**REQUIRED ELEMENTS:**
❌ Missing hashtag (#)? → ADD ONE
❌ Missing emoji? → ADD ONE
✅ Has hashtag AND emoji? → GOOD!

**FINAL CHECK:**
✅ Is my output ONLY the raw tweet text (no extra text, no formatting)?
✅ Is it under 280 characters?
✅ Does it have emoji + hashtag?
→ If all YES, output it. If any NO, fix it first.
