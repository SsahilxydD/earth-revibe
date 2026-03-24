# Earth Revibe -- Design and Style Guidelines

## 1. Brand Identity

**Brand:** Earth Revibe -- Indian streetwear brand
**Tone:** Bold, youthful, culture-driven, mobile-first
**Tagline:** "Streetwear for the Culture"
**Locale:** en_IN (Indian English)
**Currency:** INR (displayed as Rs or with the rupee symbol)

---

## 2. Storefront Design System

### 2.1 Color Palette

All colors are defined as CSS custom properties in `:root` (`apps/storefront/src/app/globals.css`).

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#121212` | Primary brand color, buttons, links, text emphasis |
| `--color-background` | `#ffffff` | Page background |
| `--color-text` | `#121212` | Default body text |
| `--color-muted` | `#737373` | Secondary text, placeholders, captions |
| `--color-surface` | `#f5f5f5` | Card backgrounds, input backgrounds |
| `--color-border` | `#e5e5e5` | Dividers, input borders, card borders |
| `--color-sale` | `#cf2929` | Sale price, discount badges |
| `--color-sold-out` | `#939393` | Sold-out variant indicators |
| `--color-star` | `#FFDC0B` | Star rating fill color |

**Selection highlight:** `::selection { background: #121212; color: #fff; }`

**Theme color (PWA/browser chrome):** `#121212`

### 2.2 Typography

Fonts are loaded via `next/font/google` in `apps/storefront/src/app/layout.tsx`.

| Role | Font Family | CSS Variable | Weights |
|------|-------------|-------------|---------|
| **Body (primary)** | Archivo Narrow | `--font-archivo` | 400, 500, 600, 700 |
| **Fallback** | Poppins | `--font-poppins` | 400, 500, 600, 700 |
| **System fallback** | sans-serif | -- | -- |

The body font is set via `--font-body: 'Archivo Narrow', sans-serif` in CSS custom properties. Both font variables are applied to the `<html>` element as CSS variable classes.

**Font rendering:** `-webkit-font-smoothing: antialiased` is applied to the body.

### 2.3 Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `--section-spacing-mobile` | `25px` | Vertical gap between page sections on mobile |
| `--section-spacing-desktop` | `40px` | Vertical gap between page sections on desktop |

### 2.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--button-radius` | `10px` | Buttons, action elements |
| `--badge-radius` | `6px` | Badges, tags, status indicators |

### 2.5 Aspect Ratios

| Token | Value | Usage |
|-------|-------|-------|
| `--product-image-ratio` | `2 / 3` | Product card and gallery images (portrait) |

### 2.6 Shadows

Card shadows and elevation levels are applied via Tailwind utility classes. The design is intentionally flat with minimal shadow usage -- the storefront relies on borders and surface color contrast rather than elevation.

### 2.7 Animations

All keyframe animations are defined in `globals.css`:

| Animation | Keyframes | Duration | Easing | Usage |
|-----------|-----------|----------|--------|-------|
| `fadeIn` | opacity 0 -> 1 | 0.4s | ease-out | General element appearance |
| `slideUp` | opacity 0, translateY(20px) -> visible | 0.5s | ease-out | Content loading, modal entry |
| `slideDown` | opacity 0, translateY(-10px) -> visible | 0.3s | ease-out | Dropdown menus, notifications |
| `slideInLeft` | translateX(-100%) -> translateX(0) | 0.3s | ease-out | Mobile menu entry |
| `slideInRight` | translateX(100%) -> translateX(0) | 0.3s | cubic-bezier(0.32, 0.72, 0, 1) | Cart drawer entry |
| `shimmer` | background-position -200% -> 200% | 1.5s | infinite | Skeleton loading placeholders |

**Utility classes:**
- `.animate-fade-in` -- fadeIn
- `.animate-slide-up` -- slideUp
- `.animate-slide-down` -- slideDown
- `.animate-slide-in-left` -- slideInLeft
- `.animate-slide-in-right` -- slideInRight
- `.skeleton` -- shimmer effect with gradient background

**Framer Motion:** Used for page transitions, product image swipe gestures, and micro-interactions. Not defined in CSS -- configured per component.

**Lenis:** Smooth scroll library wrapping the entire app via `LenisProvider`. Provides momentum-based scrolling on all pages.

### 2.8 Scrollbar

Hidden scrollbar on elements with the `.hide-scrollbar` class:
- WebKit: `display: none` on `::-webkit-scrollbar`
- Firefox: `scrollbar-width: none`
- IE/Edge: `-ms-overflow-style: none`

### 2.9 Global Resets

- `* { margin: 0; box-sizing: border-box; }`
- `html { overscroll-behavior-x: none; background: #ffffff; }`
- `body { overflow-x: hidden; }` (prevents horizontal scroll)
- iOS Safari blink fix: `backface-visibility: hidden` on body

---

## 3. Storefront Component Patterns

### 3.1 Product Card
- Portrait image (2:3 aspect ratio)
- Product name below image
- Price line: current price, crossed-out compare-at price (if different)
- Sale badge (`--color-sale`) when compare-at price exists
- "Sold Out" badge (`--color-sold-out`) when all variants have zero stock
- Tapping the card navigates to `/product/[slug]`

### 3.2 Header Variants

**Homepage header:**
- Transparent background, transitions to solid white on scroll
- Centered logo
- Hamburger menu icon (left), user account and cart icons (right)

**Category/listing page header:**
- Sticky white background
- Centered "EARTH REVIBE" text logo
- Standard navigation icons

**Product detail header:**
- Minimal: back arrow on the left, share and heart (wishlist) icons on the right
- No logo, no hamburger menu
- Positioned over the product image gallery

### 3.3 Mobile Bottom Dock
- Fixed at the bottom of the viewport on all storefront pages
- Four icons in a row: Home, Search, Wishlist, Cart
- Active state indicator for current page
- Badge counts on Wishlist (item count) and Cart (item count)
- White background with top border

### 3.4 Cart Drawer
- Slides in from the right edge (`.animate-slide-in-right`)
- Overlay backdrop dims the page
- Cart items list with quantity +/- controls
- Discount code input
- Subtotal and "Checkout" button at the bottom
- Close button or tap overlay to dismiss

### 3.5 Filter Sidebar (Category Pages)
- Mobile: slides in from the left (`.animate-slide-in-left`)
- Desktop: persistent sidebar or inline filter bar
- Filter by: category, price range, size, color, sort order

---

## 4. Admin Design System

### 4.1 Color Palette

All admin colors are defined in `@theme` in `apps/admin/src/app/globals.css`.

**Primary colors:**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#0D0D0D` | Primary actions, active states |
| `--color-primary-light` | `#FAFAFA` | Light primary background |
| `--color-accent` | `#22C55E` | Success actions, positive indicators |
| `--color-accent-light` | `#F0FDF4` | Light accent background |

**Text colors:**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-text-primary` | `#0D0D0D` | Headings, primary text |
| `--color-text-secondary` | `#7A7A7A` | Body text, descriptions |
| `--color-text-muted` | `#999999` | Captions, placeholders, disabled text |
| `--color-text-on-dark` | `#FAFAFA` | Text on dark backgrounds |

**Surface colors:**
| Token | Value | Usage |
|-------|-------|-------|
| `--color-surface` | `#FFFFFF` | Page and card backgrounds |
| `--color-surface-tint` | `#FAFAFA` | Alternating table rows, subtle backgrounds |
| `--color-surface-hover` | `#F5F5F5` | Hover state for interactive surfaces |
| `--color-border` | `#E8E8E8` | Borders, dividers |

**Semantic colors:**
| Token | Value | Background | Usage |
|-------|-------|------------|-------|
| `--color-success` | `#22C55E` | `--color-success-bg: #F0FDF4` | Completed, active, positive |
| `--color-warning` | `#F59E0B` | `--color-warning-bg: #FEF3C7` | Pending, needs attention |
| `--color-error` | `#DC2626` | `--color-error-bg: #FEE2E2` | Failed, cancelled, destructive |
| `--color-info` | `#3B82F6` | `--color-info-bg: #EFF6FF` | Informational, links |

**Legacy token aliases (backward compatibility):**
| Legacy Token | Maps To | Value |
|-------------|---------|-------|
| `--color-deep-earth` | primary | `#0D0D0D` |
| `--color-charcoal` | primary | `#0D0D0D` |
| `--color-forest-green` | accent | `#22C55E` |
| `--color-dark-gray` | text-secondary | `#7A7A7A` |
| `--color-medium-gray` | text-muted | `#999999` |
| `--color-light-gray` | border | `#E8E8E8` |
| `--color-off-white` | surface-hover | `#F5F5F5` |
| `--color-cream` | surface-tint | `#FAFAFA` |
| `--color-warm-white` | surface | `#FFFFFF` |
| `--color-terracotta` | error | `#DC2626` |
| `--color-sand` | warning | `#F59E0B` |
| `--color-clay` | text-secondary | `#7A7A7A` |
| `--color-sage` | success | `#22C55E` |

### 4.2 Typography (Admin)

| Role | Font Family | CSS Variable | Usage |
|------|-------------|-------------|-------|
| **Headings** | Space Grotesk | `--font-heading` | Page titles, section headers |
| **Body** | Inter | `--font-body` | All body text, form labels, table content |
| **System fallback** | system-ui, sans-serif | -- | Fallback stack |

Apply heading font with the `.font-heading` utility class.

### 4.3 Admin Component Patterns

**Sidebar navigation:**
- Collapsible sidebar on the left
- Dark or primary-colored background
- Active page indicator
- Section grouping for related pages

**Data tables:**
- Native HTML `<table>` with Tailwind styling (no third-party table library)
- Alternating row backgrounds (`--color-surface-tint`)
- Hover state on rows (`--color-surface-hover`)
- Action buttons in the last column

**Forms:**
- react-hook-form with Zod validation (schemas from `@earth-revibe/shared`)
- Labels above inputs
- Inline error messages in `--color-error`
- Save/Cancel button pair at the bottom

**Charts:**
- recharts library with `ResponsiveContainer` wrapper
- Line charts for revenue over time
- Bar charts for order volume
- Consistent color scheme using semantic tokens

**Rich text editor:**
- TipTap (via `@tiptap/react`) for product descriptions and blog posts
- Toolbar with formatting options (bold, italic, headings, lists, links, images)

**Drag and drop:**
- `@hello-pangea/dnd` for:
  - Homepage section reordering
  - Product image reordering
  - Category sort order

**File uploads:**
- react-dropzone for drag-and-drop file selection
- Upload to Cloudflare Images via the API (never direct)
- Progress indicator during upload
- Image preview after upload

---

## 5. Shared Design Principles

### 5.1 Mobile First
- All storefront designs start from mobile viewport and scale up
- Touch targets minimum 44x44px
- Bottom navigation dock for primary actions (mobile only)
- Swipe gestures for product browsing and cart dismissal

### 5.2 Performance
- Skeleton loading states (shimmer animation) for all data-dependent content
- next/image for all images (automatic optimization, lazy loading, proper sizing)
- Minimal JavaScript -- Server Components by default, "use client" only when needed

### 5.3 Accessibility
- Semantic HTML elements
- Proper heading hierarchy
- Alt text on all images (configurable per product image in admin)
- Focus-visible states on interactive elements
- Color contrast ratios meeting WCAG AA

### 5.4 Icons
- **Storefront and Admin:** lucide-react exclusively. No other icon libraries.
- Consistent icon sizing (16px, 20px, 24px based on context)

### 5.5 Image Guidelines
- Product images: 2:3 aspect ratio (portrait orientation)
- Always use `next/image` component -- never raw `<img>` tags
- Images hosted on Cloudflare Images CDN
- Alt text required for all product images
