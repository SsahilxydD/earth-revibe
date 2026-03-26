/**
 * Nightly codebase scan using Claude CLI.
 * Called by .github/workflows/nightly-scan.yml
 *
 * Uses `claude -p` (print mode) which works with a Claude subscription —
 * no API key needed.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

function safeRead(path, fallback = '(not available)') {
  try {
    if (!existsSync(path)) return fallback;
    const content = readFileSync(path, 'utf8');
    return content.length > 15_000 ? content.slice(0, 15_000) + '\n... [truncated]' : content;
  } catch {
    return fallback;
  }
}

const typecheckOutput = safeRead('/tmp/typecheck-output.txt');
const testOutput = safeRead('/tmp/test-output.txt');
const auditOutput = safeRead('/tmp/audit-output.txt');
const recentCommits = safeRead('/tmp/recent-commits.txt', 'No commits in last 24 hours');

const prompt = `You are a senior engineering lead performing a nightly health check on the "Earth Revibe" e-commerce monorepo.

The project is:
- apps/storefront (Next.js, customer-facing store)
- apps/admin (Next.js, admin dashboard)
- apps/api (Express 5, REST API with Prisma/PostgreSQL)
- packages/shared (Zod schemas, types)
- packages/db (Prisma client)
- India-only store, prices in INR

Analyze the following CI outputs and recent activity. Create a health report.

## Type Check / Lint Output
\`\`\`
${typecheckOutput}
\`\`\`

## Test Results
\`\`\`
${testOutput}
\`\`\`

## Security Audit
\`\`\`
${auditOutput}
\`\`\`

## Recent Commits (last 24h)
\`\`\`
${recentCommits}
\`\`\`

Your report should:
1. **Summary** — Overall health: HEALTHY, WARNING, or CRITICAL
2. **Type Errors** — List any type check failures with file paths
3. **Test Failures** — List any failing tests
4. **Security Vulnerabilities** — Flag high/critical CVEs that need action
5. **Risk Assessment** — Based on recent commits, flag any areas that might have introduced bugs
6. **Recommendations** — Top 3 actions to improve codebase health

If everything is clean, respond with just: "NO_ISSUES_FOUND"

Keep the report concise and actionable. Use markdown formatting.`;

writeFileSync('/tmp/claude-prompt.txt', prompt);

try {
  const report = execSync('cat /tmp/claude-prompt.txt | claude -p --output-format text', {
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 10 * 1024 * 1024,
  });

  writeFileSync('/tmp/scan-report.md', report.trim());
  console.log('Scan report written to /tmp/scan-report.md');
} catch (error) {
  console.error('Claude CLI failed:', error.message);
  writeFileSync('/tmp/scan-report.md', 'NO_ISSUES_FOUND');
  process.exit(1);
}
