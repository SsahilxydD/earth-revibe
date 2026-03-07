"use client";

import { use } from "react";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";

export default function OrderConfirmationPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={32} className="text-success" />
      </div>

      <h1 className="text-2xl font-semibold text-deep-earth mb-2">Order Placed!</h1>
      <p className="text-medium-gray mb-6">
        Thank you for your purchase. Your order has been confirmed.
      </p>

      <div className="bg-off-white rounded-xl p-6 mb-8">
        <p className="text-sm text-medium-gray mb-1">Order Number</p>
        <p className="text-xl font-bold text-charcoal">{orderNumber}</p>
        <p className="text-sm text-medium-gray mt-3">
          We&apos;ll send you an email with tracking details once your order ships.
        </p>
      </div>

      {!isAuthenticated && (
        <div className="bg-slate-50 rounded-xl p-5 mb-8 text-left">
          <p className="text-sm font-medium text-charcoal mb-1">
            Create an account to track your order
          </p>
          <p className="text-xs text-medium-gray mb-3">
            Save your details for faster checkout next time and earn loyalty points.
          </p>
          <Link href={`/auth/register?redirect=/account/orders`}>
            <Button variant="secondary" className="text-sm">
              Create Account
            </Button>
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {isAuthenticated && (
          <Link href="/account/orders">
            <Button variant="secondary">
              <Package size={18} />
              View My Orders
            </Button>
          </Link>
        )}
        <Link href="/products">
          <Button>
            Continue Shopping
            <ArrowRight size={18} />
          </Button>
        </Link>
      </div>
    </div>
  );
}
