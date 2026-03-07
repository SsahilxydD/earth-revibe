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

## Ruflo — MANDATORY WORKFLOW

**Every task MUST follow this order. No exceptions.**

### Step 1 — Query memory BEFORE reading any file

```bash
ruflo memory search -q "<what you're about to build>"
ruflo memory search -q "<component or feature name>"
```

If memory has the answer, skip reading files. Memory is always faster and cheaper.

### Step 2 — Use swarm, NOT single agents

```bash
# Start the right swarm for the work area
ruflo swarm start --name earth-revibe --objective "<task description>" --max-agents 6

# Or target a specific app swarm
ruflo swarm start --name storefront-swarm --objective "<task>" --max-agents 4
ruflo swarm start --name admin-swarm --objective "<task>" --max-agents 4
ruflo swarm start --name api-swarm --objective "<task>" --max-agents 4
```

Swarms assign roles automatically: architect, coder, reviewer, tester. Do not spawn individual agents manually.

### Step 3 — Store results in memory after every task

```bash
ruflo memory store -k "<feature-name>" --value "<what was built, key file paths, design decisions>"
```

Post-commit hook auto-stores commit summaries. Manually store design decisions.

### Swarm Role Reference

| Role | Responsibility |
|------|---------------|
| architect | Plans approach, reads memory, defines interfaces |
| coder | Implements — always queries memory first |
| reviewer | Checks code matches spec and memory conventions |
| tester | Writes and runs tests |
| security-architect | Audits auth, input validation, API security |

### Quick memory commands

```bash
ruflo memory search -q "query"        # semantic search
ruflo memory list                      # list all keys
ruflo memory retrieve -k "key"        # get specific key
ruflo memory stats                     # see what's stored
ruflo neural query --prompt "question" # ask trained model
```

## Key Conventions

- All Zod schemas live in `packages/shared/src/schemas/` — never duplicate in apps
- All enums live in `packages/shared/src/enums/` — import from `@earth-revibe/shared`
- API response format: `{ success: boolean, data?: T, error?: { code, message } }`
- JWT: access token 15m, refresh token 7d, rotation on every refresh
- Images: always upload via Cloudinary, never serve from local disk
- Never commit `.env` files — use `.env.example` as reference
