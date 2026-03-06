"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui";
import { CartItem } from "./cart-item";
import { formatPrice } from "@earth-revibe/shared";

export function CartDrawer() {
  const router = useRouter();
  const { items, isOpen, setCartOpen, getSubtotal } = useCartStore();

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
    },
    [setCartOpen]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  const handleCheckout = () => {
    setCartOpen(false);
    router.push("/checkout");
  };

  const subtotal = getSubtotal();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40"
            onClick={() => setCartOpen(false)}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-light-gray">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-chocolate" />
                <h2 className="text-lg font-semibold text-chocolate">Your Cart</h2>
                <span className="text-sm text-muted-text">({items.length} items)</span>
              </div>
              <button onClick={() => setCartOpen(false)} className="p-1 rounded-md hover:bg-off-white transition-colors">
                <X size={20} className="text-secondary-text" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag size={48} className="text-light-gray mb-4" />
                  <p className="text-lg font-medium text-primary-text">Your cart is empty</p>
                  <p className="text-sm text-muted-text mt-1">Add some items to get started</p>
                  <Button variant="secondary" className="mt-6" onClick={() => { setCartOpen(false); router.push("/products"); }}>
                    Browse Products
                  </Button>
                </div>
              ) : (
                items.map((item) => <CartItem key={item.variantId} item={item} />)
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-light-gray px-6 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-primary-text">Subtotal</span>
                  <span className="text-lg font-semibold text-chocolate">{formatPrice(subtotal)}</span>
                </div>
                <p className="text-xs text-muted-text">Shipping calculated at checkout</p>
                <Button onClick={handleCheckout} className="w-full" size="lg">
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
