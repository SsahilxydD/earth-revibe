'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Flame } from 'lucide-react';
import {
  COMBOS,
  comboDiscountPct,
  comboIndividualTotal,
  comboPrice,
  primaryImageUrl,
  type ComboMeta,
} from '@/lib/flight-mode-data';
import { useProducts } from '@/hooks/use-products';
import { formatPrice, getImageUrl, BLUR_DATA_URL } from '@/lib/utils';
import { ProductStacks } from '@/components/product/product-stacks';

type Filter = 'all' | '3-piece' | '5-piece' | 'weekender';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '3-piece', label: '3-piece' },
  { value: '5-piece', label: '5-piece' },
  { value: 'weekender', label: 'Weekender' },
];

export default function FlightModePage() {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'all' ? COMBOS : COMBOS.filter((c) => c.category === filter)),
    [filter]
  );

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
            SAVE UP TO 30%
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

      {/* Product stacks — 4 category stacks with rotated cards */}
      <ProductStacks />

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

/* ─── ComboCard — unified card per design (PHOR6, gItM2, IqoOY, puyFf) ─ */

function ComboCard({ combo, index }: { combo: ComboMeta; index: number }) {
  const { data, isLoading } = useProducts({
    vibe: combo.vibe,
    limit: combo.pieceCount,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const products = data?.products ?? [];
  const hero = primaryImageUrl(products[0]);
  const discountPct = comboDiscountPct(combo);
  const individualTotal = comboIndividualTotal(products, combo.pieceCount);
  const price = comboPrice(individualTotal, discountPct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.985 }}
      style={{ width: '100%' }}
    >
      <Link
        href={`/flight-mode/${combo.slug}`}
        style={{
          display: 'block',
          width: '100%',
          backgroundColor: '#FFF',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #ECECEC',
          textDecoration: 'none',
        }}
      >
        {/* Image area — 340h, F0F0F0 placeholder fills behind product hero */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 340,
            backgroundColor: '#F0F0F0',
            overflow: 'hidden',
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
              style={{ position: 'absolute', inset: 0 }}
            />
          )}

          {/* Pill row — left dark badge, optional right MOST PACKED pill */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              right: 20,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: combo.featured ? 'space-between' : 'flex-start',
              gap: 8,
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 28,
                padding: '0 12px',
                borderRadius: 9999,
                backgroundColor: 'rgba(0,0,0,0.7)',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: 2,
                  color: '#FFF',
                }}
              >
                {combo.kicker}
              </span>
            </div>
            {combo.featured && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 28,
                  padding: '0 12px',
                  borderRadius: 9999,
                  backgroundColor: '#FFF',
                }}
              >
                <Flame size={12} color="#000" />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: 2,
                    color: '#000',
                  }}
                >
                  MOST PACKED
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Body — 22/24/24/24 padding, gap 14 */}
        <div
          style={{
            padding: '22px 24px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Name row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                minWidth: 0,
                flex: 1,
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
                {combo.vibe.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 300,
                  fontStyle: 'italic',
                  letterSpacing: -0.8,
                  lineHeight: 1,
                  color: '#000',
                }}
              >
                {combo.name}
              </span>
            </div>
            <ArrowUpRight size={20} color="#000" style={{ flexShrink: 0, marginTop: 2 }} />
          </div>

          {/* Tagline */}
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 300,
              color: '#666',
              lineHeight: 1.55,
            }}
          >
            {combo.description}
          </p>

          {/* Price row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              padding: '6px 0 0 0',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              {individualTotal > 0 ? (
                <>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 500,
                      letterSpacing: -0.6,
                      lineHeight: 1,
                      color: '#000',
                    }}
                  >
                    {formatPrice(price)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 300,
                      color: '#999',
                      textDecoration: 'line-through',
                    }}
                  >
                    {formatPrice(individualTotal)}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 11, color: '#999' }}>Loading…</span>
              )}
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
        </div>
      </Link>
    </motion.div>
  );
}
