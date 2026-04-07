# Zara-Style Swipe Product Navigation

## Summary

Horizontal swipe gesture on mobile product pages (`/products/[slug]`) that transitions between products using a card-stack cover animation. Swipe left for next, right for previous. Infinite loop through the collection. Mobile touch only.

## Scope

- Product detail page only (`apps/storefront/src/app/(shop)/products/[slug]/page.tsx`)
- Mobile/touch devices only — no desktop interaction
- Builds on existing: `product-nav-store.ts`, `SwipeableProductWrapper`, `ProductDetail.isPreview`

## Panel Architecture

Three `ProductDetail` panels in the DOM at all times:

```
[PREV panel]    [CURRENT panel]    [NEXT panel]
  x: -100vw        x: 0              x: 100vw
  (offscreen)    (visible)         (offscreen)
```

- Container: `position: relative; overflow: hidden; width: 100vw; height: 100dvh`
- Each panel: `position: absolute; inset: 0; overflow-y: auto` (independent scroll)
- Offscreen panels render `ProductDetail` with `isPreview={true}` (hides fixed dock, size sheet)
- Current panel renders with `isPreview={false}` (full interactive product page)

### Panel Reassignment (after swipe left → next)

1. NEXT panel animates from `100vw` to `0` (covers current)
2. After animation settles:
   - Old PREV unmounts
   - Old CURRENT becomes PREV (moved to `-100vw`)
   - Old NEXT becomes CURRENT (`isPreview` flips to `false`)
   - New NEXT mounts with prefetched product data
3. Always exactly 3 panels in DOM

## Gesture Detection

Using framer-motion `drag="x"` on the panel container.

### Drag Phase (finger down, dragging)

- Current panel: follows finger via `translateX(dragX)`, scales to `0.95`, dims to `opacity: 0.7` — proportional to drag distance
- Incoming panel: tracks at `translateX(+/-100vw + dragX)` — visible as it enters from the edge
- Incoming product name: fades in (`opacity: 0 -> 1`) based on drag progress as an overlay on the incoming panel

### Commit Threshold

- Commits if: `|dragDistance| > 30vw` OR `|velocity| > 500px/s`
- Below threshold: spring back to original positions

### Animation Phase (finger released, threshold met)

- Incoming panel: springs to `translateX(0)` with `stiffness: 300, damping: 30` (overshoot + settle)
- Current panel: continues sliding out, stays dimmed
- Haptic: `navigator.vibrate(10)` fires on commit (ignored on devices that don't support it)
- Duration: ~300ms for spring to settle

### Bounce Back (threshold not met)

- Both panels spring back to resting positions
- Current panel: scale back to `1.0`, opacity back to `1.0`

## Immersive Details

### Parallax Depth

During drag, current panel transforms:

```css
transform: translateX(dragX) scale(0.95);
opacity: 0.7;
```

Values interpolate linearly from `scale(1.0), opacity(1.0)` at `dragX=0` to the minimums at full commit threshold.

### Haptic Feedback

```js
if ('vibrate' in navigator) navigator.vibrate(10);
```

Fires once at the moment of swipe commit (threshold exceeded on release).

### Edge Peek Indicator (idle state)

- 4px wide strip at the right edge showing the next product's hero image
- Subtle `box-shadow: -2px 0 8px rgba(0,0,0,0.1)` on the peek strip
- Hidden during active drag (full incoming panel takes over)
- Hidden if no adjacent product (solo product in list)

### Momentum Physics

Framer-motion spring config:

```js
{ type: "spring", stiffness: 300, damping: 30 }
```

Produces natural overshoot and settle. Bounce-back uses same spring.

### Product Name Reveal

During drag, an overlay on the incoming panel shows the product name:

- Positioned center of the incoming panel
- `opacity` interpolated from `0` (drag start) to `1` (commit threshold)
- Uses the product's name, `text-sm font-bold uppercase tracking-wider`
- Fades out after the panel fully lands and the real product detail is visible

## Data Prefetching

### On Mount

When current product mounts:

```js
const { prev, next } = getAdjacentSlugs(currentSlug);
if (prev) queryClient.prefetchQuery({ queryKey: productKeys.detail(prev), queryFn: ... });
if (next) queryClient.prefetchQuery({ queryKey: productKeys.detail(next), queryFn: ... });
```

### After Swipe

After panel reassignment, prefetch the newly adjacent product (the one just loaded into the new PREV or NEXT slot).

### Prefetch Failure

- Swipe gesture still works visually
- Incoming panel shows skeleton/spinner if data isn't ready
- Retry on mount — if still fails, show "Couldn't load product" with retry button
- Never blocks or breaks the current product view

## URL & State Sync

### URL Update

```js
window.history.replaceState(null, '', `/products/${newSlug}`);
document.title = `${newProduct.name} | Earth Revibe`;
```

No Next.js router navigation — avoids page reload/blink.

### Analytics

`trackProductViewed()` fires for the new product after each swipe commit.

### Browser Back/Forward

Listen to `popstate`:

- On back after swipe navigation, load previous product instantly (no animation)
- Swap product data and reset panels without transition

## Edge Cases

### No Adjacent Products

- If `getAdjacentSlugs()` returns `{ prev: null, next: null }` (< 2 products in list)
- Hide edge peek, disable swipe gesture entirely
- Product page works normally without swipe

### Rapid Successive Swipes

- Lock swipe during animation phase (~300ms)
- Ignore new touch events until current spring animation settles
- Prevents half-transitioned states

### Swipe vs Image Carousel Conflict

Product pages have a horizontal image gallery at the top.

Disambiguation:

- If touch starts inside the image carousel component, let the carousel handle the gesture
- Only intercept horizontal swipe if touch originates outside the carousel
- OR if the carousel is at its first/last image boundary (can't scroll further in that direction)

Implementation: the carousel component calls `event.stopPropagation()` on `touchmove` when it's handling an internal scroll. The swipe wrapper only acts on events that reach it.

### Viewport Resize / Orientation Change

- Panels use `100vw` CSS units so positions auto-adjust
- If mid-drag during orientation change, cancel the drag and snap back to resting positions
- Listen to `resize` event to reset any pixel-based drag offset

## Files to Create/Modify

### New Files

- `apps/storefront/src/components/product/swipe-panel-container.tsx` — the 3-panel swipe engine with framer-motion drag
- `apps/storefront/src/hooks/use-swipe-navigation.ts` — gesture logic, threshold calc, haptics, URL sync
- `apps/storefront/src/components/product/edge-peek.tsx` — the idle-state peek strip

### Modified Files

- `apps/storefront/src/components/product/swipeable-product-wrapper.tsx` — replace current single-panel render with `SwipePanelContainer`
- `apps/storefront/src/components/product/product-detail.tsx` — ensure `isPreview` fully hides interactive elements (dock, modals, size sheet)
- `apps/storefront/src/stores/product-nav-store.ts` — no changes needed, existing `getAdjacentSlugs` with infinite loop is correct

## Technology

- **Gestures:** framer-motion `drag="x"` + `onDragEnd` (already in project)
- **Animation:** framer-motion `motion.div` with spring transitions
- **State:** existing `product-nav-store` Zustand store + React Query cache
- **Prefetch:** React Query `prefetchQuery`
- **URL:** `history.replaceState` (no Next.js router)
