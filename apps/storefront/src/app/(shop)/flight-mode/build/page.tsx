'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, X, Check, Shuffle, Info, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers';
import { VIBE_META } from '@/lib/flight-mode-data';

type VibeSlug =
  | 'above-the-clouds'
  | 'salt-on-skin'
  | 'golden-hour-gang'
  | 'into-the-wild'
  | 'neon-nomads'
  | 'mixed';

type Duration = 3 | 5 | 7;

interface KitPiece {
  slug: string;
  kind: string;
  name: string;
  image: string;
  price: number;
  sized?: string | null;
}

const DURATION_TO_PIECES: Record<Duration, number> = { 3: 3, 5: 5, 7: 7 };

// ── Sample curation — one starter palette per vibe/duration combo ──
const CURATION: Record<string, KitPiece[]> = {
  'above-the-clouds-5': [
    {
      slug: 'core-tee-fog',
      kind: 'BASE TEE',
      name: 'Core Tee — Fog',
      image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&q=80',
      price: 990,
    },
    {
      slug: 'cloud-overshirt',
      kind: 'OVERSHIRT',
      name: 'Cloud Overshirt — Stone',
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80',
      price: 1290,
    },
    {
      slug: 'summit-hoodie',
      kind: 'HOODIE',
      name: 'Summit Hoodie — Ash',
      image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&q=80',
      price: 1490,
    },
    {
      slug: 'trail-trouser-olive',
      kind: 'TROUSER',
      name: 'Trail Trouser — Olive',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&q=80',
      price: 1290,
    },
    {
      slug: 'wool-scarf-charcoal',
      kind: 'SCARF',
      name: 'Wool Scarf — Charcoal',
      image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=300&q=80',
      price: 890,
    },
  ],
};

const BUNDLE_DISCOUNT_PCT = 22;
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

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
  const [pieces, setPieces] = useState<KitPiece[]>(CURATION['above-the-clouds-5'] || []);
  const [sizes, setSizes] = useState<Record<string, string>>({});

  const individualTotal = useMemo(() => pieces.reduce((acc, p) => acc + p.price, 0), [pieces]);
  const kitPrice = useMemo(
    () => Math.round(individualTotal * (1 - BUNDLE_DISCOUNT_PCT / 100)),
    [individualTotal]
  );

  const selectedVibeLabel = vibe === 'mixed' ? 'Mixed trip' : VIBE_META[vibe].label.join(' ');

  const goStep = (n: 1 | 2 | 3 | 4) => router.push(`/flight-mode/build?step=${n}`);

  const packKit = () => {
    pieces.forEach((piece) => {
      addItem({
        id: `kit-${piece.slug}`,
        productId: piece.slug,
        name: `${piece.name} · Custom Kit`,
        slug: piece.slug,
        image: piece.image,
        price: Math.round((kitPrice / individualTotal) * piece.price),
        size: sizes[piece.slug] || 'M',
        color: '',
        maxQuantity: 99,
        quantity: 1,
      });
    });
    addToast('Kit added to bag', 'success');
    router.push('/cart');
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
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '8px 20px',
        }}
      >
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
              onSwap={(idx) => {
                // Mock swap — rotate image for now
                setPieces((prev) => {
                  const next = [...prev];
                  const p = next[idx];
                  if (!p) return prev;
                  next[idx] = { ...p, slug: `${p.slug}-alt-${Date.now()}` };
                  return next;
                });
                addToast('Swapped — more options coming soon', 'info');
              }}
            />
            <StickyBar
              leftBlockLeft={`${pieces.length} PIECES SELECTED`}
              leftBlockRight={`Bundle total ${formatPrice(individualTotal)}`}
              rightBlockLeft={`SAVES ${formatPrice(individualTotal - kitPrice)}`}
              rightBlockRight={`~${formatPrice(kitPrice)}`}
              ctaLabel="CONTINUE"
              onCta={() => goStep(3)}
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
              sizedCount={pieces.filter((p) => sizes[p.slug]).length}
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
              onAdd={packKit}
              onAddToBagOnly={() => {
                pieces.forEach((piece) => {
                  addItem({
                    id: `kit-${piece.slug}`,
                    productId: piece.slug,
                    name: `${piece.name} · Custom Kit`,
                    slug: piece.slug,
                    image: piece.image,
                    price: Math.round((kitPrice / individualTotal) * piece.price),
                    size: sizes[piece.slug] || 'M',
                    color: '',
                    maxQuantity: 99,
                    quantity: 1,
                  });
                });
                addToast('Kit added to bag', 'success');
              }}
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
          Pick the trip — we&apos;ll pull pieces that actually match.
        </p>
      </div>

      {/* Vibe grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          padding: '0 20px 20px 20px',
        }}
      >
        {vibeOptions.map((v) => {
          const meta = VIBE_META[v];
          const selected = vibe === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setVibe(v)}
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
              <Image
                src={meta.bg}
                alt={meta.label.join(' ')}
                fill
                sizes="169px"
                style={{ objectFit: 'cover' }}
              />
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
        })}
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
            Pieces that work everywhere
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
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 300,
                    letterSpacing: -0.5,
                    lineHeight: 1,
                  }}
                >
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
        style={{ padding: '8px 28px 32px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2.5, color: '#999' }}>
          WHAT&apos;S NEXT
        </span>
        {[
          ['02', 'Pick the pieces we suggest (or swap them).'],
          ['03', 'Size each item — we remember from last order.'],
          ['04', 'Review, apply bundle pricing, add to bag.'],
        ].map(([n, text]) => (
          <div
            key={n}
            style={{
              padding: '10px 0',
              display: 'flex',
              gap: 14,
              alignItems: 'center',
            }}
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

/* ── Step 2 — Pick the pieces ─────────────────────────────────────── */

function Step2Pieces({
  vibeLabel,
  pieces,
  onSwap,
}: {
  vibeLabel: string;
  pieces: KitPiece[];
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
          STEP TWO · {vibeLabel.toUpperCase()} · {pieces.length} PIECES
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
          We pre-picked {pieces.length} that layer well. Tap any to swap for a similar piece.
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
        {pieces.map((p, i) => (
          <div
            key={`${p.slug}-${i}`}
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
              <Image src={p.image} alt={p.name} fill sizes="64px" style={{ objectFit: 'cover' }} />
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
              <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, color: '#999' }}>
                {p.kind}
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
        ))}
      </div>
    </div>
  );
}

/* ── Step 3 — Sizes ──────────────────────────────────────────────── */

function Step3Sizes({
  pieces,
  sizes,
  setSizes,
}: {
  pieces: KitPiece[];
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
        <p style={{ fontSize: 13, fontWeight: 300, color: '#666', lineHeight: 1.5, margin: 0 }}>
          Pre-filled from your last order. Adjust anything that doesn&apos;t fit the same.
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
        {pieces.map((p, i) => {
          const currentSize = sizes[p.slug];
          return (
            <div
              key={`${p.slug}-${i}`}
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
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="56px"
                    style={{ objectFit: 'cover' }}
                  />
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
                  <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, color: '#999' }}>
                    {p.kind}
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
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'space-between',
                }}
              >
                {SIZES.map((s) => {
                  const active = currentSize === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSizes((prev) => ({ ...prev, [p.slug]: s }))}
                      style={{
                        flex: 1,
                        height: 36,
                        borderRadius: 8,
                        border: active ? 'none' : '1px solid #E5E5E5',
                        backgroundColor: active ? '#000' : '#FFF',
                        color: active ? '#FFF' : '#000',
                        fontSize: 12,
                        fontWeight: active ? 500 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
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
  const allSized = sizedCount === totalCount;
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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          alignItems: 'flex-start',
        }}
      >
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
        <span
          style={{
            fontSize: 11,
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#666',
          }}
        >
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

/* ── Step 4 — Review ──────────────────────────────────────────────── */

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
  pieces: KitPiece[];
  sizes: Record<string, string>;
  individualTotal: number;
  kitPrice: number;
  onAdd: () => void;
  onAddToBagOnly: () => void;
}) {
  const savedAmount = individualTotal - kitPrice;
  const isMixed = vibe === 'mixed';
  const meta = isMixed ? null : VIBE_META[vibe as Exclude<VibeSlug, 'mixed'>];
  const heroBg =
    meta?.bg ?? 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=720&q=80';
  const vibeLabel = meta ? meta.label.join(' ') : 'Mixed trip';
  const kicker = meta ? `${meta.kicker} KIT · ${pieces.length} PIECES` : 'MIXED KIT';

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

      {/* Mosaic preview */}
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
            {pieces.slice(0, 5).map((p, i) => (
              <div key={i} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                <Image src={p.image} alt="" fill sizes="70px" style={{ objectFit: 'cover' }} />
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 110, height: 110 }}>
            <Image src={heroBg} alt="" fill sizes="353px" style={{ objectFit: 'cover' }} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
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
      <div
        style={{
          padding: '0 28px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2.5, color: '#999' }}>
          WHAT&apos;S IN IT
        </span>
        <div style={{ height: 14 }} />
        {pieces.map((p, i) => (
          <div key={`${p.slug}-${i}`}>
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
                  {p.name} · {sizes[p.slug] || 'M'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
                  {p.kind.toLowerCase()}
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
}: {
  left?: string;
  right?: string;
  leftBlockLeft?: string;
  leftBlockRight?: string;
  rightBlockLeft?: string;
  rightBlockRight?: string;
  ctaLabel: string;
  onCta: () => void;
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
            style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
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
        style={{
          width: '100%',
          height: 52,
          borderRadius: 9999,
          backgroundColor: '#000',
          color: '#FFF',
          border: 'none',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: 2,
          cursor: 'pointer',
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
