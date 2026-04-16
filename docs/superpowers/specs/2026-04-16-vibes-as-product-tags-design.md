# Vibes as Product Tags (Additive)

**Date:** 2026-04-16
**Scope:** packages/db (1 column added), apps/api (1 filter added), apps/admin (1 form field added), apps/storefront (filter switches data source), one-shot migration script
**Status:** Awaiting user approval

## Goal

Add a `vibes` array column to `Product` so each product carries 1-3 vibe slugs as real data. The storefront vibe filter on `/products` reads `product.vibes` directly (instead of the indirect `vibe → categories` lookup it does today). Categories remain the primary internal classification — untouched.

## Why

Per user direction and the canonical design deck (`EarthRevibe_Trip_Vibe_Homepage.pdf`):

- Vibes are the user-facing discovery axis on the storefront — already deployed (commits `0886009..35017c8`).
- Today the vibe filter uses a hardcoded TS mapping (`apps/storefront/src/lib/vibe-categories.ts`) that translates `?vibe=salt-on-skin` into a multi-category query. This is brittle — the mapping is product/marketing data living in code, and a product can only appear under a vibe if its category happens to be in the mapping.
- The PDF deck specifies an exact 47-row coverage matrix where products live in **multiple vibes** (avg ~2 per product). That's product data, not a config constant.
- This change moves vibes from "code config" to "product data", so admin can re-tag any product without a code change, and a product's vibes are independent of its category.

## Non-Goals

- **No changes to `Category`, `ProductCategory`, `Product.categoryId`, or `DiscountCode.applicableCategories`.** Categories stay primary internal classification. Discounts that scope by category continue to work.
- No changes to `BlogCategory` (separate model, separate purpose).
- No changes to checkout / order discount-applicability logic (it reads `categoryId`, untouched).
- No `Vibe` model with editable copy in CMS — slugs and metadata stay hardcoded in TS for now (admin can add a Vibe model later if vibe copy needs to be editable).
- No `flight-mode` tagging on products. Flight Mode is bundles per the PDF (separate concept). The 6th vibe tile is removed from the storefront.

## Architecture

### 1. Schema — additive

`packages/db/prisma/schema.prisma`, in the `Product` model:

```prisma
model Product {
  // ... existing fields unchanged ...
  vibes  String[]  @default([])

  // ... existing relations unchanged ...
}
```

That's the entire schema change. One column. Postgres array of strings. No new models, no FKs, no joins.

Filtering uses Prisma's array operators:

- `where: { vibes: { has: 'salt-on-skin' } }` — single vibe
- `where: { vibes: { hasSome: ['salt-on-skin', 'into-the-wild'] } }` — any of these (not used by storefront today, but available)

### 2. Vibe slug source-of-truth

New file `packages/shared/src/enums/vibe.ts`:

```ts
// 5 trip vibes that apply to individual products. Flight Mode (bundles)
// is intentionally excluded — bundles are a separate future concept.
export const VIBES = [
  'above-the-clouds',
  'salt-on-skin',
  'golden-hour-gang',
  'into-the-wild',
  'neon-nomads',
] as const;

export type Vibe = (typeof VIBES)[number];

export function isVibe(v: unknown): v is Vibe {
  return typeof v === 'string' && (VIBES as readonly string[]).includes(v);
}
```

Re-exported from `@earth-revibe/shared` index. Used by:

- API Zod schema (validate `vibes` on create/update)
- API query schema (validate `?vibe=` filter)
- Admin product form (multi-select options)
- Storefront vibe circles (already hardcoded — switches to import from shared)

### 3. API — three small changes

**a) `packages/shared/src/schemas/product.schema.ts`** — accept vibes on create/update and as a filter:

```ts
// in createProductSchema
vibes: z.array(z.enum(VIBES)).default([]),

// in productQuerySchema
vibe: z.enum(VIBES).optional(),
```

**b) `apps/api/src/services/product.service.ts`** — `listProducts` honors `?vibe=`:

```ts
if (query.vibe) {
  where.vibes = { has: query.vibe };
}
```

(Coexists with the existing `category` filter from the previous spec — both are valid filters on the same endpoint. Storefront will use vibe; admin/legacy callers keep using category.)

**c) `createProduct` and `updateProduct`** persist the `vibes` array as-is (Prisma scalar list, no relation handling needed).

### 4. Admin — vibe multi-select on product form

`apps/admin/src/components/products/product-form.tsx` gets a new field below the existing Category dropdown:

- Multi-select with the 5 vibe slugs (label: human-friendly names — "Above the Clouds", "Salt on Skin", etc.)
- Reads from / writes to `product.vibes`
- Empty array allowed (admin can leave a product untagged → invisible from storefront vibe filter)

The existing Category dropdown stays exactly as-is. Both fields persist independently.

### 5. Storefront — switch filter source, drop dead code

**`apps/storefront/src/app/(shop)/products/page.tsx`:**

- Replace `category: activeVibe ? categoriesForVibe(activeVibe) : (category || undefined)` with: when `activeVibe` is set, pass `vibe: activeVibe` to the products query (new param) and DO NOT pass `category`. When `activeVibe` is unset, pass `category` as today.
- Update local `VIBES` array to import slugs from `@earth-revibe/shared` (5 entries instead of 6 — drop Flight Mode).

**`apps/storefront/src/hooks/use-products.ts`:**

- Add `vibe?: Vibe` to `ProductListParams`.
- `buildProductQuery` serializes `vibe` to `?vibe=<slug>`.

**`apps/storefront/src/lib/vibe-categories.ts`:** **Deleted.** No longer needed.

**Header / footer / mobile menu / search overlay:** drop the FLIGHT entry from each nav array. (5 vibe links instead of 6.)

**Storefront product type** (`apps/storefront/src/types`): add `vibes: string[]` to `Product`.

### 6. Data migration — one-shot script

New file `packages/db/src/scripts/backfill-product-vibes.ts`. Runs as `pnpm --filter @earth-revibe/db backfill-vibes [--dry-run]`.

**Source of truth:** `packages/db/src/data/product-vibes.ts` — TS map extracted from the PDF matrix:

```ts
// Slug → vibes. Slugs match Product.slug in the DB.
// Source: EarthRevibe_Trip_Vibe_Homepage.pdf p.10 (coverage matrix).
export const PRODUCT_VIBES: Record<string, readonly string[]> = {
  'garden-sage': ['into-the-wild'],
  'heritage-mocha': ['golden-hour-gang', 'into-the-wild'],
  'tropical-noir': ['salt-on-skin', 'neon-nomads'],
  // ... 44 more rows ...
};
```

The full 47-row map is built from the PDF during plan execution (see plan task list). Slugs in the map use the DB's slug convention (lowercase-kebab, derived from product name).

**Script behavior:**

1. Load PRODUCT_VIBES from data file.
2. Read all `Product` rows from DB.
3. For each DB product:
   - Look up by exact `slug` → if hit, set `vibes` to mapped array.
   - If no slug hit, attempt name-prefix match against PDF row names → log "near match (NN% confidence)".
   - If no match, log as ORPHAN.
4. Print three reports:
   - **Matched** (count, sample of 3): will set vibes.
   - **Near matches** (full list with confidence): require human review before write.
   - **Orphans** (full list): will get `vibes: []` (invisible from vibe filter — known and acceptable).
   - **Unused PDF rows** (in PDF but no DB match): full list, requires human review.
5. With `--dry-run`: stop after reports. Without: prompt "proceed? (y/n)" then write.

Script is idempotent (re-running with same data is a no-op).

### 7. Storefront vibe-categories cleanup

After migration runs in prod and storefront switches to `?vibe=` (deploy together), `apps/storefront/src/lib/vibe-categories.ts` is deleted. The new flow is:

```
User clicks "Salt" vibe circle on /products
  → updateParams({ vibe: 'salt-on-skin' })
  → URL: /products?vibe=salt-on-skin
  → useInfiniteProducts({ vibe: 'salt-on-skin' })
  → API: GET /products?vibe=salt-on-skin
  → service: WHERE vibes ARRAY_CONTAINS 'salt-on-skin'
  → grid renders products tagged with that vibe
```

## Data Flow

```
ADMIN flow (new):
  Admin opens product form
  → existing Category dropdown shows current categoryId (unchanged)
  → NEW Vibes multi-select shows current product.vibes (e.g., ['salt-on-skin'])
  → admin checks/unchecks vibes
  → submit → PUT /products/:id with { vibes: [...], categoryId, ... }
  → API persists vibes array
  → storefront filter updates on next fetch

STOREFRONT flow (changed):
  User clicks Salt circle
  → URL ?vibe=salt-on-skin
  → API GET /products?vibe=salt-on-skin
  → WHERE vibes hasSome ['salt-on-skin']  (new)
  vs. today:
  → derive [t-shirts, shirts] from vibe-categories.ts
  → API GET /products?category=t-shirts,shirts
  → WHERE category.slug IN ('t-shirts', 'shirts')
```

## Error / Edge Cases

- **Product with empty `vibes` array**: invisible from vibe filter. Visible from `/products` (no filter) and from category filter (untouched). Acceptable — orphan products show up in admin's product list with no vibes; admin can tag them when ready.
- **Unknown vibe slug in `?vibe=` URL**: API Zod validation rejects (400). Storefront's `isKnownVibe` already guards client-side.
- **Migration re-run**: idempotent — sets the same array values. Safe.
- **Product created via admin without vibes**: defaults to `[]`. Same as orphan.
- **Discount.applicableCategories**: still works exactly as today, untouched.
- **Old `?category=` URL**: still works — filter coexists with `?vibe=`.

## Risks

| Risk                                                | Likelihood                        | Mitigation                                                                                                                |
| --------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| DB products not in PDF (orphans)                    | Likely (new SKUs added since PDF) | Dry-run report; user reviews; orphans get `[]` and remain visible from non-vibe entry points                              |
| PDF row name doesn't match DB product slug          | Possible (truncation, renames)    | Name-prefix fallback with confidence; require human review for near matches                                               |
| Admin user mid-edit during deploy                   | Low (single deploy, fast)         | Single PR; deploy API + admin + storefront together; no schema removal so old admin still works                           |
| Storefront cache returns old shape (no vibes field) | Low                               | New field is optional; if vibes not in payload, vibe filter just returns nothing temporarily; auto-resolves on next fetch |
| Migration script picks wrong vibe set for a product | Low                               | Dry-run shows full mapping for review before write                                                                        |

**Risks NOT applicable** (because nothing is destroyed):

- Discount breakage (`applicableCategories` untouched)
- Checkout/order breakage (`categoryId` untouched)
- Search breakage (category-name search untouched)
- Test fixture rewrites (no `categoryId` removal)
- Hard rollback (revert is just `DROP COLUMN vibes` — Prisma migration down)

## Testing

**Unit (API):**

- `productQuerySchema` accepts/rejects vibe values per the `VIBES` enum
- `productService.listProducts` produces `where: { vibes: { has: 'salt-on-skin' } }` when query.vibe is set
- `productService.createProduct` persists vibes array

**Migration script:**

- Dry-run mode prints reports without writing
- Re-running after a successful run is a no-op (idempotent)
- Orphan and near-match reports are accurate against a fixture DB

**Manual smoke (post-deploy):**

- Admin: open existing product → Vibes multi-select shows correct values per PDF; toggle a vibe → save → reload → persists
- Storefront: click each of 5 vibe circles → grid filters; counts roughly match PDF (CLD ~14, SLT ~22, GLD ~16, WLD ~22, NEO ~20)
- Storefront: header/footer/mobile/search shows 5 vibe links (no FLIGHT)
- Direct visit to `/products?vibe=salt-on-skin` works
- Direct visit to `/products?vibe=garbage` → 400 from API, gracefully handled
- Discount with `applicableCategories` still applies at checkout (no regression)

## Files Touched

**Add:**

- `packages/shared/src/enums/vibe.ts`
- `packages/db/src/data/product-vibes.ts` (PDF mapping)
- `packages/db/src/scripts/backfill-product-vibes.ts`
- Prisma migration adding `vibes` column

**Modify:**

- `packages/db/prisma/schema.prisma` (add `vibes String[]`)
- `packages/shared/src/schemas/product.schema.ts` (accept vibes on create/update + `?vibe=` filter)
- `packages/shared/src/types/index.ts` (`ProductListParams.vibe?: Vibe`; `Product.vibes: string[]`)
- `packages/shared/src/index.ts` (re-export `VIBES`, `Vibe`, `isVibe`)
- `apps/api/src/services/product.service.ts` (vibe filter in listProducts; persist vibes in create/update)
- `apps/admin/src/components/products/product-form.tsx` (vibe multi-select)
- `apps/storefront/src/types/index.ts` (`Product.vibes`)
- `apps/storefront/src/hooks/use-products.ts` (serialize `vibe` in query builder)
- `apps/storefront/src/app/(shop)/products/page.tsx` (read `vibe` URL → query; drop indirect category lookup; trim VIBES to 5)
- `apps/storefront/src/components/layout/header.tsx` (drop FLIGHT entry)
- `apps/storefront/src/components/layout/footer.tsx` (drop FLIGHT)
- `apps/storefront/src/components/layout/mobile-menu.tsx` (drop FLIGHT)
- `apps/storefront/src/components/layout/search-overlay.tsx` (drop FLIGHT)
- `packages/db/package.json` (add `backfill-vibes` script)

**Delete:**

- `apps/storefront/src/lib/vibe-categories.ts` (replaced by real product data)

**Untouched (intentional):**

- `Category`, `ProductCategory`, `Product.categoryId`, `DiscountCode.applicableCategories` Prisma models
- `apps/api/src/services/category.service.ts`, `apps/api/src/routes/category.routes.ts`
- `checkout.service.ts`, `order.service.ts`, `search.service.ts` (all category logic)
- `apps/admin/src/app/(admin)/categories/page.tsx`
- `apps/admin/src/hooks/use-categories.ts`
- `BlogCategory`, blog routes
