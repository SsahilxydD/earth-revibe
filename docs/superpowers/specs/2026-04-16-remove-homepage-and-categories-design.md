# Remove Homepage & Categories — Vibes Become The Filter

**Date:** 2026-04-16
**Scope:** apps/storefront (primary), packages/shared (1 schema change), apps/api (1 service change)
**Status:** Awaiting user approval

## Goal

The site no longer has a homepage. Visiting `/` redirects to `/products`. The `/categories` and `/categories/[slug]` routes are removed. The 6 trip-vibe circles already shown at the top of `/products` become a real filter (currently visual-only).

## Why

Per user direction:

- Homepage will be "gone forever" — every entry hits the catalog directly.
- The category browse experience is being killed at the user-facing layer; the catalog is the single product-display surface.
- The 6 vibes (Above the Clouds, Salt on Skin, Golden Hour Gang, Into the Wild, Neon Nomads, Flight Mode) replace categories as the primary discovery axis.

## Non-Goals

- No changes to the Prisma `Category` model, the `/api/v1/categories` endpoint, or the admin app's category management. Categories remain in the DB so products keep their `categoryId` linkage.
- No new vibe column on the Product table. Vibes live as a TS constant in the storefront.
- No changes to search, blog, account, cart, or checkout flows beyond replacing dead `/categories/...` href values.
- No SEO redirects from `/categories/<slug>` to `/products` (the routes simply 404 — Next.js default). If we want 301s for SEO preservation, that's a follow-up.

## Architecture

### 1. Root → catalog

`apps/storefront/src/app/(shop)/page.tsx` becomes a 5-line server component that calls Next.js's `redirect('/products')`. The whole "Trip Vibe" landing implementation is deleted. URL bar changes from `/` to `/products` on first hit (308 permanent).

### 2. Categories routes deleted

Delete:

- `apps/storefront/src/app/(shop)/categories/page.tsx`
- `apps/storefront/src/app/(shop)/categories/[slug]/page.tsx`
- The `categories/` directory itself

### 3. Orphaned homepage components deleted

Delete `apps/storefront/src/components/home/` entirely (hero, new-arrivals, collection-banner, plus any siblings). Verified no other consumers.

### 4. Vibe → category mapping constant

New file `apps/storefront/src/lib/vibe-categories.ts`:

```ts
// Maps each trip-vibe slug to the underlying category slugs that should
// be returned when the user selects that vibe. This mapping is
// intentionally a flat config so product/marketing can revise it
// without code changes elsewhere.
export const VIBE_TO_CATEGORIES: Record<string, readonly string[]> = {
  'above-the-clouds': ['outerwear'],
  'salt-on-skin': ['t-shirts', 'shirts'],
  'golden-hour-gang': ['shirts', 't-shirts'],
  'into-the-wild': ['cargo-pants', 'outerwear'],
  'neon-nomads': ['polos', 'trousers'],
  'flight-mode': ['shirts', 't-shirts', 'polos', 'cargo-pants', 'trousers', 'outerwear'],
};

export const VIBE_SLUGS = Object.keys(VIBE_TO_CATEGORIES);
```

Mapping is a placeholder — user will refine slug lists later. The plumbing supports any mapping; only the constant changes.

### 5. Wire the vibe filter on `/products`

In `apps/storefront/src/app/(shop)/products/page.tsx`:

- Read `vibe` from `useSearchParams()` (currently the page reads it nowhere — `activeVibe` is local React state with no URL persistence).
- When a vibe circle is clicked, write `?vibe=<slug>` into the URL via the existing `updateParams()` helper. Toggle off when re-clicked.
- Highlight the active circle based on the URL value (not local state).
- When `vibe` is set, look up `VIBE_TO_CATEGORIES[vibe]` and pass that array as `category` in the query (joined comma-separated for the API call). When `vibe` is unset, pass nothing.
- Drop the local `useState<string>('')` for `activeVibe` and the dead-code comment ("visual-only for now").
- Active filter chip section gets a vibe chip when `vibe` is set, with an X to clear it.

### 6. FilterSidebar loses the category dropdown

In `apps/storefront/src/components/product/filter-sidebar.tsx`:

- Remove the category dropdown UI entirely.
- Remove `category` from the `FilterState` type and its consumers (the page passes `currentFilters.category`, which becomes dead).
- Keep size, color, price filters.

The page's `category` URL param logic stays only as a vehicle for the vibe-derived category list (set internally, never via UI).

### 7. API — single tiny change to support multi-category

The product list endpoint currently only takes one category slug. To honor a vibe that maps to N categories in one query, extend it:

**`packages/shared/src/schemas/product.schema.ts`** — change line 37:

```ts
// before
category: z.string().optional(),
// after
category: z.preprocess(
  (v) => (typeof v === 'string' && v.includes(',') ? v.split(',') : v),
  z.union([z.string(), z.array(z.string())]).optional()
),
```

**`apps/api/src/services/product.service.ts`** (or wherever the WHERE is built) — change the category clause from a slug equality to an `IN` when an array is provided:

```ts
// before (sketch)
if (query.category) where.category = { slug: query.category };
// after (sketch)
if (query.category) {
  const slugs = Array.isArray(query.category) ? query.category : [query.category];
  where.category = { slug: { in: slugs } };
}
```

This is fully backward-compatible: a single string still works, so any other consumers (admin, etc.) are unaffected.

### 8. Storefront link rewrites

Every `/categories/...` href in the storefront is replaced with `/products` (or `/products?vibe=<slug>` where the destination clearly maps to a vibe — but defaulting to `/products` is safe everywhere).

Files to update:

- `components/layout/header.tsx` — replace the 6 category nav items with the 6 vibe nav items, each linking to `/products?vibe=<slug>`.
- `components/layout/footer.tsx` — replace category links with vibe links (same scheme).
- `components/layout/mobile-menu.tsx` — same as header.
- `components/layout/search-overlay.tsx` — replace quick-link tiles with vibes; the dynamic category list at line 177 also goes to `/products?vibe=<slug>` (or just `/products` if we kill that section — see open question below).
- `components/product/swipeable-product-wrapper.tsx:52` — change fallback from `/categories/${categorySlug}` to `/products`.
- `app/(shop)/cart/page.tsx`, `app/(shop)/checkout/page.tsx`, `app/(shop)/checkout/confirmation/page.tsx`, `app/(shop)/account/wishlist/page.tsx`, `app/(shop)/account/orders/page.tsx` — every empty-state CTA pointing to `/categories/new-arrivals` becomes `/products`.

### 9. Sitemap & prefetch cleanup

- `app/sitemap.ts:45,161` — drop the per-category URL section. Keep `/products`. Drop `/` if listed (it's now a redirect).
- `providers/prefetch-provider.tsx:31` and `hooks/use-products.ts:135` — these prefetch the categories list for the FilterSidebar dropdown. Since the dropdown is removed, delete the prefetch and the unused `useCategories` hook (verify no other consumers first).

## Data Flow

```
User hits /
  → server component redirect → /products

User on /products clicks "Salt" vibe circle
  → updateParams({ vibe: 'salt-on-skin' })
  → URL becomes /products?vibe=salt-on-skin
  → page derives categorySlugs = VIBE_TO_CATEGORIES['salt-on-skin'] = ['t-shirts', 'shirts']
  → useInfiniteProducts({ category: categorySlugs, ... })
  → API: WHERE category.slug IN ('t-shirts', 'shirts')
  → grid re-renders with filtered products

User clicks active "Salt" again
  → updateParams({ vibe: undefined })
  → URL becomes /products
  → all products
```

## Error / Edge Cases

- **Unknown vibe in URL** (e.g., `?vibe=garbage`): treat as no vibe filter. Don't crash. The vibe circle row shows nothing as active.
- **Old links to `/categories/xyz`**: 404. Acceptable per non-goals. The Next.js default `not-found.tsx` already exists.
- **Old links to `/products?vibe=<slug>` from before this change**: now actually filter. Win.
- **Old links with `?category=foo`**: still work (single string still accepted by the schema). Nothing breaks for direct category URLs even though no UI surfaces them.
- **Empty result for a vibe**: existing "No products found" state handles it; "Clear all" now also clears `vibe`.

## Testing

- **Manual:** hit `/` → lands on `/products`. Click each vibe circle → URL updates, products filter, chip appears, X clears it. Toggle off → all products. Hit `/categories` and `/categories/anything` → 404. Open header / footer / mobile-menu → all category links replaced with vibe links and they work.
- **Unit (API):** add a test for `productQuerySchema` accepting a comma-separated string and producing an array. Add a service test for the `IN` clause when category is an array.
- **No regression:** existing product filters (size, color, price, sort) still work; product card → PDP navigation still works; cart/checkout/account empty states still render and their CTAs land on `/products`.

## Risks & Trade-offs

- **SEO:** killing `/categories/<slug>` without 301 redirects loses any search ranking those URLs accumulated. User's call — flagged in non-goals. Easy follow-up.
- **`isFeatured` / "New Arrivals" / "Bestsellers":** the header used to surface these as virtual category slugs. After this change those discovery surfaces disappear from the UI entirely. If product wants them back later, they'd be additional vibe-like filters on the catalog (sort by `isFeatured` already exists).
- **Mapping accuracy:** the strawman vibe→category mapping is a guess. Until refined, vibes will return the products in the listed categories — which may not match the marketing intent. Easy fix: edit one constant.

## Open Question (one)

**Search overlay quick-links section** (`components/layout/search-overlay.tsx:20-26` + the dynamic category list at line 177): the simplest move is to replace the 6 quick-links with the 6 vibes (mirrors header). The dynamic category list at line 177 either gets repurposed to vibes too or removed.

Default plan unless user objects: **replace the static quick-links with the 6 vibes; remove the dynamic category list section entirely** (it was rendering categories the user wants killed).

## Files Touched (summary)

**Delete:**

- `apps/storefront/src/components/home/` (whole directory)
- `apps/storefront/src/app/(shop)/categories/` (whole directory)

**Replace contents:**

- `apps/storefront/src/app/(shop)/page.tsx` — becomes a redirect

**Create:**

- `apps/storefront/src/lib/vibe-categories.ts`

**Modify:**

- `apps/storefront/src/app/(shop)/products/page.tsx` — wire vibe filter
- `apps/storefront/src/components/product/filter-sidebar.tsx` — drop category dropdown
- `apps/storefront/src/components/layout/header.tsx` — vibe links
- `apps/storefront/src/components/layout/footer.tsx` — vibe links
- `apps/storefront/src/components/layout/mobile-menu.tsx` — vibe links
- `apps/storefront/src/components/layout/search-overlay.tsx` — vibe links
- `apps/storefront/src/components/product/swipeable-product-wrapper.tsx` — fallback to `/products`
- `apps/storefront/src/app/(shop)/cart/page.tsx`
- `apps/storefront/src/app/(shop)/checkout/page.tsx`
- `apps/storefront/src/app/(shop)/checkout/confirmation/page.tsx`
- `apps/storefront/src/app/(shop)/account/wishlist/page.tsx`
- `apps/storefront/src/app/(shop)/account/orders/page.tsx`
- `apps/storefront/src/app/sitemap.ts`
- `apps/storefront/src/providers/prefetch-provider.tsx`
- `apps/storefront/src/hooks/use-products.ts`
- `packages/shared/src/schemas/product.schema.ts` — `category` accepts comma-separated
- `apps/api/src/services/product.service.ts` — WHERE uses `IN` when array
