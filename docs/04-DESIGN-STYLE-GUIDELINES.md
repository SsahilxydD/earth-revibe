# Earth Revibe - Design & Style Guidelines

## Brand Identity

**Brand Personality:** Warm, grounded, conscious, authentic, approachable premium
**Tone:** Conversational yet refined. Never preachy about sustainability — let the products and materials speak for themselves.
**Visual Language:** Organic textures, natural photography, generous whitespace, soft curves

---

## Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Forest Green** | `#2D5016` | Primary brand color, CTAs, active states |
| **Sage** | `#87A878` | Secondary actions, highlights, tags |
| **Cream** | `#FAF7F2` | Primary background |
| **Warm White** | `#FFFFFF` | Card backgrounds, modals |

### Secondary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Terracotta** | `#C67B5C` | Accent color, sale badges, warm highlights |
| **Sand** | `#D4C5A9` | Borders, dividers, subtle backgrounds |
| **Clay** | `#8B6F47` | Secondary text, icon fills |
| **Deep Earth** | `#3D2B1F` | Primary text, headings |

### Neutral Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Charcoal** | `#2C2C2C` | Body text |
| **Dark Gray** | `#4A4A4A` | Secondary text |
| **Medium Gray** | `#8E8E8E` | Placeholder text, disabled states |
| **Light Gray** | `#E5E5E5` | Borders, dividers |
| **Off White** | `#F5F5F5` | Alternate backgrounds |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#4A7C59` | Success messages, in-stock indicator |
| **Warning** | `#D4A843` | Low stock, warnings |
| **Error** | `#C0392B` | Error messages, validation errors |
| **Info** | `#5B8FA8` | Information banners, tooltips |

---

## Typography

### Font Stack

| Role | Font | Fallback | Weight |
|------|------|----------|--------|
| **Headings** | `Playfair Display` | `Georgia, serif` | 500, 600, 700 |
| **Body** | `Inter` | `system-ui, sans-serif` | 400, 500, 600 |
| **Accent/Labels** | `Inter` | `system-ui, sans-serif` | 500, 600 |
| **Monospace** | `JetBrains Mono` | `monospace` | 400 (admin code/IDs) |

### Type Scale

| Name | Size (Desktop) | Size (Mobile) | Line Height | Weight | Usage |
|------|----------------|---------------|-------------|--------|-------|
| **Display** | 56px / 3.5rem | 36px / 2.25rem | 1.1 | 700 | Hero headings |
| **H1** | 40px / 2.5rem | 28px / 1.75rem | 1.2 | 600 | Page titles |
| **H2** | 32px / 2rem | 24px / 1.5rem | 1.25 | 600 | Section headings |
| **H3** | 24px / 1.5rem | 20px / 1.25rem | 1.3 | 600 | Subsection headings |
| **H4** | 20px / 1.25rem | 18px / 1.125rem | 1.4 | 500 | Card headings |
| **Body Large** | 18px / 1.125rem | 16px / 1rem | 1.6 | 400 | Lead paragraphs |
| **Body** | 16px / 1rem | 15px / 0.9375rem | 1.6 | 400 | Main content |
| **Body Small** | 14px / 0.875rem | 13px / 0.8125rem | 1.5 | 400 | Captions, meta |
| **Label** | 12px / 0.75rem | 12px / 0.75rem | 1.4 | 600 | Labels, badges, overlines |
| **Overline** | 11px / 0.6875rem | 11px / 0.6875rem | 1.5 | 600 | Category tags (uppercase, tracked) |

---

## Spacing System

Based on 4px grid with Tailwind's spacing scale:

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps (icon + text) |
| `space-2` | 8px | Inline padding, small gaps |
| `space-3` | 12px | Form field padding |
| `space-4` | 16px | Card padding, standard gap |
| `space-5` | 20px | Between related sections |
| `space-6` | 24px | Card inner padding |
| `space-8` | 32px | Section padding |
| `space-10` | 40px | Between major sections |
| `space-12` | 48px | Page section spacing |
| `space-16` | 64px | Major section dividers |
| `space-20` | 80px | Hero/banner vertical padding |
| `space-24` | 96px | Page top/bottom padding |

---

## Layout & Grid

### Container Widths

| Breakpoint | Container Max-Width | Padding |
|------------|-------------------|---------|
| Mobile (`< 640px`) | 100% | 16px |
| Tablet (`640px - 1023px`) | 100% | 24px |
| Desktop (`1024px - 1279px`) | 1024px | 32px |
| Wide (`1280px+`) | 1280px | 32px |

### Product Grid

| Breakpoint | Columns | Gap |
|------------|---------|-----|
| Mobile | 2 | 12px |
| Tablet | 3 | 16px |
| Desktop | 4 | 24px |

### Admin Layout

| Component | Width |
|-----------|-------|
| Sidebar (expanded) | 260px |
| Sidebar (collapsed) | 72px |
| Main content | remaining |
| Max content width | 1440px |

---

## Component Design Tokens

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Badges, tags |
| `rounded-md` | 8px | Buttons, inputs |
| `rounded-lg` | 12px | Cards, modals |
| `rounded-xl` | 16px | Hero sections, feature cards |
| `rounded-full` | 9999px | Avatars, round buttons |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation (cards at rest) |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | Cards on hover, dropdowns |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modals, popovers |
| `shadow-xl` | `0 16px 48px rgba(0,0,0,0.16)` | Toast notifications |

### Transitions

| Property | Duration | Easing |
|----------|----------|--------|
| Color, background | 150ms | ease-in-out |
| Transform, opacity | 200ms | ease-out |
| Layout, height | 300ms | ease-in-out |
| Page transitions | 400ms | ease-out |

---

## Button Styles

### Primary Button
- Background: Forest Green `#2D5016`
- Text: White `#FFFFFF`
- Padding: 12px 24px
- Border Radius: 8px
- Font: Inter 500, 16px
- Hover: darken 10% (`#244012`)
- Active: darken 15%
- Disabled: opacity 0.5, no pointer

### Secondary Button
- Background: transparent
- Border: 1.5px solid Forest Green `#2D5016`
- Text: Forest Green `#2D5016`
- Hover: Forest Green bg, white text

### Ghost Button
- Background: transparent
- Text: Forest Green `#2D5016`
- Hover: Cream background `#FAF7F2`

### Danger Button
- Background: Error `#C0392B`
- Text: White
- Hover: darken 10%

### Button Sizes

| Size | Padding | Font Size | Height |
|------|---------|-----------|--------|
| Small | 8px 16px | 14px | 36px |
| Medium | 12px 24px | 16px | 44px |
| Large | 16px 32px | 18px | 52px |

---

## Form Elements

### Input Fields
- Background: White `#FFFFFF`
- Border: 1.5px solid `#E5E5E5`
- Border Radius: 8px
- Padding: 12px 16px
- Font: Inter 400, 16px
- Focus: border Forest Green `#2D5016`, subtle green shadow
- Error: border Error `#C0392B`, error text below
- Placeholder: Medium Gray `#8E8E8E`
- Height: 44px

### Select / Dropdown
- Same as input styling
- Custom chevron icon (lucide-react)
- Dropdown menu: white bg, shadow-md, rounded-lg

### Checkbox / Radio
- Custom styled with Forest Green accent
- Size: 20px
- Border Radius: 4px (checkbox), full (radio)
- Checked: Forest Green fill with white check

### Toggle Switch
- Track: Light Gray -> Forest Green (active)
- Thumb: White with shadow-sm
- Width: 44px, Height: 24px

---

## Card Styles

### Product Card
```
- Background: White
- Border Radius: 12px
- Shadow: shadow-sm, hover: shadow-md
- Image: aspect-ratio 3:4, rounded-t-lg
- Padding (content area): 16px
- Transition: transform scale(1.02) on hover
- Wishlist icon: top-right corner, 32px circle
```

### Admin Dashboard Card
```
- Background: White
- Border: 1px solid #E5E5E5
- Border Radius: 12px
- Padding: 24px
- Shadow: none (flat design for admin)
- Hover: border color Sage #87A878
```

---

## Iconography

- **Library:** Lucide React (consistent, clean stroke icons)
- **Stroke Width:** 1.5px (storefront), 2px (admin)
- **Default Size:** 20px (inline), 24px (standalone)
- **Color:** inherits from text color

---

## Image Guidelines

### Product Photography
- Clean, natural lighting (warm daylight feel)
- Neutral/natural backgrounds (off-white linen, raw wood, earth tones)
- Model shots + flat lays
- Minimum resolution: 1200x1600px (3:4 ratio)
- Format: WebP with JPEG fallback

### Aspect Ratios

| Context | Ratio |
|---------|-------|
| Product card thumbnail | 3:4 |
| Product detail main image | 3:4 |
| Hero banner (desktop) | 21:9 |
| Hero banner (mobile) | 16:9 |
| Blog featured image | 16:9 |
| Category card | 1:1 |
| Avatar | 1:1 |

---

## Animation Guidelines

### Micro-interactions
- Button hover: subtle scale (1.02) + color shift, 150ms
- Card hover: lift with shadow-md, 200ms
- Add to cart: icon bounce + badge pulse
- Toast notification: slide in from top-right, 300ms
- Page load: content fade-in staggered, 400ms

### Page Transitions
- Route change: fade (opacity 0->1), 300ms
- Modal open: fade + scale (0.95->1), 200ms
- Drawer open: slide from right, 300ms
- Accordion: height auto with ease-in-out, 300ms

### Loading States
- Skeleton screens (not spinners) for content loading
- Shimmer effect on skeletons using CSS animation
- Button loading: text replaced with spinner, width maintained

---

## Responsive Breakpoints

| Name | Min Width | Tailwind Prefix |
|------|-----------|-----------------|
| Mobile (default) | 0px | (none) |
| Small | 640px | `sm:` |
| Medium | 768px | `md:` |
| Large | 1024px | `lg:` |
| Extra Large | 1280px | `xl:` |
| 2XL | 1536px | `2xl:` |

### Mobile-First Principles
1. Design for 375px width first (iPhone SE)
2. Touch targets minimum 44x44px
3. Bottom navigation bar on mobile storefront
4. Swipe gestures for carousels and drawers
5. No hover-dependent interactions on mobile
6. Simplified navigation (hamburger + drawer)

---

## Admin Dashboard Aesthetic

- **Style:** Clean, professional, Shopify-inspired
- **Background:** Off White `#F5F5F5`
- **Cards:** White with subtle borders (no shadows — flat)
- **Sidebar:** Deep Earth `#3D2B1F` background, white text
- **Active nav item:** Forest Green `#2D5016` left border + Sage `#87A878` text
- **Data tables:** Alternating row colors (white / off-white)
- **Status badges:** Rounded pills with semantic colors
  - Active/Delivered: Success green bg
  - Pending/Processing: Warning amber bg
  - Cancelled/Error: Error red bg
  - Draft: Medium Gray bg

---

## Accessibility Standards

- WCAG 2.1 AA compliance minimum
- Color contrast ratio: 4.5:1 for body text, 3:1 for large text
- Focus indicators: 2px Forest Green outline with 2px offset
- Skip to main content link
- Semantic HTML (proper heading hierarchy, landmarks)
- Alt text for all images
- Keyboard navigable (all interactive elements)
- Screen reader friendly (ARIA labels where needed)
- Reduced motion support via `prefers-reduced-motion`
