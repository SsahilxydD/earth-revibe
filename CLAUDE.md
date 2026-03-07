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

## Ruflo Agent Routing

| Task | Command |
|------|---------|
| New feature design | `ruflo --agent architect --task "..."` |
| Implementation | `ruflo --agent coder --task "..."` |
| Code review | `ruflo --agent reviewer --task "..."` |
| Write tests | `ruflo --agent tester --task "..."` |
| Security audit | `ruflo --agent security-architect --task "..."` |
| Performance | `ruflo --agent perf-analyzer --task "..."` |
| Storefront work | add `--swarm storefront-swarm` |
| Admin work | add `--swarm admin-swarm` |
| API work | add `--swarm api-swarm` |
| Shared/DB work | add `--swarm shared-swarm` |

## Key Conventions

- All Zod schemas live in `packages/shared/src/schemas/` — never duplicate in apps
- All enums live in `packages/shared/src/enums/` — import from `@earth-revibe/shared`
- API response format: `{ success: boolean, data?: T, error?: { code, message } }`
- JWT: access token 15m, refresh token 7d, rotation on every refresh
- Images: always upload via Cloudinary, never serve from local disk
- Never commit `.env` files — use `.env.example` as reference
