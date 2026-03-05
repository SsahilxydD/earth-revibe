"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { Spinner } from "@/components/ui/spinner";
import { AddressStep } from "@/components/checkout/address-step";
import { ReviewStep } from "@/components/checkout/review-step";

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const [step, setStep] = useState<"address" | "review">("address");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/checkout");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" className="text-forest-green" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-deep-earth mb-2">Your cart is empty</h1>
        <p className="text-medium-gray">Add some items before checking out.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center gap-2 mb-8">
        <div className={`flex items-center gap-1.5 text-sm font-medium ${step === "address" ? "text-forest-green" : "text-medium-gray"}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "address" ? "bg-forest-green text-white" : "bg-light-gray text-dark-gray"}`}>1</span>
          Address
        </div>
        <div className="w-8 h-px bg-light-gray" />
        <div className={`flex items-center gap-1.5 text-sm font-medium ${step === "review" ? "text-forest-green" : "text-medium-gray"}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "review" ? "bg-forest-green text-white" : "bg-light-gray text-dark-gray"}`}>2</span>
          Review & Pay
        </div>
      </div>

      {step === "address" && (
        <AddressStep
          selectedAddressId={selectedAddressId}
          onSelect={setSelectedAddressId}
          onNext={() => setStep("review")}
        />
      )}

      {step === "review" && selectedAddressId && (
        <ReviewStep
          addressId={selectedAddressId}
          onBack={() => setStep("address")}
        />
      )}
    </div>
  );
}
