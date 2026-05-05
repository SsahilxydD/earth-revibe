# Earth Revibe — Operational Roadmap

**Date:** 2026-05-05
**Status:** Draft, written the night of the payment-outage incident
**Purpose:** Concrete plan to close the operational gaps exposed by the incident. Each item is independently shippable; each one's effort estimate is a working hour count, not a calendar estimate.

---

## Why this exists

On 2026-05-05 a missing `pnpm db:push` caused an 11-hour payment-finalization outage. That bug is one of a class of operational gaps. This doc enumerates the gaps and the work required to close each one. Items are sequenced by leverage: do the high-leverage low-effort items first, defer big-rewrite items.

Read alongside `project_payment_outage_2026-05-05.md` in user memory.

---

## Phase 1 — Critical (week 1; close incident-class)

### Item 1: Replace `prisma db push` with formal Prisma migrations

**Effort:** 60-90 min.
**Blast radius:** Touches Railway startup command. Get it wrong and every deploy after this fails to start. Schedule for morning brain.
**What it prevents:** Today's exact incident class. Schema-on-prod can't drift from schema-in-code because migrations apply automatically before app boot.

**Steps:**

1. Pick a clean local dev DB (or a temporary Supabase branch). Ensure it has the current production schema.
2. Run `pnpm --filter @earth-revibe/db exec prisma migrate dev --name baseline_2026-05-05`. This generates `packages/db/prisma/migrations/<timestamp>_baseline_2026-05-05/migration.sql` containing the entire current schema.
3. Commit the `migrations/` folder.
4. **On production**: run `pnpm --filter @earth-revibe/db exec prisma migrate resolve --applied baseline_2026-05-05` once. This marks the migration as applied without re-running it (because the schema already matches).
5. Update `apps/api/package.json` start script from `node dist/index.js` to `prisma migrate deploy && node dist/index.js`.
6. Update `packages/db/package.json` scripts:
   - Replace `db:push` with `db:migrate` → `prisma migrate dev`
   - Add `db:migrate:deploy` → `prisma migrate deploy`
   - Keep `db:generate` and `db:studio` as-is.
7. Update root `package.json` turbo scripts for migrations.
8. Update `apps/api/CLAUDE.md` and `packages/db/CLAUDE.md` with the new flow.
9. Verify on a staging deploy first (see Item 4) before merging to main.

**Rollback:** Revert the start command change. Migrations folder can stay; doesn't break anything if `migrate deploy` isn't called.

**Done when:** A no-op schema change committed via `prisma migrate dev` deploys cleanly to Railway, with the migration visible in `_prisma_migrations` table.

### Item 2: ~~GitHub Actions CI workflow~~ — ALREADY DONE

`.github/workflows/ci.yml` exists with type check + lint + format check + tests + build + audit. `.github/workflows/e2e.yml` runs Playwright on PR. `.github/workflows/nightly-scan.yml` runs security scans nightly. Strike this from the roadmap.

**Why today's incident bypassed CI:** the bug was schema-on-production drift, not code correctness. CI tests against a fresh in-CI Postgres where the schema matches the Prisma client. CI has no view into prod's actual schema state. Item 1 (formal migrations) closes that gap structurally.

**Sub-item 2a (still TODO):** add a CI check that fails when `schema.prisma` changes are pushed without a paired `migrations/<timestamp>_*` directory. Effort: 15 min. Wait until Item 1 lands.

### Item 3: Post-deploy smoke test against PRODUCTION (not PR)

**Effort:** 30-45 min.
**Blast radius:** Zero. Workflow is observation-only initially. Auto-rollback can be added later.
**Note:** existing e2e.yml hits `storefront-tawny-one.vercel.app` (preview) on PR. This adds a complementary check on PROD after deploy.
**What it prevents:** Deploys that boot but immediately fail basic queries. Today's incident would have been caught here within 60 seconds.

**Steps:**

1. Create `.github/workflows/post-deploy-smoke.yml` triggered on `repository_dispatch` from a Railway deploy webhook (or on a 2-min cron after pushes to main):
   ```yaml
   name: Post-deploy smoke
   on:
     workflow_run:
       workflows: ['CI']
       types: [completed]
       branches: [main]
   jobs:
     smoke:
       runs-on: ubuntu-latest
       steps:
         - name: Wait for deploy
           run: sleep 180 # crude; better: poll Railway API for deploy status
         - name: Health check
           run: |
             curl -fsS https://earth-revibeapi-production.up.railway.app/api/v1/health \
               | jq -e '.success == true and .checks.database == "ok"'
         - name: Public products endpoint
           run: |
             curl -fsS 'https://earth-revibeapi-production.up.railway.app/api/v1/products?limit=1' \
               | jq -e '.success == true and (.data | length) > 0'
         - name: Notify on failure
           if: failure()
           run: |
             # Send to Discord webhook DISCORD_OPS_URL (set as repo secret)
             curl -X POST $DISCORD_OPS_URL \
               -H 'Content-Type: application/json' \
               -d '{"content":"🚨 Post-deploy smoke FAILED on commit ${{ github.sha }}"}'
   ```
2. Add `DISCORD_OPS_URL` repo secret pointing to a new Discord channel called `#deploy-alerts`.
3. The Railway dispatch path is preferred over the cron/wait path; defer that hookup as a later improvement.

**Rollback:** Delete the workflow.

**Done when:** A deliberate broken deploy (push a commit that crashes on boot) triggers the failure path, the Discord channel gets a message.

---

## Phase 2 — Should-have (week 2; safety net)

### Item 4: Staging environment

**Effort:** 2-3 hours.
**Blast radius:** Zero. New environment, doesn't touch prod.
**What it prevents:** Schema/code changes going straight from local to prod. Lets you test risky changes against a real-ish DB without customer impact.

**Steps:**

1. **Supabase**: create a new project `earth-revibe-staging` in the same org. Cheaper plan acceptable.
2. **Railway**: create a new environment `staging` on the same project. Set its DATABASE_URL/DIRECT_URL to the staging Supabase project. Other env vars copy from prod.
3. **Vercel**: each app (storefront, admin, etc.) already gets preview deploys per branch. Hook a `staging` branch that auto-deploys to a stable URL.
4. **Razorpay**: use Razorpay's test mode keys for staging.
5. Add `STAGING_API_URL` etc. to `apps/admin/CLAUDE.md` and `apps/storefront/CLAUDE.md`.

**Done when:** A push to `staging` branch deploys all apps to staging URLs that work end-to-end.

### Item 5: Payment-path canary

**Effort:** 2 hours.
**Blast radius:** Low. New endpoint, behind cron-secret auth.
**What it prevents:** Bugs in finalize/webhook paths going undetected. 5-min detection window vs 8 hours.

**Steps:**

1. New endpoint: `POST /api/v1/internal/canary/finalize` (cron-secret protected, just like other internal endpoints).
2. Body of handler:
   - Wrap entire `finalizeOrderFromPending` call in `prisma.$transaction(async tx => { ...call with synthetic data...; throw new Error('rollback') })` so nothing actually persists.
   - Synthetic data: a deterministic test user, test variant, fake razorpayOrderId/paymentId.
   - Catch the rollback error, log success.
   - Any OTHER error → log + `throw` so the response is non-200.
3. Add to existing in-process node-cron: `*/5 * * * *` runs the canary.
4. Sentry: in the catch block, if the error is anything other than the rollback marker, capture with tag `canary=true` and high severity.
5. Wire a Sentry alert rule: any `canary=true` error → email/page Sahil immediately.

**Done when:** Manually breaking `finalizeOrderFromPending` (push a commit with a typo) triggers a Sentry page within 5 min of deploy.

### Item 6: Sentry critical-path alerting

**Effort:** 30 min.
**Blast radius:** Zero. Tagging only.
**What it prevents:** Real errors in payment paths buried in noise. Turns Sentry from "log dump" into "useful alert source."

**Steps:**

1. In `finalizeOrderFromPending`, the Razorpay webhook handler, `processOneAbandonedCart`, and the finalize-related cron, wrap with:
   ```ts
   import * as Sentry from '@sentry/node';
   Sentry.withScope((scope) => {
     scope.setTag('critical_path', 'payment_finalize');
     scope.setLevel('fatal');
     // ... existing logic ...
   });
   ```
2. In Sentry dashboard, add an alert rule: any error with `critical_path:payment_finalize` → email Sahil + Discord webhook immediately.
3. Test by deliberately throwing in a payment-path code path on staging.

**Done when:** Test error fires Sentry email within 60 seconds.

---

## Phase 3 — Should-have (weeks 3-4; reduce surface area)

### Item 7: Background workers off the API process

**Effort:** 4-6 hours.
**Blast radius:** Medium. Moves cron + webhook DB writes to a new process. Could surface coordination bugs.
**What it prevents:** Background workloads competing with customer requests for the same DB connection pool. Reduces tail latency.

**Steps:**

1. New app: `apps/worker` running a single Express server on a different Railway service.
2. Move from `apps/api`: the in-process node-cron jobs (abandoned-cart sweep, points expiry, etc.).
3. Keep webhooks in `apps/api` (they need to be on the public URL Razorpay/Meta know).
4. Worker has its own Prisma client + connection pool.
5. Sentry hookup, smoke test included.

**Done when:** API process has no node-cron import. Worker is deployed and processing the abandoned-cart sweep on schedule.

### Item 8: Path-based PR review for payment/auth/checkout

**Effort:** 30 min.
**Blast radius:** Zero. GitHub config only.
**What it prevents:** Risky changes going to main without review. Even solo, you re-read your own diff in GitHub UI and catch things you missed.

**Steps:**

1. `.github/CODEOWNERS`:
   ```
   apps/api/src/services/checkout.service.ts @SsahilxydD
   apps/api/src/routes/webhook.routes.ts @SsahilxydD
   packages/db/prisma/schema.prisma @SsahilxydD
   apps/api/src/middleware/auth.ts @SsahilxydD
   ```
2. Branch protection on main: require pull request review for changes to those paths. Owner-self-approval allowed (still forces PR creation, which forces review of the diff in GitHub).

**Done when:** A change to checkout.service.ts cannot be pushed directly to main without going through a PR.

### Item 9: Feature flags for risky code paths

**Effort:** 2 hours.
**Blast radius:** Low. Adds gating but doesn't break existing paths.
**What it prevents:** All-or-nothing risky changes. Lets you ship code dark, enable for a small % of traffic, then ramp.

**Steps:**

1. Use PostHog feature flags (already paying for PostHog, no new vendor).
2. Wrap risky paths in `if (await posthog.isFeatureEnabled('flag_name', userId))`.
3. Document the flag in `apps/api/CLAUDE.md`.
4. Use for: any change to payment-finalize logic, any new schema migration that backfills data, any change to RLS posture.

**Done when:** A test flag exists and the API correctly gates a code path on it.

---

## Phase 4 — Nice-to-have (later)

- Observability dashboard (Grafana / Railway metrics export)
- Load testing (k6 against staging)
- Runbooks (`docs/runbooks/payments-down.md`, etc.)
- Multi-region read replicas (only relevant past 10k orders/month)

---

## Estimated total to reach Phase 2 done

- Phase 1: ~2.5 hours (Items 1-3)
- Phase 2: ~5 hours (Items 4-6)

**Total ~7.5 working hours.** Realistic calendar: 3-5 days of focused work spread over 1-2 weeks.

After Phase 2, the operational floor is meaningfully better than today: schema drift impossible, deploys validated, payment-path bugs detected within 5 min.

---

## Open questions for Sahil

1. Are you OK with creating a second Supabase project (staging)? It costs ~$10/mo.
2. Do you want PR-based reviews for the protected paths, or a separate review tool / a contractor as second pair of eyes?
3. Discord channel for ops alerts (`#deploy-alerts`) — does that exist or do we create it?
4. Do you want canary alerts to email you, ping a Discord channel, or both?

---

_End of roadmap. Items are sequenced for highest leverage first. Each item is shippable independently._
