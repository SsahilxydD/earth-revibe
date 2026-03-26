# Ruflo Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install and fully configure Ruflo v3.5 in the Earth Revibe monorepo for maximum parallel agent output, spec-driven phase execution, and automated quality gates.

**Architecture:** Global Ruflo install with MCP wired into Claude Code, 4 named anti-drift swarms (one per app + shared), per-app CLAUDE.md routing files, pre-commit reviewer hook, and a user-facing command reference guide.

**Tech Stack:** Ruflo v3.5, Node.js npm globals, Claude Code MCP, bash git hooks

---

## Task 1: Install Ruflo Globally

**Files:**

- No files — shell only

**Step 1: Install globally**

```bash
npm install -g ruflo@latest
```

Expected: installs `ruflo` CLI globally (~340MB with ML/embeddings)

**Step 2: Verify install**

```bash
ruflo --version
```

Expected: prints `ruflo v3.5.x`

**Step 3: Check status and auth**

```bash
ruflo --status
```

Expected: shows version, concurrency limit, and credits if authenticated. If not authenticated, run:

```bash
ruflo login --browser
```

---

## Task 2: Initialize Ruflo in the Monorepo Root

**Files:**

- Created by ruflo init: `c:/work/earth_revibe/CLAUDE.md` (will be replaced in Task 4)
- Created by ruflo init: `c:/work/earth_revibe/.ruflo/` directory

**Step 1: Navigate to monorepo root and run init wizard**

```bash
cd c:/work/earth_revibe
ruflo init --wizard
```

When prompted:

- Project name: `earth-revibe`
- Project type: `monorepo`
- Primary language: `TypeScript`
- Accept defaults for everything else

Expected: creates `.ruflo/` config dir, scaffolds initial `CLAUDE.md`, wires skill hooks

**Step 2: Verify init output**

```bash
ls c:/work/earth_revibe/.ruflo/
```

Expected: see config files, agent definitions, memory dir

**Step 3: Commit init scaffold**

```bash
cd c:/work/earth_revibe
git add .ruflo/ CLAUDE.md
git commit -m "chore: initialize ruflo v3.5 in monorepo root"
```

---

## Task 3: Write ruflo.config.json (4-Swarm Configuration)

**Files:**

- Create: `c:/work/earth_revibe/ruflo.config.json`

**Step 1: Create the swarm config**

```json
{
  "version": "3.5",
  "project": "earth-revibe",
  "memory": {
    "namespace": "earth-revibe",
    "sharedNamespaces": ["earth-revibe-api-contract"]
  },
  "swarms": {
    "storefront-swarm": {
      "root": "apps/storefront",
      "topology": "hierarchical",
      "maxAgents": 6,
      "agentType": "specialized",
      "antiDrift": true,
      "checkpointEvery": 5,
      "sharedMemory": ["earth-revibe-api-contract"],
      "defaultAgents": ["architect", "coder", "reviewer", "tester"]
    },
    "admin-swarm": {
      "root": "apps/admin",
      "topology": "hierarchical",
      "maxAgents": 6,
      "agentType": "specialized",
      "antiDrift": true,
      "checkpointEvery": 5,
      "sharedMemory": ["earth-revibe-api-contract"],
      "defaultAgents": ["architect", "coder", "reviewer", "tester"]
    },
    "api-swarm": {
      "root": "apps/api",
      "topology": "hierarchical",
      "maxAgents": 6,
      "agentType": "specialized",
      "antiDrift": true,
      "checkpointEvery": 5,
      "sharedMemory": ["earth-revibe-api-contract"],
      "defaultAgents": ["architect", "coder", "reviewer", "tester", "security-architect"]
    },
    "shared-swarm": {
      "root": "packages",
      "topology": "mesh",
      "maxAgents": 4,
      "agentType": "specialized",
      "antiDrift": true,
      "checkpointEvery": 3,
      "defaultAgents": ["architect", "coder", "reviewer"]
    }
  },
  "routing": {
    "enabled": true,
    "learningRate": "high",
    "fallbackAgent": "coder"
  },
  "tokenOptimizer": {
    "enabled": true,
    "strategy": "adaptive"
  }
}
```

**Step 2: Validate the config**

```bash
cd c:/work/earth_revibe
ruflo config validate
```

Expected: "Config valid" with swarm summary printed

**Step 3: Commit**

```bash
git add ruflo.config.json
git commit -m "chore: add ruflo 4-swarm config for monorepo"
```

---

## Task 4: Write Root CLAUDE.md

**Files:**

- Overwrite: `c:/work/earth_revibe/CLAUDE.md`

**Step 1: Replace the ruflo-generated CLAUDE.md with our project-specific one**

````markdown
# Earth Revibe — Monorepo

Turborepo monorepo. pnpm workspaces. TypeScript everywhere.

## Structure

- `apps/storefront` — Next.js 16 App Router, customer-facing storefront
- `apps/admin` — Next.js 16 App Router, admin dashboard
- `apps/api` — Express 5, REST API at `/api/v1/`
- `packages/shared` — Zod 4 schemas, enums, TypeScript types, utilities
- `packages/db` — Prisma 7 client, schema, migrations (PostgreSQL 16)

## Commands

```bash
pnpm dev          # start all apps
pnpm build        # build all apps
pnpm lint         # lint all apps
pnpm db:generate  # regenerate Prisma client after schema changes
pnpm db:push      # push schema to database
pnpm db:seed      # seed database
```
````

## Ruflo Agent Routing

| Task               | Command                                         |
| ------------------ | ----------------------------------------------- |
| New feature design | `ruflo --agent architect --task "..."`          |
| Implementation     | `ruflo --agent coder --task "..."`              |
| Code review        | `ruflo --agent reviewer --task "..."`           |
| Write tests        | `ruflo --agent tester --task "..."`             |
| Security audit     | `ruflo --agent security-architect --task "..."` |
| Performance        | `ruflo --agent perf-analyzer --task "..."`      |
| Storefront work    | add `--swarm storefront-swarm`                  |
| Admin work         | add `--swarm admin-swarm`                       |
| API work           | add `--swarm api-swarm`                         |
| Shared/DB work     | add `--swarm shared-swarm`                      |

## Key Conventions

- All Zod schemas live in `packages/shared/src/schemas/` — never duplicate in apps
- All enums live in `packages/shared/src/enums/` — import from `@earth-revibe/shared`
- API response format: `{ success: boolean, data?: T, error?: { code, message } }`
- JWT: access token 15m, refresh token 7d, rotation on every refresh
- Images: always upload via Cloudinary, never serve from local disk
- Never commit `.env` files — use `.env.example` as reference

````

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: write root CLAUDE.md with ruflo agent routing table"
````

---

## Task 5: Write apps/storefront/CLAUDE.md

**Files:**

- Create: `c:/work/earth_revibe/apps/storefront/CLAUDE.md`

**Step 1: Create the file**

```markdown
# Storefront — apps/storefront

Next.js 16 App Router. React 19. Tailwind CSS 4. TypeScript.

## Structure
```

src/
app/
(auth)/ # login, register pages — public routes
(shop)/ # all shopping routes — layout with header/footer
components/
cart/ # cart drawer, cart item, cart summary
checkout/ # checkout form, payment, confirmation
home/ # hero, featured collections, new arrivals
layout/ # header, footer, nav, mobile menu
product/ # product card, product gallery, product filters
ui/ # shared primitives: button, input, badge, modal
hooks/ # custom React hooks
lib/ # api client (fetch wrappers), analytics helpers
providers/ # QueryClientProvider, AuthProvider, etc
stores/ # zustand stores: cart, ui, auth

````

## Patterns

- **Server Components by default** — only add `"use client"` when you need interactivity, hooks, or browser APIs
- **Data fetching:** use `fetch()` in Server Components for SSR/SSG; use TanStack Query (`useQuery`) in Client Components
- **State:** Zustand for cart + UI state only; TanStack Query for all server state
- **Forms:** react-hook-form + Zod resolver — import schema from `@earth-revibe/shared`
- **Animations:** framer-motion for page transitions and micro-interactions
- **Images:** always use `next/image` — never `<img>` tags
- **Icons:** lucide-react only — no other icon libraries
- **Routing:** file-based App Router — no manual router.push except in event handlers

## Ruflo Swarm

Always use `--swarm storefront-swarm` for work in this directory.

Example:
```bash
ruflo --agent coder --swarm storefront-swarm --task "Add wishlist toggle to ProductCard"
````

````

**Step 2: Commit**

```bash
git add apps/storefront/CLAUDE.md
git commit -m "docs: add storefront CLAUDE.md with ruflo routing and conventions"
````

---

## Task 6: Write apps/admin/CLAUDE.md

**Files:**

- Create: `c:/work/earth_revibe/apps/admin/CLAUDE.md`

**Step 1: Create the file**

```markdown
# Admin — apps/admin

Next.js 16 App Router. React 19. Tailwind CSS 4. TypeScript.
Admin dashboard for Earth Revibe — product management, orders, customers, blog, support.

## Structure
```

src/
app/
(admin)/ # all admin routes — protected, requires admin auth
login/ # admin login page — public
components/
analytics/ # revenue charts, KPI cards (recharts)
dashboard/ # dashboard home widgets
layout/ # sidebar, topbar, breadcrumbs
products/ # product form, variant editor, image uploader
ui/ # shared primitives: button, input, table, modal, badge
hooks/ # custom hooks
lib/ # api client, helpers
providers/ # QueryClientProvider, AdminAuthProvider
stores/ # zustand: ui state, sidebar collapse

````

## Patterns

- **All admin routes are protected** — check auth in layout, redirect to `/login` if not authenticated
- **Rich text:** @tiptap/react for product descriptions and blog posts — always use the shared TiptapEditor component
- **Drag and drop:** @hello-pangea/dnd for category ordering and image reordering
- **File upload:** react-dropzone for image uploads — always upload to Cloudinary via API, never direct
- **Charts:** recharts for all data visualizations — ResponsiveContainer always wraps charts
- **Tables:** build with native HTML table + Tailwind — no third-party table library
- **Forms:** react-hook-form + Zod resolver — import schema from `@earth-revibe/shared`
- **Server Components by default** — `"use client"` only for interactive components

## Ruflo Swarm

Always use `--swarm admin-swarm` for work in this directory.

Example:
```bash
ruflo --agent coder --swarm admin-swarm --task "Add low stock alert badge to inventory table"
````

````

**Step 2: Commit**

```bash
git add apps/admin/CLAUDE.md
git commit -m "docs: add admin CLAUDE.md with ruflo routing and conventions"
````

---

## Task 7: Write apps/api/CLAUDE.md

**Files:**

- Create: `c:/work/earth_revibe/apps/api/CLAUDE.md`

**Step 1: Create the file**

```markdown
# API — apps/api

Express 5. TypeScript. Prisma 7. PostgreSQL 16.
REST API at `/api/v1/`. All endpoints require JWT auth except `/auth/*` and public product/category reads.

## Structure
```

src/
config/ # env config, db config, cloudinary config
controllers/ # request handlers — thin, delegate to services
middleware/ # auth, error handler, rate limiter, validation
routes/ # express routers — one file per resource
services/ # business logic — all DB access goes here
types/ # express Request augmentation, shared types
utils/ # helpers: jwt, email, slugify, pagination
app.ts # express app setup (no listen here)
index.ts # server listen entry point

````

## Patterns

- **Controllers are thin** — validate input (Zod), call service, return response. No business logic in controllers.
- **Services own all DB access** — all Prisma queries go in `services/`, never in controllers or routes
- **Validation:** use Zod schemas imported from `@earth-revibe/shared` in middleware before controller runs
- **Error format:** always `{ success: false, error: { code: string, message: string } }` — use the central error handler
- **Auth:** `authenticateToken` middleware extracts `req.user` from JWT — all protected routes use this middleware
- **Pagination:** all list endpoints accept `page` + `limit` query params, return `{ data, pagination: { page, limit, total, totalPages } }`
- **File uploads:** multer for multipart, then immediately upload to Cloudinary in the service — never store files locally
- **Razorpay webhooks:** always verify `X-Razorpay-Signature` header before processing

## Existing Routes

auth, product, category, cart, checkout, order, address, wishlist, review, search,
blog, support, discount, loyalty, referral, shipping, upload, analytics,
admin-product, admin-order, admin-customer, admin-blog, admin-discount,
admin-inventory, admin-support, admin-notification

## Ruflo Swarm

Always use `--swarm api-swarm` for work in this directory.

Example:
```bash
ruflo --agent coder --swarm api-swarm --task "Add endpoint to bulk update inventory stock levels"
ruflo --agent security-architect --swarm api-swarm --task "Audit auth middleware for token validation gaps"
````

````

**Step 2: Commit**

```bash
git add apps/api/CLAUDE.md
git commit -m "docs: add api CLAUDE.md with ruflo routing and conventions"
````

---

## Task 8: Pre-Train Ruflo on the Codebase

**Files:**

- No files created — trains Ruflo's internal routing model

**Step 1: Run deep pre-training from monorepo root**

```bash
cd c:/work/earth_revibe
npx ruflo@v3alpha hooks pretrain --depth deep
```

This will scan all TypeScript files, learn patterns, and index the codebase. Takes a few minutes.

Expected output: progress bar, then summary like:

```
Indexed 847 files
Learned 23 patterns
Routing accuracy baseline: ready
```

**Step 2: Check routing works with a test query**

```bash
npx ruflo@v3alpha hooks route "Add a new API endpoint for bulk order export"
```

Expected: routes to `--agent coder --swarm api-swarm` with explanation

**Step 3: Check routing for frontend**

```bash
npx ruflo@v3alpha hooks route "Fix the product image gallery zoom on mobile"
```

Expected: routes to `--agent coder --swarm storefront-swarm`

---

## Task 9: Start MCP Server and Register with Claude Code

**Files:**

- Modify: `C:/Users/Administrator/.claude/claude_desktop_config.json` (or equivalent MCP config)

**Step 1: Start the Ruflo MCP server**

```bash
cd c:/work/earth_revibe
npx ruflo@latest mcp start
```

Expected: MCP server starts, prints connection URL like `http://localhost:7777`

**Step 2: Find your Claude Code MCP config file**

```bash
cat ~/.claude/claude_desktop_config.json 2>/dev/null || echo "file not found"
```

If not found, check: `%APPDATA%\Claude\claude_desktop_config.json` on Windows.

**Step 3: Add Ruflo to the MCP config**

Add this to the `mcpServers` section:

```json
{
  "mcpServers": {
    "ruflo": {
      "command": "npx",
      "args": ["ruflo@latest", "mcp", "start", "--stdio"],
      "cwd": "c:/work/earth_revibe"
    }
  }
}
```

**Step 4: Restart Claude Code** so it picks up the new MCP server.

**Step 5: Verify MCP is connected**

In a new Claude Code session, type `/mcp` or check that Ruflo tools appear in the tool list.

---

## Task 10: Wire Pre-Commit Review Hook

**Files:**

- Create: `c:/work/earth_revibe/.git/hooks/pre-commit`

**Step 1: Create the pre-commit hook script**

```bash
#!/usr/bin/env bash
# Ruflo pre-commit: fast reviewer agent on staged files

STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' | head -20)

if [ -z "$STAGED" ]; then
  exit 0
fi

echo "Ruflo: running quick review on staged files..."
echo "$STAGED" | xargs -I{} npx ruflo@v3alpha --agent reviewer --task "Quick review of {}: check for obvious bugs, missing error handling, and type safety issues" --no-interactive 2>/dev/null

# Hook always passes — reviewer is advisory, not blocking
exit 0
```

**Step 2: Make it executable**

```bash
chmod +x c:/work/earth_revibe/.git/hooks/pre-commit
```

**Step 3: Test it works with a dry run**

```bash
cd c:/work/earth_revibe
# Stage a file then run the hook manually
git add apps/api/CLAUDE.md
bash .git/hooks/pre-commit
```

Expected: reviewer agent runs and prints feedback (non-blocking)

---

## Task 11: Write the Ruflo Command Reference Guide

**Files:**

- Create: `c:/work/earth_revibe/docs/RUFLO-GUIDE.md`

**Step 1: Create the guide** (see content in the plan — this is the deliverable the user requested)

The guide content is written in Task 11 of the implementation below. Write it as specified.

---

## Task 12: Final Verification

**Step 1: Confirm all files exist**

```bash
ls c:/work/earth_revibe/ruflo.config.json
ls c:/work/earth_revibe/CLAUDE.md
ls c:/work/earth_revibe/apps/storefront/CLAUDE.md
ls c:/work/earth_revibe/apps/admin/CLAUDE.md
ls c:/work/earth_revibe/apps/api/CLAUDE.md
ls c:/work/earth_revibe/docs/RUFLO-GUIDE.md
ls c:/work/earth_revibe/.git/hooks/pre-commit
```

**Step 2: Confirm ruflo is globally installed**

```bash
ruflo --version
```

**Step 3: Test a swarm command**

```bash
cd c:/work/earth_revibe
npx ruflo@v3alpha --list
```

Expected: lists all 60+ available agents

**Step 4: Final commit**

```bash
cd c:/work/earth_revibe
git add docs/RUFLO-GUIDE.md docs/plans/
git commit -m "chore: complete ruflo setup with guide, swarms, and CLAUDE.md files"
```

---

## Appendix: RUFLO-GUIDE.md Content

This is the exact content to write to `docs/RUFLO-GUIDE.md` in Task 11:

````markdown
# Ruflo Command Reference — Earth Revibe

Your daily cheat sheet for getting maximum output from Ruflo on this project.
All commands run from `c:/work/earth_revibe` unless noted.

---

## Setup & Status

| Command                 | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `ruflo --status`        | Shows auth status, concurrency limit, and remaining API credits     |
| `ruflo --version`       | Confirms installed version                                          |
| `ruflo mcp start`       | Starts the MCP server so Ruflo tools appear in Claude Code sessions |
| `ruflo config validate` | Checks ruflo.config.json is valid and shows swarm summary           |
| `ruflo --list`          | Lists all 60+ available agents you can use                          |

---

## Running a Single Agent Task

Pattern: `ruflo --agent <agent> --task "<what you want done>"`

| Command                                                                         | What it does                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `ruflo --agent architect --task "Design the referral program API endpoints"`    | Gets an architecture plan with ADR before any code is written |
| `ruflo --agent coder --task "Implement the referral code generation service"`   | Writes the implementation code                                |
| `ruflo --agent reviewer --task "Review the checkout flow implementation"`       | Full code review: security, performance, style, correctness   |
| `ruflo --agent tester --task "Write tests for the auth middleware"`             | Generates unit + integration tests                            |
| `ruflo --agent security-architect --task "Audit the payment webhook handling"`  | Deep security review, finds vulnerabilities                   |
| `ruflo --agent perf-analyzer --task "Profile the product listing API endpoint"` | Finds bottlenecks, suggests optimizations                     |

---

## Running an Agent in a Specific Swarm

Add `--swarm <swarm-name>` to target a specific app. This ensures the agent knows your codebase conventions for that app.

| Swarm                      | Use for                                                   |
| -------------------------- | --------------------------------------------------------- |
| `--swarm storefront-swarm` | `apps/storefront` — Next.js customer-facing site          |
| `--swarm admin-swarm`      | `apps/admin` — Next.js admin dashboard                    |
| `--swarm api-swarm`        | `apps/api` — Express REST API                             |
| `--swarm shared-swarm`     | `packages/shared` and `packages/db` — Zod schemas, Prisma |

Example:

```bash
ruflo --agent coder --swarm api-swarm --task "Add bulk stock update endpoint"
ruflo --agent coder --swarm storefront-swarm --task "Add size guide modal to product page"
ruflo --agent coder --swarm admin-swarm --task "Add export to CSV button on orders table"
```
````

---

## Running a Multi-Agent Swarm on a Feature

Use `swarm init` + `task orchestrate` for larger tasks that need multiple agents working together.

```bash
# Step 1: initialize the swarm
npx ruflo@v3alpha swarm init --topology hierarchical

# Step 2: orchestrate a task (agents divide and conquer)
npx ruflo@v3alpha task orchestrate "Build the wishlist feature end-to-end"
```

For cross-app work (e.g. API + storefront together):

```bash
npx ruflo@v3alpha task orchestrate \
  "Add product reviews: API endpoints + storefront UI + admin moderation" \
  --strategy adaptive
```

---

## Spec-Driven Execution (Run a Full Phase Plan)

Use your existing `docs/plans/` phase files to drive autonomous multi-agent execution.

```bash
npx ruflo@v3alpha task orchestrate \
  --spec docs/plans/<filename>.md \
  --swarm <swarm> \
  --strategy adaptive
```

### Phase → Swarm Quick Reference

| Phase                         | Command                                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Phase 1 — Foundation          | `--spec docs/plans/2026-03-05-phase1-foundation.md --swarm shared-swarm`            |
| Phase 2 — API Core            | `--spec docs/plans/2026-03-05-phase2-api-core.md --swarm api-swarm`                 |
| Phase 3 — Storefront Core     | `--spec docs/plans/2026-03-05-phase3-storefront-core.md --swarm storefront-swarm`   |
| Phase 4 — Admin Core          | `--spec docs/plans/2026-03-05-phase4-admin-core.md --swarm admin-swarm`             |
| Phase 5 — Cart & Checkout     | `--spec docs/plans/2026-03-05-phase5-cart-checkout.md --swarm storefront-swarm`     |
| Phase 6 — Admin Orders        | `--spec docs/plans/2026-03-05-phase6-admin-orders-customers.md --swarm admin-swarm` |
| Phase 7 — User Features       | `--spec docs/plans/2026-03-05-phase7-user-features.md --swarm storefront-swarm`     |
| Phase 8 — Loyalty & Referrals | `--spec docs/plans/2026-03-05-phase8-loyalty-referrals.md --swarm api-swarm`        |
| Phase 9 — Blog & Support      | `--spec docs/plans/2026-03-05-phase9-blog-support.md --swarm admin-swarm`           |
| Phase 10 — Analytics & SEO    | `--spec docs/plans/2026-03-05-phase10-analytics-seo.md --swarm storefront-swarm`    |
| Phase 11 — Testing & Security | `--spec docs/plans/2026-03-05-phase11-testing-security.md` (all swarms)             |

---

## Quality & Maintenance (On-Demand)

Run these anytime — no swarm needed.

```bash
# Full security audit of the API (OWASP Top 10)
npx ruflo@v3alpha --agent security-architect --task "Audit apps/api for OWASP Top 10 vulnerabilities"

# Generate tests for a specific module
npx ruflo@v3alpha --agent tester --task "Write tests for apps/api/src/services/order.service.ts"

# Refactor safely
npx ruflo@v3alpha --agent coder --task "Refactor the cart service to use repository pattern"

# Check bundle size and performance
npx ruflo@v3alpha --agent perf-analyzer --task "Analyze storefront bundle size and find lazy-loading opportunities"

# Review a specific file before committing
npx ruflo@v3alpha --agent reviewer --task "Review apps/api/src/controllers/checkout.controller.ts"
```

---

## Intelligence & Learning

```bash
# Re-train Ruflo after adding many new files (run monthly or after big features)
npx ruflo@v3alpha hooks pretrain --depth deep

# See what agent Ruflo would route a task to (useful for understanding routing)
npx ruflo@v3alpha hooks route "Add Razorpay webhook signature verification"

# See routing with explanation
npx ruflo@v3alpha hooks route "Add Razorpay webhook signature verification" --include-explanation

# Check current memory and learned patterns
npx ruflo@v3alpha hooks intelligence --status

# Transfer patterns learned from this project to another project
npx ruflo@v3alpha hooks transfer <destination-project-path>
```

---

## Upgrading Ruflo

```bash
# Update Ruflo while keeping your data, config, and learned patterns
npx ruflo@v3alpha init upgrade

# Update AND install any new skills/agents added in the new version
npx ruflo@v3alpha init upgrade --add-missing
```

---

## GitHub & DevOps

```bash
# Review open PRs automatically
npx ruflo@v3alpha --agent pr-manager --task "Review open PRs"

# Triage and prioritize GitHub issues
npx ruflo@v3alpha --agent issue-tracker --task "Triage new issues"

# Prepare a release with changelog
npx ruflo@v3alpha --agent release-manager --task "Prepare v1.0 release notes"
```

---

## Troubleshooting

| Problem                           | Fix                                                                    |
| --------------------------------- | ---------------------------------------------------------------------- |
| `ruflo: command not found`        | Run `npm install -g ruflo@latest` again                                |
| MCP tools not in Claude Code      | Run `ruflo mcp start` then restart Claude Code                         |
| Agent ignores project conventions | Re-run `npx ruflo@v3alpha hooks pretrain --depth deep`                 |
| Swarm agents going off-task       | Check `ruflo.config.json` has `"antiDrift": true` and `maxAgents` <= 8 |
| Routing wrong agent               | Run `ruflo hooks route "<task>" --include-explanation` to debug        |
| Out of credits                    | Run `ruflo --status` to check, then top up at ruflo dashboard          |

```

```
