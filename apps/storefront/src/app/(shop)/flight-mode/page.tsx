'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { COMBOS } from '@/lib/flight-mode-data';
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
