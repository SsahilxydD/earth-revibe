"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const isNewAccount = searchParams.get("newAccount") === "1";

  return (
    <div className="flex min-h-[calc(100dvh-160px)] items-center justify-center px-4 py-10 lg:px-8">
      <div className="mx-auto w-full max-w-sm text-center">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <h1 className="mt-5 text-xl font-bold uppercase tracking-wider">
          Order Confirmed!
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
          Thank you for your order. We&apos;ve received your payment and are
          preparing your items for shipment.
        </p>

        {/* Order number + delivery in a compact stack */}
        <div className="mt-6 space-y-3">
          {orderId && (
            <div className="rounded-[var(--button-radius)] border border-[var(--color-border)] px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Order Number
              </p>
              <p className="mt-1 text-base font-bold tracking-wide">{orderId}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 rounded-[var(--button-radius)] bg-[var(--color-surface)] px-4 py-3">
            <Package className="h-4 w-4 text-[var(--color-muted)]" />
            <p className="text-sm">
              <span className="font-semibold">Estimated Delivery</span>
              <span className="mx-1.5 text-[var(--color-muted)]">&middot;</span>
              <span className="text-[var(--color-muted)]">5-7 business days</span>
            </p>
          </div>
        </div>

        {/* Auto-created account banner */}
        {isNewAccount && (
          <div className="mt-5 rounded-[var(--button-radius)] border border-green-200 bg-green-50 px-4 py-4 text-left">
            <div className="flex items-start gap-3">
              <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-900">
                  Account created!
                </p>
                <p className="mt-1 text-xs leading-relaxed text-green-700">
                  We&apos;ve created an account for you. Check your email to set
                  a password — then you can log in to track your orders anytime.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="mt-5 text-xs leading-relaxed text-[var(--color-muted)]">
          A confirmation email has been sent to your registered email address.
        </p>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/categories/new-arrivals">
            <Button fullWidth size="lg">
              Continue Shopping
            </Button>
          </Link>

          {orderId && (
            <Link
              href={`/account/orders/${orderId}`}
              className="inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              View Order
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
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
