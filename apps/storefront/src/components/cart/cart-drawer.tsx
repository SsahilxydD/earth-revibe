"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { lockBodyScroll, unlockBodyScroll } from "@/stores/ui-store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CartItemRow } from "./cart-item";
import { api } from "@/lib/api-client";

const FREE_SHIPPING_THRESHOLD = 999;

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    discountCode,
    discountAmount,
    applyDiscount,
    removeDiscount,
    getSubtotal,
    getTotal,
  } = useCartStore();

  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const subtotal = getSubtotal();
  const total = getTotal();
  const shippingProgress = Math.min(subtotal / FREE_SHIPPING_THRESHOLD, 1);
  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) closeCart();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) return;
    setApplyingDiscount(true);
    setDiscountError("");
    try {
      const result = await api.post<{ code: string; discountAmount: number }>(
        "/discounts/validate",
        { code: discountInput.trim(), orderTotal: subtotal }
      );
      applyDiscount(result.code, result.discountAmount);
      setDiscountInput("");
    } catch (error: any) {
      setDiscountError(error?.message || "Invalid discount code");
    } finally {
      setApplyingDiscount(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em]">
            Your Cart
          </h2>
          <button
            onClick={closeCart}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-surface)]"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5">
            <ShoppingBag className="h-16 w-16 text-[var(--color-border)]" />
            <p className="text-sm font-medium text-[var(--color-muted)]">
              Your cart is empty
            </p>
            <Button onClick={closeCart} variant="primary" size="md">
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Free shipping bar */}
            <div className="border-b border-[var(--color-border)] px-5 py-3">
              {amountToFreeShipping > 0 ? (
                <p className="mb-2 text-center text-xs text-[var(--color-muted)]">
                  {formatPrice(amountToFreeShipping)} away from free shipping!
                </p>
              ) : (
                <p className="mb-2 text-center text-xs font-semibold text-green-600">
                  You qualify for free shipping!
                </p>
              )}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                  style={{ width: `${shippingProgress * 100}%` }}
                />
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-5 py-4">
              <ul className="divide-y divide-[var(--color-border)]">
                {items.map((item) => (
                  <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                    <CartItemRow item={item} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--color-border)] px-5 py-4">
              {/* Discount */}
              {!discountCode ? (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      placeholder="Discount code"
                      className="flex-1 rounded-[var(--button-radius)] border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyDiscount}
                      loading={applyingDiscount}
                    >
                      Apply
                    </Button>
                  </div>
                  {discountError && (
                    <p className="mt-1 text-xs text-[var(--color-sale)]">
                      {discountError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mb-4 flex items-center justify-between rounded-[var(--badge-radius)] bg-[var(--color-surface)] px-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold">{discountCode}</span>
                    {" "}&minus;{formatPrice(discountAmount)}
                  </span>
                  <button
                    onClick={removeDiscount}
                    className="text-xs text-[var(--color-sale)] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Totals */}
              <div className="mb-4 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-muted)]">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-[var(--color-sale)]">
                    <span>Discount</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-1.5 text-base font-bold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Link href="/checkout" onClick={closeCart}>
                <Button variant="primary" fullWidth size="lg">
                  Checkout
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
