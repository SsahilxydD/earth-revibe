"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useRazorpayCheckout } from "@/hooks/use-razorpay-checkout";
import { formatPrice } from "@earth-revibe/shared";

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const { startCheckout, isProcessing } = useRazorpayCheckout();
  const hasTriggered = useRef(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/checkout");
    }
  }, [isAuthenticated, isLoading, router]);

  // Auto-trigger Magic Checkout when page loads
  useEffect(() => {
    if (isLoading || !isAuthenticated || items.length === 0 || hasTriggered.current) return;
    hasTriggered.current = true;

    const checkoutItems = items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    startCheckout(checkoutItems);
  }, [isLoading, isAuthenticated, items, startCheckout]);

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (items.length === 0) {
    return (
      <div className="bg-white min-h-screen">
        <div className="h-16 lg:h-20" aria-hidden="true" />
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-[15px] text-slate-600 mb-2">Your cart is empty</p>
          <Link
            href="/products"
            className="mt-4 h-11 px-8 flex items-center bg-black text-white text-[11px] tracking-[0.1em] uppercase rounded-full hover:bg-black/85 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Show a summary while Magic Checkout modal is open
  return (
    <div className="bg-white min-h-screen">
      <div className="h-16 lg:h-20" aria-hidden="true" />
      <div className="max-w-md mx-auto px-4 pt-12 pb-24">
        <h1 className="text-[22px] font-medium text-black mb-6 text-center">Checkout</h1>

        <div className="border border-slate-200 rounded-lg p-6 mb-6">
          <p className="text-[13px] text-slate-500 mb-4">{items.length} item{items.length > 1 ? "s" : ""} in your order</p>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.variantId} className="flex justify-between text-[13px]">
                <span className="text-slate-700">{item.productName} <span className="text-slate-400">x{item.quantity}</span></span>
                <span className="text-slate-800">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 mt-4 pt-3 flex justify-between">
            <span className="text-[14px] font-medium text-black">Subtotal</span>
            <span className="text-[14px] font-medium text-black">{formatPrice(getSubtotal())}</span>
          </div>
        </div>

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-slate-500">Opening secure checkout...</p>
          </div>
        ) : (
          <button
            onClick={() => {
              const checkoutItems = items.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
              }));
              startCheckout(checkoutItems);
            }}
            className="w-full h-[52px] rounded-full bg-black text-white text-[14px] hover:bg-black/85 transition-colors"
          >
            Open Secure Checkout
          </button>
        )}

        <p className="text-[11px] text-slate-400 text-center mt-4">
          Powered by Razorpay Magic Checkout
        </p>
      </div>
    </div>
  );
}
