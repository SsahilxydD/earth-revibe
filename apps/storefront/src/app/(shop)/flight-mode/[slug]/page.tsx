'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, notFound } from 'next/navigation';
import { ArrowLeft, Bookmark, Share2, Lock, ChevronDown, Shuffle } from 'lucide-react';
import { useEffect } from 'react';
import {
  getCombo,
  comboDiscountPct,
  comboIndividualTotal,
  comboPrice,
  primaryImageUrl,
  toNumber,
} from '@/lib/flight-mode-data';
import { useProducts } from '@/hooks/use-products';
import { formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';
import { SwapSheet } from '@/components/flight-mode/swap-sheet';
import type { Product, ProductVariant } from '@/types';

export default function ComboDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const combo = getCombo(slug);
  if (!combo) notFound();

  const router = useRouter();
  const { addToast } = useToast();
  const addItem = useCartStore((s) => s.addItem);

  // 1) Vibe-scoped fetch — seeds the default roster with products that
  //    actually match the combo's collection.
  const { data: vibeData, isLoading } = useProducts({
    vibe: combo.vibe,
    limit: 24,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const vibePool: Product[] = useMemo(() => vibeData?.products ?? [], [vibeData]);

  // 2) Full catalog fetch — powers the swap sheet so the customer can
  //    pick anything from the store, not just items tagged with the
  //    combo's vibe.
  const { data: allData } = useProducts({
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const catalog: Product[] = useMemo(() => allData?.products ?? [], [allData]);

  // Pool used for selection resolution. Prefer the full catalog when it's
  // arrived (so swapped-in products exist in the pool), otherwise fall
  // back to the vibe pool so the default roster can still render.
  const pool: Product[] = catalog.length > 0 ? catalog : vibePool;

  // Selected piece IDs in display order. Seeded from the vibe-scoped
  // pool so the default roster actually matches the combo's collection.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  useEffect(() => {
    if (vibePool.length === 0) return;
    setSelectedIds((prev) => {
      // Keep existing selection as long as every id still resolves
      if (prev.length === combo.pieceCount && prev.every((id) => pool.some((p) => p.id === id))) {
        return prev;
      }
      return vibePool.slice(0, combo.pieceCount).map((p) => p.id);
    });
  }, [vibePool, pool, combo.pieceCount]);

  const pieces: Product[] = useMemo(
    () => selectedIds.map((id) => pool.find((p) => p.id === id)).filter((p): p is Product => !!p),
    [selectedIds, pool]
  );

  // Index of the slot whose swap sheet is currently open, or null.
  const [swapSlot, setSwapSlot] = useState<number | null>(null);

  const openSwap = (index: number) => {
    if (catalog.length <= pieces.length) {
      addToast('No other pieces available right now', 'info');
      return;
    }
    setOpenSizePicker(null);
    setSwapSlot(index);
  };

  const applySwap = (index: number, next: Product) => {
    const current = pieces[index];
    if (!current) return;
    setSelectedIds((prev) => {
      const copy = [...prev];
      copy[index] = next.id;
      return copy;
    });
    // Preserve size preference if the new product offers the same size in stock
    setSizes((prev) => {
      const copy = { ...prev };
      const oldSize = copy[current.id];
      if (oldSize) {
        const nextHasSize = next.variants.some((v) => v.size === oldSize && v.stock > 0);
        if (nextHasSize) copy[next.id] = oldSize;
        delete copy[current.id];
      }
      return copy;
    });
  };

  const discountPct = comboDiscountPct(combo);
  const individualTotal = useMemo(
    () => comboIndividualTotal(pieces, combo.pieceCount),
    [pieces, combo.pieceCount]
  );
  const price = useMemo(
    () => comboPrice(individualTotal, discountPct),
    [individualTotal, discountPct]
  );
  const savedAmount = individualTotal - price;

  // Hero mosaic — real product primaries
  const heroImages = useMemo(
    () => pieces.map((p) => primaryImageUrl(p)).filter(Boolean) as string[],
    [pieces]
  );
  const heroMosaic = heroImages.slice(0, 4);

  // Per-piece size state, stored by product id
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [openSizePicker, setOpenSizePicker] = useState<string | null>(null);

  const addBundleToCart = () => {
    if (pieces.length === 0) {
      addToast('Bundle is empty right now — try again', 'error');
      return;
    }
    // Items go in at FULL price; the server looks everything up from
    // variantId and ignores client-sent price. The combo discount is now
    // applied server-side via comboSlug + comboGroupId tokens (see
    // comboDiscount in @earth-revibe/shared/combos).
    //
    // comboGroupId is minted fresh per "Add Pack" press so two of the same
    // combo in a cart price independently and one removal doesn't break
    // the other.
    const groupId = mintComboGroupId();
    for (const product of pieces) {
      const chosenSize = sizes[product.id] || defaultSize(product);
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
        color: '',
        maxQuantity: variant.stock,
        quantity: 1,
        comboSlug: combo.slug,
        comboGroupId: groupId,
      });
    }
    addToast(`${combo.name} added to bag`, 'success');
  };

  const buyBundleNow = () => {
    addBundleToCart();
    router.push('/cart');
  };

  return (
    <div
      className="font-[family-name:var(--font-inter)]"
      style={{ backgroundColor: '#FAF7F0', minHeight: '100vh' }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 56,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAF7F0',
          borderBottom: '1px solid #F0F0F0',
          position: 'sticky',
          top: 56,
          zIndex: 10,
        }}
      >
        <Link href="/flight-mode" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <ArrowLeft size={20} color="#000" />
        </Link>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, color: '#000' }}>
          FLIGHT MODE · {combo.name.toUpperCase()}
        </span>
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && 'share' in navigator) {
              navigator.share?.({ title: combo.name, url: window.location.href }).catch(() => {});
            }
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Share"
        >
          <Share2 size={18} color="#000" />
        </button>
      </div>

      {/* Hero mosaic — real products */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 440,
          backgroundColor: '#EDE8DF',
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => {
          const src = heroMosaic[i];
          return (
            <div
              key={i}
              className={!src && isLoading ? 'skeleton' : ''}
              style={{
                position: 'absolute',
                width: '50%',
                height: '50%',
                top: i < 2 ? 0 : '50%',
                left: i % 2 === 0 ? 0 : '50%',
                overflow: 'hidden',
                backgroundColor: '#F5F5F5',
              }}
            >
              {src && (
                <Image
                  src={getImageUrl(src, 600)}
                  alt=""
                  fill
                  sizes="50vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  style={{ objectFit: 'cover' }}
                />
              )}
            </div>
          );
        })}
        <button
          type="button"
          style={{
            position: 'absolute',
            right: 16,
            top: 20,
            width: 32,
            height: 32,
            borderRadius: 9999,
            backgroundColor: 'rgba(255,255,255,0.82)',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Save combo"
        >
          <Bookmark size={14} color="#000" />
        </button>
      </div>

      {/* Header block */}
      <section
        style={{
          padding: '32px 24px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, color: '#999' }}>
          {combo.kicker}
        </span>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 300,
            letterSpacing: -0.8,
            lineHeight: 1,
            color: '#000',
            margin: 0,
          }}
        >
          {combo.name}
        </h1>
        <div style={{ width: 24, height: 1, backgroundColor: '#000' }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            color: '#666',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {combo.description}
        </p>
      </section>

      {/* What's in it — real products */}
      <section
        style={{
          padding: '8px 24px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2.5, color: '#999' }}>
          WHAT&apos;S IN IT
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {pieces.length === 0 && isLoading && (
            <>
              {Array.from({ length: combo.pieceCount }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{
                    height: 72,
                    marginBottom: 12,
                    borderRadius: 8,
                  }}
                />
              ))}
            </>
          )}
          {pieces.length === 0 && !isLoading && (
            <p style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
              Inventory for this kit is getting packed — check back soon.
            </p>
          )}
          {pieces.map((p, i) => (
            <div key={p.id}>
              <PieceRow
                product={p}
                size={sizes[p.id] || defaultSize(p)}
                onSizeClick={() => setOpenSizePicker((cur) => (cur === p.id ? null : p.id))}
                expanded={openSizePicker === p.id}
                onSizeChange={(s) => {
                  setSizes((prev) => ({ ...prev, [p.id]: s }));
                  setOpenSizePicker(null);
                }}
                onSwap={() => openSwap(i)}
                canSwap={catalog.length > pieces.length}
              />
              {i < pieces.length - 1 && <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />}
            </div>
          ))}
        </div>
      </section>

      {/* Price summary */}
      {pieces.length > 0 && (
        <section
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            backgroundColor: '#F5F5F5',
          }}
        >
          <Row
            left={<span>Individual total</span>}
            right={<span style={{ color: '#999' }}>{formatPrice(individualTotal)}</span>}
            leftColor="#666"
          />
          <Row
            left={<span style={{ color: '#22C55E' }}>Bundle discount (−{discountPct}%)</span>}
            right={<span style={{ color: '#22C55E' }}>−{formatPrice(savedAmount)}</span>}
            leftColor="#22C55E"
          />
          <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>You pay</span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: '#000',
                letterSpacing: -0.5,
              }}
            >
              {formatPrice(price)}
            </span>
          </div>
        </section>
      )}

      {/* CTAs */}
      <section
        style={{
          padding: '20px 20px 40px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={addBundleToCart}
          disabled={pieces.length === 0}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 9999,
            backgroundColor: 'transparent',
            border: '1px solid #E5E5E5',
            color: '#000',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 1.5,
            cursor: pieces.length === 0 ? 'not-allowed' : 'pointer',
            opacity: pieces.length === 0 ? 0.5 : 1,
          }}
        >
          ADD PACK TO BAG
        </button>
        <button
          type="button"
          onClick={buyBundleNow}
          disabled={pieces.length === 0}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 9999,
            backgroundColor: '#000',
            border: 'none',
            color: '#FFF',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 1.5,
            cursor: pieces.length === 0 ? 'not-allowed' : 'pointer',
            opacity: pieces.length === 0 ? 0.5 : 1,
          }}
        >
          BUY PACK NOW {pieces.length > 0 ? `· ${formatPrice(price)}` : ''}
        </button>
        <div
          style={{
            padding: '8px 0 0 0',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lock size={12} color="#CCC" />
          <span
            style={{
              fontSize: 9,
              fontWeight: 400,
              letterSpacing: 2,
              color: '#999',
            }}
          >
            365-DAY BUYBACK · FREE SHIPPING
          </span>
        </div>
      </section>

      {/* Swap picker — bottom sheet with every alternate from this vibe */}
      <SwapSheet
        isOpen={swapSlot !== null}
        onClose={() => setSwapSlot(null)}
        pool={pool}
        currentId={swapSlot !== null ? (pieces[swapSlot]?.id ?? null) : null}
        takenIds={selectedIds}
        kindLabel={
          swapSlot !== null ? pieces[swapSlot]?.category?.name?.toUpperCase() || 'PIECE' : 'PIECE'
        }
        onSelect={(next) => {
          if (swapSlot !== null) applySwap(swapSlot, next);
        }}
      />
    </div>
  );
}

/* ─── Per-piece row ───────────────────────────────────────────────── */

function PieceRow({
  product,
  size,
  onSizeClick,
  expanded,
  onSizeChange,
  onSwap,
  canSwap,
}: {
  product: Product;
  size: string;
  onSizeClick: () => void;
  expanded: boolean;
  onSizeChange: (s: string) => void;
  onSwap: () => void;
  canSwap: boolean;
}) {
  const img = primaryImageUrl(product);
  const sizes = useMemo(() => uniqueSizes(product.variants), [product.variants]);
  const kind = product.category?.name?.toUpperCase() || 'PIECE';

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link
          href={`/products/${product.slug}`}
          style={{
            position: 'relative',
            width: 60,
            aspectRatio: '3 / 4',
            borderRadius: 6,
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: '#F5F5F5',
          }}
        >
          {img && (
            <Image
              src={getImageUrl(img, 200)}
              alt={product.name}
              fill
              sizes="60px"
              style={{ objectFit: 'cover' }}
            />
          )}
        </Link>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: 1.5,
              color: '#999',
            }}
          >
            {kind}
          </span>
          <Link
            href={`/products/${product.slug}`}
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: '#000',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {product.name}
          </Link>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
            {sizes.length > 0 && (
              <button
                type="button"
                onClick={onSizeClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  height: 28,
                  width: 112,
                  flexShrink: 0,
                  padding: '0 12px',
                  borderRadius: 6,
                  border: '1px solid #E5E5E5',
                  backgroundColor: '#FAF7F0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 400, color: '#000' }}>Size · {size}</span>
                <ChevronDown size={10} color="#000" />
              </button>
            )}
            <button
              type="button"
              onClick={onSwap}
              disabled={!canSwap}
              aria-label="Swap this piece"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 28,
                padding: '0 10px',
                borderRadius: 6,
                border: '1px solid #E5E5E5',
                backgroundColor: '#FAF7F0',
                cursor: canSwap ? 'pointer' : 'not-allowed',
                opacity: canSwap ? 1 : 0.4,
              }}
            >
              <Shuffle size={11} color="#000" />
              <span style={{ fontSize: 10, fontWeight: 400, color: '#000' }}>Swap</span>
            </button>
          </div>
        </div>
        <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>
          {formatPrice(product.price)}
        </span>
      </div>
      {expanded && sizes.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 12,
            paddingLeft: 74,
            flexWrap: 'wrap',
          }}
        >
          {sizes.map((s) => {
            const active = s === size;
            const outOfStock = isSizeOutOfStock(product.variants, s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => !outOfStock && onSizeChange(s)}
                disabled={outOfStock}
                style={{
                  minWidth: 56,
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: active ? 'none' : `1px solid ${outOfStock ? '#F0F0F0' : '#E5E5E5'}`,
                  backgroundColor: active ? '#000' : '#FFF',
                  color: active ? '#FFF' : outOfStock ? '#CCC' : '#000',
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  cursor: outOfStock ? 'not-allowed' : 'pointer',
                  textDecoration: outOfStock ? 'line-through' : 'none',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

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

function findVariant(variants: ProductVariant[], size: string): ProductVariant | undefined {
  return variants.find((v) => v.size === size);
}

function isSizeOutOfStock(variants: ProductVariant[], size: string): boolean {
  const v = findVariant(variants, size);
  return v ? v.stock <= 0 : true;
}

function mintComboGroupId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultSize(product: Product): string {
  const sizes = uniqueSizes(product.variants);
  if (sizes.length === 0) return '';
  // Prefer M if available, otherwise first in-stock size
  const inStock = sizes.find((s) => !isSizeOutOfStock(product.variants, s));
  if (sizes.includes('M') && !isSizeOutOfStock(product.variants, 'M')) return 'M';
  return inStock || sizes[0];
}

function Row({
  left,
  right,
  leftColor = '#666',
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  leftColor?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 300, color: leftColor }}>{left}</span>
      <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>{right}</span>
    </div>
  );
}
