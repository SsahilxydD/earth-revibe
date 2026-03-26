/**
 * Claude-powered PR code review using Claude CLI.
 * Called by .github/workflows/claude-review.yml
 *
 * Uses `claude -p` (print mode) which works with a Claude subscription —
 * no API key needed.
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const diff = readFileSync('/tmp/pr-diff.txt', 'utf8');
if (!diff.trim()) {
  console.log('Empty diff — nothing to review');
  process.exit(0);
}

// Truncate very large diffs to stay within token limits
const MAX_DIFF_CHARS = 80_000;
const truncatedDiff =
  diff.length > MAX_DIFF_CHARS
    ? diff.slice(0, MAX_DIFF_CHARS) + '\n\n... [diff truncated — too large for single review]'
    : diff;

const prTitle = process.env.PR_TITLE || '';
const prBody = (process.env.PR_BODY || '').slice(0, 2000);

const prompt = `You are a senior full-stack engineer reviewing a pull request for "Earth Revibe", an e-commerce monorepo with:
- apps/storefront (Next.js 16, React 19, Tailwind CSS 4)
- apps/admin (Next.js 16, React 19, Tailwind CSS 4)
- apps/api (Express 5, Prisma, PostgreSQL)
- packages/shared (Zod schemas, TypeScript types)
- packages/db (Prisma client)

PR Title: ${prTitle}
PR Description: ${prBody}

Review the following diff. Focus ONLY on real problems:
1. **Bugs** — logic errors, off-by-one, null/undefined issues, race conditions
2. **Security** — XSS, injection, auth bypass, exposed secrets, missing validation
3. **Performance** — N+1 queries, missing indexes, unnecessary re-renders, memory leaks
4. **Data integrity** — missing error handling, unchecked API responses, broken transactions

DO NOT flag:
- Style preferences (naming, formatting — that's ESLint/Prettier's job)
- Missing comments or documentation
- Minor suggestions that aren't actual problems

If the code looks good, say: "No significant issues found. LGTM!"

Format each issue as:
### [severity] File: path — Brief title
Description of the problem and suggested fix.

Where severity is: BUG, SECURITY, PERFORMANCE, or DATA_INTEGRITY

\`\`\`diff
${truncatedDiff}
\`\`\``;

// Write prompt to a temp file to avoid shell escaping issues
writeFileSync('/tmp/claude-prompt.txt', prompt);

try {
  const review = execSync('cat /tmp/claude-prompt.txt | claude -p --bare --output-format text', {
    encoding: 'utf8',
    timeout: 300_000, // 5 minute timeout
    maxBuffer: 10 * 1024 * 1024,
  });

  writeFileSync('/tmp/review.md', review.trim());
  console.log('Review written to /tmp/review.md');
} catch (error) {
  console.error('Claude CLI failed:', error.message);
  // Write a fallback so the workflow doesn't break
  writeFileSync(
    '/tmp/review.md',
    '⚠️ Claude review could not be generated. Check CI logs for details.'
  );
  process.exit(1);
}
