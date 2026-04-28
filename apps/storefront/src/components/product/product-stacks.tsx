'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
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

interface CardPosition {
  x: number;
  y: number;
  rotation: number;
}

interface StackConfig {
  combo: ComboMeta;
  cards: CardPosition[];
}

const STACKS: StackConfig[] = [
  {
    combo: COMBOS[0], // touch-and-go (WEEKENDER)
    cards: [
      { x: 30, y: 50, rotation: 6 },
      { x: 50, y: 40, rotation: -4 },
      { x: 38, y: 30, rotation: 1.5 },
    ],
  },
  {
    combo: COMBOS[1], // salt-pack (BEACH)
    cards: [
      { x: 25, y: 55, rotation: -5 },
      { x: 48, y: 42, rotation: 4 },
      { x: 35, y: 32, rotation: -1.5 },
    ],
  },
  {
    combo: COMBOS[2], // above-the-fold (MOUNTAIN)
    cards: [
      { x: 32, y: 52, rotation: 5 },
      { x: 45, y: 40, rotation: -3.5 },
      { x: 36, y: 30, rotation: 1.5 },
    ],
  },
  {
    combo: COMBOS[3], // neon-starter (CITY)
    cards: [
      { x: 28, y: 55, rotation: -6 },
      { x: 50, y: 44, rotation: 3.5 },
      { x: 38, y: 34, rotation: -1 },
    ],
  },
];

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 28, mass: 0.8 };
const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY = 400;

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

function CardContent({
  product,
  size,
  onSizeToggle,
  sizeOpen,
  onSizeChange,
  onSwap,
}: {
  product: Product;
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
            sizes="280px"
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

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {sizes.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSizeToggle(); }}
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
            onClick={(e) => { e.stopPropagation(); onSwap(); }}
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
            <span style={{ fontSize: 10, fontWeight: 400, color: '#000', fontFamily: 'Inter, sans-serif' }}>
              Swap
            </span>
          </button>
        </div>

        {sizeOpen && sizes.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ display: 'flex', gap: 4, flexWrap: 'wrap', overflow: 'hidden' }}
          >
            {sizes.map((s) => {
              const active = s === size;
              const oos = !product.variants.some((v) => v.size === s && v.stock > 0);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); if (!oos) onSizeChange(s); }}
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
          </motion.div>
        )}
      </div>
    </>
  );
}

function StackCard({
  product,
  position,
  zIndex,
  isFront,
  onSwipe,
  size,
  onSizeToggle,
  sizeOpen,
  onSizeChange,
  onSwap,
}: {
  product: Product;
  position: CardPosition;
  zIndex: number;
  isFront: boolean;
  onSwipe: () => void;
  size: string;
  onSizeToggle: () => void;
  sizeOpen: boolean;
  onSizeChange: (s: string) => void;
  onSwap: () => void;
}) {
  const x = useMotionValue(0);
  const dragRotate = useTransform(x, [-300, 0, 300], [-12, 0, 12]);
  const cardRotate = useTransform(dragRotate, (dr) => position.rotation + dr);
  const cardOpacity = useTransform(x, [-250, -120, 0, 120, 250], [0.4, 0.85, 1, 0.85, 0.4]);
  const scale = useTransform(x, [-250, 0, 250], [0.95, 1, 0.95]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipedFarEnough = Math.abs(info.offset.x) > SWIPE_THRESHOLD;
    const swipedFastEnough = Math.abs(info.velocity.x) > SWIPE_VELOCITY;

    if (swipedFarEnough || swipedFastEnough) {
      const direction = info.offset.x > 0 ? 1 : -1;
      animate(x, direction * 400, {
        type: 'spring',
        stiffness: 200,
        damping: 25,
        mass: 0.5,
        onComplete: () => {
          x.set(0);
          onSwipe();
        },
      });
    } else {
      animate(x, 0, SPRING);
    }
  };

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: 280,
    height: 420,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    border: '1px solid #ECECEC',
    boxShadow: '0 4px 16px -2px rgba(0,0,0,0.125)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transformOrigin: 'top left',
    zIndex,
  };

  if (!isFront) {
    return (
      <motion.div
        style={{
          ...cardStyle,
          rotate: position.rotation,
        }}
        animate={{
          left: position.x,
          top: position.y,
          rotate: position.rotation,
        }}
        transition={SPRING}
      >
        <CardContent
          product={product}
          size={size}
          onSizeToggle={onSizeToggle}
          sizeOpen={false}
          onSizeChange={onSizeChange}
          onSwap={onSwap}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      style={{
        ...cardStyle,
        x,
        rotate: cardRotate,
        opacity: cardOpacity,
        scale,
        cursor: 'grab',
        touchAction: 'none',
      }}
      animate={{
        left: position.x,
        top: position.y,
      }}
      transition={SPRING}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
      whileDrag={{ scale: 1.02 }}
    >
      <CardContent
        product={product}
        size={size}
        onSizeToggle={onSizeToggle}
        sizeOpen={sizeOpen}
        onSizeChange={onSizeChange}
        onSwap={onSwap}
      />
    </motion.div>
  );
}

function StackCardSkeleton({
  position,
  zIndex,
}: {
  position: CardPosition;
  zIndex: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: 280,
        height: 420,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        border: '1px solid #ECECEC',
        boxShadow: '0 4px 16px -2px rgba(0,0,0,0.125)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transform: `rotate(${position.rotation}deg)`,
        transformOrigin: 'top left',
        zIndex,
      }}
    >
      <div style={{ width: '100%', flex: 1, backgroundColor: '#F0F0F0' }} />
      <div style={{ padding: '12px 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ width: 120, height: 14, borderRadius: 4, backgroundColor: '#F0F0F0' }} />
        <div style={{ width: 60, height: 12, borderRadius: 4, backgroundColor: '#F0F0F0' }} />
      </div>
    </div>
  );
}

function CategoryStack({ stack }: { stack: StackConfig }) {
  const { combo } = stack;
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
      if (prev.length === combo.pieceCount && prev.every((id) => source.some((p) => p.id === id))) {
        return prev;
      }
      return initialProducts.slice(0, combo.pieceCount).map((p) => p.id);
    });
  }, [initialProducts, pool, combo.pieceCount]);

  const allProducts: Product[] = useMemo(() => {
    const source = pool.length > 0 ? pool : initialProducts;
    return selectedIds.map((id) => source.find((p) => p.id === id)).filter((p): p is Product => !!p);
  }, [selectedIds, pool, initialProducts]);

  // Only the first 3 products are shown in the visual stack
  const visibleProducts = allProducts.slice(0, 3);

  const [order, setOrder] = useState([0, 1, 2]);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [openSizePicker, setOpenSizePicker] = useState<string | null>(null);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { addToast } = useToast();

  const getSize = (product: Product) => sizes[product.id] || defaultSize(product);

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

  const handleSwipe = useCallback(() => {
    setOpenSizePicker(null);
    setOrder((prev) => {
      const front = prev[prev.length - 1];
      return [front, ...prev.slice(0, -1)];
    });
  }, []);

  const handleSwap = useCallback((slotIndex: number) => {
    setOpenSizePicker(null);
    const productIdx = order[slotIndex];
    setSwapSlot(productIdx);
  }, [order]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 500,
          overflow: 'visible',
        }}
      >
        {/* Category label */}
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

        {/* Stacked cards */}
        {order.map((productIdx, renderIdx) => {
          const pos = stack.cards[renderIdx];
          const product = visibleProducts[productIdx];
          const isFront = renderIdx === order.length - 1;

          if (isLoading || !product) {
            return <StackCardSkeleton key={renderIdx} position={pos} zIndex={renderIdx + 1} />;
          }

          return (
            <StackCard
              key={product.id}
              product={product}
              position={pos}
              zIndex={renderIdx + 1}
              isFront={isFront}
              onSwipe={handleSwipe}
              size={getSize(product)}
              onSizeToggle={() =>
                setOpenSizePicker((cur) => (cur === product.id ? null : product.id))
              }
              sizeOpen={openSizePicker === product.id}
              onSizeChange={(s) => {
                setSizes((prev) => ({ ...prev, [product.id]: s }));
                setOpenSizePicker(null);
              }}
              onSwap={() => handleSwap(renderIdx)}
            />
          );
        })}
      </div>

      {/* Pricing row */}
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

      {/* Add to Bag button */}
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

      {/* Save label */}
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
      {STACKS.map((stack) => (
        <CategoryStack key={stack.combo.slug} stack={stack} />
      ))}
    </div>
  );
}
