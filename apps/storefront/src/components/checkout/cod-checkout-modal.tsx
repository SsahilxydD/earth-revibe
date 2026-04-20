'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Plus, Loader2, Check } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { MapplsAddressInput } from './mappls-address-input';
import { useCartStore, type CartItem } from '@/stores/cart-store';
import { useAddresses, useCreateAddress } from '@/hooks/use-addresses';
import { api } from '@/lib/api-client';
import { formatPrice } from '@/lib/utils';
import { trackPurchaseCompleted } from '@/lib/analytics';
import type { Address } from '@/types';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

type Step = 'address' | 'review' | 'confirming';

interface CODCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Optional override for direct Buy Now flows. When provided, the modal uses
   * these items for display + order placement instead of the cart store, and
   * leaves the cart untouched on success.
   */
  directItems?: CartItem[];
}

export function CODCheckoutModal({ isOpen, onClose, directItems }: CODCheckoutModalProps) {
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const discountCode = useCartStore((s) => s.discountCode);
  const discountAmount = useCartStore((s) => s.discountAmount);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const clearCart = useCartStore((s) => s.clearCart);

  // When directItems is provided (Buy Now), use those and ignore cart-wide
  // discounts entirely. Otherwise fall back to the regular cart flow.
  const isDirect = !!directItems && directItems.length > 0;
  const items = isDirect ? directItems : cartItems;
  const effectiveDiscountCode = isDirect ? '' : discountCode;
  const effectiveDiscountAmount = isDirect ? 0 : discountAmount;

  const { data: addresses = [], isLoading: loadingAddresses } = useAddresses({ enabled: isOpen });
  const createAddress = useCreateAddress();

  const [step, setStep] = useState<Step>('address');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState('');
  const [_isSubmitting, setIsSubmitting] = useState(false);

  // New address form state
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pinCode: '',
  });

  const subtotal = isDirect
    ? items.reduce((acc, i) => acc + i.price * i.quantity, 0)
    : getSubtotal();
  const total = Math.max(subtotal - effectiveDiscountAmount, 0);

  const selectedAddress = addresses.find((a: Address) => a.id === selectedAddressId);

  const resetAndClose = () => {
    setStep('address');
    setSelectedAddressId(null);
    setShowNewForm(false);
    setError('');
    setForm({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pinCode: '' });
    onClose();
  };

  const handleMapplsSelect = (addr: {
    line1: string;
    city: string;
    state: string;
    pinCode: string;
  }) => {
    setForm((f) => ({
      ...f,
      line1: addr.line1,
      city: addr.city,
      state: addr.state,
      pinCode: addr.pinCode,
    }));
  };

  const handleSaveAddress = async () => {
    if (
      !form.fullName ||
      !form.phone ||
      !form.line1 ||
      !form.city ||
      !form.state ||
      !form.pinCode
    ) {
      setError('Please fill all required fields');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    if (!/^\d{6}$/.test(form.pinCode)) {
      setError('Enter a valid 6-digit PIN code');
      return;
    }
    setError('');
    try {
      const newAddr = await createAddress.mutateAsync({
        label: 'Home',
        ...form,
      });
      setSelectedAddressId(newAddr.id);
      setShowNewForm(false);
    } catch {
      setError('Failed to save address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) return;
    setIsSubmitting(true);
    setError('');
    setStep('confirming');
    try {
      const result = await api.post<{ orderNumber: string; total: number; pointsEarned: number }>(
        '/checkout/create-cod-order',
        {
          items: items.map((i) => ({ variantId: i.id, quantity: i.quantity })),
          addressId: selectedAddressId,
          discountCode: effectiveDiscountCode || undefined,
          loyaltyPointsToUse: 0,
        }
      );

      trackPurchaseCompleted({
        orderId: result.orderNumber,
        total: result.total,
        itemCount: items.reduce((n, i) => n + i.quantity, 0),
        paymentMethod: 'cod',
      });

      // Direct Buy Now flows never touched the cart — don't clear it.
      if (!isDirect) clearCart();
      resetAndClose();
      router.push(`/checkout/confirmation?orderId=${result.orderNumber}&method=cod`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
      setStep('review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    step === 'address' ? 'Delivery Address' : step === 'review' ? 'Review Order' : 'Placing Order';

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title={title} maxWidth="max-w-md">
      {/* ── Step: Address ── */}
      {step === 'address' && (
        <div className="space-y-4">
          {loadingAddresses ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted)]" />
            </div>
          ) : (
            <>
              {/* Saved addresses */}
              {addresses.length > 0 && !showNewForm && (
                <div className="space-y-2">
                  {addresses.map((addr: Address) => (
                    <button
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`w-full rounded-lg border p-3 text-left text-xs transition-colors ${
                        selectedAddressId === addr.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-surface)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-[var(--color-text)]">{addr.fullName}</p>
                          <p className="mt-0.5 text-[var(--color-muted)]">
                            {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ''}
                          </p>
                          <p className="text-[var(--color-muted)]">
                            {addr.city}, {addr.state} — {addr.pinCode}
                          </p>
                        </div>
                        {selectedAddressId === addr.id && (
                          <Check size={16} className="shrink-0 text-[var(--color-primary)]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Add new address */}
              {!showNewForm ? (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] p-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  <Plus size={14} />
                  Add New Address
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="flex items-center gap-1 text-xs text-[var(--color-muted)]"
                  >
                    <ChevronLeft size={14} /> Back to saved addresses
                  </button>

                  <MapplsAddressInput onSelect={handleMapplsSelect} />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Full Name *"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      className="col-span-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                    <input
                      placeholder="Phone (10 digits) *"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })
                      }
                      className="col-span-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                    <input
                      placeholder="Address Line 1 *"
                      value={form.line1}
                      onChange={(e) => setForm({ ...form, line1: e.target.value })}
                      className="col-span-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                    <input
                      placeholder="Landmark (optional)"
                      value={form.line2}
                      onChange={(e) => setForm({ ...form, line2: e.target.value })}
                      className="col-span-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                    <input
                      placeholder="City *"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                    <input
                      placeholder="PIN Code *"
                      value={form.pinCode}
                      onChange={(e) =>
                        setForm({ ...form, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })
                      }
                      className="rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
                    />
                    <select
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="col-span-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] appearance-none bg-white"
                    >
                      <option value="">Select State *</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && <p className="text-xs text-red-500">{error}</p>}

                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleSaveAddress}
                    isLoading={createAddress.isPending}
                  >
                    Save & Use This Address
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Continue to review */}
          {!showNewForm && selectedAddressId && (
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setError('');
                setStep('review');
              }}
            >
              Continue
            </Button>
          )}
        </div>
      )}

      {/* ── Step: Review ── */}
      {step === 'review' && selectedAddress && (
        <div className="space-y-4">
          <button
            onClick={() => setStep('address')}
            className="flex items-center gap-1 text-xs text-[var(--color-muted)]"
          >
            <ChevronLeft size={14} /> Change address
          </button>

          {/* Delivery address */}
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
              <MapPin size={12} /> Delivering to
            </div>
            <p className="text-sm font-semibold">{selectedAddress.fullName}</p>
            <p className="text-xs text-[var(--color-muted)]">
              {selectedAddress.line1}
              {selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}, {selectedAddress.city},{' '}
              {selectedAddress.state} — {selectedAddress.pinCode}
            </p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text)]">
                  {item.name} ({item.size}) x{item.quantity}
                </span>
                <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <hr className="border-[var(--color-border)]" />

          {/* Totals */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {effectiveDiscountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({effectiveDiscountCode})</span>
                <span>-{formatPrice(effectiveDiscountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Shipping</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="flex justify-between border-t border-[var(--color-border)] pt-1.5 text-sm font-bold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <div className="rounded-lg bg-[var(--color-surface)] p-3 text-center text-[11px] text-[var(--color-muted)]">
            Pay {formatPrice(total)} in cash when your order is delivered
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}

          <Button variant="primary" fullWidth size="lg" onClick={handlePlaceOrder}>
            Place COD Order
          </Button>
        </div>
      )}

      {/* ── Step: Confirming ── */}
      {step === 'confirming' && (
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
          <p className="mt-4 text-sm text-[var(--color-muted)]">Placing your order...</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Please don&apos;t close this window
          </p>
        </div>
      )}
    </Modal>
  );
}
