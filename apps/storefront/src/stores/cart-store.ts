import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api-client";

interface CartItem {
  variantId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  discountCode: string | null;
  discountAmount: number;
  discountError: string | null;
  isApplyingDiscount: boolean;

  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;

  getItemCount: () => number;
  getSubtotal: () => number;
  getTotal: () => number;

  applyDiscount: (code: string) => Promise<void>;
  removeDiscount: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      discountCode: null,
      discountAmount: 0,
      discountError: null,
      isApplyingDiscount: false,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),

      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((i) => i.variantId !== variantId)
            : state.items.map((i) =>
                i.variantId === variantId ? { ...i, quantity } : i
              ),
        })),

      clearCart: () => set({ items: [], discountCode: null, discountAmount: 0 }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setCartOpen: (open) => set({ isOpen: open }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      getTotal: () => Math.max(0, get().getSubtotal() - get().discountAmount),

      applyDiscount: async (code: string) => {
        set({ isApplyingDiscount: true, discountError: null });
        try {
          const subtotal = get().getSubtotal();
          const res = await api.post("/discounts/validate", { code, orderValue: subtotal });
          set({
            discountCode: code,
            discountAmount: res.data.discountAmount,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Invalid discount code";
          set({ discountError: message, discountCode: null, discountAmount: 0 });
        } finally {
          set({ isApplyingDiscount: false });
        }
      },

      removeDiscount: () => set({ discountCode: null, discountAmount: 0, discountError: null }),
    }),
    {
      name: "earth-revibe-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
