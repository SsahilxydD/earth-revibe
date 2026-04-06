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

## Ruflo Memory

Use ruflo for cross-session memory storage. Swarm commands are metadata-only and do not execute real work.

```bash
ruflo memory search -q "query"        # semantic search
ruflo memory list                      # list all keys
ruflo memory retrieve -k "key"        # get specific key
ruflo memory store -k "key" --value "value"  # store a decision or result
ruflo memory stats                     # see what's stored
```

Store design decisions after completing work so future sessions can reference them.

## Thinking Protocol

Always use the `mcp__sequential-thinking__sequentialthinking` MCP tool on every prompt before writing any code or making changes. Use it to:

- Break down the task into steps
- Analyze existing code for side effects before editing
- Loop through multiple thoughts (adjust `totalThoughts` as needed)
- Verify your approach before acting

This is mandatory — never skip sequential thinking, even for small tasks.

## Key Conventions

- All Zod schemas live in `packages/shared/src/schemas/` — never duplicate in apps
- All enums live in `packages/shared/src/enums/` — import from `@earth-revibe/shared`
- API response format: `{ success: boolean, data?: T, error?: { code, message } }`
- JWT: access token 15m, refresh token 30d, rotation on every refresh
- Images: always upload via Cloudinary, never serve from local disk
- Never commit `.env` files — use `.env.example` as reference
