# Ruflo Command Reference — Earth Revibe

Your daily cheat sheet for getting maximum output from Ruflo on this project.
All commands run from `c:/work/earth_revibe` unless noted.

---

## Setup & Status

| Command | What it does |
|---------|-------------|
| `ruflo --status` | Shows auth status, concurrency limit, and remaining API credits |
| `ruflo --version` | Confirms installed version |
| `ruflo mcp start` | Starts the MCP server so Ruflo tools appear in Claude Code sessions |
| `ruflo config validate` | Checks ruflo.config.json is valid and shows swarm summary |
| `ruflo --list` | Lists all 60+ available agents you can use |

---

## Running a Single Agent Task

Pattern: `ruflo --agent <agent> --task "<what you want done>"`

| Command | What it does |
|---------|-------------|
| `ruflo --agent architect --task "Design the referral program API endpoints"` | Gets an architecture plan with ADR before any code is written |
| `ruflo --agent coder --task "Implement the referral code generation service"` | Writes the implementation code |
| `ruflo --agent reviewer --task "Review the checkout flow implementation"` | Full code review: security, performance, style, correctness |
| `ruflo --agent tester --task "Write tests for the auth middleware"` | Generates unit + integration tests |
| `ruflo --agent security-architect --task "Audit the payment webhook handling"` | Deep security review, finds vulnerabilities |
| `ruflo --agent perf-analyzer --task "Profile the product listing API endpoint"` | Finds bottlenecks, suggests optimizations |

---

## Running an Agent in a Specific Swarm

Add `--swarm <swarm-name>` to target a specific app. This ensures the agent knows your codebase conventions for that app.

| Swarm | Use for |
|-------|---------|
| `--swarm storefront-swarm` | `apps/storefront` — Next.js customer-facing site |
| `--swarm admin-swarm` | `apps/admin` — Next.js admin dashboard |
| `--swarm api-swarm` | `apps/api` — Express REST API |
| `--swarm shared-swarm` | `packages/shared` and `packages/db` — Zod schemas, Prisma |

Example:
```bash
ruflo --agent coder --swarm api-swarm --task "Add bulk stock update endpoint"
ruflo --agent coder --swarm storefront-swarm --task "Add size guide modal to product page"
ruflo --agent coder --swarm admin-swarm --task "Add export to CSV button on orders table"
```

---

## Running a Multi-Agent Swarm on a Feature

Use `swarm init` + `task orchestrate` for larger tasks that need multiple agents working together.

```bash
# Step 1: initialize the swarm
ruflo swarm init --topology hierarchical

# Step 2: orchestrate a task (agents divide and conquer)
ruflo task orchestrate "Build the wishlist feature end-to-end"
```

For cross-app work (e.g. API + storefront together):
```bash
ruflo task orchestrate \
  "Add product reviews: API endpoints + storefront UI + admin moderation" \
  --strategy adaptive
```

---

## Spec-Driven Execution (Run a Full Phase Plan)

Use your existing `docs/plans/` phase files to drive autonomous multi-agent execution.

```bash
ruflo task orchestrate \
  --spec docs/plans/<filename>.md \
  --swarm <swarm> \
  --strategy adaptive
```

### Phase → Swarm Quick Reference

| Phase | Command |
|-------|---------|
| Phase 1 — Foundation | `--spec docs/plans/2026-03-05-phase1-foundation.md --swarm shared-swarm` |
| Phase 2 — API Core | `--spec docs/plans/2026-03-05-phase2-api-core.md --swarm api-swarm` |
| Phase 3 — Storefront Core | `--spec docs/plans/2026-03-05-phase3-storefront-core.md --swarm storefront-swarm` |
| Phase 4 — Admin Core | `--spec docs/plans/2026-03-05-phase4-admin-core.md --swarm admin-swarm` |
| Phase 5 — Cart & Checkout | `--spec docs/plans/2026-03-05-phase5-cart-checkout.md --swarm storefront-swarm` |
| Phase 6 — Admin Orders | `--spec docs/plans/2026-03-05-phase6-admin-orders-customers.md --swarm admin-swarm` |
| Phase 7 — User Features | `--spec docs/plans/2026-03-05-phase7-user-features.md --swarm storefront-swarm` |
| Phase 8 — Loyalty & Referrals | `--spec docs/plans/2026-03-05-phase8-loyalty-referrals.md --swarm api-swarm` |
| Phase 9 — Blog & Support | `--spec docs/plans/2026-03-05-phase9-blog-support.md --swarm admin-swarm` |
| Phase 10 — Analytics & SEO | `--spec docs/plans/2026-03-05-phase10-analytics-seo.md --swarm storefront-swarm` |
| Phase 11 — Testing & Security | `--spec docs/plans/2026-03-05-phase11-testing-security.md` (all swarms) |

---

## Quality & Maintenance (On-Demand)

Run these anytime — no swarm needed.

```bash
# Full security audit of the API (OWASP Top 10)
ruflo --agent security-architect --task "Audit apps/api for OWASP Top 10 vulnerabilities"

# Generate tests for a specific module
ruflo --agent tester --task "Write tests for apps/api/src/services/order.service.ts"

# Refactor safely
ruflo --agent coder --task "Refactor the cart service to use repository pattern"

# Check bundle size and performance
ruflo --agent perf-analyzer --task "Analyze storefront bundle size and find lazy-loading opportunities"

# Review a specific file before committing
ruflo --agent reviewer --task "Review apps/api/src/controllers/checkout.controller.ts"
```

---

## Intelligence & Learning

```bash
# Re-train Ruflo after adding many new files (run monthly or after big features)
ruflo hooks pretrain --depth deep

# See what agent Ruflo would route a task to (useful for understanding routing)
ruflo hooks route --task "Add Razorpay webhook signature verification"

# See routing with explanation
ruflo hooks route --task "Add Razorpay webhook signature verification" --include-explanation

# Check current memory and learned patterns
ruflo hooks intelligence --status

# Search your codebase semantically (powered by HNSW embeddings)
ruflo embeddings search -q "how does cart state sync work"
ruflo embeddings search -q "where is Razorpay webhook verification"
```

---

## Upgrading Ruflo

```bash
# Update Ruflo while keeping your data, config, and learned patterns
ruflo init upgrade

# Update AND install any new skills/agents added in the new version
ruflo init upgrade --add-missing
```

---

## GitHub & DevOps

```bash
# Review open PRs automatically
ruflo --agent pr-manager --task "Review open PRs"

# Triage and prioritize GitHub issues
ruflo --agent issue-tracker --task "Triage new issues"

# Prepare a release with changelog
ruflo --agent release-manager --task "Prepare v1.0 release notes"
```

---

## MCP Server (Claude Code Integration)

The `.mcp.json` in the project root connects Ruflo to Claude Code automatically.
If tools are missing in a session:

```bash
# Manually start the MCP server
ruflo mcp start

# Or via claude-flow directly
npx @claude-flow/cli@latest mcp start
```

Then restart Claude Code to pick up the server.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ruflo: command not found` | Run `npm install -g ruflo@latest` again |
| MCP tools not in Claude Code | Check `.mcp.json` exists, restart Claude Code |
| Agent ignores project conventions | Re-run `ruflo hooks pretrain --depth deep` |
| Swarm agents going off-task | Check `ruflo.config.json` has `"antiDrift": true` and `maxAgents` <= 8 |
| Routing wrong agent | Run `ruflo hooks route --task "<task>" --include-explanation` to debug |
| `v3alpha` not found | Use `ruflo` (global) instead of `npx ruflo@v3alpha` |

---

## Quick Reference Card

```
Single agent:     ruflo --agent coder --task "..."
With swarm:       ruflo --agent coder --swarm api-swarm --task "..."
Swarm feature:    ruflo swarm init && ruflo task orchestrate "..."
Run phase plan:   ruflo task orchestrate --spec docs/plans/PHASE.md --swarm SWARM
Security audit:   ruflo --agent security-architect --task "Audit apps/api for OWASP Top 10"
Write tests:      ruflo --agent tester --task "Write tests for MODULE"
Code review:      ruflo --agent reviewer --task "Review FILE"
Re-train:         ruflo hooks pretrain --depth deep
Semantic search:  ruflo embeddings search -q "QUERY"
```
