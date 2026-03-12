"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center lg:px-8">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
      </div>

      <h1 className="mt-6 text-2xl font-bold uppercase tracking-wider">
        Order Confirmed!
      </h1>

      <p className="mt-3 text-sm text-[var(--color-muted)]">
        Thank you for your order. We&apos;ve received your payment and are
        preparing your items for shipment.
      </p>

      {orderId && (
        <div className="mt-6 rounded-[var(--button-radius)] border border-[var(--color-border)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Order Number
          </p>
          <p className="mt-1 text-lg font-bold tracking-wider">{orderId}</p>
        </div>
      )}

      <div className="mt-6 rounded-[var(--button-radius)] bg-[var(--color-surface)] p-5">
        <div className="flex items-center justify-center gap-2">
          <Package className="h-5 w-5 text-[var(--color-muted)]" />
          <p className="text-sm font-semibold">Estimated Delivery</p>
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          5-7 business days
        </p>
      </div>

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        A confirmation email has been sent to your registered email address.
        You can track your order status from your account.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <Link href="/categories/new-arrivals">
          <Button fullWidth size="lg">
            Continue Shopping
          </Button>
        </Link>

        {orderId && (
          <Link
            href={`/account/orders/${orderId}`}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
          >
            View Order
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
