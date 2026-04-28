'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
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

const SLOTS: Record<number, { left: number; scale: number; opacity: number; zIndex: number }> = {
  [-2]: { left: -194, scale: 0.8, opacity: 0.5, zIndex: 1 },
  [-1]: { left: -136, scale: 0.9, opacity: 0.75, zIndex: 3 },
  [0]: { left: 66, scale: 1, opacity: 1, zIndex: 5 },
  [1]: { left: 269, scale: 0.9, opacity: 0.75, zIndex: 3 },
  [2]: { left: 327, scale: 0.8, opacity: 0.5, zIndex: 1 },
};
const HIDDEN_SLOT = { left: 66, scale: 0, opacity: 0, zIndex: 0 };

const EASE = 'cubic-bezier(0.25,0.1,0.25,1)';
const CARD_TRANSITION = `left 0.6s ${EASE}, transform 0.6s ${EASE}, opacity 0.6s ${EASE}`;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 300;
const DRAG_START_PX = 5;

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
  if (sizes.includes('M') && product.variants.some((v) => v.size === 'M' && v.stock > 0)) return 'M';
  return sizes.find((s) => product.variants.some((v) => v.size === s && v.stock > 0)) || sizes[0];
}

function findVariant(variants: ProductVariant[], size: string): ProductVariant | undefined {
  return variants.find((v) => v.size === size && v.stock > 0) || variants.find((v) => v.size === size);
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
  if (offset < -2 || offset > 2) return HIDDEN_SLOT;
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
          padding: '12px 14px 14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: -0.2,
              lineHeight: 1.2,
              color: '#000000',
              flex: 1,
              minWidth: 0,
            }}
          >
            {product.name}
          </span>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              color: '#000000',
              flexShrink: 0,
              marginLeft: 8,
            }}
          >
            {formatPrice(product.price)}
          </span>
        </div>

        {isActive && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                  height: 26,
                  flex: 1,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid #E5E5E5',
                  backgroundColor: '#FFF',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 400,
                  color: '#000',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span>Size · {size}</span>
                <ChevronDown size={10} color="#000" />
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
                gap: 4,
                height: 26,
                padding: '0 8px',
                borderRadius: 6,
                border: '1px solid #E5E5E5',
                backgroundColor: '#FFF',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Shuffle size={10} color="#000" />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 400,
                  color: '#000',
                  fontFamily: 'Inter, sans-serif',
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
                    fontFamily: 'Inter, sans-serif',
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

interface DragState {
  startX: number;
  startTime: number;
  dragging: boolean;
  pointerId: number;
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
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive) return;
      dragRef.current = {
        startX: e.clientX,
        startTime: Date.now(),
        dragging: false,
        pointerId: e.pointerId,
      };
    },
    [isActive],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !cardRef.current) return;
      const dx = e.clientX - drag.startX;

      if (!drag.dragging && Math.abs(dx) > DRAG_START_PX) {
        drag.dragging = true;
        cardRef.current.style.transition = 'none';
        cardRef.current.setPointerCapture(drag.pointerId);
      }

      if (drag.dragging) {
        cardRef.current.style.transform = `translateY(-50%) scale(${slot.scale}) translateX(${dx}px)`;
      }
    },
    [slot.scale],
  );

  const handlePointerEnd = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !cardRef.current) return;

      if (drag.dragging) {
        const dx = e.clientX - drag.startX;
        const dt = Date.now() - drag.startTime;
        const velocity = (Math.abs(dx) / Math.max(dt, 1)) * 1000;
        const swiped =
          Math.abs(dx) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;

        cardRef.current.style.transition = CARD_TRANSITION;

        if (swiped) {
          if (dx < 0) onNext();
          else onPrev();
        } else {
          cardRef.current.style.transform = `translateY(-50%) scale(${slot.scale}) translateX(0px)`;
        }
      }

      dragRef.current = null;
    },
    [slot.scale, onPrev, onNext],
  );

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        left: slot.left,
        top: '50%',
        width: CARD_W,
        height: CARD_H,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        border: '1px solid #ECECEC',
        boxShadow: isActive
          ? '0 8px 32px -4px rgba(0,0,0,0.18)'
          : '0 4px 16px -2px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transform: `translateY(-50%) scale(${slot.scale}) translateX(0px)`,
        opacity: slot.opacity,
        zIndex: slot.zIndex,
        transition: CARD_TRANSITION,
        willChange: 'transform, opacity, left',
        cursor: isActive ? 'grab' : 'default',
        touchAction: isActive ? 'pan-y' : 'auto',
        userSelect: 'none',
        pointerEvents: slot === HIDDEN_SLOT ? 'none' : 'auto',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
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
    </div>
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
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.1)',
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
              <div style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: '#F0F0F0' }} />
              <div style={{ width: 60, height: 12, borderRadius: 4, backgroundColor: '#F0F0F0' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoryCarousel({ combo }: { combo: ComboMeta }) {
  const { data, isLoading } = useProducts({
    vibe: combo.vibe,
    limit: combo.pieceCount,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const initialProducts = data?.products ?? [];

  const { data: poolData } = useProducts({
    vibe: combo.vibe,
    limit: 24,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const pool: Product[] = poolData?.products ?? [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    if (initialProducts.length === 0) return;
    setSelectedIds((prev) => {
      const source = pool.length > 0 ? pool : initialProducts;
      if (
        prev.length === combo.pieceCount &&
        prev.every((id) => source.some((p) => p.id === id))
      ) {
        return prev;
      }
      return initialProducts.slice(0, combo.pieceCount).map((p) => p.id);
    });
  }, [initialProducts, pool, combo.pieceCount]);

  const allProducts: Product[] = useMemo(() => {
    const source = pool.length > 0 ? pool : initialProducts;
    return selectedIds
      .map((id) => source.find((p) => p.id === id))
      .filter((p): p is Product => !!p);
  }, [selectedIds, pool, initialProducts]);

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
    [allProducts, combo.pieceCount],
  );
  const bundlePrice = useMemo(
    () => comboPrice(individualTotal, discountPct),
    [individualTotal, discountPct],
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
            const nextHasSize = next.variants.some(
              (v) => v.size === oldSize && v.stock > 0,
            );
            if (nextHasSize) copy[next.id] = oldSize;
            delete copy[oldId];
          }
        }
        return copy;
      });
    },
    [swapSlot, selectedIds],
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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <CarouselSkeleton />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Carousel */}
      <div style={{ position: 'relative', width: '100%', height: 420, overflow: 'hidden' }}>
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1.5,
            color: '#999999',
            zIndex: 10,
          }}
        >
          {combo.kicker}
        </span>

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
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* Pricing */}
      {individualTotal > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: -0.5,
                color: '#000',
              }}
            >
              {formatPrice(bundlePrice)}
            </span>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: 300,
                color: '#999',
                textDecoration: 'line-through',
              }}
            >
              {formatPrice(individualTotal)}
            </span>
          </div>
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
                fontFamily: 'Inter, sans-serif',
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 1.5,
                color: '#FFF',
              }}
            >
              SAVE {discountPct}%
            </span>
          </div>
        </div>
      )}

      {/* Add to Bag */}
      <button
        type="button"
        onClick={handleAddAll}
        disabled={allProducts.length === 0}
        style={{
          width: '100%',
          height: 48,
          borderRadius: 9999,
          backgroundColor: '#000',
          border: 'none',
          color: '#FFF',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: 1.5,
          cursor: allProducts.length === 0 ? 'not-allowed' : 'pointer',
          opacity: allProducts.length === 0 ? 0.4 : 1,
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {allProducts.length > 0
          ? `ADD PACK TO BAG · ${formatPrice(bundlePrice)}`
          : 'LOADING…'}
      </button>

      {/* Save hint */}
      {savedAmount > 0 && (
        <span
          style={{
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
            fontSize: 10,
            fontWeight: 400,
            color: '#22C55E',
            letterSpacing: 0.5,
          }}
        >
          You save {formatPrice(savedAmount)} with this bundle
        </span>
      )}

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
    </div>
  );
}

export function ProductStacks() {
  return (
    <div
      style={{
        padding: '20px 20px 30px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        width: '100%',
      }}
    >
      {COMBOS.map((combo) => (
        <CategoryCarousel key={combo.slug} combo={combo} />
      ))}
    </div>
  );
}
