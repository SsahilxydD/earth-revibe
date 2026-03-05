"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api-client";
import { formatPrice } from "@earth-revibe/shared";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ReviewStepProps {
  addressId: string;
  onBack: () => void;
}

export function ReviewStep({ addressId, onBack }: ReviewStepProps) {
  const router = useRouter();
  const { items, getSubtotal, clearCart } = useCartStore();
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string; discountAmount: number } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);

  const subtotal = getSubtotal();
  const shipping = subtotal >= 999 ? 0 : 99;
  const discountAmount = discount?.discountAmount || 0;
  const total = Math.max(subtotal - discountAmount + shipping, 0);

  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) return;
    setIsValidating(true);
    try {
      const result = await api.post("/discounts/validate", {
        code: discountCode.trim().toUpperCase(),
        orderTotal: subtotal,
      });
      setDiscount(result);
      toast.success(`Discount applied: -${formatPrice(result.discountAmount)}`);
    } catch (err: any) {
      toast.error(err.message || "Invalid discount code");
      setDiscount(null);
    } finally {
      setIsValidating(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    try {
      const result = await api.post("/orders", {
        addressId,
        discountCode: discount?.code,
        loyaltyPointsToUse: 0,
      });

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Payment gateway failed to load. Please try again.");
        setIsPlacing(false);
        return;
      }

      const options = {
        key: result.razorpayKeyId,
        amount: Math.round(result.amount * 100),
        currency: "INR",
        name: "Earth Revibe",
        description: "Order Payment",
        order_id: result.razorpayOrderId,
        handler: async (response: any) => {
          try {
            const verifyResult = await api.post("/orders/verify-payment", {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            clearCart();
            router.push(`/order-confirmation/${verifyResult.orderNumber}`);
          } catch {
            toast.error("Payment verification failed. Contact support.");
          }
        },
        modal: {
          ondismiss: () => {
            setIsPlacing(false);
            toast.warning("Payment cancelled");
          },
        },
        theme: { color: "#2D5016" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Failed to create order");
      setIsPlacing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-deep-earth">Review Your Order</h2>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-charcoal mb-3">Items ({items.length})</h3>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.variantId} className="flex items-center justify-between text-sm">
              <div className="flex-1">
                <p className="font-medium text-charcoal">{item.productName}</p>
                <p className="text-xs text-medium-gray">{item.size} / {item.color} x {item.quantity}</p>
              </div>
              <p className="font-medium text-charcoal">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Discount */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-charcoal mb-3">Discount Code</h3>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray" />
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="Enter discount code"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border-[1.5px] border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-forest-green"
            />
          </div>
          <Button variant="secondary" onClick={handleValidateDiscount} isLoading={isValidating}>
            Apply
          </Button>
        </div>
        {discount && (
          <p className="text-sm text-success mt-2">
            Code &quot;{discount.code}&quot; applied — you save {formatPrice(discount.discountAmount)}
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-charcoal mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-dark-gray">Subtotal</span>
            <span className="text-charcoal">{formatPrice(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount</span>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-dark-gray">Shipping</span>
            <span className="text-charcoal">{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
          </div>
          {shipping > 0 && <p className="text-xs text-medium-gray">Free shipping on orders over ₹999</p>}
          <div className="border-t border-light-gray pt-2 flex justify-between">
            <span className="text-base font-semibold text-charcoal">Total</span>
            <span className="text-lg font-bold text-deep-earth">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back to Address</Button>
        <Button onClick={handlePlaceOrder} isLoading={isPlacing} size="lg">
          Pay {formatPrice(total)}
        </Button>
      </div>
    </div>
  );
}
