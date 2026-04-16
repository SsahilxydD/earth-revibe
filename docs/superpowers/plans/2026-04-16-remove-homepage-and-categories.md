# Remove Homepage & Categories — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the storefront homepage and the `/categories` routes; make `/` redirect to `/products`; wire the existing 6 trip-vibe circles on `/products` into a real category filter via a TS mapping constant.

**Architecture:** Storefront-only feature change with one tiny API extension (multi-slug category filter). The 6 vibes map to existing category slugs through a single TS config (`vibe-categories.ts`). The product list endpoint accepts a comma-separated `category` param backed by a Prisma `slug IN (...)` clause. URL state for vibe lives in `?vibe=<slug>` so it's shareable.

**Tech Stack:** Next.js 16 App Router (React 19), Express 5 + Prisma 7, Zod 4, TanStack Query, Vitest.

**Spec:** [docs/superpowers/specs/2026-04-16-remove-homepage-and-categories-design.md](../specs/2026-04-16-remove-homepage-and-categories-design.md)

---

## File Structure

**API / shared (multi-slug support):**

- Modify `packages/shared/src/schemas/product.schema.ts` — `category` accepts `string | string[]`
- Modify `apps/api/src/services/product.service.ts` — WHERE clause uses `slug IN (...)` for arrays
- Modify `apps/api/src/services/__tests__/product.service.test.ts` — add multi-category test, update existing test to match current `AND.OR` shape

**Storefront — new files:**

- Create `apps/storefront/src/lib/vibe-categories.ts` — vibe→category-slugs mapping

**Storefront — replace contents:**

- `apps/storefront/src/app/(shop)/page.tsx` — becomes a redirect to `/products`

**Storefront — modify:**

- `apps/storefront/src/app/(shop)/products/page.tsx` — wire vibe filter from URL
- `apps/storefront/src/components/product/filter-sidebar.tsx` — drop `useCategories` import + `category` from `FilterState`
- `apps/storefront/src/components/layout/header.tsx` — vibe nav links + remove dead `isHomepage` branch
- `apps/storefront/src/components/layout/footer.tsx` — vibe links in SHOP section
- `apps/storefront/src/components/layout/mobile-menu.tsx` — vibe links in nav
- `apps/storefront/src/components/layout/search-overlay.tsx` — vibe quick-links, remove dynamic category list
- `apps/storefront/src/components/product/swipeable-product-wrapper.tsx` — fallback to `/products`
- `apps/storefront/src/app/(shop)/cart/page.tsx` (2 hrefs)
- `apps/storefront/src/app/(shop)/checkout/page.tsx` (1 href)
- `apps/storefront/src/app/(shop)/checkout/confirmation/page.tsx` (1 href)
- `apps/storefront/src/app/(shop)/account/wishlist/page.tsx` (1 href)
- `apps/storefront/src/app/(shop)/account/orders/page.tsx` (1 href)
- `apps/storefront/src/app/sitemap.ts` — drop categories section
- `apps/storefront/src/providers/prefetch-provider.tsx` — drop categories prefetch
- `apps/storefront/src/hooks/use-products.ts` — drop `useCategories` + `productKeys.categories`; update `buildProductQuery` for array category
- `packages/shared/src/types/index.ts` — `ProductListParams.category` accepts string | string[]

**Storefront — delete:**

- `apps/storefront/src/app/(shop)/categories/` (whole directory)
- `apps/storefront/src/components/home/` (whole directory — verified no external consumers)

---

## Task 1: API schema — `category` accepts string | string[]

**Files:**

- Modify: `packages/shared/src/schemas/product.schema.ts:36-51`

- [ ] **Step 1: Update the schema**

In `packages/shared/src/schemas/product.schema.ts`, replace line 37:

```ts
// before (line 37)
category: z.string().optional(),

// after
category: z
  .preprocess(
    (v) => (typeof v === 'string' && v.includes(',') ? v.split(',').filter(Boolean) : v),
    z.union([z.string(), z.array(z.string())]).optional()
  ),
```

This preserves single-string callers (admin app, server-side fetches) while enabling `?category=t-shirts,shirts` from the storefront. The `filter(Boolean)` drops empty segments from a trailing comma.

- [ ] **Step 2: Build shared package**

Run: `pnpm --filter @earth-revibe/shared build`
Expected: success, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schemas/product.schema.ts
git commit -m "feat(shared): productQuerySchema category accepts string | string[]"
```

---

## Task 2: API service — WHERE uses `slug IN (...)` for arrays

**Files:**

- Modify: `apps/api/src/services/product.service.ts:46-55`
- Test: `apps/api/src/services/__tests__/product.service.test.ts:154-162`

- [ ] **Step 1: Update the failing test for the existing single-string case to match the actual `AND.OR` shape**

In `apps/api/src/services/__tests__/product.service.test.ts`, replace lines 154-162 with:

```ts
it('filters by category slug when category is a single string', async () => {
  vi.mocked(prisma.product.findMany).mockResolvedValue([]);
  vi.mocked(prisma.product.count).mockResolvedValue(0);

  await productService.listProducts(makeProductQuery({ category: 'tops' }));

  const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
  expect(call.where.AND).toEqual([
    {
      OR: [
        { category: { slug: 'tops' } },
        { productCategories: { some: { category: { slug: 'tops' } } } },
      ],
    },
  ]);
});

it('filters by IN clause when category is an array of slugs', async () => {
  vi.mocked(prisma.product.findMany).mockResolvedValue([]);
  vi.mocked(prisma.product.count).mockResolvedValue(0);

  await productService.listProducts(makeProductQuery({ category: ['t-shirts', 'shirts'] as any }));

  const call = vi.mocked(prisma.product.findMany).mock.calls[0][0] as any;
  expect(call.where.AND).toEqual([
    {
      OR: [
        { category: { slug: { in: ['t-shirts', 'shirts'] } } },
        { productCategories: { some: { category: { slug: { in: ['t-shirts', 'shirts'] } } } } },
      ],
    },
  ]);
});
```

- [ ] **Step 2: Run the new array test to confirm it fails**

Run: `pnpm --filter @earth-revibe/api test -- product.service.test.ts`
Expected: the "IN clause when category is an array" test FAILS. The single-string test should now PASS (we corrected the assertion to match the existing `AND.OR` shape). Confirm the failure on the array test is shape-related (received `slug: ['t-shirts', 'shirts']` instead of `slug: { in: [...] }`), not setup-related.

- [ ] **Step 3: Update the service to handle arrays**

In `apps/api/src/services/product.service.ts`, replace lines 46-55 with:

```ts
if (category) {
  // Match products by primary category OR via the many-to-many join table.
  // `category` is `string` (single slug) or `string[]` (vibe → multi-category).
  const slugFilter = Array.isArray(category) ? { in: category } : category;
  const categoryFilter: Prisma.ProductWhereInput = {
    OR: [
      { category: { slug: slugFilter } },
      { productCategories: { some: { category: { slug: slugFilter } } } },
    ],
  };
  where.AND = [...((where.AND as Prisma.ProductWhereInput[]) || []), categoryFilter];
}
```

- [ ] **Step 4: Run the full product service suite to confirm both new tests pass and no regression**

Run: `pnpm --filter @earth-revibe/api test -- product.service.test.ts`
Expected: PASS — every test in the file is green, including both the single-string and IN-clause category tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/services/product.service.ts apps/api/src/services/__tests__/product.service.test.ts
git commit -m "feat(api): products list accepts category as array (slug IN clause)"
```

---

## Task 3: Storefront — vibe → categories TS constant

**Files:**

- Create: `apps/storefront/src/lib/vibe-categories.ts`

- [ ] **Step 1: Create the constant file**

Create `apps/storefront/src/lib/vibe-categories.ts` with:

```ts
/**
 * Maps each trip-vibe slug to the category slugs that should be returned
 * when the user selects that vibe on /products.
 *
 * The mapping is intentionally a flat config so product/marketing can
 * revise it without touching the page or filter wiring. Storefront-only.
 *
 * STRAWMAN: refine slug lists as the catalog evolves.
 */
export const VIBE_TO_CATEGORIES: Record<string, readonly string[]> = {
  'above-the-clouds': ['outerwear'],
  'salt-on-skin': ['t-shirts', 'shirts'],
  'golden-hour-gang': ['shirts', 't-shirts'],
  'into-the-wild': ['cargo-pants', 'outerwear'],
  'neon-nomads': ['polos', 'trousers'],
  'flight-mode': ['shirts', 't-shirts', 'polos', 'cargo-pants', 'trousers', 'outerwear'],
};

export const VIBE_SLUGS = Object.keys(VIBE_TO_CATEGORIES);

export function isKnownVibe(slug: string | null | undefined): slug is string {
  return !!slug && slug in VIBE_TO_CATEGORIES;
}

export function categoriesForVibe(slug: string | null | undefined): string[] | undefined {
  if (!isKnownVibe(slug)) return undefined;
  return [...VIBE_TO_CATEGORIES[slug]];
}
```

- [ ] **Step 2: Type-check storefront**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success, no TS errors.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/lib/vibe-categories.ts
git commit -m "feat(storefront): add vibe → categories mapping constant"
```

---

## Task 4: Storefront — `ProductListParams.category` accepts string | string[]

**Files:**

- Modify: `packages/shared/src/types/index.ts:388`
- Modify: `apps/storefront/src/hooks/use-products.ts:25-44`

- [ ] **Step 1: Widen the type**

In `packages/shared/src/types/index.ts` line 388, change:

```ts
// before
category?: string;
// after
category?: string | string[];
```

- [ ] **Step 2: Update the storefront query builder to serialize arrays**

In `apps/storefront/src/hooks/use-products.ts` line 31, change:

```ts
// before
if (params.category) searchParams.set('category', params.category);
// after
if (params.category) {
  const value = Array.isArray(params.category) ? params.category.join(',') : params.category;
  if (value) searchParams.set('category', value);
}
```

- [ ] **Step 3: Build shared and type-check storefront**

Run: `pnpm --filter @earth-revibe/shared build && pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts apps/storefront/src/hooks/use-products.ts
git commit -m "feat(shared,storefront): ProductListParams.category accepts string | string[]"
```

---

## Task 5: Wire vibe filter on `/products`

**Files:**

- Modify: `apps/storefront/src/app/(shop)/products/page.tsx:1-178`

- [ ] **Step 1: Replace the local `VIBES` constant with one that imports the canonical vibe slugs**

In `apps/storefront/src/app/(shop)/products/page.tsx`, replace lines 15-49 (the `VIBES` const and its preceding comment) with:

```ts
import { categoriesForVibe, isKnownVibe } from '@/lib/vibe-categories';

// 6 trip vibes — visual labels + Unsplash placeholders. The slug field
// is the source of truth and matches keys in VIBE_TO_CATEGORIES.
const VIBES = [
  {
    label: 'Clouds',
    value: 'above-the-clouds',
    img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=80&fm=jpg',
  },
  {
    label: 'Salt',
    value: 'salt-on-skin',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=80&fm=jpg',
  },
  {
    label: 'Gold',
    value: 'golden-hour-gang',
    img: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=200&q=80&fm=jpg',
  },
  {
    label: 'Wild',
    value: 'into-the-wild',
    img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&q=80&fm=jpg',
  },
  {
    label: 'Neon',
    value: 'neon-nomads',
    img: 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=200&q=80&fm=jpg',
  },
  {
    label: 'Flight',
    value: 'flight-mode',
    img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=200&q=80&fm=jpg',
  },
] as const;
```

- [ ] **Step 2: Make `vibe` URL-driven (replace local state) and feed it into the products query**

In the same file, find the `ProductsContent` function (starts at line 71). Replace these spans:

a) Drop the local vibe state. Replace line 85:

```ts
// before
const [activeVibe, setActiveVibe] = useState<string>('');
// after
const vibeParam = searchParams.get('vibe');
const activeVibe = isKnownVibe(vibeParam) ? vibeParam : '';
```

b) Pipe vibe-derived categories into the query. Replace the `category` line inside `queryParams` (line 93) AND add `activeVibe` to the `useMemo` dependency array (line 103):

```ts
// before
const queryParams = useMemo(
  () => ({
    category: category || undefined,
    sortBy,
    ...
  }),
  [category, sortBy, sortOrder, minPrice, maxPrice, size, color, search]
);
// after
const queryParams = useMemo(
  () => ({
    category: activeVibe
      ? categoriesForVibe(activeVibe)
      : (category || undefined),
    sortBy,
    ...
  }),
  [activeVibe, category, sortBy, sortOrder, minPrice, maxPrice, size, color, search]
);
```

(Leave the other fields inside the `useMemo` body unchanged — only the `category` line and the dependency array change.)

c) Drop the dead "visual-only" comment + alias. Replace lines 158-159:

```ts
// before
// Vibe is visual-only for now — products are not filtered by vibe yet
const allProducts = rawProducts;
// after
const allProducts = rawProducts;
```

d) Make vibe circle clicks update the URL. Replace the `onClick` for vibe buttons (line 370):

```ts
// before
onClick={() => setActiveVibe(isActive ? '' : v.value)}
// after
onClick={() => updateParams({ vibe: isActive ? undefined : v.value })}
```

e) Make "Clear all" clear the vibe too. Replace lines 174-177:

```ts
// before
const clearAllFilters = () => {
  setActiveVibe('');
  router.push('/products', { scroll: false });
};
// after
const clearAllFilters = () => {
  router.push('/products', { scroll: false });
};
```

- [ ] **Step 3: Add a vibe chip to the active-filter chip row**

In `apps/storefront/src/app/(shop)/products/page.tsx`, update the `hasActiveFilters` computation (line 172):

```ts
// before
const hasActiveFilters = !!(minPrice || maxPrice || size || color || category);
// after
const hasActiveFilters = !!(minPrice || maxPrice || size || color || category || activeVibe);
```

Then add a vibe chip block immediately after the opening `{hasActiveFilters && (` chip section (insert it as the first chip, before the existing `{category && ...}` block at line 429). New chip block:

```tsx
{
  activeVibe && (
    <button
      onClick={() => updateParams({ vibe: undefined })}
      style={{
        display: 'inline-flex',
        height: 28,
        padding: '0 12px',
        gap: 6,
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 400,
          color: '#000',
          letterSpacing: 0.5,
          textTransform: 'capitalize',
        }}
      >
        Vibe: {VIBES.find((v) => v.value === activeVibe)?.label ?? activeVibe}
      </span>
      <X size={10} color="#999" />
    </button>
  );
}
```

- [ ] **Step 4: Drop the now-unused `useState` import**

Check the import on line 3. If `useState` is no longer referenced anywhere in the file, remove it from the named imports:

```ts
// before
import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from 'react';
// after
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
```

If you find any remaining `useState` use, leave the import as-is.

- [ ] **Step 5: Type-check storefront**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success.

- [ ] **Step 6: Manual smoke test**

Run: `pnpm --filter @earth-revibe/storefront dev`
In the browser:

1. Navigate to `http://localhost:3000/products` → all products visible.
2. Click the "Salt" vibe circle → URL becomes `/products?vibe=salt-on-skin`, grid filters to t-shirts + shirts, "Vibe: Salt" chip appears.
3. Click "Salt" again → URL clears `vibe`, all products return.
4. Click "Salt" then click the chip's X → URL clears, all products return.
5. Visit `/products?vibe=garbage` directly → no vibe is highlighted, all products show, no crash.

- [ ] **Step 7: Commit**

```bash
git add apps/storefront/src/app/(shop)/products/page.tsx
git commit -m "feat(storefront): wire vibe circles on /products as real category filter"
```

---

## Task 6: Drop the dead category dropdown plumbing in FilterSidebar

**Files:**

- Modify: `apps/storefront/src/components/product/filter-sidebar.tsx:1-49`
- Modify: `apps/storefront/src/app/(shop)/products/page.tsx` (FilterState consumer)

- [ ] **Step 1: Remove the unused hook + the `category` field from FilterState**

In `apps/storefront/src/components/product/filter-sidebar.tsx`:

a) Remove line 5 (the import) and line 49 (the call):

```ts
// remove
import { useCategories } from '@/hooks/use-products';
// remove (line 49 inside FilterSidebar):
useCategories();
// also remove the comment on line 48: "Keep categories hook for potential future use"
```

b) Remove `category` from the `FilterState` interface (lines 33-39):

```ts
// before
export interface FilterState {
  category: string;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  size: string;
  color: string;
}
// after
export interface FilterState {
  minPrice: number | undefined;
  maxPrice: number | undefined;
  size: string;
  color: string;
}
```

c) Remove the `category` line from `clearAll` (line 67):

```ts
// before
const clearAll = () => {
  onFilterChange({
    category: filters.category,
    minPrice: undefined,
    maxPrice: undefined,
    size: '',
    color: '',
  });
};
// after
const clearAll = () => {
  onFilterChange({
    minPrice: undefined,
    maxPrice: undefined,
    size: '',
    color: '',
  });
};
```

- [ ] **Step 2: Update the FilterSidebar consumer on /products**

In `apps/storefront/src/app/(shop)/products/page.tsx`, find the `currentFilters` object (line 171) and the `handleFilterChange` callback (lines 133-144).

a) Drop `category` from `currentFilters` (line 171):

```ts
// before
const currentFilters: FilterState = { category, minPrice, maxPrice, size, color };
// after
const currentFilters: FilterState = { minPrice, maxPrice, size, color };
```

b) Drop the `category` mapping from `handleFilterChange` (lines 133-144):

```ts
// before
const handleFilterChange = useCallback(
  (filters: FilterState) => {
    updateParams({
      category: filters.category || undefined,
      minPrice: filters.minPrice !== undefined ? String(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice !== undefined ? String(filters.maxPrice) : undefined,
      size: filters.size || undefined,
      color: filters.color || undefined,
    });
  },
  [updateParams]
);
// after
const handleFilterChange = useCallback(
  (filters: FilterState) => {
    updateParams({
      minPrice: filters.minPrice !== undefined ? String(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice !== undefined ? String(filters.maxPrice) : undefined,
      size: filters.size || undefined,
      color: filters.color || undefined,
    });
  },
  [updateParams]
);
```

Note: the page still reads `category` from the URL (line 76) so direct `?category=foo` URLs keep working — only the UI surface (sidebar) is removed.

- [ ] **Step 3: Type-check storefront**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/components/product/filter-sidebar.tsx apps/storefront/src/app/(shop)/products/page.tsx
git commit -m "refactor(storefront): drop category dropdown from FilterSidebar"
```

---

## Task 7: Replace homepage with redirect to `/products`

**Files:**

- Modify (full rewrite): `apps/storefront/src/app/(shop)/page.tsx`

- [ ] **Step 1: Replace the entire file**

Overwrite `apps/storefront/src/app/(shop)/page.tsx` with:

```tsx
import { redirect } from 'next/navigation';

// The dedicated homepage is gone — `/` is now the catalog. This is a
// permanent (308) server-side redirect to /products.
export default function HomePage(): never {
  redirect('/products');
}
```

- [ ] **Step 2: Manual verification**

Restart dev server if needed, hit `http://localhost:3000/` → URL becomes `/products` immediately, products page renders.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/(shop)/page.tsx
git commit -m "feat(storefront): redirect / to /products (homepage removed)"
```

---

## Task 8: Delete the `/categories` routes

**Files:**

- Delete: `apps/storefront/src/app/(shop)/categories/page.tsx`
- Delete: `apps/storefront/src/app/(shop)/categories/[slug]/page.tsx`
- Delete: `apps/storefront/src/app/(shop)/categories/` directory itself

- [ ] **Step 1: Delete the routes**

Run from repo root:

```bash
rm -rf apps/storefront/src/app/\(shop\)/categories
```

- [ ] **Step 2: Type-check storefront**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success. (Stale `/categories/...` href strings throughout the storefront are just `string` values — TS won't complain. Those get rewritten in Tasks 10-15.)

- [ ] **Step 3: Manual verification**

In the browser, hit `http://localhost:3000/categories` → 404 (Next.js default not-found). Hit `http://localhost:3000/categories/shirts` → 404. This is expected per the spec's non-goal "no SEO redirects".

- [ ] **Step 4: Commit**

```bash
git add -A apps/storefront/src/app/\(shop\)/categories
git commit -m "feat(storefront): delete /categories and /categories/[slug] routes"
```

---

## Task 9: Delete orphaned homepage components

**Files:**

- Delete: `apps/storefront/src/components/home/` (whole directory)

Verified earlier: zero external consumers of `@/components/home/*` remain after Task 7.

- [ ] **Step 1: Confirm zero consumers (sanity check)**

Run: `grep -rn "components/home" apps/storefront/src --include="*.tsx" --include="*.ts" | grep -v "src/components/home/"`
Expected: no output.

- [ ] **Step 2: Delete the directory**

```bash
rm -rf apps/storefront/src/components/home
```

- [ ] **Step 3: Type-check + lint**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit && pnpm --filter @earth-revibe/storefront lint`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add -A apps/storefront/src/components/home
git commit -m "chore(storefront): delete unused components/home/ (homepage gone)"
```

---

## Task 10: Header — replace category nav with vibes; drop dead `isHomepage` branch

**Files:**

- Modify: `apps/storefront/src/components/layout/header.tsx:13-21,42-43,73-91,99-104`

- [ ] **Step 1: Replace `NAV_LINKS` with vibe-driven nav**

In `apps/storefront/src/components/layout/header.tsx`, replace lines 13-21:

```ts
// before
const NAV_LINKS = [
  { label: 'NEW ARRIVALS', href: '/categories/new-arrivals' },
  { label: 'BESTSELLERS', href: '/categories/bestsellers' },
  { label: 'ALL PRODUCTS', href: '/products' },
  { label: 'T-SHIRTS', href: '/categories/t-shirts' },
  { label: 'SHIRTS', href: '/categories/shirts' },
  { label: 'POLOS', href: '/categories/polos' },
  { label: 'BOTTOMWEAR', href: '/categories/bottomwear' },
];
// after
const NAV_LINKS = [
  { label: 'ALL PRODUCTS', href: '/products' },
  { label: 'CLOUDS', href: '/products?vibe=above-the-clouds' },
  { label: 'SALT', href: '/products?vibe=salt-on-skin' },
  { label: 'GOLD', href: '/products?vibe=golden-hour-gang' },
  { label: 'WILD', href: '/products?vibe=into-the-wild' },
  { label: 'NEON', href: '/products?vibe=neon-nomads' },
  { label: 'FLIGHT', href: '/products?vibe=flight-mode' },
];
```

- [ ] **Step 2: Remove the dead `isHomepage` branch**

`/` now redirects, so `usePathname() === '/'` is unreachable for users. Remove the `isHomepage` variable and its consumers.

a) Delete line 43 (`const isHomepage = pathname === '/';`).

b) Delete the entire `{isHomepage && (...)}` block at lines 73-91 (the transparent mobile logo overlay).

c) Drop `isHomepage && 'hidden md:block'` from the className at line 103. The replacement:

```tsx
// before
<header
  className={cn(
    'sticky top-0 z-40 w-full bg-white transition-all duration-300',
    scrolled && 'shadow-md',
    isHomepage && 'hidden md:block'
  )}
>
// after
<header
  className={cn(
    'sticky top-0 z-40 w-full bg-white transition-all duration-300',
    scrolled && 'shadow-md'
  )}
>
```

- [ ] **Step 3: Type-check + manual smoke**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success.

In the browser (desktop viewport), confirm header nav now shows ALL PRODUCTS + 6 vibe links and clicking each one filters the catalog correctly.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/components/layout/header.tsx
git commit -m "feat(storefront): header nav uses 6 vibes; drop dead isHomepage branch"
```

---

## Task 11: Footer — replace SHOP section links with vibes

**Files:**

- Modify: `apps/storefront/src/components/layout/footer.tsx:9-21`

- [ ] **Step 1: Replace the SHOP section links**

In `apps/storefront/src/components/layout/footer.tsx`, replace lines 11-20 (the SHOP links inside `SECTIONS`):

```ts
// before
{
  title: 'SHOP',
  links: [
    { label: 'New Arrivals', href: '/categories/new-arrivals' },
    { label: 'Bestsellers', href: '/categories/bestsellers' },
    { label: 'All Products', href: '/products' },
    { label: 'T-Shirts', href: '/categories/t-shirts' },
    { label: 'Shirts', href: '/categories/shirts' },
    { label: 'Polos', href: '/categories/polos' },
    { label: 'Bottomwear', href: '/categories/bottomwear' },
  ],
},
// after
{
  title: 'SHOP',
  links: [
    { label: 'All Products', href: '/products' },
    { label: 'Clouds', href: '/products?vibe=above-the-clouds' },
    { label: 'Salt', href: '/products?vibe=salt-on-skin' },
    { label: 'Gold', href: '/products?vibe=golden-hour-gang' },
    { label: 'Wild', href: '/products?vibe=into-the-wild' },
    { label: 'Neon', href: '/products?vibe=neon-nomads' },
    { label: 'Flight', href: '/products?vibe=flight-mode' },
  ],
},
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/layout/footer.tsx
git commit -m "feat(storefront): footer SHOP section links to vibes"
```

---

## Task 12: Mobile menu — replace nav with vibes

**Files:**

- Modify: `apps/storefront/src/components/layout/mobile-menu.tsx:15-40`

- [ ] **Step 1: Replace `NAV_SECTIONS`**

In `apps/storefront/src/components/layout/mobile-menu.tsx`, replace lines 15-40:

```ts
// before
const NAV_SECTIONS: NavSection[] = [
  {
    label: 'NEW ARRIVALS',
    href: '/categories/new-arrivals',
  },
  {
    label: 'SHIRTS',
    href: '/categories/shirts',
  },
  {
    label: 'T-SHIRTS',
    href: '/categories/t-shirts',
  },
  {
    label: 'OUTERWEAR',
    href: '/categories/outerwear',
  },
  {
    label: 'ALL PRODUCTS',
    href: '/products',
  },
  {
    label: 'BESTSELLERS',
    href: '/categories/bestsellers',
  },
];
// after
const NAV_SECTIONS: NavSection[] = [
  { label: 'ALL PRODUCTS', href: '/products' },
  { label: 'CLOUDS', href: '/products?vibe=above-the-clouds' },
  { label: 'SALT', href: '/products?vibe=salt-on-skin' },
  { label: 'GOLD', href: '/products?vibe=golden-hour-gang' },
  { label: 'WILD', href: '/products?vibe=into-the-wild' },
  { label: 'NEON', href: '/products?vibe=neon-nomads' },
  { label: 'FLIGHT', href: '/products?vibe=flight-mode' },
];
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/layout/mobile-menu.tsx
git commit -m "feat(storefront): mobile menu nav uses 6 vibes"
```

---

## Task 13: Search overlay — vibe quick-links, remove dynamic categories

**Files:**

- Modify: `apps/storefront/src/components/layout/search-overlay.tsx:7,19-27,32-47,128-130,167-190,242-265`

- [ ] **Step 1: Replace `BROWSE_CATEGORIES` with vibe quick-links**

In `apps/storefront/src/components/layout/search-overlay.tsx`, replace lines 19-27:

```ts
// before
const BROWSE_CATEGORIES = [
  { label: 'New Arrivals', href: '/categories/new-arrivals', icon: Sparkles },
  { label: 'Bestsellers', href: '/categories/bestsellers', icon: Sparkles },
  { label: 'All Products', href: '/products', icon: Grid3X3 },
  { label: 'T-Shirts', href: '/categories/t-shirts', icon: Shirt },
  { label: 'Shirts', href: '/categories/shirts', icon: Shirt },
  { label: 'Polos', href: '/categories/polos', icon: Shirt },
  { label: 'Bottomwear', href: '/categories/bottomwear', icon: Shirt },
];
// after
const BROWSE_VIBES = [
  { label: 'All Products', href: '/products', icon: Grid3X3 },
  { label: 'Clouds', href: '/products?vibe=above-the-clouds', icon: Sparkles },
  { label: 'Salt', href: '/products?vibe=salt-on-skin', icon: Sparkles },
  { label: 'Gold', href: '/products?vibe=golden-hour-gang', icon: Sparkles },
  { label: 'Wild', href: '/products?vibe=into-the-wild', icon: Sparkles },
  { label: 'Neon', href: '/products?vibe=neon-nomads', icon: Sparkles },
  { label: 'Flight', href: '/products?vibe=flight-mode', icon: Sparkles },
];
```

- [ ] **Step 2: Drop the unused `Shirt` import**

On line 7:

```ts
// before
import { Search, X, Clock, ArrowRight, Grid3X3, Sparkles, Shirt } from 'lucide-react';
// after
import { Search, X, Clock, ArrowRight, Grid3X3, Sparkles } from 'lucide-react';
```

- [ ] **Step 3: Drop the dynamic categories from autocomplete results**

a) In the `AutocompleteResult` interface (lines 32-47), remove the `categories` field:

```ts
// before
interface AutocompleteResult {
  products: { ... }[];
  categories: { name: string; slug: string }[];
  blogPosts?: { title: string; slug: string }[];
}
// after
interface AutocompleteResult {
  products: {
    name: string;
    slug: string;
    price: number;
    images?: { url: string }[];
  }[];
  blogPosts?: { title: string; slug: string }[];
}
```

b) Remove the `hasCategories` derivation and update `hasResults`. Replace lines 128-130:

```ts
// before
const hasProducts = results && results.products.length > 0;
const hasCategories = results && results.categories.length > 0;
const hasResults = hasProducts || hasCategories;
// after
const hasProducts = results && results.products.length > 0;
const hasResults = hasProducts;
```

c) Delete the entire `{!loading && hasCategories && (...)}` block (lines 167-190 — the "Search results: categories" section).

- [ ] **Step 4: Update the empty-state grid to use vibes**

Replace the BROWSE block in the empty state (around lines 244-265). The body of `{showEmpty && (` now renders vibes:

```tsx
{
  /* Browse vibes — replaces hamburger menu */
}
<div className="mb-6">
  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
    Browse
  </p>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {BROWSE_VIBES.map((vibe) => {
      const Icon = vibe.icon;
      return (
        <Link
          key={vibe.href}
          href={vibe.href}
          onClick={closeSearch}
          className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border)] px-3 py-3 text-sm font-medium transition-colors hover:bg-[var(--color-surface)] hover:border-[var(--color-primary)]"
        >
          <Icon className="h-4 w-4 text-[var(--color-muted)]" />
          {vibe.label}
        </Link>
      );
    })}
  </div>
</div>;
```

(The `BROWSE_CATEGORIES` reference is replaced by `BROWSE_VIBES`; the surrounding markup is unchanged. The "Recent searches" block immediately below this stays as-is.)

- [ ] **Step 5: Type-check + manual smoke**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success.

In the browser, click the search icon → empty state shows "All Products" + 6 vibe tiles. Type a query → only product results render (no categories chip row). Click a vibe tile → catalog filters by vibe.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/components/layout/search-overlay.tsx
git commit -m "feat(storefront): search overlay uses vibe quick-links; remove category results"
```

---

## Task 14: Update remaining empty-state CTAs to `/products`

**Files:**

- Modify: `apps/storefront/src/app/(shop)/cart/page.tsx:113,186`
- Modify: `apps/storefront/src/app/(shop)/checkout/page.tsx:128`
- Modify: `apps/storefront/src/app/(shop)/checkout/confirmation/page.tsx:88`
- Modify: `apps/storefront/src/app/(shop)/account/wishlist/page.tsx:100`
- Modify: `apps/storefront/src/app/(shop)/account/orders/page.tsx:78`

- [ ] **Step 1: Apply the same swap in each file**

In each of the five files, change the literal string `/categories/new-arrivals` to `/products`. The hrefs are the only thing changing — leave surrounding markup as-is.

For `cart/page.tsx` there are two occurrences (lines 113 and 186); update both.

A safe sweep using grep + a single replace per file:

```
apps/storefront/src/app/(shop)/cart/page.tsx:113
  "/categories/new-arrivals"  →  "/products"
apps/storefront/src/app/(shop)/cart/page.tsx:186
  "/categories/new-arrivals"  →  "/products"
apps/storefront/src/app/(shop)/checkout/page.tsx:128
  "/categories/new-arrivals"  →  "/products"
apps/storefront/src/app/(shop)/checkout/confirmation/page.tsx:88
  "/categories/new-arrivals"  →  "/products"
apps/storefront/src/app/(shop)/account/wishlist/page.tsx:100
  "/categories/new-arrivals"  →  "/products"
apps/storefront/src/app/(shop)/account/orders/page.tsx:78
  "/categories/new-arrivals"  →  "/products"
```

- [ ] **Step 2: Verify no `/categories/new-arrivals` remains in storefront**

Run: `grep -rn "/categories/new-arrivals" apps/storefront/src`
Expected: no output.

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/app/\(shop\)/cart/page.tsx \
        apps/storefront/src/app/\(shop\)/checkout/page.tsx \
        apps/storefront/src/app/\(shop\)/checkout/confirmation/page.tsx \
        apps/storefront/src/app/\(shop\)/account/wishlist/page.tsx \
        apps/storefront/src/app/\(shop\)/account/orders/page.tsx
git commit -m "refactor(storefront): empty-state CTAs land on /products (categories gone)"
```

---

## Task 15: Update swipeable-product-wrapper fallback

**Files:**

- Modify: `apps/storefront/src/components/product/swipeable-product-wrapper.tsx:48-53`

- [ ] **Step 1: Replace the categorySlug-based href**

In `apps/storefront/src/components/product/swipeable-product-wrapper.tsx`, replace the block at lines 48-53:

```ts
// before
if (categorySlug) {
  setNavContext(
    productSlugs,
    initialProduct.category?.name || 'Products',
    categorySlug ? `/categories/${categorySlug}` : '/products'
  );
} else {
  setAllSlugs(productSlugs);
}
// after
if (categorySlug) {
  setNavContext(productSlugs, initialProduct.category?.name || 'Products', '/products');
} else {
  setAllSlugs(productSlugs);
}
```

The wrapper still uses `categorySlug` to decide whether to set nav context (preserves category-relevant prev/next nav inside PDP), but the back-link goes to `/products` since `/categories/<slug>` no longer exists.

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/components/product/swipeable-product-wrapper.tsx
git commit -m "refactor(storefront): swipeable wrapper back-link goes to /products"
```

---

## Task 16: Sitemap — drop categories section

**Files:**

- Modify: `apps/storefront/src/app/sitemap.ts:10-13,39-56,77-82,160-165,174`

- [ ] **Step 1: Remove the collections fetch + entries**

In `apps/storefront/src/app/sitemap.ts`:

a) Delete the `Collection` interface (lines 10-13).

b) Delete the entire `fetchCollections` function (lines 39-56).

c) In the default-export function, remove `fetchCollections()` from the `Promise.all` and the `collections` binding (lines 77-82):

```ts
// before
const [products, collections, blogPosts] = await Promise.all([
  fetchProducts(),
  fetchCollections(),
  fetchBlogPosts(),
]);
// after
const [products, blogPosts] = await Promise.all([fetchProducts(), fetchBlogPosts()]);
```

d) Delete the `collectionPages` block (lines 160-165) and remove `...collectionPages` from the return statement (line 174):

```ts
// before
return [...staticPages, ...productPages, ...collectionPages, ...blogPages];
// after
return [...staticPages, ...productPages, ...blogPages];
```

The `SITE_URL` (root) entry stays — it's a valid 308-redirect target for crawlers that prefer the canonical short URL.

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/sitemap.ts
git commit -m "chore(storefront): drop /categories/* entries from sitemap"
```

---

## Task 17: Remove dead categories prefetch + delete `useCategories`

**Files:**

- Modify: `apps/storefront/src/providers/prefetch-provider.tsx:1-37`
- Modify: `apps/storefront/src/hooks/use-products.ts:9-18,128-139`

- [ ] **Step 1: Confirm `useCategories` has zero remaining consumers**

Run: `grep -rn "useCategories\|productKeys.categories" apps/storefront/src --include="*.tsx" --include="*.ts"`
Expected: matches only inside `prefetch-provider.tsx` and `use-products.ts` (the code we're about to remove).

- [ ] **Step 2: Strip the prefetch**

Overwrite `apps/storefront/src/providers/prefetch-provider.tsx` with:

```tsx
'use client';

/**
 * Previously prefetched the categories list for filter UI. After the
 * categories surface was removed (vibes are the new filter), there is
 * nothing worth prefetching at app boot — product data is fetched
 * on-demand by TanStack Query with reasonable staleTime/gcTime.
 *
 * Kept as a pass-through so providers/index.ts wiring remains stable.
 */
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 3: Delete `useCategories` and its query key**

In `apps/storefront/src/hooks/use-products.ts`:

a) Remove `categories: ['categories'] as const,` from `productKeys` (line 17).

b) Remove `Category` from the imports on line 5 if it's now unreferenced. After this change `Category` is only used inside `useCategories`, so:

```ts
// before
import type { Product, Category, ProductListParams, PaginatedResponse, ApiError } from '@/types';
// after
import type { Product, ProductListParams, PaginatedResponse, ApiError } from '@/types';
```

c) Delete the entire `useCategories` block (lines 128-139, including the section comment `// ─── useCategories ───`).

- [ ] **Step 4: Type-check + lint + build**

Run: `pnpm --filter @earth-revibe/storefront exec tsc --noEmit && pnpm --filter @earth-revibe/storefront lint`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/providers/prefetch-provider.tsx apps/storefront/src/hooks/use-products.ts
git commit -m "chore(storefront): remove dead categories prefetch + useCategories hook"
```

---

## Task 18: Final verification — full end-to-end smoke

**Files:** none (verification only)

- [ ] **Step 1: Build everything**

Run: `pnpm build`
Expected: storefront, admin, and api all build successfully.

- [ ] **Step 2: Run the test suites that touch changed code**

Run: `pnpm --filter @earth-revibe/api test -- product.service.test.ts`
Expected: all green.

If a storefront vitest config is present (the untracked `apps/storefront/vitest.config.ts`), also run:
Run: `pnpm --filter @earth-revibe/storefront test`
Expected: all green (or no tests — that's fine; this plan didn't add storefront unit tests).

- [ ] **Step 3: Manual end-to-end pass**

Start dev: `pnpm dev`
In a browser, walk through:

1. `/` → 308 redirect → `/products` (URL bar shows `/products`).
2. Click each of the 6 vibe circles in turn → URL gains `?vibe=<slug>`, grid filters, "Vibe: <Label>" chip appears, click chip's X → vibe clears, all products return.
3. Direct visit to `/products?vibe=salt-on-skin` → vibe is highlighted, grid filtered.
4. Direct visit to `/products?vibe=garbage` → no vibe highlighted, all products show.
5. Header → click "CLOUDS" → catalog filters to outerwear.
6. Footer → SHOP section → click "Salt" → catalog filters to t-shirts + shirts.
7. Open mobile menu (resize viewport) → all 7 nav items present, each filters correctly.
8. Open search overlay → empty state shows 7 vibe tiles. Type "shirt" → only product results, no categories chip row.
9. `/categories` → 404. `/categories/shirts` → 404.
10. Add a product to cart, then empty cart → empty-state CTA → `/products`.
11. Visit `/account/wishlist`, `/account/orders` (sign in as needed) → empty-state CTAs → `/products`.
12. From a PDP that came via a category context, swipe nav still works; back arrow goes to `/products`.

- [ ] **Step 4: Final cleanup commit (only if needed)**

If any drift was found during the smoke pass, fix it and commit with a descriptive message. If everything passed, no commit needed.

---

## Self-Review Notes

**Spec coverage** (each section/requirement → task that implements it):

- Spec §1 Root → catalog → Task 7
- Spec §2 Categories routes deleted → Task 8
- Spec §3 Orphaned home components deleted → Task 9
- Spec §4 Vibe → category mapping constant → Task 3
- Spec §5 Wire vibe filter on /products → Task 5
- Spec §6 FilterSidebar loses category dropdown → Task 6
- Spec §7 API multi-category support → Tasks 1, 2, 4
- Spec §8 Storefront link rewrites (header/footer/mobile/search/swipe/cart/checkout/account) → Tasks 10-15
- Spec §9 Sitemap + prefetch cleanup → Tasks 16, 17
- Spec error/edge cases (unknown vibe, old `?category=foo` direct links, empty results) → covered by Task 5 wiring (`isKnownVibe` guard, `category` URL still readable) + Task 18 smoke pass
- Spec testing (manual + API unit) → Tasks 2, 18
