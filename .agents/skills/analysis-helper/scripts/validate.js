#!/usr/bin/env node
// Analysis output validation script
// Returns: {"valid": true} or {"valid": false, "errors": [...]}

const analysis = process.argv[2];
const errors = [];

// Rule 1: Not empty
if (!analysis || analysis.length === 0) {
  errors.push('Analysis is empty');
} else {
  // Rule 2: Must have "Winner:" (plain text, not markdown)
  if (!analysis.includes('Winner:')) {
    if (analysis.includes('**Winner') || analysis.includes('*Winner')) {
      errors.push('Winner has markdown formatting - use plain "Winner:" without asterisks');
    } else {
      errors.push('Missing "Winner:" - start with "Winner: [headline]"');
    }
  }

  // Rule 3: Must have "Why it matters"
  if (!analysis.includes('Why it matters')) {
    if (analysis.includes('**Why') || analysis.includes('*Why')) {
      errors.push('Why it matters has markdown formatting - use plain text without asterisks');
    } else {
      errors.push('Missing "Why it matters:" section');
    }
  }

  // Rule 4: No markdown formatting
  if (analysis.includes('**') || analysis.includes('##') || analysis.includes('# ')) {
    errors.push('Contains markdown formatting (**, ##, #) - use plain text only');
  }

  // Rule 5: No JSON wrapping
  if (
    analysis.trim().startsWith('{') ||
    analysis.includes('"winner"') ||
    analysis.includes('"Winner"')
  ) {
    errors.push('Output is JSON wrapped - output plain text only');
  }

  // Rule 6: No bullet points at start of lines
  const lines = analysis.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (
      trimmedLine.startsWith('- ') ||
      trimmedLine.startsWith('* ') ||
      trimmedLine.match(/^\d+\./)
    ) {
      errors.push('Contains bullet points or numbered lists - use plain prose');
      break;
    }
  }
}

// Output result
if (errors.length === 0) {
  console.log(JSON.stringify({ valid: true }));
  process.exit(0);
} else {
  console.log(JSON.stringify({ valid: false, errors }));
  process.exit(1);
}
