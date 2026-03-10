"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useRazorpayCheckout } from "@/hooks/use-razorpay-checkout";
import { api } from "@/lib/api-client";
import { formatPrice } from "@earth-revibe/shared";

export default function CheckoutPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const { startCheckout, isProcessing } = useRazorpayCheckout();

  const [guestEmail, setGuestEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(false);

  const [discountCode, setDiscountCode] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    type: string;
    value: number;
    amount: number;
  } | null>(null);

  const handleApplyDiscount = async () => {
    const code = discountCode.trim();
    if (!code) return;

    setDiscountLoading(true);
    setDiscountError("");

    try {
      const result = await api.get<{
        valid: boolean;
        discount: { type: string; value: number; code: string };
        discountAmount: number;
      }>(`/discounts/validate?code=${encodeURIComponent(code)}&orderTotal=${getSubtotal()}`);

      setAppliedDiscount({
        code: result.discount.code,
        type: result.discount.type,
        value: result.discount.value,
        amount: result.discountAmount,
      });
    } catch (err: any) {
      setDiscountError(err.message || "Invalid discount code");
      setAppliedDiscount(null);
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError("");
  };

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

  const handleGuestCheckout = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");

    const checkoutItems = items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    startCheckout(checkoutItems, appliedDiscount?.code, guestEmail);
  };

  const handleAuthenticatedCheckout = () => {
    const checkoutItems = items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));
    startCheckout(checkoutItems, appliedDiscount?.code);
  };

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

          {appliedDiscount && (
            <div className="flex justify-between mt-2">
              <span className="text-[13px] text-green-700">Discount ({appliedDiscount.code})</span>
              <span className="text-[13px] text-green-700">-{formatPrice(appliedDiscount.amount)}</span>
            </div>
          )}

          {appliedDiscount && (
            <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between">
              <span className="text-[14px] font-medium text-black">Total</span>
              <span className="text-[14px] font-medium text-black">
                {formatPrice(getSubtotal() - appliedDiscount.amount)}
              </span>
            </div>
          )}
        </div>

        {/* Discount Code */}
        <div className="border border-slate-200 rounded-lg p-4 mb-6">
          <p className="text-[12px] font-medium text-slate-600 mb-3 tracking-wide uppercase">Discount Code</p>
          {appliedDiscount ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-green-700 font-medium">{appliedDiscount.code}</span>
                <span className="text-[12px] text-green-600">
                  ({appliedDiscount.type === "PERCENTAGE" ? `${appliedDiscount.value}% off` : `${formatPrice(appliedDiscount.value)} off`})
                </span>
              </div>
              <button
                onClick={handleRemoveDiscount}
                className="text-[12px] text-slate-400 hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    if (discountError) setDiscountError("");
                  }}
                  placeholder="Enter code"
                  className="flex-1 h-[40px] px-3 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-black transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
                />
                <button
                  onClick={handleApplyDiscount}
                  disabled={!discountCode.trim() || discountLoading}
                  className="h-[40px] px-5 bg-black text-white text-[12px] tracking-wide uppercase rounded-lg hover:bg-black/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {discountLoading ? "..." : "Apply"}
                </button>
              </div>
              {discountError && (
                <p className="text-[12px] text-red-500 mt-2">{discountError}</p>
              )}
            </>
          )}
        </div>

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-slate-500">Opening secure checkout...</p>
          </div>
        ) : isAuthenticated ? (
          /* Authenticated user — single checkout button */
          <button
            onClick={handleAuthenticatedCheckout}
            className="w-full h-[52px] rounded-full bg-black text-white text-[14px] hover:bg-black/85 transition-colors"
          >
            Open Secure Checkout
          </button>
        ) : (
          /* Not authenticated — show login + guest options */
          <div className="space-y-4">
            <Link
              href={`/auth/login?redirect=/checkout`}
              className="flex items-center justify-center w-full h-[52px] rounded-full bg-black text-white text-[14px] hover:bg-black/85 transition-colors"
            >
              Log In to Checkout
            </Link>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[12px]">
                <span className="bg-white px-4 text-slate-400 uppercase tracking-wide">or</span>
              </div>
            </div>

            {!showGuestForm ? (
              <button
                onClick={() => setShowGuestForm(true)}
                className="w-full h-[52px] rounded-full border border-slate-300 text-black text-[14px] hover:border-black transition-colors"
              >
                Continue as Guest
              </button>
            ) : (
              <div className="border border-slate-200 rounded-lg p-5 space-y-4">
                <p className="text-[13px] text-slate-600">
                  Enter your email to receive order updates
                </p>
                <div>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    placeholder="your@email.com"
                    className="w-full h-[48px] px-4 border border-slate-200 rounded-lg text-[14px] focus:outline-none focus:border-black transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleGuestCheckout()}
                    autoFocus
                  />
                  {emailError && (
                    <p className="text-[12px] text-red-500 mt-1">{emailError}</p>
                  )}
                </div>
                <button
                  onClick={handleGuestCheckout}
                  disabled={!guestEmail}
                  className="w-full h-[48px] rounded-full bg-black text-white text-[14px] hover:bg-black/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Checkout as Guest
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  You can create an account after placing your order
                </p>
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center mt-4">
          Powered by Razorpay Magic Checkout
        </p>
      </div>
    </div>
  );
}
