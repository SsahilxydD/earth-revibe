"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Package,
  Tag,
  X,
  ShoppingBag,
} from "lucide-react";
import { useCartStore } from "@/stores/cart-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatPrice, getImageUrl } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { useToast } from "@/providers";
import { useRazorpay } from "@/hooks/use-razorpay";

interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pinCode: string;
  label?: string;
  isDefault?: boolean;
}

interface AddressFormData {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pinCode: string;
  label: string;
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
  "Jammu & Kashmir",
  "Ladakh",
  "Puducherry",
  "Andaman & Nicobar Islands",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Lakshadweep",
];

const STEP_LABELS = ["Shipping", "Review", "Payment"];

function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEP_LABELS.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;

        return (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isCompleted) onStepClick(stepNum);
              }}
              disabled={!isCompleted}
              className="flex items-center gap-2 disabled:cursor-default"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isCurrent
                    ? "bg-[var(--color-primary)] text-white"
                    : isCompleted
                      ? "bg-green-600 text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-muted)]"
                }`}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNum}
              </span>
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isCurrent
                    ? "text-[var(--color-text)]"
                    : "text-[var(--color-muted)]"
                }`}
              >
                {label}
              </span>
            </button>
            {idx < STEP_LABELS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-[var(--color-muted)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AddressCard({
  address,
  isSelected,
  onSelect,
}: {
  address: Address;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-[var(--button-radius)] border-2 p-4 text-left transition-colors ${
        isSelected
          ? "border-[var(--color-primary)] bg-[var(--color-surface)]"
          : "border-[var(--color-border)] hover:border-[var(--color-muted)]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          {address.label && (
            <span className="mb-1 inline-block rounded-[var(--badge-radius)] bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              {address.label}
            </span>
          )}
          <p className="text-sm font-semibold">{address.fullName}</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {address.line1}
            {address.line2 && `, ${address.line2}`}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {address.city}, {address.state} - {address.pinCode}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Phone: {address.phone}
          </p>
        </div>
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            isSelected
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
              : "border-[var(--color-border)]"
          }`}
        >
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </span>
      </div>
    </button>
  );
}

function NewAddressForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  onSubmit: (data: AddressFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormData>();

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mt-4 space-y-4 rounded-[var(--button-radius)] border border-[var(--color-border)] p-5"
    >
      <h3 className="text-sm font-bold uppercase tracking-wider">
        New Address
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full Name"
          {...register("fullName", { required: "Name is required" })}
          error={errors.fullName?.message}
          placeholder="John Doe"
        />
        <Input
          label="Phone Number"
          type="tel"
          {...register("phone", {
            required: "Phone is required",
            pattern: {
              value: /^[6-9]\d{9}$/,
              message: "Enter a valid 10-digit phone number",
            },
          })}
          error={errors.phone?.message}
          placeholder="9876543210"
        />
      </div>

      <Input
        label="Address Line 1"
        {...register("line1", { required: "Address is required" })}
        error={errors.line1?.message}
        placeholder="House/Flat No., Building, Street"
      />

      <Input
        label="Address Line 2 (Optional)"
        {...register("line2")}
        placeholder="Landmark, Area"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="City"
          {...register("city", { required: "City is required" })}
          error={errors.city?.message}
          placeholder="Mumbai"
        />

        <div className="w-full">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            State
          </label>
          <select
            {...register("state", { required: "State is required" })}
            className="w-full rounded-[var(--button-radius)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm text-[var(--color-text)] outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          {errors.state && (
            <p className="mt-1 text-xs text-[var(--color-sale)]">
              {errors.state.message}
            </p>
          )}
        </div>

        <Input
          label="PIN Code"
          {...register("pinCode", {
            required: "PIN code is required",
            pattern: {
              value: /^\d{6}$/,
              message: "Enter a valid 6-digit PIN code",
            },
          })}
          error={errors.pinCode?.message}
          placeholder="400001"
        />
      </div>

      <Input
        label="Label (Optional)"
        {...register("label")}
        placeholder="Home, Office, etc."
      />

      <div className="flex gap-3">
        <Button type="submit" loading={isSubmitting}>
          Save Address
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ShippingStep({
  selectedAddressId,
  onSelectAddress,
  onContinue,
}: {
  selectedAddressId: string | null;
  onSelectAddress: (id: string) => void;
  onContinue: () => void;
}) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const { addToast } = useToast();

  const {
    data: addresses,
    isLoading,
    refetch,
  } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => api.get("/addresses"),
  });

  useEffect(() => {
    if (addresses?.length && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.isDefault);
      if (defaultAddr) {
        onSelectAddress(defaultAddr.id);
      }
    }
  }, [addresses, selectedAddressId, onSelectAddress]);

  const handleSaveAddress = async (data: AddressFormData) => {
    setSavingAddress(true);
    try {
      const saved = await api.post<Address>("/addresses", data);
      onSelectAddress(saved.id);
      setShowNewForm(false);
      addToast("Address saved!", "success");
      refetch();
    } catch (error: any) {
      addToast(error?.message || "Failed to save address", "error");
    } finally {
      setSavingAddress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5" />
        <h2 className="text-lg font-bold uppercase tracking-wider">
          Shipping Address
        </h2>
      </div>

      {addresses && addresses.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              isSelected={selectedAddressId === address.id}
              onSelect={() => onSelectAddress(address.id)}
            />
          ))}
        </div>
      )}

      {!showNewForm ? (
        <button
          onClick={() => setShowNewForm(true)}
          className="mt-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <Plus className="h-4 w-4" />
          Add New Address
        </button>
      ) : (
        <NewAddressForm
          onSubmit={handleSaveAddress}
          onCancel={() => setShowNewForm(false)}
          isSubmitting={savingAddress}
        />
      )}

      <div className="mt-8">
        <Button
          fullWidth
          size="lg"
          onClick={onContinue}
          disabled={!selectedAddressId}
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({
  selectedAddressId,
  onBack,
  onPlaceOrder,
  isPlacingOrder,
}: {
  selectedAddressId: string;
  onBack: () => void;
  onPlaceOrder: () => void;
  isPlacingOrder: boolean;
}) {
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTotal = useCartStore((s) => s.getTotal);
  const discountCode = useCartStore((s) => s.discountCode);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const applyDiscount = useCartStore((s) => s.applyDiscount);
  const removeDiscount = useCartStore((s) => s.removeDiscount);

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const { addToast } = useToast();

  const { data: address } = useQuery<Address>({
    queryKey: ["address", selectedAddressId],
    queryFn: () => api.get(`/addresses/${selectedAddressId}`),
    enabled: !!selectedAddressId,
  });

  const subtotal = getSubtotal();
  const total = getTotal();
  const shipping = subtotal >= 999 ? 0 : 79;
  const grandTotal = total + shipping;

  const handleApplyDiscount = async () => {
    if (!couponInput.trim()) return;
    setCouponError("");
    setCouponLoading(true);
    try {
      const result = await api.post<{ code: string; amount: number }>(
        "/discounts/validate",
        { code: couponInput.trim(), subtotal }
      );
      applyDiscount(result.code, result.amount);
      setCouponInput("");
      addToast("Discount applied!", "success");
    } catch (error: any) {
      setCouponError(error?.message || "Invalid discount code");
    } finally {
      setCouponLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        <h2 className="text-lg font-bold uppercase tracking-wider">
          Review Your Order
        </h2>
      </div>

      {/* Address Summary */}
      {address && (
        <div className="mt-5 rounded-[var(--button-radius)] border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
              Shipping To
            </h3>
            <button
              onClick={onBack}
              className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-text)]"
            >
              Change
            </button>
          </div>
          <p className="mt-2 text-sm font-semibold">{address.fullName}</p>
          <p className="text-sm text-[var(--color-muted)]">
            {address.line1}
            {address.line2 && `, ${address.line2}`}, {address.city},{" "}
            {address.state} - {address.pinCode}
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Phone: {address.phone}
          </p>
        </div>
      )}

      {/* Order Items */}
      <div className="mt-5 rounded-[var(--button-radius)] border border-[var(--color-border)] p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">
          Order Items ({items.length})
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

      {/* Discount Code */}
      {!discountCode && (
        <div className="mt-5 flex gap-2">
          <Input
            placeholder="Discount code"
            value={couponInput}
            onChange={(e) => {
              setCouponInput(e.target.value);
              setCouponError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApplyDiscount();
              }
            }}
            className="flex-1"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleApplyDiscount}
            loading={couponLoading}
            disabled={!couponInput.trim()}
          >
            Apply
          </Button>
        </div>
      )}
      {couponError && (
        <p className="mt-1.5 text-xs text-[var(--color-sale)]">{couponError}</p>
      )}

      {/* Order Totals */}
      <div className="mt-5 rounded-[var(--button-radius)] border border-[var(--color-border)] p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          {discountCode && discountAmount > 0 && (
            <div className="flex items-center justify-between text-green-600">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                <span>{discountCode}</span>
                <button
                  onClick={removeDiscount}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--color-surface)]"
                  aria-label="Remove discount"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <span>-{formatPrice(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Shipping</span>
            <span>{shipping === 0 ? "FREE" : formatPrice(shipping)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Tax (incl. GST)</span>
            <span>Included</span>
          </div>

          <div className="border-t border-[var(--color-border)] pt-2">
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="ghost" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          fullWidth
          size="lg"
          onClick={onPlaceOrder}
          loading={isPlacingOrder}
        >
          Place Order
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const discountCode = useCartStore((s) => s.discountCode);
  const clearCart = useCartStore((s) => s.clearCart);
  const { addToast } = useToast();
  const { initiatePayment } = useRazorpay();

  const [step, setStep] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router]);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) return;

    setIsPlacingOrder(true);
    setStep(3);

    try {
      const checkoutPayload = {
        items: items.map((item) => ({
          variantId: item.id,
          quantity: item.quantity,
        })),
        addressId: selectedAddressId,
        ...(discountCode ? { discountCode } : {}),
      };

      const orderResult = await api.post<{
        orderId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
      }>("/checkout", checkoutPayload);

      const paymentResponse = await initiatePayment({
        orderId: orderResult.orderId,
        razorpayOrderId: orderResult.razorpayOrderId,
        amount: orderResult.amount,
        currency: orderResult.currency || "INR",
      });

      if (!paymentResponse) {
        addToast("Payment was cancelled. You can try again.", "info");
        setStep(2);
        setIsPlacingOrder(false);
        return;
      }

      await api.post("/checkout/verify", {
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      });

      clearCart();
      router.push(
        `/checkout/confirmation?orderId=${orderResult.orderId}`
      );
    } catch (error: any) {
      addToast(
        error?.message || "Something went wrong. Please try again.",
        "error"
      );
      setStep(2);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-[var(--color-muted)]" />
          <p className="mt-4 text-lg font-semibold">Your cart is empty</p>
          <Link href="/collections/new-arrivals">
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

      <div className="mt-6">
        <StepIndicator
          currentStep={step}
          onStepClick={(s) => setStep(s)}
        />
      </div>

      <div className="mt-8">
        {step === 1 && (
          <ShippingStep
            selectedAddressId={selectedAddressId}
            onSelectAddress={setSelectedAddressId}
            onContinue={() => setStep(2)}
          />
        )}

        {step === 2 && selectedAddressId && (
          <ReviewStep
            selectedAddressId={selectedAddressId}
            onBack={() => setStep(1)}
            onPlaceOrder={handlePlaceOrder}
            isPlacingOrder={isPlacingOrder}
          />
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-wider">
              Processing your payment...
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Please do not close this page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
