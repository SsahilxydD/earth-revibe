"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/components/ui/toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutItem {
  variantId: string;
  quantity: number;
}

interface UseRazorpayCheckoutReturn {
  startCheckout: (items: CheckoutItem[], discountCode?: string) => Promise<void>;
  isProcessing: boolean;
}

function loadMagicCheckoutScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/magic-checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpayCheckout(): UseRazorpayCheckoutReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clearCart);
  const { isAuthenticated } = useAuthStore();

  const startCheckout = useCallback(
    async (items: CheckoutItem[], discountCode?: string) => {
      if (!isAuthenticated) {
        router.push("/auth/login?redirect=/checkout");
        return;
      }

      setIsProcessing(true);

      try {
        // 1. Create Magic Checkout order via our API
        const result = await api.post("/checkout/create-order", {
          items,
          discountCode,
          loyaltyPointsToUse: 0,
        });

        // 2. Load the Magic Checkout script
        const loaded = await loadMagicCheckoutScript();
        if (!loaded) {
          toast.error("Payment gateway failed to load. Please try again.");
          setIsProcessing(false);
          return;
        }

        // 3. Open Magic Checkout modal
        const options = {
          key: result.razorpayKeyId,
          one_click_checkout: true,
          name: "Earth Revibe",
          description: "Sustainable Fashion",
          order_id: result.razorpayOrderId,
          show_coupons: true,
          prefill: {
            name: result.prefill.name,
            email: result.prefill.email,
            contact: result.prefill.contact,
          },
          handler: async (response: any) => {
            // Payment successful — verify on server
            try {
              const verifyResult = await api.post("/checkout/verify-payment", {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              clearCart();
              router.push(`/order-confirmation/${verifyResult.orderNumber}`);
            } catch {
              toast.error("Payment verification failed. Please contact support.");
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              toast.warning("Checkout cancelled");
            },
            confirm_close: true,
          },
          theme: { color: "#2D5016" },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err: any) {
        toast.error(err.message || "Failed to start checkout");
        setIsProcessing(false);
      }
    },
    [isAuthenticated, router, clearCart]
  );

  return { startCheckout, isProcessing };
}
