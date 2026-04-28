'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ChevronDown, Shuffle } from 'lucide-react';
import { useProducts } from '@/hooks/use-products';
import { formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import { primaryImageUrl, toNumber } from '@/lib/flight-mode-data';
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
  label: string;
  vibe: string;
  cards: CardPosition[];
}

const STACKS: StackConfig[] = [
  {
    label: 'WEEKENDER',
    vibe: 'salt-on-skin',
    cards: [
      { x: 30, y: 50, rotation: 6 },
      { x: 50, y: 40, rotation: -4 },
      { x: 38, y: 30, rotation: 1.5 },
    ],
  },
  {
    label: 'BEACH',
    vibe: 'salt-on-skin',
    cards: [
      { x: 25, y: 55, rotation: -5 },
      { x: 48, y: 42, rotation: 4 },
      { x: 35, y: 32, rotation: -1.5 },
    ],
  },
  {
    label: 'MOUNTAIN',
    vibe: 'above-the-clouds',
    cards: [
      { x: 32, y: 52, rotation: 5 },
      { x: 45, y: 40, rotation: -3.5 },
      { x: 36, y: 30, rotation: 1.5 },
    ],
  },
  {
    label: 'CITY',
    vibe: 'neon-nomads',
    cards: [
      { x: 28, y: 55, rotation: -6 },
      { x: 50, y: 44, rotation: 3.5 },
      { x: 38, y: 34, rotation: -1 },
    ],
  },
];

const SWIPE_THRESHOLD = 100;

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
      {/* Image area */}
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

      {/* Body */}
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

        {/* Size + Swap row */}
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

        {/* Expanded size picker */}
        {sizeOpen && sizes.length > 0 && (
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
  const dragRotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const cardRotate = useTransform(dragRotate, (dr) => position.rotation + dr);
  const cardOpacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 0.8, 1, 0.8, 0.5]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipedFarEnough = Math.abs(info.offset.x) > SWIPE_THRESHOLD;
    const swipedFastEnough = Math.abs(info.velocity.x) > 500;

    if (swipedFarEnough || swipedFastEnough) {
      const direction = info.offset.x > 0 ? 1 : -1;
      animate(x, direction * 500, {
        duration: 0.3,
        onComplete: () => {
          x.set(0);
          onSwipe();
        },
      });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
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
      <div
        style={{
          ...cardStyle,
          transform: `rotate(${position.rotation}deg)`,
        }}
      >
        <CardContent
          product={product}
          size={size}
          onSizeToggle={onSizeToggle}
          sizeOpen={false}
          onSizeChange={onSizeChange}
          onSwap={onSwap}
        />
      </div>
    );
  }

  return (
    <motion.div
      style={{
        ...cardStyle,
        x,
        rotate: cardRotate,
        opacity: cardOpacity,
        cursor: 'grab',
        touchAction: 'none',
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: 'grabbing' }}
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
}

function CategoryStack({ stack }: { stack: StackConfig }) {
  const { data, isLoading } = useProducts({
    vibe: stack.vibe,
    limit: 3,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const initialProducts = data?.products ?? [];

  const { data: poolData } = useProducts({
    vibe: stack.vibe,
    limit: 24,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const pool: Product[] = poolData?.products ?? [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    if (initialProducts.length === 0) return;
    setSelectedIds((prev) => {
      if (prev.length === 3 && prev.every((id) => (pool.length > 0 ? pool : initialProducts).some((p) => p.id === id))) {
        return prev;
      }
      return initialProducts.slice(0, 3).map((p) => p.id);
    });
  }, [initialProducts, pool]);

  const products: Product[] = useMemo(() => {
    const source = pool.length > 0 ? pool : initialProducts;
    return selectedIds.map((id) => source.find((p) => p.id === id)).filter((p): p is Product => !!p);
  }, [selectedIds, pool, initialProducts]);

  const [order, setOrder] = useState([0, 1, 2]);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [openSizePicker, setOpenSizePicker] = useState<string | null>(null);
  const [swapSlot, setSwapSlot] = useState<number | null>(null);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const { addToast } = useToast();

  const getSize = (product: Product) => sizes[product.id] || defaultSize(product);

  const handleSwipe = useCallback(() => {
    setOpenSizePicker(null);
    setOrder((prev) => {
      const front = prev[prev.length - 1];
      return [front, ...prev.slice(0, -1)];
    });
  }, []);

  const handleSwap = useCallback(
    (slotIndex: number) => {
      setOpenSizePicker(null);
      setSwapSlot(slotIndex);
    },
    []
  );

  const applySwap = useCallback(
    (next: Product) => {
      if (swapSlot === null) return;
      const productIdx = order[swapSlot];
      setSelectedIds((prev) => {
        const copy = [...prev];
        copy[productIdx] = next.id;
        return copy;
      });
      setSizes((prev) => {
        const copy = { ...prev };
        const oldId = selectedIds[productIdx];
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
    [swapSlot, order, selectedIds]
  );

  const handleAddAll = () => {
    if (products.length === 0) return;
    for (const product of products) {
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
      });
    }
    addToast(`${stack.label} picks added to bag`, 'success');
    setTimeout(() => openCart(), 200);
  };

  const totalPrice = useMemo(
    () => products.reduce((sum, p) => sum + toNumber(p.price), 0),
    [products]
  );

  const frontProductIdx = order[order.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          {stack.label}
        </span>

        {/* Stacked cards */}
        {order.map((productIdx, renderIdx) => {
          const pos = stack.cards[renderIdx];
          const product = products[productIdx];
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

      {/* Add to Bag button */}
      <button
        type="button"
        onClick={handleAddAll}
        disabled={products.length === 0}
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
          cursor: products.length === 0 ? 'not-allowed' : 'pointer',
          opacity: products.length === 0 ? 0.4 : 1,
          fontFamily: 'Inter, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {products.length > 0 ? `ADD ALL TO BAG · ${formatPrice(totalPrice)}` : 'LOADING…'}
      </button>

      {/* Swap sheet */}
      <SwapSheet
        isOpen={swapSlot !== null}
        onClose={() => setSwapSlot(null)}
        pool={pool}
        currentId={swapSlot !== null ? (products[order[swapSlot]]?.id ?? null) : null}
        takenIds={selectedIds}
        kindLabel={stack.label}
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
        gap: 24,
        width: '100%',
      }}
    >
      {STACKS.map((stack) => (
        <CategoryStack key={stack.label} stack={stack} />
      ))}
    </div>
  );
}
