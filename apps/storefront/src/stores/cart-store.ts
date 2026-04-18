'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  getAutoBundleDiscount: () => number;
}

/**
 * Mirror of the server's autoBundleDiscount in apps/api/src/services/checkout.service.ts.
 * Keep these two in sync — the server value is authoritative.
 *   3 or 4 items   → 20%
 *   5+ items       → 22%
 *   anything else  → 0
 */
function autoBundleDiscountPreview(itemCount: number, subtotal: number): number {
  if (itemCount >= 5) return subtotal * 0.22;
  if (itemCount >= 3) return subtotal * 0.2;
  return 0;
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
        items: items.map((i) => ({ variantId: i.id, quantity: i.quantity })),
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
        const updatedItems = get().items.filter((i) => i.id !== id);
        set({ items: updatedItems });
        scheduleSyncToServer(updatedItems);
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        const updatedItems = get().items.map((i) =>
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

      getAutoBundleDiscount: () => {
        const { items } = get();
        const itemCount = items.reduce((n, i) => n + i.quantity, 0);
        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        return autoBundleDiscountPreview(itemCount, subtotal);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        // Coupon vs auto-bundle: take whichever saves more (no stacking).
        const effectiveDiscount = Math.max(get().discountAmount, get().getAutoBundleDiscount());
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
