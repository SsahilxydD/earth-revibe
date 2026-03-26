'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

        if (existingIndex > -1) {
          const existing = items[existingIndex];
          const newQuantity = Math.min(
            existing.quantity + (item.quantity || 1),
            existing.maxQuantity
          );
          const updatedItems = items.map((i, idx) =>
            idx === existingIndex ? { ...i, quantity: newQuantity } : i
          );
          set({ items: updatedItems, isOpen: true });
        } else {
          const newItem: CartItem = {
            ...item,
            quantity: item.quantity || 1,
          };
          set({ items: [...items, newItem], isOpen: true });
        }
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.min(quantity, i.maxQuantity) } : i
          ),
        }));
      },

      clearCart: () => set({ items: [], discountCode: '', discountAmount: 0 }),

      applyDiscount: (code, amount) => set({ discountCode: code, discountAmount: amount }),

      removeDiscount: () => set({ discountCode: '', discountAmount: 0 }),

      getItemCount: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        return Math.max(0, subtotal - get().discountAmount);
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
