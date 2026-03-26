# Storefront Visual Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port visual design, UI patterns, and missing pages from the Shopify-based backup frontend onto the current Express API-backed storefront.

**Architecture:** Keep all existing data-fetching logic (Zustand stores, TanStack Query, Express API). Replace CSS design tokens, fonts, and component JSX/styles with the backup's premium visual design. Add missing static pages and new UI components (Hero carousel, SmoothScroll, SocialProof, etc.).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Framer Motion, Embla Carousel, Lenis, Lucide React, Zustand, TanStack Query

**Source reference:** `earth-revibe-frontend-backup/` (Shopify-based, read-only)
**Target:** `apps/storefront/` (monorepo storefront)

---

## Task 1: Install Dependencies & Copy Assets

**Files:**

- Modify: `apps/storefront/package.json`
- Copy to: `apps/storefront/public/` (assets from backup)

**Step 1: Install new dependencies**

```bash
cd apps/storefront && pnpm add embla-carousel-react lenis clsx tailwind-merge gsap
```

Note: `framer-motion`, `lucide-react` are already installed. `swiper` can stay (not conflicting).

**Step 2: Copy assets from backup**

```bash
cp earth-revibe-frontend-backup/public/favicon.ico apps/storefront/public/
cp "earth-revibe-frontend-backup/public/Earth Revibe Logo Black.png" apps/storefront/public/
cp "earth-revibe-frontend-backup/public/Earth Revibe Logo White.png" apps/storefront/public/
cp earth-revibe-frontend-backup/public/poster1.png apps/storefront/public/
cp earth-revibe-frontend-backup/public/poster2.png apps/storefront/public/
cp earth-revibe-frontend-backup/public/poster3.png apps/storefront/public/
cp earth-revibe-frontend-backup/public/sample_product.png apps/storefront/public/
```

**Step 3: Verify build**

```bash
cd apps/storefront && pnpm next build
```

**Step 4: Commit**

```bash
git add apps/storefront/package.json apps/storefront/public/ pnpm-lock.yaml
git commit -m "feat(storefront): add visual upgrade dependencies and brand assets"
```

---

## Task 2: Design Foundation — CSS Tokens, Fonts, Root Layout

**Files:**

- Modify: `apps/storefront/src/app/globals.css`
- Modify: `apps/storefront/src/app/layout.tsx`

**Step 1: Replace globals.css with backup's design tokens**

Replace the entire contents of `apps/storefront/src/app/globals.css` with:

```css
@import 'tailwindcss';

:root {
  /* Brand Colors from Kit */
  --sage-light: #e7f6f1;
  --sage: #8db7ac;
  --taupe: #97826f;
  --dusty-teal: #9dbbbb;
  --forest: #6d7b6e;
  --chocolate: #583220;

  /* Semantic colors */
  --background: #fdfcfa;
  --foreground: #583220;
  --accent: #8db7ac;
  --muted: #97826f;

  /* Design System Colors */
  --card-bg: #f9f9f9;
  --border-color: #e5e5e5;
  --muted-text: #999999;
  --secondary-text: #555555;
  --primary-text: #111111;
  --page-bg: #fafafa;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.06);

  /* Typography Scale */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-md: 15px;
  --text-lg: 16px;
  --text-xl: 18px;
  --text-2xl: 22px;
  --text-3xl: 24px;
}

/* Keep @theme for Tailwind class compatibility */
@theme {
  --color-sage-light: #e7f6f1;
  --color-sage: #8db7ac;
  --color-taupe: #97826f;
  --color-dusty-teal: #9dbbbb;
  --color-forest: #6d7b6e;
  --color-chocolate: #583220;
  --color-background: #fdfcfa;
  --color-card-bg: #f9f9f9;
  --color-border-color: #e5e5e5;
  --color-muted-text: #999999;
  --color-secondary-text: #555555;
  --color-primary-text: #111111;
  --color-page-bg: #fafafa;
  --color-success: #4a7c59;
  --color-warning: #d4a843;
  --color-error: #c0392b;
  --color-info: #5b8fa8;
}

* {
  margin: 0;
  box-sizing: border-box;
}

html {
  overflow-x: hidden;
}

body {
  font-family: var(--font-sans);
  color: var(--primary-text);
  background-color: var(--background);
}

h1,
h2,
h3,
h4,
h5,
h6 {
  color: var(--chocolate);
}
```

**Step 2: Update root layout with 4 Google Fonts**

Replace `apps/storefront/src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Poppins, Playfair_Display, Cinzel } from 'next/font/google';
import { QueryProvider } from '@/providers/query-provider';
import { ToastContainer } from '@/components/ui/toast';
import './globals.css';

const cormorant = Cormorant_Garamond({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: true,
});

const poppins = Poppins({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: true,
});

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  preload: true,
});

const cinzel = Cinzel({
  variable: '--font-cinzel',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: 'Earth Revibe | Sustainable Fashion Essentials',
    template: '%s | Earth Revibe',
  },
  description:
    'Natural landscapes, minimal product shots, and authentic storytelling. Sustainable fashion essentials crafted with care.',
  keywords: [
    'sustainable fashion',
    'earth tones',
    'natural clothing',
    'eco-friendly',
    'minimal fashion',
  ],
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }],
    apple: [{ url: '/Earth%20Revibe%20Logo%20Black.png', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${poppins.variable} ${playfair.variable} ${cinzel.variable}`}
    >
      <body className="font-[var(--font-sans)] antialiased bg-[var(--background)]">
        <QueryProvider>
          {children}
          <ToastContainer />
        </QueryProvider>
      </body>
    </html>
  );
}
```

**Step 3: Verify build**

```bash
cd apps/storefront && pnpm next build
```

Expected: Build passes. Pages render with new fonts and color scheme.

**Step 4: Commit**

```bash
git add apps/storefront/src/app/globals.css apps/storefront/src/app/layout.tsx
git commit -m "feat(storefront): update design tokens, fonts, and color palette"
```

---

## Task 3: Utility — cn() helper and SmoothScroll wrapper

**Files:**

- Create: `apps/storefront/src/lib/utils.ts`
- Create: `apps/storefront/src/components/ui/smooth-scroll.tsx`
- Modify: `apps/storefront/src/app/(shop)/layout.tsx`

**Step 1: Create cn() utility**

```ts
// apps/storefront/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 2: Create SmoothScroll component**

Port directly from `earth-revibe-frontend-backup/src/components/SmoothScroll.tsx`. The component is framework-agnostic (no Shopify deps). Copy it as-is into `apps/storefront/src/components/ui/smooth-scroll.tsx`.

Reference: Read `earth-revibe-frontend-backup/src/components/SmoothScroll.tsx` and copy — it uses dynamic `import('lenis')`, no Shopify references.

**Step 3: Add SmoothScroll to shop layout**

Update `apps/storefront/src/app/(shop)/layout.tsx`:

```tsx
import { Header, Footer, MobileBottomBar } from '@/components/layout';
import { CartDrawer } from '@/components/cart/cart-drawer';
import SmoothScroll from '@/components/ui/smooth-scroll';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <Header />
      <main className="min-h-screen pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileBottomBar />
      <CartDrawer />
    </SmoothScroll>
  );
}
```

**Step 4: Verify build, commit**

```bash
cd apps/storefront && pnpm next build
git add apps/storefront/src/lib/utils.ts apps/storefront/src/components/ui/smooth-scroll.tsx apps/storefront/src/app/\(shop\)/layout.tsx
git commit -m "feat(storefront): add cn() utility and Lenis smooth scrolling"
```

---

## Task 4: UI Store Updates

**Files:**

- Modify: `apps/storefront/src/stores/ui-store.ts`

**Step 1: Add header transparency and promo popup state**

Add to the UIState interface and store:

```ts
// Add these fields to the interface:
isHeaderTransparent: boolean;
isPromoDismissed: boolean;

setHeaderTransparent: (transparent: boolean) => void;
setPromoDismissed: (dismissed: boolean) => void;

// Add to the store:
isHeaderTransparent: false,
isPromoDismissed: false,

setHeaderTransparent: (transparent) => set({ isHeaderTransparent: transparent }),
setPromoDismissed: (dismissed) => set({ isPromoDismissed: dismissed }),
```

**Step 2: Verify build, commit**

---

## Task 5: Header — Transparent-to-Opaque with Logo Switching

**Files:**

- Modify: `apps/storefront/src/components/layout/header.tsx`

**Step 1: Update Header with scroll-aware transparency and logo images**

Key changes to port from backup:

- Add scroll listener: track `isScrolled` via `useEffect` + `window.scrollY`
- Read `isHeaderTransparent` from ui-store (set by Hero component)
- When transparent + not scrolled: `bg-transparent text-white`, show white logo
- When opaque (scrolled or non-hero page): `bg-white/95 backdrop-blur-sm border-b`, show black logo
- Replace text "Earth Revibe" with `<Image>` using logo PNGs
- Add Framer Motion `<AnimatePresence>` for dropdown animations
- Keep all existing Zustand/auth store wiring, nav links, and icons intact

Reference: Read `earth-revibe-frontend-backup/src/components/Header.tsx` for the scroll behavior pattern and styling. Adapt — don't copy (it uses Shopify data fetching).

**Step 2: Verify dev server renders correctly, commit**

---

## Task 6: Footer — Multi-Column with Newsletter

**Files:**

- Modify: `apps/storefront/src/components/layout/footer.tsx`
- Create: `apps/storefront/src/components/ui/newsletter-form.tsx`

**Step 1: Create NewsletterForm component**

A simple email input + submit button. Since there's no newsletter API endpoint yet, it stores in localStorage and shows a success toast. Style with backup's design tokens.

**Step 2: Update Footer**

Update the footer links to point to correct routes under `(shop)`:

- `/policies/privacy`, `/policies/returns`, `/policies/shipping`, `/policies/terms`
- Add `/size-guide`, `/faq`
- Add social media icon links (Instagram, Facebook, Twitter) using Lucide icons
- Add `<NewsletterForm />` in the brand column
- Keep the multi-column grid layout (already similar)

**Step 3: Verify, commit**

---

## Task 7: Homepage — Hero Carousel

**Files:**

- Create: `apps/storefront/src/components/home/hero.tsx`
- Modify: `apps/storefront/src/app/(shop)/page.tsx`

**Step 1: Create Hero component with Embla Carousel**

Port the visual design from `earth-revibe-frontend-backup/src/components/Hero.tsx`:

- Use Embla carousel (not Shopify data fetching)
- 4 slides using poster images from `public/`
- Each slide: full-viewport-height background image, gradient overlay, accent text, CTA button
- Auto-advance every 5 seconds
- On mount: call `useUIStore.getState().setHeaderTransparent(true)`, on unmount set false
- Framer Motion fade transitions between slides

Hardcoded slide data (no API call needed):

```ts
const slides = [
  { title: 'Essentials', bgImage: '/poster1.png', bgColor: '#97826F', href: '/products' },
  { title: 'Luxe', bgImage: '/poster2.png', bgColor: '#8DB7AC', href: '/products' },
  { title: 'Polos', bgImage: '/sample_product.png', bgColor: '#97826F', href: '/products' },
  {
    title: 'Bottomwear',
    bgImage: '/poster3.png',
    bgColor: '#6D7B6E',
    href: '/categories/bottoms-pants',
  },
];
```

**Step 2: Create SectionHeader component**

```tsx
// apps/storefront/src/components/home/section-header.tsx
export function SectionHeader({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div className="text-center mb-12 lg:mb-16 px-6 lg:px-14">
      <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-3">
        {subtitle}
      </p>
      <h2 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black">
        {title}
      </h2>
    </div>
  );
}
```

**Step 3: Create FeaturedSection and SocialProofSection**

- `apps/storefront/src/components/home/featured-section.tsx` — Fetches featured products from API (`/api/v1/products?isFeatured=true&limit=4`), renders in a grid with ProductCard
- `apps/storefront/src/components/home/social-proof-section.tsx` — Port directly from backup. Static reviews data, Framer Motion scroll animations. No API deps.

**Step 4: Update homepage**

Replace `apps/storefront/src/app/(shop)/page.tsx`:

```tsx
import { Suspense } from 'react';
import { Hero } from '@/components/home/hero';
import { FeaturedSection } from '@/components/home/featured-section';
import { SocialProofSection } from '@/components/home/social-proof-section';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FeaturedSection />
      </Suspense>
      <SocialProofSection />
    </>
  );
}
```

**Step 5: Verify dev server, commit**

---

## Task 8: ProductCard — Visual Upgrade

**Files:**

- Modify: `apps/storefront/src/components/product/product-card.tsx`

**Step 1: Update ProductCard styling**

Port from backup's `ProductCard.tsx` visual design:

- Image with hover opacity transition (secondary image swap if available)
- Wishlist heart icon overlay (top-right)
- Sale badge (top-left) when `compareAtPrice > price`
- Price display: `₹2,499` format with strikethrough for compare price
- Product name in Cinzel font, category in small muted text
- Framer Motion `whileHover` scale on image container

Keep existing: Link to `/products/[slug]`, data props from current component.

**Step 2: Verify, commit**

---

## Task 9: Product Page — Image Gallery Upgrade

**Files:**

- Modify: `apps/storefront/src/components/product/image-gallery.tsx`

**Step 1: Upgrade ImageGallery**

Use Embla Carousel for the main image display:

- Thumbnail strip below main image (desktop) or dot indicators (mobile)
- Swipe support on mobile
- Zoom on hover (CSS `transform: scale(1.5)` with `overflow: hidden`)
- Framer Motion fade transition on image change

Keep existing: image data props from the product page.

**Step 2: Verify, commit**

---

## Task 10: CartDrawer — Visual Upgrade

**Files:**

- Modify: `apps/storefront/src/components/cart/cart-drawer.tsx`
- Modify: `apps/storefront/src/components/cart/cart-item.tsx`

**Step 1: Update CartDrawer styling**

- Slide-in from right with Framer Motion (`AnimatePresence` + `motion.div`)
- Overlay backdrop (`bg-black/40`)
- Clean item display with image thumbnail, name, size/color, quantity +/- buttons
- Subtotal at bottom with "Checkout" button
- Empty state with shopping bag icon and "Start Shopping" link

Keep existing: all Zustand cart-store wiring.

**Step 2: Verify, commit**

---

## Task 11: Static Pages — About, Contact, FAQ

**Files:**

- Create: `apps/storefront/src/app/(shop)/about/page.tsx`
- Create: `apps/storefront/src/app/(shop)/contact/page.tsx`
- Create: `apps/storefront/src/app/(shop)/faq/page.tsx`

**Step 1: Create About page**

Port content structure from `earth-revibe-frontend-backup/src/app/about/page.tsx`. Adapt to use new design tokens. Content:

- Hero banner with brand message
- Mission statement section
- Sustainability pillars (3-column grid)
- "Our Promise" section

**Step 2: Create Contact page**

Port from backup. Features:

- Contact form (name, email, subject, message) with client-side validation
- Company info sidebar (email, phone, hours)
- No API endpoint needed yet — show success toast on submit

**Step 3: Create FAQ page**

Port from backup. Features:

- Accordion component with expand/collapse (Framer Motion)
- Grouped by topic: Shipping, Returns, Products, Orders
- Search/filter input at top

**Step 4: Verify build, commit**

---

## Task 12: Static Pages — Policies & Size Guide

**Files:**

- Create: `apps/storefront/src/app/(shop)/policies/privacy/page.tsx`
- Create: `apps/storefront/src/app/(shop)/policies/returns/page.tsx`
- Create: `apps/storefront/src/app/(shop)/policies/shipping/page.tsx`
- Create: `apps/storefront/src/app/(shop)/policies/terms/page.tsx`
- Create: `apps/storefront/src/app/(shop)/size-guide/page.tsx`

**Step 1: Create policy pages**

Port content from backup's `policies/` pages. These are simple prose pages with headings and paragraphs. Use consistent layout:

- Page title in Playfair Display
- Max-width prose container (`max-w-3xl mx-auto`)
- Proper heading hierarchy

**Step 2: Create Size Guide page**

Port from backup. Features:

- Responsive table with size measurements
- Tab switcher for Tops / Bottoms / Outerwear
- "How to Measure" section with illustrations (can use placeholder text)

**Step 3: Verify build, commit**

---

## Task 13: Track Order Page

**Files:**

- Create: `apps/storefront/src/app/(shop)/track-order/page.tsx`

**Step 1: Create Track Order page**

Simple form:

- Order number input + email input
- Submit calls existing API: `GET /api/v1/orders/{orderNumber}`
- Displays order status timeline if found
- Error state if not found
- Uses existing `apiClient` from `src/lib/api-client.ts`

**Step 2: Verify, commit**

---

## Task 14: Cart Store — Discount Code Support

**Files:**

- Modify: `apps/storefront/src/stores/cart-store.ts`

**Step 1: Add discount code fields**

Add to CartState interface:

```ts
discountCode: string | null;
discountAmount: number;
applyDiscount: (code: string) => Promise<void>;
removeDiscount: () => void;
```

The `applyDiscount` calls `POST /api/v1/discounts/validate` with the code and cart subtotal.

**Step 2: Verify, commit**

---

## Task 15: Final Polish & Build Verification

**Files:**

- Various component style tweaks

**Step 1: Run full build**

```bash
cd /c/work/earth_revibe && pnpm turbo build
```

Fix any TypeScript or build errors.

**Step 2: Run dev servers and visual check**

```bash
pnpm turbo dev
```

Check these routes:

- `http://localhost:3000` — Homepage with Hero carousel, Featured products, Social proof
- `http://localhost:3000/products` — Product grid with filter sidebar
- `http://localhost:3000/about` — About page
- `http://localhost:3000/contact` — Contact page
- `http://localhost:3000/faq` — FAQ page
- `http://localhost:3000/policies/privacy` — Privacy policy
- `http://localhost:3000/size-guide` — Size guide

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(storefront): complete visual upgrade from backup design"
```
