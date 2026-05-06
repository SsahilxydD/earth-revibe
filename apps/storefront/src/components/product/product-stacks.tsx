'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, type PanInfo } from 'framer-motion';
import { ChevronDown, Shuffle } from 'lucide-react';
import { useProducts } from '@/hooks/use-products';
import { formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import {
  COMBOS,
  comboDiscountPct,
  comboIndividualTotal,
  comboPrice,
  primaryImageUrl,
  toNumber,
  type ComboMeta,
} from '@/lib/flight-mode-data';
import { SwapSheet } from '@/components/flight-mode/swap-sheet';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';
import type { Product, ProductVariant } from '@/types';

const CARD_W = 260;
const CARD_H = 380;

// Three-slot peek (was five). Far peeks at ±2 added visual noise without
// communication value on a 390px viewport — they were barely visible AND
// fought the active card's shadow. Now: visible peek only at ±1.
const SLOTS: Record<number, { left: number; scale: number; opacity: number; zIndex: number }> = {
  [-1]: { left: -120, scale: 0.92, opacity: 0.55, zIndex: 3 },
  [0]: { left: 65, scale: 1, opacity: 1, zIndex: 5 },
  [1]: { left: 250, scale: 0.92, opacity: 0.55, zIndex: 3 },
};
const HIDDEN_SLOT = { left: 65, scale: 0, opacity: 0, zIndex: 0 };

// Shared horizontal gutter so title, cards, dots, pricing and CTA all align
// to the same 16px column on either side of the viewport.
const BUNDLE_PADDING_X = 16;

// Spring physics for slot transitions and drag snap-back. Tuned to match
// the natural-feel of native scroll inertia: snappy at small drags,
// elastic at the edges, consistent across slow/fast flicks.
const SLOT_SPRING = { type: 'spring' as const, stiffness: 280, damping: 32, mass: 0.9 };
const SWIPE_OFFSET_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 350;

function uniqueSizes(variants: ProductVariant[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    if (v.size && !seen.has(v.size)) {
      seen.add(v.size);
      out.push(v.size);
    }
  }
  return out;
}

function defaultSize(product: Product): string {
  const sizes = uniqueSizes(product.variants);
  if (sizes.length === 0) return '';
  if (sizes.includes('M') && product.variants.some((v) => v.size === 'M' && v.stock > 0))
    return 'M';
  return sizes.find((s) => product.variants.some((v) => v.size === s && v.stock > 0)) || sizes[0];
}

function findVariant(variants: ProductVariant[], size: string): ProductVariant | undefined {
  return (
    variants.find((v) => v.size === size && v.stock > 0) || variants.find((v) => v.size === size)
  );
}

function mintComboGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSlotOffset(index: number, activeIndex: number, total: number): number {
  let offset = index - activeIndex;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return Math.round(offset);
}

function getSlot(offset: number) {
  if (offset < -1 || offset > 1) return HIDDEN_SLOT;
  return SLOTS[offset];
}

function CardContent({
  product,
  isActive,
  size,
  onSizeToggle,
  sizeOpen,
  onSizeChange,
  onSwap,
}: {
  product: Product;
  isActive: boolean;
  size: string;
  onSizeToggle: () => void;
  sizeOpen: boolean;
  onSizeChange: (s: string) => void;
  onSwap: () => void;
}) {
  const imgUrl = primaryImageUrl(product);
  const sizes = useMemo(() => uniqueSizes(product.variants), [product.variants]);

  return (
    <>
      <div
        style={{
          width: '100%',
          flex: 1,
          backgroundColor: '#F0F0F0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {imgUrl && (
          <Image
            src={getImageUrl(imgUrl, 560)}
            alt={product.name}
            fill
            sizes="260px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            style={{ objectFit: 'cover' }}
          />
        )}
      </div>

      <div
        style={{
          padding: '14px 16px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontFamily: 'var(--font-helvetica)',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: -0.2,
              lineHeight: 1.25,
              color: '#000000',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 32,
            }}
          >
            {product.name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-helvetica)',
              fontSize: 12,
              fontWeight: 500,
              color: '#000000',
            }}
          >
            {formatPrice(product.price)}
          </span>
        </div>

        {isActive && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            {sizes.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSizeToggle();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  height: 36,
                  flex: 1,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid #E5E5E5',
                  backgroundColor: '#FFF',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 400,
                  color: '#000',
                  fontFamily: 'var(--font-helvetica)',
                }}
              >
                <span>Size · {size}</span>
                <ChevronDown size={12} color="#000" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwap();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                height: 36,
                flex: 1,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid #E5E5E5',
                backgroundColor: '#FFF',
                cursor: 'pointer',
              }}
            >
              <Shuffle size={12} color="#000" />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: '#000',
                  fontFamily: 'var(--font-helvetica)',
                }}
              >
                Swap
              </span>
            </button>
          </div>
        )}

        {isActive && sizeOpen && sizes.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {sizes.map((s) => {
              const active = s === size;
              const oos = !product.variants.some((v) => v.size === s && v.stock > 0);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!oos) onSizeChange(s);
                  }}
                  disabled={oos}
                  style={{
                    minWidth: 38,
                    height: 28,
                    padding: '0 6px',
                    borderRadius: 6,
                    border: active ? 'none' : `1px solid ${oos ? '#F0F0F0' : '#E5E5E5'}`,
                    backgroundColor: active ? '#000' : '#FFF',
                    color: active ? '#FFF' : oos ? '#CCC' : '#000',
                    fontSize: 10,
                    fontWeight: active ? 500 : 400,
                    cursor: oos ? 'not-allowed' : 'pointer',
                    textDecoration: oos ? 'line-through' : 'none',
                    fontFamily: 'var(--font-helvetica)',
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function CarouselCard({
  product,
  slot,
  isActive,
  onPrev,
  onNext,
  size,
  onSizeToggle,
  sizeOpen,
  onSizeChange,
  onSwap,
}: {
  product: Product;
  slot: { left: number; scale: number; opacity: number; zIndex: number };
  isActive: boolean;
  onPrev: () => void;
  onNext: () => void;
  size: string;
  onSizeToggle: () => void;
  sizeOpen: boolean;
  onSizeChange: (s: string) => void;
  onSwap: () => void;
}) {
  // Drag is enabled only on the active card. Framer's `drag` handles the
  // pointer/touch tracking; we just decide on dragEnd whether the gesture
  // crossed the swipe threshold (offset OR velocity). If it did, advance
  // the active index and let the spring animation in `animate` carry every
  // card to its new slot. If it didn't, framer auto-snaps back to slot.left.
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const dx = info.offset.x;
      const vx = info.velocity.x;
      const passed =
        Math.abs(dx) > SWIPE_OFFSET_THRESHOLD || Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD;
      if (!passed) return;
      if (dx < 0) onNext();
      else onPrev();
    },
    [onPrev, onNext]
  );

  return (
    <motion.div
      initial={false}
      animate={{
        x: slot.left,
        scale: slot.scale,
        opacity: slot.opacity,
      }}
      transition={SLOT_SPRING}
      drag={isActive ? 'x' : false}
      dragElastic={0.18}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        width: CARD_W,
        height: CARD_H,
        marginTop: -CARD_H / 2,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        border: '1px solid #ECECEC',
        boxShadow: isActive
          ? '0 4px 14px -4px rgba(0,0,0,0.10)'
          : '0 2px 8px -2px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        zIndex: slot.zIndex,
        willChange: 'transform, opacity',
        cursor: isActive ? 'grab' : 'default',
        touchAction: isActive ? 'pan-y' : 'auto',
        userSelect: 'none',
        pointerEvents: slot === HIDDEN_SLOT ? 'none' : 'auto',
      }}
    >
      <CardContent
        product={product}
        isActive={isActive}
        size={size}
        onSizeToggle={onSizeToggle}
        sizeOpen={isActive ? sizeOpen : false}
        onSizeChange={onSizeChange}
        onSwap={onSwap}
      />
    </motion.div>
  );
}

function CarouselSkeleton() {
  return (
    <div style={{ position: 'relative', width: '100%', height: 420, overflow: 'hidden' }}>
      {([-1, 0, 1] as const).map((offset) => {
        const slot = SLOTS[offset];
        return (
          <div
            key={offset}
            style={{
              position: 'absolute',
              left: slot.left,
              top: '50%',
              width: CARD_W,
              height: CARD_H,
              borderRadius: 12,
              backgroundColor: '#FFF',
              border: '1px solid #ECECEC',
              boxShadow: '0 2px 8px -2px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transform: `translateY(-50%) scale(${slot.scale})`,
              opacity: slot.opacity,
              zIndex: slot.zIndex,
            }}
          >
            <div style={{ width: '100%', flex: 1, backgroundColor: '#F0F0F0' }} />
            <div
              style={{
                padding: '12px 14px 14px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: '#F0F0F0' }}
              />
              <div style={{ width: 60, height: 12, borderRadius: 4, backgroundColor: '#F0F0F0' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryCarousel({ combo, index }: { combo: ComboMeta; index: number }) {
  // Pull the bundle's exact products by slug (deck source of truth) instead
  // of by vibe — vibe-fetch was returning whichever top-N products matched
  // the tag, often skipping bottomwear entirely. Reorder by productSlugs
  // because Prisma `slug: { in: [...] }` doesn't preserve input order, and
  // the carousel relies on products[0] being the hero card.
  const { data, isLoading } = useProducts({
    slugs: combo.productSlugs,
    limit: combo.pieceCount,
  });
  const slugIndex = useMemo(
    () => new Map(combo.productSlugs.map((s, i) => [s, i] as const)),
    [combo.productSlugs]
  );
  const initialProducts = useMemo(
    () =>
      [...(data?.products ?? [])].sort(
        (a, b) => (slugIndex.get(a.slug) ?? 99) - (slugIndex.get(b.slug) ?? 99)
      ),
    [data, slugIndex]
  );

  // Swap-sheet pool stays vibe-based — users browse alternatives within the
  // same aesthetic, not just the deck list.
  const { data: poolData } = useProducts({
    vibe: combo.vibe,
    limit: 24,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const pool: Product[] = poolData?.products ?? [];

  // Union of bundle products + vibe pool. The bundle's slug-fetched items
  // must always be resolvable: pool is by vibe and may not contain every
  // bundle product (e.g. cargo pants tagged differently than the polo
  // they pair with), so pool-only lookup silently dropped most cards.
  const sourcePool: Product[] = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of initialProducts) map.set(p.id, p);
    for (const p of pool) if (!map.has(p.id)) map.set(p.id, p);
    return Array.from(map.values());
  }, [initialProducts, pool]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    if (initialProducts.length === 0) return;
    setSelectedIds((prev) => {
      if (
        prev.length === combo.pieceCount &&
        prev.every((id) => sourcePool.some((p) => p.id === id))
      ) {
        return prev;
      }
      return initialProducts.slice(0, combo.pieceCount).map((p) => p.id);
    });
  }, [initialProducts, sourcePool, combo.pieceCount]);

  const allProducts: Product[] = useMemo(() => {
    return selectedIds
      .map((id) => sourcePool.find((p) => p.id === id))
      .filter((p): p is Product => !!p);
  }, [selectedIds, sourcePool]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [openSizePicker, setOpenSizePicker] = useState<string | null>(null);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { addToast } = useToast();

  const getSize = (product: Product) => sizes[product.id] || defaultSize(product);
  const total = allProducts.length;

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setOpenSizePicker(null);
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setOpenSizePicker(null);
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const discountPct = comboDiscountPct(combo);
  const individualTotal = useMemo(
    () => comboIndividualTotal(allProducts, combo.pieceCount),
    [allProducts, combo.pieceCount]
  );
  const bundlePrice = useMemo(
    () => comboPrice(individualTotal, discountPct),
    [individualTotal, discountPct]
  );
  const savedAmount = individualTotal - bundlePrice;

  const handleSwap = useCallback(() => {
    setOpenSizePicker(null);
    setSwapSlot(activeIndex);
  }, [activeIndex]);

  const applySwap = useCallback(
    (next: Product) => {
      if (swapSlot === null) return;
      setSelectedIds((prev) => {
        const copy = [...prev];
        copy[swapSlot] = next.id;
        return copy;
      });
      setSizes((prev) => {
        const copy = { ...prev };
        const oldId = selectedIds[swapSlot];
        if (oldId) {
          const oldSize = copy[oldId];
          if (oldSize) {
            const nextHasSize = next.variants.some((v) => v.size === oldSize && v.stock > 0);
            if (nextHasSize) copy[next.id] = oldSize;
            delete copy[oldId];
          }
        }
        return copy;
      });
    },
    [swapSlot, selectedIds]
  );

  const handleAddAll = () => {
    if (allProducts.length === 0) return;
    const groupId = mintComboGroupId();
    for (const product of allProducts) {
      const chosenSize = getSize(product);
      const variant = findVariant(product.variants, chosenSize);
      if (!variant) {
        addToast(`Pick a size for ${product.name}`, 'error');
        return;
      }
      addItem({
        id: variant.id,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: primaryImageUrl(product) || '',
        price: toNumber(product.price),
        size: chosenSize,
        color: variant.color || '',
        maxQuantity: variant.stock,
        quantity: 1,
        comboSlug: combo.slug,
        comboGroupId: groupId,
      });
    }
    addToast(`${combo.name} added to bag`, 'success');
    setTimeout(() => openCart(), 200);
  };

  // Section wrapper — every bundle gets the same horizontal gutter and a
  // hairline divider above (skipped for the first one) so bundles read as
  // discrete cards instead of bleeding into each other.
  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    paddingLeft: BUNDLE_PADDING_X,
    paddingRight: BUNDLE_PADDING_X,
    paddingTop: 36,
    paddingBottom: 36,
    borderTop: index > 0 ? '1px solid #F0F0F0' : 'none',
  };

  if (isLoading) {
    return (
      <section style={sectionStyle}>
        <CarouselSkeleton />
      </section>
    );
  }

  return (
    <section style={sectionStyle}>
      {/* Title block — kicker → name → tagline. Tight gaps; left-aligned to
          match the rest of the section instead of floating centered. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-helvetica)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 1.6,
            color: '#999',
          }}
        >
          {combo.kicker}
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-helvetica)',
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: -0.5,
            color: '#000',
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          {combo.name}
        </h2>
        {combo.tagline && (
          <span
            style={{
              fontFamily: 'var(--font-helvetica)',
              fontSize: 12,
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#666',
            }}
          >
            {combo.tagline}
          </span>
        )}
      </div>

      {/* Carousel — height clamped to card height + breathing room. */}
      <div style={{ position: 'relative', width: '100%', height: 400, overflow: 'hidden' }}>
        {allProducts.map((product, i) => {
          const offset = getSlotOffset(i, activeIndex, total);
          const slot = getSlot(offset);
          const isActive = offset === 0;

          return (
            <CarouselCard
              key={product.id}
              product={product}
              slot={slot}
              isActive={isActive}
              onPrev={handlePrev}
              onNext={handleNext}
              size={getSize(product)}
              onSizeToggle={() =>
                setOpenSizePicker((cur) => (cur === product.id ? null : product.id))
              }
              sizeOpen={openSizePicker === product.id}
              onSizeChange={(s) => {
                setSizes((prev) => ({ ...prev, [product.id]: s }));
                setOpenSizePicker(null);
              }}
              onSwap={handleSwap}
            />
          );
        })}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center' }}>
          {allProducts.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setOpenSizePicker(null);
                setActiveIndex(i);
              }}
              style={{
                width: i === activeIndex ? 8 : 6,
                height: i === activeIndex ? 8 : 6,
                borderRadius: 9999,
                border: 'none',
                backgroundColor: i === activeIndex ? '#000' : '#D0D0D0',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Pricing strip — bundle price + strikethrough on left, SAVE pill
          on right. Both share the section gutter (no extra inner padding). */}
      {individualTotal > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-helvetica)',
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: -0.5,
                color: '#000',
              }}
            >
              {formatPrice(bundlePrice)}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-helvetica)',
                fontSize: 13,
                fontWeight: 300,
                color: '#999',
                textDecoration: 'line-through',
              }}
            >
              {formatPrice(individualTotal)}
            </span>
          </div>
          {discountPct > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 24,
                padding: '0 10px',
                borderRadius: 9999,
                backgroundColor: '#22C55E',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-helvetica)',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  color: '#FFF',
                }}
              >
                SAVE {discountPct}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Savings hint sits ABOVE the CTA so users see the win before they
          tap. Only shown when there's actually a discount (skips 2-piece
          bundles that fall below the tier floor). */}
      {savedAmount > 0 && (
        <span
          style={{
            fontFamily: 'var(--font-helvetica)',
            fontSize: 11,
            fontWeight: 500,
            color: '#22C55E',
            letterSpacing: 0.3,
          }}
        >
          You save {formatPrice(savedAmount)} with this bundle
        </span>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={handleAddAll}
        disabled={allProducts.length === 0}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 9999,
          backgroundColor: '#000',
          border: 'none',
          color: '#FFF',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 1.4,
          cursor: allProducts.length === 0 ? 'not-allowed' : 'pointer',
          opacity: allProducts.length === 0 ? 0.4 : 1,
          fontFamily: 'var(--font-helvetica)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {allProducts.length > 0 ? `ADD PACK · ${formatPrice(bundlePrice)}` : 'LOADING…'}
      </button>

      {/* Swap sheet */}
      <SwapSheet
        isOpen={swapSlot !== null}
        onClose={() => setSwapSlot(null)}
        pool={pool}
        currentId={swapSlot !== null ? (allProducts[swapSlot]?.id ?? null) : null}
        takenIds={selectedIds}
        kindLabel={combo.name}
        onSelect={(next) => {
          applySwap(next);
          setSwapSlot(null);
        }}
      />
    </section>
  );
}

export function ProductStacks() {
  // No outer padding or gap — each <section> handles its own padding and
  // the top-border divider provides separation. Keeps spacing predictable
  // and lets sections sit edge-to-edge when needed (e.g. alternate bg).
  return (
    <div style={{ width: '100%' }}>
      {COMBOS.map((combo, i) => (
        <CategoryCarousel key={combo.slug} combo={combo} index={i} />
      ))}
    </div>
  );
}
