'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { comboDiscount } from '@earth-revibe/shared';
import { api } from '@/lib/api-client';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  size: string;
  color: string;
  quantity: number;
  maxQuantity: number;
  // Set when this item was added as part of a Flight Mode combo (curated or
  // BYO). The server uses these to apply the combo discount; items without
  // them are à la carte and get no auto-discount.
  comboSlug?: string;
  comboGroupId?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  discountCode: string;
  discountAmount: number;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;

  applyDiscount: (code: string, amount: number) => void;
  removeDiscount: () => void;

  getItemCount: () => number;
  getSubtotal: () => number;
  getTotal: () => number;
  getComboDiscount: () => number;
}

/**
 * Detach all sibling items in a combo group from the combo. Used when the
 * user removes a piece or bumps a piece's quantity — the kit is no longer
 * intact, so the entire group falls back to à la carte (no discount). The
 * remaining items stay in the cart at full price.
 */
function detachComboGroup(items: CartItem[], comboGroupId: string): CartItem[] {
  return items.map((i) => {
    if (i.comboGroupId !== comboGroupId) return i;
    const { comboSlug: _slug, comboGroupId: _gid, ...rest } = i;
    return rest as CartItem;
  });
}

// Debounced sync to server — fires for logged-in users (auth cart sync)
// and for guests who gave their email via newsletter popup (abandoned cart recovery)
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSyncToServer(items: CartItem[]) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    // Try authenticated cart sync first
    try {
      await api.post('/cart/sync', {
        items: items.map((i) => ({
          variantId: i.id,
          quantity: i.quantity,
          comboSlug: i.comboSlug,
          comboGroupId: i.comboGroupId,
        })),
      });
    } catch {
      // Auth sync failed (not logged in) — try guest snapshot if email exists
      if (typeof window !== 'undefined') {
        const guestEmail = localStorage.getItem('er-guest-email');
        if (guestEmail && items.length > 0) {
          try {
            await fetch(`${window.location.origin}/api/v1/cart/guest-snapshot`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: guestEmail,
                items: items.map((i) => ({
                  variantId: i.id,
                  productName: i.name,
                  slug: i.slug,
                  price: i.price,
                  quantity: i.quantity,
                })),
              }),
            });
          } catch {
            // Best-effort
          }
        }
      }
    }
  }, 1000);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      discountCode: '',
      discountAmount: 0,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      addItem: (item) => {
        const { items } = get();
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId && i.size === item.size && i.color === item.color
        );

        let updatedItems: CartItem[];
        if (existingIndex > -1) {
          const existing = items[existingIndex];
          const newQuantity = Math.min(
            existing.quantity + (item.quantity || 1),
            existing.maxQuantity
          );
          updatedItems = items.map((i, idx) =>
            idx === existingIndex ? { ...i, quantity: newQuantity } : i
          );
        } else {
          const newItem: CartItem = {
            ...item,
            quantity: item.quantity || 1,
          };
          updatedItems = [...items, newItem];
        }
        set({ items: updatedItems, isOpen: true });
        scheduleSyncToServer(updatedItems);
      },

      removeItem: (id) => {
        const items = get().items;
        const removed = items.find((i) => i.id === id);
        let updatedItems = items.filter((i) => i.id !== id);
        // Removing a combo piece breaks the kit — strip combo identity from
        // the remaining siblings so they don't hold a phantom group that
        // can never re-qualify (and don't get re-discounted on next sync).
        if (removed?.comboGroupId) {
          updatedItems = detachComboGroup(updatedItems, removed.comboGroupId);
        }
        set({ items: updatedItems });
        scheduleSyncToServer(updatedItems);
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        const items = get().items;
        const target = items.find((i) => i.id === id);
        // Combo identity assumes 1-of-each; bumping a piece's quantity
        // breaks the kit. Detach the whole group first, then apply qty.
        let working = items;
        if (target?.comboGroupId && quantity !== target.quantity) {
          working = detachComboGroup(working, target.comboGroupId);
        }
        const updatedItems = working.map((i) =>
          i.id === id ? { ...i, quantity: Math.min(quantity, i.maxQuantity) } : i
        );
        set({ items: updatedItems });
        scheduleSyncToServer(updatedItems);
      },

      clearCart: () => {
        set({ items: [], discountCode: '', discountAmount: 0 });
        scheduleSyncToServer([]);
      },

      applyDiscount: (code, amount) => set({ discountCode: code, discountAmount: amount }),

      removeDiscount: () => set({ discountCode: '', discountAmount: 0 }),

      getItemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },

      getComboDiscount: () => {
        return comboDiscount(
          get().items.map((i) => ({
            price: i.price,
            quantity: i.quantity,
            comboSlug: i.comboSlug,
            comboGroupId: i.comboGroupId,
          }))
        ).total;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        // Coupon vs combo discount: take whichever saves more (no stacking
        // in v1 — phase 3 may revisit with a 35% cap).
        const effectiveDiscount = Math.max(get().discountAmount, get().getComboDiscount());
        return Math.max(0, subtotal - effectiveDiscount);
      },
    }),
    {
      name: 'earth-revibe-cart',
      partialize: (state) => ({
        items: state.items,
        discountCode: state.discountCode,
        discountAmount: state.discountAmount,
      }),
    }
  )
);
