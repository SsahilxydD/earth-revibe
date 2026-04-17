'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, X, Check, Shuffle, Info, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';
import { VIBE_META, primaryImageUrl, type ComboVibe } from '@/lib/flight-mode-data';
import { useProducts } from '@/hooks/use-products';
import type { Product, ProductVariant } from '@/types';

type VibeSlug = ComboVibe | 'mixed';

type Duration = 3 | 5 | 7;

const DURATION_TO_PIECES: Record<Duration, number> = { 3: 3, 5: 5, 7: 7 };
const BUNDLE_DISCOUNT_PCT = 22;

export default function KitBuilderPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 12, color: '#999' }}>Loading builder…</span>
        </div>
      }
    >
      <KitBuilderInner />
    </Suspense>
  );
}

function KitBuilderInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const step = Math.max(1, Math.min(4, Number(sp.get('step') || 1))) as 1 | 2 | 3 | 4;

  const { addToast } = useToast();
  const addItem = useCartStore((s) => s.addItem);

  const [vibe, setVibe] = useState<VibeSlug>('above-the-clouds');
  const [duration, setDuration] = useState<Duration>(5);

  // Fetch a larger pool so the user can swap into alternates without
  // blowing it up. We only actually use `duration` items.
  const { data, isLoading } = useProducts(
    {
      vibe: vibe === 'mixed' ? undefined : vibe,
      limit: 24,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    { enabled: step >= 2 }
  );
  const pool = data?.products ?? [];

  // Selected piece IDs, in display order
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Sizes by product id
  const [sizes, setSizes] = useState<Record<string, string>>({});

  // When pool arrives or duration changes, seed selection from the top-N
  useEffect(() => {
    if (pool.length === 0) return;
    const needed = DURATION_TO_PIECES[duration];
    setSelectedIds((prev) => {
      if (prev.length === needed && prev.every((id) => pool.some((p) => p.id === id))) {
        return prev;
      }
      return pool.slice(0, needed).map((p) => p.id);
    });
  }, [pool, duration]);

  const pieces: Product[] = useMemo(
    () => selectedIds.map((id) => pool.find((p) => p.id === id)).filter((p): p is Product => !!p),
    [selectedIds, pool]
  );

  const individualTotal = useMemo(() => pieces.reduce((acc, p) => acc + p.price, 0), [pieces]);
  const kitPrice = useMemo(
    () => Math.round(individualTotal * (1 - BUNDLE_DISCOUNT_PCT / 100)),
    [individualTotal]
  );

  const selectedVibeLabel = vibe === 'mixed' ? 'Mixed trip' : VIBE_META[vibe].label.join(' ');

  const goStep = (n: 1 | 2 | 3 | 4) => router.push(`/flight-mode/build?step=${n}`);

  const swapPiece = (idx: number) => {
    const current = pieces[idx];
    if (!current || pool.length <= pieces.length) {
      addToast('No other options right now for that slot', 'info');
      return;
    }
    const alreadyIn = new Set(selectedIds);
    const next = pool.find((p) => !alreadyIn.has(p.id));
    if (!next) {
      addToast('No more alternates available', 'info');
      return;
    }
    setSelectedIds((prev) => {
      const copy = [...prev];
      copy[idx] = next.id;
      return copy;
    });
    // Carry size preference if possible
    setSizes((prev) => {
      const copy = { ...prev };
      if (copy[current.id]) {
        copy[next.id] = copy[current.id];
        delete copy[current.id];
      }
      return copy;
    });
  };

  const packKit = () => {
    if (pieces.length === 0) {
      addToast('Kit is empty', 'error');
      return;
    }
    pieces.forEach((product) => {
      const size = sizes[product.id] || defaultSize(product);
      const variant = findVariant(product.variants, size);
      const scaledPrice =
        individualTotal > 0
          ? Math.round((kitPrice / individualTotal) * product.price)
          : product.price;
      const img = primaryImageUrl(product) || '';
      addItem({
        id: variant?.id || `kit-${product.id}`,
        productId: product.id,
        name: `${product.name} · Custom Kit`,
        slug: product.slug,
        image: img,
        price: scaledPrice,
        size,
        color: '',
        maxQuantity: variant?.stock ?? 99,
        quantity: 1,
      });
    });
    addToast('Kit added to bag', 'success');
  };

  return (
    <div
      className="font-[family-name:var(--font-inter)]"
      style={{
        backgroundColor: '#FFF',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 56,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #F0F0F0',
        }}
      >
        {step === 1 ? (
          <Link href="/flight-mode">
            <X size={20} color="#000" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => goStep((step - 1) as 1 | 2 | 3 | 4)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={20} color="#000" />
          </button>
        )}
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: 2.5, color: '#000' }}>
          BUILD YOUR KIT
        </span>
        <span style={{ fontSize: 11, fontWeight: 300, letterSpacing: 1, color: '#999' }}>
          {step} / 4
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 20px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 2,
              borderRadius: 1,
              backgroundColor: i <= step ? '#000' : '#E5E5E5',
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Step1Vibe
              vibe={vibe}
              setVibe={setVibe}
              duration={duration}
              setDuration={setDuration}
            />
            <StickyBar
              left="Preview"
              right={`${selectedVibeLabel} · ${DURATION_TO_PIECES[duration]} pieces`}
              ctaLabel="CONTINUE"
              onCta={() => goStep(2)}
            />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Step2Pieces
              vibeLabel={selectedVibeLabel}
              pieces={pieces}
              expectedCount={DURATION_TO_PIECES[duration]}
              isLoading={isLoading}
              onSwap={swapPiece}
            />
            <StickyBar
              leftBlockLeft={`${pieces.length} PIECES SELECTED`}
              leftBlockRight={`Bundle total ${formatPrice(individualTotal)}`}
              rightBlockLeft={`SAVES ${formatPrice(individualTotal - kitPrice)}`}
              rightBlockRight={`~${formatPrice(kitPrice)}`}
              ctaLabel="CONTINUE"
              onCta={() => goStep(3)}
              disabled={pieces.length === 0}
            />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Step3Sizes pieces={pieces} sizes={sizes} setSizes={setSizes} />
            <Step3Sticky
              sizedCount={pieces.filter((p) => sizes[p.id]).length}
              totalCount={pieces.length}
              onCta={() => goStep(4)}
            />
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Step4Review
              vibe={vibe}
              pieces={pieces}
              sizes={sizes}
              individualTotal={individualTotal}
              kitPrice={kitPrice}
              onAdd={() => {
                packKit();
                router.push('/cart');
              }}
              onAddToBagOnly={packKit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Step 1 — Where + how long ────────────────────────────────────── */

function Step1Vibe({
  vibe,
  setVibe,
  duration,
  setDuration,
}: {
  vibe: VibeSlug;
  setVibe: (v: VibeSlug) => void;
  duration: Duration;
  setDuration: (d: Duration) => void;
}) {
  const vibeOptions: Exclude<VibeSlug, 'mixed'>[] = [
    'above-the-clouds',
    'salt-on-skin',
    'golden-hour-gang',
    'into-the-wild',
    'neon-nomads',
  ];
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          padding: '40px 28px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2.5, color: '#999' }}>
          STEP ONE
        </span>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -1,
            lineHeight: 1,
            color: '#000',
            margin: 0,
          }}
        >
          Where are
          <br />
          you going?
        </h1>
        <div style={{ width: 24, height: 1, backgroundColor: '#000' }} />
        <p style={{ fontSize: 13, fontWeight: 300, color: '#666', lineHeight: 1.5, margin: 0 }}>
          Pick the trip — we pull pieces from the matching collection in your catalog.
        </p>
      </div>

      {/* Vibe grid — each tile preloads one real primary image from that vibe */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          padding: '0 20px 20px 20px',
        }}
      >
        {vibeOptions.map((v) => (
          <VibeTile key={v} slug={v} selected={vibe === v} onClick={() => setVibe(v)} />
        ))}
        {/* Mixed tile */}
        <button
          type="button"
          onClick={() => setVibe('mixed')}
          style={{
            height: 220,
            borderRadius: 14,
            backgroundColor: '#FAFAFA',
            border: vibe === 'mixed' ? '2px solid #000' : '1px dashed #E5E5E5',
            cursor: 'pointer',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <Shuffle size={22} color="#000" />
          <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>Mixed trip</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 300,
              color: '#999',
              textAlign: 'center',
            }}
          >
            Pieces from any collection
          </span>
        </button>
      </div>

      {/* Duration */}
      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2.5, color: '#999' }}>
          HOW LONG?
        </span>
        <span style={{ fontSize: 12, fontWeight: 300, fontStyle: 'italic', color: '#666' }}>
          We&apos;ll size the kit to the stay.
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          {([3, 5, 7] as Duration[]).map((d) => {
            const active = duration === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                style={{
                  flex: 1,
                  height: 76,
                  borderRadius: 12,
                  backgroundColor: active ? '#000' : '#FFF',
                  border: active ? 'none' : '1px solid #E5E5E5',
                  color: active ? '#FFF' : '#000',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 26, fontWeight: 300, letterSpacing: -0.5, lineHeight: 1 }}>
                  {d === 7 ? '7+' : d}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    letterSpacing: 1,
                    opacity: active ? 0.8 : 0.6,
                  }}
                >
                  days
                </span>
                <span style={{ fontSize: 9, fontWeight: 300, opacity: active ? 0.7 : 0.55 }}>
                  {DURATION_TO_PIECES[d]} pieces
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* What's next */}
      <div
        style={{
          padding: '8px 28px 32px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2.5, color: '#999' }}>
          WHAT&apos;S NEXT
        </span>
        {[
          ['02', 'Review the pieces we pulled (swap any).'],
          ['03', 'Pick your size for each piece.'],
          ['04', 'Bundle discount applies automatically — add to bag.'],
        ].map(([n, text]) => (
          <div
            key={n}
            style={{ padding: '10px 0', display: 'flex', gap: 14, alignItems: 'center' }}
          >
            <span style={{ fontSize: 11, fontWeight: 400, color: '#CCC', letterSpacing: 1 }}>
              {n}
            </span>
            <span style={{ fontSize: 12, fontWeight: 300, color: '#666' }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VibeTile({
  slug,
  selected,
  onClick,
}: {
  slug: Exclude<VibeSlug, 'mixed'>;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = VIBE_META[slug];
  const { data } = useProducts({
    vibe: slug,
    limit: 1,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const hero = primaryImageUrl(data?.products?.[0]);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        height: 220,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        border: selected ? '2px solid #000' : '1px solid #E5E5E5',
        backgroundColor: '#1a1a1a',
      }}
    >
      {hero ? (
        <Image
          src={getImageUrl(hero, 400)}
          alt={meta.label.join(' ')}
          fill
          sizes="169px"
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: selected ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.22)',
        }}
      />
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            width: 22,
            height: 22,
            borderRadius: 9999,
            backgroundColor: '#FFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={12} color="#000" />
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 20,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -0.6,
            lineHeight: 1,
            color: '#FFF',
          }}
        >
          {meta.label[0]}
          <br />
          {meta.label[1]}
        </div>
        <div
          style={{
            fontSize: 8,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.8)',
            letterSpacing: 2,
            marginTop: 8,
          }}
        >
          {meta.kicker}
        </div>
      </div>
    </button>
  );
}

/* ── Step 2 — Pick the pieces (from real inventory) ───────────────── */

function Step2Pieces({
  vibeLabel,
  pieces,
  expectedCount,
  isLoading,
  onSwap,
}: {
  vibeLabel: string;
  pieces: Product[];
  expectedCount: number;
  isLoading: boolean;
  onSwap: (idx: number) => void;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          padding: '40px 28px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, color: '#999' }}>
          STEP TWO · {vibeLabel.toUpperCase()} · {expectedCount} PIECES
        </span>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -1,
            lineHeight: 1,
            color: '#000',
            margin: 0,
          }}
        >
          Pick your
          <br />
          pieces.
        </h1>
        <div style={{ width: 24, height: 1, backgroundColor: '#000' }} />
        <p style={{ fontSize: 13, fontWeight: 300, color: '#666', lineHeight: 1.5, margin: 0 }}>
          We pulled {expectedCount} pieces from your catalog that layer well. Tap any to swap for a
          similar in-stock piece.
        </p>
      </div>

      <div
        style={{
          padding: '8px 20px 28px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {pieces.length === 0 && isLoading && (
          <>
            {Array.from({ length: expectedCount }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 92, borderRadius: 12 }} />
            ))}
          </>
        )}
        {pieces.length === 0 && !isLoading && (
          <p style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
            No products match this trip yet — try a different vibe.
          </p>
        )}
        {pieces.map((p, i) => {
          const img = primaryImageUrl(p);
          const kind = p.category?.name?.toUpperCase() || 'PIECE';
          return (
            <div
              key={p.id}
              style={{
                height: 92,
                borderRadius: 12,
                border: '1px solid #F0F0F0',
                backgroundColor: '#FFF',
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 64,
                  height: 76,
                  borderRadius: 8,
                  overflow: 'hidden',
                  backgroundColor: '#F5F5F5',
                  flexShrink: 0,
                }}
              >
                {img && (
                  <Image
                    src={getImageUrl(img, 200)}
                    alt={p.name}
                    fill
                    sizes="64px"
                    style={{ objectFit: 'cover' }}
                  />
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: 2,
                    color: '#999',
                  }}
                >
                  {kind}
                </span>
                <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>{p.name}</span>
                <span style={{ fontSize: 11, fontWeight: 300, color: '#666' }}>
                  {formatPrice(p.price)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSwap(i)}
                style={{
                  height: 32,
                  minWidth: 72,
                  padding: '0 12px',
                  borderRadius: 9999,
                  border: '1px solid #E5E5E5',
                  backgroundColor: '#FFF',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Shuffle size={11} color="#000" />
                <span style={{ fontSize: 10, fontWeight: 400, color: '#000' }}>Swap</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 3 — Sizes (from real variants) ──────────────────────────── */

function Step3Sizes({
  pieces,
  sizes,
  setSizes,
}: {
  pieces: Product[];
  sizes: Record<string, string>;
  setSizes: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          padding: '40px 28px 8px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2.5, color: '#999' }}>
          STEP THREE
        </span>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -1,
            lineHeight: 1,
            color: '#000',
            margin: 0,
          }}
        >
          What&apos;s
          <br />
          your size?
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
          Real sizes from real variants — only in-stock options are tappable.
        </p>
      </div>

      <div
        style={{
          padding: '12px 28px',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <Info size={13} color="#999" />
        <span style={{ fontSize: 11, fontWeight: 300, fontStyle: 'italic', color: '#999' }}>
          Size guide · free swaps within 15 days
        </span>
      </div>

      <div
        style={{
          padding: '16px 20px 28px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {pieces.map((p) => {
          const img = primaryImageUrl(p);
          const currentSize = sizes[p.id];
          const availableSizes = uniqueSizes(p.variants);
          const kind = p.category?.name?.toUpperCase() || 'PIECE';
          return (
            <div
              key={p.id}
              style={{
                borderRadius: 12,
                border: '1px solid #F0F0F0',
                backgroundColor: '#FFF',
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div
                  style={{
                    position: 'relative',
                    width: 56,
                    height: 68,
                    borderRadius: 8,
                    overflow: 'hidden',
                    backgroundColor: '#F5F5F5',
                    flexShrink: 0,
                  }}
                >
                  {img && (
                    <Image
                      src={getImageUrl(img, 200)}
                      alt={p.name}
                      fill
                      sizes="56px"
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: 2,
                      color: '#999',
                    }}
                  >
                    {kind}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#000' }}>{p.name}</span>
                  {currentSize ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 300,
                        fontStyle: 'italic',
                        color: '#22C55E',
                      }}
                    >
                      {currentSize} selected
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 400, color: '#CF2929' }}>
                      Pick a size
                    </span>
                  )}
                </div>
              </div>
              {availableSizes.length === 0 ? (
                <span style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>
                  One-size product
                </span>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  {availableSizes.map((s) => {
                    const active = currentSize === s;
                    const oos = isSizeOutOfStock(p.variants, s);
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={oos}
                        onClick={() => !oos && setSizes((prev) => ({ ...prev, [p.id]: s }))}
                        style={{
                          flex: 1,
                          minWidth: 48,
                          height: 36,
                          borderRadius: 8,
                          border: active ? 'none' : `1px solid ${oos ? '#F0F0F0' : '#E5E5E5'}`,
                          backgroundColor: active ? '#000' : '#FFF',
                          color: active ? '#FFF' : oos ? '#CCC' : '#000',
                          fontSize: 12,
                          fontWeight: active ? 500 : 400,
                          cursor: oos ? 'not-allowed' : 'pointer',
                          textDecoration: oos ? 'line-through' : 'none',
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
        })}
      </div>
    </div>
  );
}

function Step3Sticky({
  sizedCount,
  totalCount,
  onCta,
}: {
  sizedCount: number;
  totalCount: number;
  onCta: () => void;
}) {
  const allSized = sizedCount === totalCount && totalCount > 0;
  return (
    <div
      style={{
        borderTop: '1px solid #F0F0F0',
        padding: '16px 20px 24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        backgroundColor: '#FFF',
        position: 'sticky',
        bottom: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: 1.5,
            color: allSized ? '#22C55E' : '#CF2929',
          }}
        >
          {sizedCount} OF {totalCount} SIZED
        </span>
        <span style={{ fontSize: 11, fontWeight: 300, fontStyle: 'italic', color: '#666' }}>
          {allSized ? 'All set — ready to review.' : 'Finish sizing to continue'}
        </span>
      </div>
      <button
        type="button"
        disabled={!allSized}
        onClick={onCta}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 9999,
          border: 'none',
          backgroundColor: allSized ? '#000' : 'rgba(0,0,0,0.3)',
          color: allSized ? '#FFF' : 'rgba(255,255,255,0.8)',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: 2,
          cursor: allSized ? 'pointer' : 'not-allowed',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {allSized ? 'CONTINUE' : 'FINISH SIZING'}
        {allSized && <ArrowRight size={14} color="#FFF" />}
      </button>
    </div>
  );
}

/* ── Step 4 — Review (real product mosaic) ────────────────────────── */

function Step4Review({
  vibe,
  pieces,
  sizes,
  individualTotal,
  kitPrice,
  onAdd,
  onAddToBagOnly,
}: {
  vibe: VibeSlug;
  pieces: Product[];
  sizes: Record<string, string>;
  individualTotal: number;
  kitPrice: number;
  onAdd: () => void;
  onAddToBagOnly: () => void;
}) {
  const savedAmount = individualTotal - kitPrice;
  const isMixed = vibe === 'mixed';
  const meta = isMixed ? null : VIBE_META[vibe as Exclude<VibeSlug, 'mixed'>];
  const vibeLabel = meta ? meta.label.join(' ') : 'Mixed trip';
  const kicker = meta ? `${meta.kicker} KIT · ${pieces.length} PIECES` : 'MIXED KIT';
  const mosaicImages = pieces.map((p) => primaryImageUrl(p)).filter((u): u is string => !!u);

  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          padding: '40px 28px 24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2.5, color: '#999' }}>
          STEP FOUR
        </span>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -1,
            lineHeight: 1,
            color: '#000',
            margin: 0,
          }}
        >
          Your kit,
          <br />
          packed.
        </h1>
        <div style={{ width: 24, height: 1, backgroundColor: '#000' }} />
        <p style={{ fontSize: 13, fontWeight: 300, color: '#666', lineHeight: 1.5, margin: 0 }}>
          {vibeLabel} · {pieces.length} pieces · ready for takeoff.
        </p>
      </div>

      {/* Mosaic preview — real piece images + hero strip */}
      <div style={{ padding: '0 20px' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 220,
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid #F0F0F0',
            backgroundColor: '#F5F5F5',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, display: 'flex', height: 110 }}>
            {pieces.slice(0, 5).map((p, i) => {
              const src = primaryImageUrl(p);
              return (
                <div key={i} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                  {src && (
                    <Image
                      src={getImageUrl(src, 200)}
                      alt=""
                      fill
                      sizes="70px"
                      style={{ objectFit: 'cover' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 110, height: 110 }}>
            {mosaicImages[0] ? (
              <Image
                src={getImageUrl(mosaicImages[0], 720)}
                alt=""
                fill
                sizes="353px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: '#222' }} />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: 2.5,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                {kicker}
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 300,
                  fontStyle: 'italic',
                  color: '#FFF',
                  letterSpacing: -0.4,
                }}
              >
                {vibeLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 32 }} />

      {/* Line items */}
      <div style={{ padding: '0 28px', display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2.5, color: '#999' }}>
          WHAT&apos;S IN IT
        </span>
        <div style={{ height: 14 }} />
        {pieces.map((p, i) => (
          <div key={p.id}>
            <div
              style={{
                padding: '10px 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>
                  {p.name}
                  {sizes[p.id] ? ` · ${sizes[p.id]}` : ''}
                </span>
                <span style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
                  {(p.category?.name || 'piece').toLowerCase()}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 400, color: '#000' }}>
                {formatPrice(p.price)}
              </span>
            </div>
            {i < pieces.length - 1 && <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />}
          </div>
        ))}
      </div>

      <div style={{ height: 24 }} />

      {/* Summary */}
      <div
        style={{
          padding: '20px 28px',
          backgroundColor: '#F5F5F5',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 300, color: '#666' }}>Individual total</span>
          <span style={{ fontSize: 13, fontWeight: 300, color: '#999' }}>
            {formatPrice(individualTotal)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 300, color: '#22C55E' }}>
            Bundle discount (−{BUNDLE_DISCOUNT_PCT}%)
          </span>
          <span style={{ fontSize: 13, fontWeight: 400, color: '#22C55E' }}>
            −{formatPrice(savedAmount)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 300, color: '#666' }}>Shipping</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: '#22C55E' }}>Free</span>
        </div>
        <div style={{ height: 1, backgroundColor: '#E5E5E5' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#000' }}>You pay</span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#000',
              letterSpacing: -0.5,
            }}
          >
            {formatPrice(kitPrice)}
          </span>
        </div>
      </div>

      {/* CTAs */}
      <div
        style={{
          padding: '20px 20px 24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={onAddToBagOnly}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 9999,
            border: '1px solid #E5E5E5',
            backgroundColor: '#FFF',
            color: '#000',
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: 1.5,
            cursor: 'pointer',
          }}
        >
          ADD KIT TO BAG
        </button>
        <button
          type="button"
          onClick={onAdd}
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
            cursor: 'pointer',
          }}
        >
          PACK &amp; CHECKOUT · {formatPrice(kitPrice)}
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
          <span style={{ fontSize: 9, fontWeight: 400, letterSpacing: 2, color: '#999' }}>
            365-DAY BUYBACK · FREE SHIPPING
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Shared sticky CTA bar (step 1 & 2) ─────────────────────────── */

function StickyBar({
  left,
  right,
  leftBlockLeft,
  leftBlockRight,
  rightBlockLeft,
  rightBlockRight,
  ctaLabel,
  onCta,
  disabled,
}: {
  left?: string;
  right?: string;
  leftBlockLeft?: string;
  leftBlockRight?: string;
  rightBlockLeft?: string;
  rightBlockRight?: string;
  ctaLabel: string;
  onCta: () => void;
  disabled?: boolean;
}) {
  const showBlock = !!(leftBlockLeft || rightBlockLeft);
  return (
    <div
      style={{
        borderTop: '1px solid #F0F0F0',
        padding: '16px 20px 24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        backgroundColor: '#FFF',
        position: 'sticky',
        bottom: 0,
      }}
    >
      {showBlock ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              alignItems: 'flex-start',
            }}
          >
            {leftBlockLeft && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: 1.5,
                  color: '#999',
                }}
              >
                {leftBlockLeft}
              </span>
            )}
            {leftBlockRight && (
              <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>{leftBlockRight}</span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              alignItems: 'flex-end',
            }}
          >
            {rightBlockLeft && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: 1.5,
                  color: '#22C55E',
                }}
              >
                {rightBlockLeft}
              </span>
            )}
            {rightBlockRight && (
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: '#000',
                  letterSpacing: -0.3,
                }}
              >
                {rightBlockRight}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1.5, color: '#999' }}>
            {left}
          </span>
          <span style={{ fontSize: 11, fontWeight: 400, color: '#000' }}>{right}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onCta}
        disabled={disabled}
        style={{
          width: '100%',
          height: 52,
          borderRadius: 9999,
          backgroundColor: disabled ? 'rgba(0,0,0,0.3)' : '#000',
          color: '#FFF',
          border: 'none',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: 2,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {ctaLabel}
        <ArrowRight size={14} color="#FFF" />
      </button>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

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

function defaultSize(product: Product): string {
  const sizes = uniqueSizes(product.variants);
  if (sizes.length === 0) return '';
  if (sizes.includes('M') && !isSizeOutOfStock(product.variants, 'M')) return 'M';
  const inStock = sizes.find((s) => !isSizeOutOfStock(product.variants, s));
  return inStock || sizes[0];
}
