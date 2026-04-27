# Analysis Helper Examples

## Good Examples

### Example 1: Selecting from Multiple Items

**Input (research JSON):**

```json
{
  "items": [
    {
      "title": "OpenAI releases GPT-5 with revolutionary reasoning",
      "summary": "GPT-5 scores 90% on PhD science exams",
      "source": "TechCrunch"
    },
    {
      "title": "Google updates Bard with new features",
      "summary": "Minor UI improvements and faster responses",
      "source": "The Verge"
    },
    {
      "title": "AI startup raises $10M seed round",
      "summary": "New chatbot company gets funding",
      "source": "VentureBeat"
    }
  ]
}
```

**Good Output:**

```
Winner: OpenAI releases GPT-5 with revolutionary reasoning
Why it matters: This is a major capability leap - scoring 90% on PhD-level exams suggests GPT-5 has crossed a significant threshold in scientific reasoning. This could accelerate AI adoption in research, medicine, and engineering where complex reasoning is essential.
```

**Why this is correct:**

- GPT-5 release is clearly more impactful than UI updates or small funding
- "Why it matters" explains the significance with specifics
- Plain text format, no markdown

### Example 2: Business Impact Story

**Input:**

```json
{
  "items": [
    {
      "title": "Frontier AI lab raises $5B at $60B valuation",
      "summary": "Largest AI safety funding round ever",
      "source": "Bloomberg"
    },
    {
      "title": "New paper on transformer efficiency",
      "summary": "Researchers find 10% compute savings",
      "source": "arXiv"
    }
  ]
}
```

**Good Output:**

```
Winner: Frontier AI lab raises $5B at $60B valuation
Why it matters: This is a major funding round for an AI safety-focused company, signaling that responsible AI development has become a mainstream investment thesis.
```

### Example 3: Research Breakthrough

**Input:**

```json
{
  "items": [
    {
      "title": "DeepMind achieves AGI benchmark milestone",
      "summary": "First system to match humans across all test domains",
      "source": "Nature"
    }
  ]
}
```

**Good Output:**

```
Winner: DeepMind achieves AGI benchmark milestone
Why it matters: Matching human expert performance across all tested domains is a watershed moment in AI research. This suggests general-purpose AI capabilities are emerging faster than many predicted, with implications for everything from scientific discovery to economic productivity.
```

## Bad Examples

### Bad: Wrong Format (Markdown)

```
**Winner:** OpenAI releases GPT-5
**Why it matters:** This is significant...
```

❌ No asterisks - plain text only

### Bad: JSON Output

```
{
  "winner": "OpenAI releases GPT-5",
  "why": "This is significant..."
}
```

❌ Output plain text, not JSON

### Bad: Vague Explanation

```
Winner: OpenAI releases GPT-5
Why it matters: This is exciting news and will change things.
```

❌ Too vague - explain WHAT changes and HOW

### Bad: Made-up Headline

```
Winner: Revolutionary AI Breakthrough Transforms Everything
Why it matters: This changes the game completely.
```

❌ Winner must be EXACT headline from the research input

### Bad: Bullet Points

```
Winner: OpenAI releases GPT-5
Why it matters:
- Better reasoning
- Faster responses
- More accurate
```

❌ No bullets - use prose

## Selection Tips

When items seem equally important:

1. Prefer **breakthrough** over **incremental**
2. Prefer **confirmed** over **rumored**
3. Prefer **broad impact** over **niche**
4. Prefer **today's news** over **ongoing story**
