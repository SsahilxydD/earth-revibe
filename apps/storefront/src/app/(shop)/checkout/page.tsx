"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ShoppingBag, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useToast } from "@/providers";
import { useRazorpay } from "@/hooks/use-razorpay";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const discountCode = useCartStore((s) => s.discountCode);
  const clearCart = useCartStore((s) => s.clearCart);
  const { addToast } = useToast();
  const { initiatePayment, isLoading: isRazorpayLoading } = useRazorpay();

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [hasLaunched, setHasLaunched] = useState(false);

  const launchMagicCheckout = useCallback(async () => {
    if (hasLaunched || items.length === 0) return;
    setHasLaunched(true);
    setIsCreatingOrder(true);

    try {
      // Create Magic Checkout order via the API
      const result = await api.post<{
        razorpayOrderId: string;
        razorpayKeyId: string;
        amount: number;
        orderNumber: string;
        prefill: { name: string; email: string; contact: string };
      }>("/checkout/create-order", {
        items: items.map((item) => ({
          variantId: item.id,
          quantity: item.quantity,
        })),
        ...(discountCode ? { discountCode } : {}),
        loyaltyPointsToUse: 0,
      });

      setIsCreatingOrder(false);

      // Open Razorpay Magic Checkout — address, payment, coupons all handled by Razorpay
      const paymentResponse = await initiatePayment({
        orderId: result.orderNumber,
        razorpayOrderId: result.razorpayOrderId,
        amount: Math.round(result.amount * 100), // paise
        currency: "INR",
        customerName: result.prefill.name,
        customerEmail: result.prefill.email,
        customerPhone: result.prefill.contact,
        description: `Order ${result.orderNumber}`,
      });

      if (!paymentResponse) {
        // User dismissed the popup
        addToast("Payment was cancelled. You can try again.", "info");
        setHasLaunched(false);
        return;
      }

      // Verify payment and create the final order
      const verification = await api.post<{
        orderNumber: string;
        pointsEarned: number;
      }>("/checkout/verify-payment", {
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpaySignature: paymentResponse.razorpay_signature,
      });

      clearCart();
      router.push(
        `/checkout/confirmation?orderId=${verification.orderNumber}`
      );
    } catch (error: any) {
      addToast(
        error?.message || "Something went wrong. Please try again.",
        "error"
      );
      setIsCreatingOrder(false);
      setHasLaunched(false);
    }
  }, [hasLaunched, items, discountCode, initiatePayment, addToast, clearCart, router]);

  // Auto-launch Magic Checkout when page loads with items
  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
      return;
    }
    // Small delay to let the page render before opening popup
    const timer = setTimeout(() => {
      launchMagicCheckout();
    }, 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-[var(--color-muted)]" />
          <p className="mt-4 text-lg font-semibold">Your cart is empty</p>
          <Link href="/categories/new-arrivals">
            <Button className="mt-4">Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to cart
      </Link>

      <h1 className="mt-4 text-2xl font-bold uppercase tracking-wider">
        Checkout
      </h1>

      {/* Order summary while Magic Checkout loads */}
      <div className="mt-8">
        {(isCreatingOrder || isRazorpayLoading) && (
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider">
              {isCreatingOrder
                ? "Preparing your order..."
                : "Opening payment..."}
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Please wait, Razorpay checkout will open shortly.
            </p>
          </div>
        )}

        {!isCreatingOrder && !isRazorpayLoading && (
          <>
            {/* Order items summary */}
            <div className="rounded-[var(--button-radius)] border border-[var(--color-border)] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
                Order Summary ({items.length} {items.length === 1 ? "item" : "items"})
              </h3>
              <div className="mt-3 divide-y divide-[var(--color-border)]">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 py-3">
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-[var(--badge-radius)] bg-[var(--color-surface)]">
                      <Image
                        src={getImageUrl(item.image, 100)}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex flex-1 items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-[var(--color-muted)]">
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && " | "}
                          {item.color && `Color: ${item.color}`}
                          {" | "}Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-bold">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Retry button if popup was dismissed */}
            <div className="mt-6">
              <Button
                fullWidth
                size="lg"
                onClick={launchMagicCheckout}
                disabled={isCreatingOrder}
              >
                {isCreatingOrder ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Proceed to Pay"
                )}
              </Button>
              <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
                Address and payment handled securely by Razorpay
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
