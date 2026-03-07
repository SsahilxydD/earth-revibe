# Ruflo Setup Design — Earth Revibe
**Date:** 2026-03-07
**Approach:** Full Ruflo Init + Per-App CLAUDE.md Agent Hooks (Approach B)

---

## Overview

Transform Earth Revibe's Turborepo monorepo into a fully orchestrated multi-agent development environment using Ruflo v3.5. This gives us parallel swarms across all 3 apps, self-learning task routing, spec-driven execution from existing phase plans, and automated quality gates.

---

## Section 1: Installation & Project Initialization

**Goal:** Get Ruflo installed globally and initialized in the monorepo root with MCP wired into Claude Code.

**Steps:**
1. Install Ruflo globally: `npm install -g ruflo@latest`
2. Run the init wizard from `c:/work/earth_revibe`: `ruflo init --wizard`
   - Scaffolds `.claude/` hooks, root `CLAUDE.md`, swarm config, and skill wiring
3. Start MCP server: `ruflo mcp start`
4. Register MCP in Claude Code config so Ruflo tools are available in every session

---

## Section 2: Codebase Pre-Training

**Goal:** Train Ruflo's routing intelligence on the Earth Revibe codebase so it learns file patterns, naming conventions, import structures, and tech-stack conventions before any agents are dispatched.

**Command:**
```bash
npx ruflo@v3alpha hooks pretrain --depth deep
```

Targets learned:
- Next.js 16 App Router patterns (storefront + admin)
- Express 5 + Prisma service/controller/route patterns (api)
- Zod 4 schema conventions (packages/shared)
- Tailwind 4 CSS patterns
- TanStack Query + Zustand usage patterns

---

## Section 3: Swarm Configuration

**Goal:** Define 4 named swarms — one per app plus a shared-concerns swarm — with anti-drift defaults and a shared memory namespace for API contract knowledge.

**Config file:** `c:/work/earth_revibe/ruflo.config.json`

**Swarms:**
| Swarm | Target | Topology | Max Agents |
|-------|--------|----------|------------|
| `storefront-swarm` | `apps/storefront` | hierarchical | 6 |
| `admin-swarm` | `apps/admin` | hierarchical | 6 |
| `api-swarm` | `apps/api` | hierarchical | 6 |
| `shared-swarm` | `packages/shared`, `packages/db` | mesh | 4 |

**Anti-drift defaults enabled on all swarms:**
- `specialized` topology — each agent has clear domain boundaries, no overlap
- Checkpoints every N steps
- Shared memory namespace: `earth-revibe-api-contract` (storefront + admin agents share API knowledge)

---

## Section 4: CLAUDE.md Files

**Goal:** Guide Ruflo's agent routing per-context with conventions and agent selection rules.

**Files created/updated:**
- `c:/work/earth_revibe/CLAUDE.md` — root: project overview, monorepo structure, global agent routing table
- `c:/work/earth_revibe/apps/storefront/CLAUDE.md` — Next.js 16 App Router conventions, Tailwind 4, Zustand, TanStack Query
- `c:/work/earth_revibe/apps/admin/CLAUDE.md` — admin patterns, Tiptap, drag-and-drop, Recharts
- `c:/work/earth_revibe/apps/api/CLAUDE.md` — Express 5 patterns, Prisma queries, JWT flow, Zod validation

**Global agent routing table (in root CLAUDE.md):**
| Task Type | Agent |
|-----------|-------|
| New feature / architecture decision | `--agent architect` |
| Implementation | `--agent coder` |
| Code review / PR review | `--agent reviewer` |
| Test generation | `--agent tester` |
| Security audit | `--agent security-architect` |
| Performance profiling | `--agent perf-analyzer` |
| Order/inventory/analytics admin work | `--agent coder` in `admin-swarm` |
| API endpoints | `--agent coder` in `api-swarm` |

---

## Section 5: Spec-Driven Execution

**Goal:** Wire existing `docs/plans/*.md` phase plans to Ruflo's task orchestrator for autonomous multi-agent phase execution.

**Pattern:**
```bash
npx ruflo@v3alpha task orchestrate \
  --spec docs/plans/<phase-file>.md \
  --swarm <target-swarm> \
  --strategy adaptive
```

**Phase → Swarm mapping:**
| Phase | Spec File | Swarm |
|-------|-----------|-------|
| Phase 1 (Foundation) | `2026-03-05-phase1-foundation.md` | `shared-swarm` |
| Phase 2 (API Core) | `2026-03-05-phase2-api-core.md` | `api-swarm` |
| Phase 3 (Storefront Core) | `2026-03-05-phase3-storefront-core.md` | `storefront-swarm` |
| Phase 4 (Admin Core) | `2026-03-05-phase4-admin-core.md` | `admin-swarm` |
| Phase 5 (Cart & Checkout) | `2026-03-05-phase5-cart-checkout.md` | `storefront-swarm` + `api-swarm` |
| Phase 6 (Admin Orders) | `2026-03-05-phase6-admin-orders-customers.md` | `admin-swarm` |
| Phase 7 (User Features) | `2026-03-05-phase7-user-features.md` | `storefront-swarm` |
| Phase 8 (Loyalty & Referrals) | `2026-03-05-phase8-loyalty-referrals.md` | `storefront-swarm` + `api-swarm` |
| Phase 9 (Blog & Support) | `2026-03-05-phase9-blog-support.md` | `storefront-swarm` + `admin-swarm` |
| Phase 10 (Analytics & SEO) | `2026-03-05-phase10-analytics-seo.md` | `storefront-swarm` |
| Phase 11 (Testing & Security) | `2026-03-05-phase11-testing-security.md` | all swarms |

---

## Section 6: Quality & Maintenance Hooks

**Goal:** Automated quality gates that run pre-commit and on-demand.

**Pre-commit hook:** Fast review of changed files via `--agent reviewer`
**On-demand commands:**
- Security audit: `--agent security-architect` OWASP Top 10 scan across `apps/api`
- Test generation: `--agent tester` targeting `src/services/__tests__/` and `src/routes/__tests__/`
- Performance: `--agent perf-analyzer` for Next.js bundle size and API p95 latency

---

## Deliverables

1. Ruflo installed globally
2. `ruflo.config.json` at monorepo root with 4 swarms
3. `CLAUDE.md` at root + 3 per-app CLAUDE.md files
4. Pre-training completed on full codebase
5. MCP server registered in Claude Code
6. Pre-commit hook wired
7. `docs/RUFLO-GUIDE.md` — command reference guide for daily use
