#!/usr/bin/env node
// Validates analysis output format
// Returns JSON: {"valid": true} or {"valid": false, "errors": [...]}

const input = process.argv[2];
const errors = [];

if (!input || input.trim().length === 0) {
  errors.push('Output is empty');
} else {
  // Rule 1: Must start with "Winner:"
  if (!input.startsWith('Winner:')) {
    errors.push('Must start with "Winner:" (not **Winner:** or Most Impactful Story:)');
  }

  // Rule 2: Must have "Why it matters:"
  if (!input.includes('Why it matters:')) {
    errors.push('Missing "Why it matters:" section');
  }

  // Rule 3: No markdown formatting
  if (input.includes('**')) {
    errors.push('Contains markdown ** - use plain text only');
  }

  // Rule 4: Winner line should have content
  const winnerMatch = input.match(/^Winner:\s*(.+)/);
  if (winnerMatch && winnerMatch[1].trim().length < 10) {
    errors.push('Winner headline seems too short');
  }
}

if (errors.length === 0) {
  console.log(JSON.stringify({ valid: true }));
  process.exit(0);
} else {
  console.log(JSON.stringify({ valid: false, errors }));
  process.exit(1);
}
