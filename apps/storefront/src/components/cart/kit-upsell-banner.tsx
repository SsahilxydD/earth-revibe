'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { comboDiscount, COMBOS } from '@earth-revibe/shared';
import { useCartStore } from '@/stores/cart-store';

/* ------------------------------------------------------------------ */
/*  KitUpsellBanner — Flight Mode discovery prompt for the cart        */
/*                                                                      */
/*  Conversion lever: customers who bundle as a kit save 20-30%, but   */
/*  many shoppers don't notice Flight Mode exists. The cart is the     */
/*  highest-intent surface to surface it. Hides when the cart already  */
/*  contains a complete combo (group at full pieceCount) — there's     */
/*  nothing to upsell once they've taken the action.                    */
/* ------------------------------------------------------------------ */

const MAX_CURATED_DISCOUNT_PCT = Math.max(
  ...COMBOS.map((c) => (c.pieceCount >= 7 ? 30 : c.pieceCount >= 5 ? 25 : 20)),
  0
);

interface KitUpsellBannerProps {
  variant?: 'drawer' | 'page';
  onClick?: () => void;
}

export function KitUpsellBanner({ variant = 'drawer', onClick }: KitUpsellBannerProps) {
  const items = useCartStore((s) => s.items);

  // Empty cart: the drawer's empty state already promotes Flight Mode via
  // EMPTY_VIBES tiles, so we don't double up. The /cart page redirects
  // to an EmptyCart component before reaching us.
  if (items.length === 0) return null;

  // Hide when a complete combo already sits in the cart — they took the
  // action, no upsell to make.
  const result = comboDiscount(
    items.map((i) => ({
      price: i.price,
      quantity: i.quantity,
      comboSlug: i.comboSlug,
      comboGroupId: i.comboGroupId,
    }))
  );
  if (result.groups.length > 0) return null;

  const isDrawer = variant === 'drawer';

  return (
    <Link
      href="/flight-mode"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: isDrawer ? '14px 16px' : '16px 18px',
        margin: isDrawer ? '0 0 16px 0' : '0 0 20px 0',
        borderRadius: 12,
        backgroundColor: '#0E1116',
        color: '#FFF',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          FLIGHT MODE · KITS
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#FFF',
            lineHeight: 1.25,
          }}
        >
          Bundle as a kit, save up to {MAX_CURATED_DISCOUNT_PCT}%
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.55)',
          }}
        >
          Pre-packed for the trip · or build your own.
        </span>
      </div>
      <ArrowUpRight size={18} color="#FFF" style={{ flexShrink: 0 }} />
    </Link>
  );
}
