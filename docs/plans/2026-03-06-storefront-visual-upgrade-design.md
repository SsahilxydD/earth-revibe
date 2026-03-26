# Storefront Visual Upgrade — Design Document

**Date**: 2026-03-06
**Status**: Approved
**Source**: `earth-revibe-frontend-backup/` (Shopify-based frontend)
**Target**: `apps/storefront/` (monorepo, Express API-backed)

## Goal

Port the visual design, UI patterns, and missing pages from the backup frontend onto the current storefront. Keep all existing data-fetching logic (Zustand stores, TanStack Query, Express API calls) intact.

## Approach

**Approach 1 — Port visual design onto current storefront.** The current storefront already has working API integration. We upgrade the visuals and add missing pages/components without touching the data layer.

---

## 1. Design Foundation

### Fonts (4 Google Fonts)

- **Cormorant Garamond** (`--font-serif`) — elegant serif for section labels
- **Poppins** (`--font-sans`) — primary body text
- **Playfair Display** (`--font-display`) — hero titles, page headings
- **Cinzel** (`--font-cinzel`) — breadcrumbs, nav labels

### Color Palette

```css
--sage-light: #e7f6f1;
--sage: #8db7ac;
--taupe: #97826f;
--dusty-teal: #9dbbbb;
--forest: #6d7b6e;
--chocolate: #583220;
--background: #fdfcfa;
--foreground: #583220;
--accent: #8db7ac;
--muted: #97826f;
--card-bg: #f9f9f9;
--border-color: #e5e5e5;
--muted-text: #999999;
--secondary-text: #555555;
--primary-text: #111111;
--page-bg: #fafafa;
```

### Typography Scale (CSS variables)

11px / 13px / 14px / 15px / 16px / 18px / 22px / 24px

### Shadows

- `--shadow-sm`: `0 2px 8px rgba(0, 0, 0, 0.04)`
- `--shadow-md`: `0 4px 12px rgba(0, 0, 0, 0.08)`
- `--shadow-lg`: `0 10px 30px rgba(0, 0, 0, 0.06)`

### New Dependencies

- `framer-motion` — animations
- `embla-carousel-react` — carousels
- `lucide-react` — icons
- `lenis` — smooth scrolling
- `clsx` + `tailwind-merge` — className utilities
- `gsap` — scroll/hero animations

### Assets to Copy

- `Earth Revibe Logo Black.png`
- `Earth Revibe Logo White.png`
- `favicon.ico`
- `poster1.png`, `poster2.png`, `poster3.png`
- `sample_product.png`

---

## 2. Component Upgrades

### Layout (restyle existing)

| Component             | Changes                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Header**            | Transparent-to-opaque on scroll, mega menu with product previews, logo variant switching (white on hero, black after scroll), mobile slide-in panel |
| **Footer**            | Multi-column layout, newsletter form, social links, policy links                                                                                    |
| **CartDrawer**        | Slide-in drawer with quantity controls, discount code input, subtotal display                                                                       |
| **Mobile Bottom Bar** | Restyle to match new design tokens                                                                                                                  |

### Product (restyle existing)

| Component           | Changes                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| **ProductCard**     | Hover image swap, quick-add trigger, wishlist heart, sale badge, INR price formatting |
| **Hero** (homepage) | Full-width Embla carousel, overlay text, CTA buttons, auto-advance                    |
| **FilterSidebar**   | Collapsible groups, price range, color swatches, size chips                           |
| **ImageGallery**    | Carousel with thumbnail strip, zoom on hover, mobile swipe                            |
| **ProductGrid**     | Skeleton loading states                                                               |

### New Components

| Component             | Source                           | Purpose                                    |
| --------------------- | -------------------------------- | ------------------------------------------ |
| `QuickAddModal`       | backup `QuickAddModal.tsx`       | Size/color picker overlay on product hover |
| `SmoothScroll`        | backup `SmoothScroll.tsx`        | Lenis smooth scrolling wrapper             |
| `PromoCountdownPopup` | backup `PromoCountdownPopup.tsx` | Timed promotional popup                    |
| `NewsletterForm`      | backup `NewsletterForm.tsx`      | Email capture in footer                    |
| `ShippingEstimator`   | backup `ShippingEstimator.tsx`   | Delivery estimate on product page          |
| `SocialProofSection`  | backup home components           | Homepage trust signals                     |
| `SectionHeader`       | backup `SectionHeader.tsx`       | Reusable section title pattern             |

---

## 3. New Pages

| Route                | Content                                              |
| -------------------- | ---------------------------------------------------- |
| `/about`             | Brand story, sustainability mission                  |
| `/contact`           | Contact form with validation                         |
| `/faq`               | Accordion Q&A                                        |
| `/policies/privacy`  | Privacy policy                                       |
| `/policies/returns`  | Returns & refund policy                              |
| `/policies/shipping` | Shipping information                                 |
| `/policies/terms`    | Terms of service                                     |
| `/size-guide`        | Size chart table                                     |
| `/track-order`       | Order tracking form (uses existing order detail API) |

---

## 4. State Management Updates

| Store                         | Change                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| `cart-store.ts`               | Add discount code support                                  |
| `ui-store.ts`                 | Add header transparency state, promo popup dismissed state |
| No changes to `auth-store.ts` | Already complete                                           |

---

## 5. Excluded (Not Porting)

- All `shopify-*.ts` files (20+ files)
- Shopify GraphQL types/fragments
- Next.js API routes (`/api/*`) — Express API handles this
- Sentry/WebVitals reporters
- Currency/language selectors (India-only, INR-only)
- Shopify webhooks, metafields, admin API
