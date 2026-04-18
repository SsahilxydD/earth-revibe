'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Flame } from 'lucide-react';
import {
  COMBOS,
  comboIndividualTotal,
  comboPrice,
  primaryImageUrl,
  type ComboMeta,
} from '@/lib/flight-mode-data';
import { useProducts } from '@/hooks/use-products';
import { formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import type { Product } from '@/types';

type Filter = 'all' | '3-piece' | '5-piece' | 'weekender';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '3-piece', label: '3-piece' },
  { value: '5-piece', label: '5-piece' },
  { value: 'weekender', label: 'Weekender' },
];

export default function FlightModePage() {
  const [filter, setFilter] = useState<Filter>('all');

  const flagship = useMemo(() => COMBOS.find((c) => c.featured), []);
  const rest = useMemo(
    () => COMBOS.filter((c) => !c.featured && (filter === 'all' || c.category === filter)),
    [filter]
  );
  const showFlagship = filter === 'all' || (flagship ? flagship.category === filter : false);

  return (
    <div
      className="font-[family-name:var(--font-inter)]"
      style={{ backgroundColor: '#FFF', minHeight: '100vh' }}
    >
      {/* Hero */}
      <section
        style={{
          padding: '48px 28px 40px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, color: '#999' }}>
          BUNDLES · COMBOS
        </span>
        <div style={{ height: 8 }} />
        <h1
          style={{
            fontSize: 52,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -1.6,
            lineHeight: 1,
            color: '#000',
            margin: 0,
          }}
        >
          Flight
          <br />
          Mode.
        </h1>
        <div style={{ width: 28, height: 1, backgroundColor: '#000', marginTop: 4 }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            color: '#666',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Pre-packed kits, picked by the trip.
          <br />
          Fewer decisions, bigger savings.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingTop: 20,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1.5, color: '#000' }}>
            {COMBOS.length} BUNDLES
          </span>
          <span style={{ fontSize: 10, color: '#CCC' }}>·</span>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1.5, color: '#22C55E' }}>
            SAVE UP TO 22%
          </span>
        </div>
      </section>

      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* Filter chips */}
      <div
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: 8,
          padding: '16px 20px',
          overflowX: 'auto',
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              style={{
                flexShrink: 0,
                height: 32,
                padding: '0 14px',
                borderRadius: 9999,
                backgroundColor: active ? '#000' : '#FFF',
                border: active ? 'none' : '1px solid #E5E5E5',
                color: active ? '#FFF' : '#666',
                fontSize: 11,
                fontWeight: active ? 400 : 300,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* Bundle list */}
      <div
        style={{
          padding: '20px 20px 40px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {showFlagship && flagship && <FlagshipCard combo={flagship} />}
        {rest.map((combo) => (
          <HorizontalCard key={combo.slug} combo={combo} />
        ))}
      </div>

      {/* BUILD YOUR OWN closer */}
      <section
        style={{
          padding: '60px 28px 80px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          backgroundColor: '#FAFAFA',
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: 2, color: '#999' }}>
          BUILD YOUR OWN
        </span>
        <h2
          style={{
            fontSize: 32,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -0.8,
            lineHeight: 1.1,
            color: '#000',
            margin: 0,
          }}
        >
          Can&apos;t pick?
          <br />
          We&apos;ll pack.
        </h2>
        <div style={{ width: 28, height: 1, backgroundColor: '#000' }} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 300,
            color: '#666',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Tell us your trip. We&apos;ll hand-pack a kit from our actual inventory — still bundle
          pricing, still free shipping.
        </p>
        <Link
          href="/flight-mode/build"
          style={{
            marginTop: 4,
            height: 50,
            padding: '0 24px',
            borderRadius: 9999,
            backgroundColor: '#000',
            color: '#FFF',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: 2,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textDecoration: 'none',
          }}
        >
          START A KIT
          <ArrowRight size={14} color="#FFF" />
        </Link>
      </section>
    </div>
  );
}

/* ─── Flagship card — pulls products live by vibe ─────────────────── */

function FlagshipCard({ combo }: { combo: ComboMeta }) {
  const { data, isLoading } = useProducts({
    vibe: combo.vibe,
    limit: combo.pieceCount,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const products = data?.products ?? [];
  const hero = primaryImageUrl(products[0]);
  const individualTotal = comboIndividualTotal(products, combo.pieceCount);
  const price = comboPrice(individualTotal, combo.discountPct);

  return (
    <Link
      href={`/flight-mode/${combo.slug}`}
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        height: 360,
        borderRadius: 20,
        overflow: 'hidden',
        textDecoration: 'none',
        backgroundColor: '#1a1a1a',
      }}
    >
      {hero ? (
        <Image
          src={getImageUrl(hero, 720)}
          alt={combo.name}
          fill
          sizes="(max-width: 393px) 100vw, 393px"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
          style={{ objectFit: 'cover' }}
        />
      ) : (
        <div
          className={isLoading ? 'skeleton' : ''}
          style={{ position: 'absolute', inset: 0, backgroundColor: '#1a1a1a' }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.44)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 26,
          padding: '0 12px',
          borderRadius: 9999,
          backgroundColor: '#FFF',
        }}
      >
        <Flame size={12} color="#000" />
        <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 2, color: '#000' }}>
          MOST PACKED
        </span>
      </div>
      <div style={{ position: 'absolute', top: 22, right: 20 }}>
        <ArrowUpRight size={20} color="#FFF" />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {combo.kicker}
        </span>
        <h3
          style={{
            fontSize: 32,
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: -1,
            lineHeight: 1,
            color: '#FFF',
            margin: 0,
          }}
        >
          {combo.name}
        </h3>
        <div style={{ width: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.5)' }} />
        <p
          style={{
            fontSize: 12,
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.8)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {combo.description}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 12,
            paddingTop: 12,
          }}
        >
          {individualTotal > 0 ? (
            <>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 300,
                  color: 'rgba(255,255,255,0.5)',
                  textDecoration: 'line-through',
                }}
              >
                {formatPrice(individualTotal)}
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: '#FFF',
                  letterSpacing: -0.4,
                }}
              >
                {formatPrice(price)}
              </span>
              <span
                style={{
                  height: 22,
                  padding: '0 8px',
                  borderRadius: 9999,
                  backgroundColor: '#22C55E',
                  color: '#FFF',
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: 1.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                SAVE {combo.discountPct}%
              </span>
            </>
          ) : (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Loading pricing…</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── Horizontal card — pulls products live by vibe ───────────────── */

function HorizontalCard({ combo }: { combo: ComboMeta }) {
  const { data, isLoading } = useProducts({
    vibe: combo.vibe,
    limit: combo.pieceCount,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const products = data?.products ?? [];
  const mosaic = products.slice(0, 4);
  const individualTotal = comboIndividualTotal(products, combo.pieceCount);
  const price = comboPrice(individualTotal, combo.discountPct);
  const saved = individualTotal - price;

  return (
    <Link
      href={`/flight-mode/${combo.slug}`}
      style={{
        display: 'flex',
        width: '100%',
        height: 200,
        borderRadius: 16,
        border: '1px solid #F0F0F0',
        overflow: 'hidden',
        textDecoration: 'none',
        backgroundColor: '#FFF',
      }}
    >
      {/* Adaptive mosaic — shape follows pieceCount so 3-piece kits
          don't render an awkward empty 4th grey cell. */}
      <AdaptiveMosaic products={mosaic} pieceCount={combo.pieceCount} isLoading={isLoading} />

      {/* Body */}
      <div
        style={{
          flex: 1,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 4,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: 2,
              color: '#999',
            }}
          >
            {combo.kicker}
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 400,
              letterSpacing: -0.4,
              color: '#000',
              lineHeight: 1.1,
            }}
          >
            {combo.name}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#999',
              lineHeight: 1.4,
            }}
          >
            {combo.tagline}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {individualTotal > 0 ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 500,
                      letterSpacing: -0.4,
                      color: '#000',
                    }}
                  >
                    {formatPrice(price)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 300,
                      color: '#CCC',
                      textDecoration: 'line-through',
                    }}
                  >
                    {formatPrice(individualTotal)}
                  </span>
                </div>
                <ArrowUpRight size={16} color="#000" style={{ flexShrink: 0 }} />
              </div>
              <div
                style={{
                  alignSelf: 'flex-start',
                  height: 22,
                  padding: '0 8px',
                  borderRadius: 9999,
                  backgroundColor: '#22C55E',
                  color: '#FFF',
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: 1.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                SAVE {formatPrice(saved)} · {combo.discountPct}%
              </div>
            </>
          ) : (
            <span style={{ fontSize: 11, color: '#CCC' }}>…</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ─── AdaptiveMosaic — mosaic layout adapts to combo.pieceCount ──── */

function AdaptiveMosaic({
  products,
  pieceCount,
  isLoading,
}: {
  products: Product[];
  pieceCount: number;
  isLoading: boolean;
}) {
  // Wrap for 160×200 mosaic — same dimensions as before so card height doesn't shift.
  const shell: React.CSSProperties = {
    position: 'relative',
    width: 160,
    height: 200,
    backgroundColor: '#F5F5F5',
    flexShrink: 0,
  };

  // 3-piece layout: 1 tall hero left (80×200), 2 stacked right (80×100 each)
  if (pieceCount === 3) {
    return (
      <div style={shell}>
        <MosaicTile product={products[0]} x={0} y={0} w={80} h={200} isLoading={isLoading} />
        <MosaicTile product={products[1]} x={80} y={0} w={80} h={100} isLoading={isLoading} />
        <MosaicTile product={products[2]} x={80} y={100} w={80} h={100} isLoading={isLoading} />
      </div>
    );
  }

  // 4-piece layout: clean 2×2
  if (pieceCount === 4) {
    return (
      <div style={shell}>
        {products.slice(0, 4).map((p, i) => (
          <MosaicTile
            key={i}
            product={p}
            x={i % 2 === 0 ? 0 : 80}
            y={i < 2 ? 0 : 100}
            w={80}
            h={100}
            isLoading={isLoading}
          />
        ))}
      </div>
    );
  }

  // 5+ layout: 2×2 with "+N" overlay on the 4th tile
  const extra = pieceCount - 4;
  return (
    <div style={shell}>
      {products.slice(0, 3).map((p, i) => (
        <MosaicTile
          key={i}
          product={p}
          x={i % 2 === 0 ? 0 : 80}
          y={i < 2 ? 0 : 100}
          w={80}
          h={100}
          isLoading={isLoading}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 80,
          width: 80,
          height: 100,
          overflow: 'hidden',
          backgroundColor: '#F5F5F5',
        }}
      >
        {products[3] && (
          <MosaicTile product={products[3]} x={0} y={0} w={80} h={100} isLoading={isLoading} />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#FFF',
              letterSpacing: -0.5,
            }}
          >
            +{extra}
          </span>
        </div>
      </div>
    </div>
  );
}

function MosaicTile({
  product,
  x,
  y,
  w,
  h,
  isLoading,
}: {
  product: Product | undefined;
  x: number;
  y: number;
  w: number;
  h: number;
  isLoading: boolean;
}) {
  const src = primaryImageUrl(product);
  return (
    <div
      className={!src && isLoading ? 'skeleton' : ''}
      style={{
        position: 'absolute',
        top: y,
        left: x,
        width: w,
        height: h,
        overflow: 'hidden',
        backgroundColor: '#F5F5F5',
      }}
    >
      {src && (
        <Image
          src={getImageUrl(src, 300)}
          alt={product?.name || ''}
          fill
          sizes={`${w}px`}
          style={{ objectFit: 'cover' }}
        />
      )}
    </div>
  );
}
