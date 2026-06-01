'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button, Badge, Card, Select } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import {
  useCreateManualOrder,
  useCreateDraftOrder,
  useSendCustomerOtp,
  useVerifyCustomerOtp,
} from '@/hooks/use-orders';
import {
  OrderItemsEditor,
  computeOrderTotals,
  type LineItem,
} from '@/components/orders/order-items-editor';
import { todayLocalDate, localDateToISO } from '@/lib/order-date';
import type { CreateManualOrderInput, CreateDraftOrderInput, OfflinePaymentMethod } from '@/types';

type VerifiedCustomer = {
  userId: string;
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  isNewCustomer: boolean;
};

const statusOptions = [
  { value: 'DELIVERED', label: 'Delivered (handed over in person)' },
  { value: 'CONFIRMED', label: 'Confirmed (will ship later)' },
  { value: 'SHIPPING', label: 'Shipping' },
];

const paymentOptions: { value: '' | OfflinePaymentMethod; label: string }[] = [
  { value: '', label: 'Payment method (optional)' },
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'OTHER', label: 'Other' },
];

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export default function NewManualOrderPage() {
  const router = useRouter();
  const createManualOrder = useCreateManualOrder();
  const createDraftOrder = useCreateDraftOrder();
  const sendCustomerOtp = useSendCustomerOtp();
  const verifyCustomerOtp = useVerifyCustomerOtp();

  // Two ways to capture the customer:
  //  'verify' — OTP-verify now, then create a confirmed offline order (original flow).
  //  'draft'  — capture name + phone unverified, save a DRAFT to confirm later.
  const [customerMode, setCustomerMode] = useState<'verify' | 'draft'>('verify');
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');

  // Customer verification gate — phone + OTP must be verified BEFORE the rest
  // of the form unlocks. This is the only way Order.userId gets populated,
  // which is how the offline order shows up in the customer's account when
  // they later log in via OTP.
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [hasNameOnFile, setHasNameOnFile] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [verified, setVerified] = useState<VerifiedCustomer | null>(null);

  const [items, setItems] = useState<LineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [shippingAmount, setShippingAmount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');
  const [status, setStatus] = useState('DELIVERED');
  const [paymentMethod, setPaymentMethod] = useState<'' | OfflinePaymentMethod>('CASH');
  const [note, setNote] = useState('');
  // Effective order date — defaults to today; can be backdated for a sale
  // recorded after the fact. Applies to both the verify-now and draft flows.
  const [orderDate, setOrderDate] = useState(todayLocalDate());

  const discountNum = Number(discountAmount) || 0;
  const shippingNum = Number(shippingAmount) || 0;
  const taxNum = Number(taxAmount) || 0;
  const { total } = computeOrderTotals(items, discountNum, shippingNum, taxNum);

  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    try {
      const result = await sendCustomerOtp.mutateAsync({ phone: phone.trim() });
      setOtpSent(true);
      setIsExistingCustomer(result.isExistingCustomer);
      setHasNameOnFile(result.hasName);
      toast.success(
        result.isExistingCustomer ? 'OTP sent — existing customer' : 'OTP sent — new customer'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode.trim())) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    // For new customers (no name on file), require a name before verify so
    // the User row gets created with one. Existing customers with a name
    // already on file can skip this.
    if (!hasNameOnFile && !firstName.trim()) {
      toast.error('Enter the customer name');
      return;
    }
    try {
      const result = await verifyCustomerOtp.mutateAsync({
        phone: phone.trim(),
        code: otpCode.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      setVerified({
        userId: result.userId,
        phone: result.phone ?? phone.trim(),
        firstName: result.firstName ?? '',
        lastName: result.lastName ?? '',
        email: result.email ?? '',
        isNewCustomer: result.isNewCustomer,
      });
      toast.success(result.isNewCustomer ? 'Customer verified + created' : 'Customer verified');
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify OTP');
    }
  };

  const handleResetVerification = () => {
    setVerified(null);
    setOtpSent(false);
    setOtpCode('');
    setFirstName('');
    setLastName('');
    setIsExistingCustomer(false);
    setHasNameOnFile(false);
  };

  const validate = (): string | null => {
    if (!verified) return 'Verify the customer phone (OTP) first';
    if (items.length === 0) return 'Add at least one item';
    if (items.some((i) => i.quantity < 1)) return 'Quantity must be at least 1';
    if (items.some((i) => i.unitPrice < 0)) return 'Unit price cannot be negative';
    if (items.some((i) => i.quantity > i.stock)) {
      return 'One or more items exceed available stock';
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error || !verified) {
      toast.error(error || 'Verify the customer first');
      return;
    }
    const payload: CreateManualOrderInput = {
      userId: verified.userId,
      items: items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      discountAmount: discountNum,
      shippingAmount: shippingNum,
      taxAmount: taxNum,
      status: status as CreateManualOrderInput['status'],
      paymentMethod: paymentMethod || undefined,
      note: note.trim() || undefined,
      orderDate:
        orderDate && orderDate !== todayLocalDate() ? localDateToISO(orderDate) : undefined,
    };
    try {
      const created = await createManualOrder.mutateAsync(payload);
      toast.success(`Offline order #${created.orderNumber} created`);
      router.push(`/orders/${created.orderNumber}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
    }
  };

  const draftValid =
    draftName.trim().length > 0 && /^[6-9]\d{9}$/.test(draftPhone.trim()) && items.length > 0;

  const handleSaveDraft = async () => {
    if (!draftName.trim()) {
      toast.error('Enter the customer name');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(draftPhone.trim())) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    // Note: stock is NOT validated/reserved for a draft — it's checked again
    // when the draft is confirmed (after payment).
    const payload: CreateDraftOrderInput = {
      guestName: draftName.trim(),
      guestPhone: draftPhone.trim(),
      items: items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      discountAmount: discountNum,
      shippingAmount: shippingNum,
      taxAmount: taxNum,
      paymentMethod: paymentMethod || undefined,
      note: note.trim() || undefined,
      orderDate:
        orderDate && orderDate !== todayLocalDate() ? localDateToISO(orderDate) : undefined,
    };
    try {
      const created = await createDraftOrder.mutateAsync(payload);
      toast.success(`Draft order #${created.orderNumber} saved`);
      router.push(`/orders/${created.orderNumber}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-charcoal">New offline order</h1>
          <p className="text-sm text-medium-gray mt-1">
            Record an offline / in-person sale. Verify the customer now to create a confirmed order
            (stock decremented), or save a draft to confirm later once payment lands.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column: items + totals */}
        <div className="lg:col-span-2 space-y-6">
          <OrderItemsEditor
            items={items}
            onItemsChange={setItems}
            discountAmount={discountAmount}
            shippingAmount={shippingAmount}
            taxAmount={taxAmount}
            onDiscountChange={setDiscountAmount}
            onShippingChange={setShippingAmount}
            onTaxChange={setTaxAmount}
            enforceStock
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer — OTP-gated verification */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-3">Customer</h3>

            <div className="flex gap-1 p-1 mb-4 rounded-lg bg-off-white border border-light-gray">
              <button
                type="button"
                onClick={() => setCustomerMode('verify')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                  customerMode === 'verify'
                    ? 'bg-white text-charcoal shadow-sm'
                    : 'text-medium-gray hover:text-charcoal'
                }`}
              >
                Verify now
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode('draft')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                  customerMode === 'draft'
                    ? 'bg-white text-charcoal shadow-sm'
                    : 'text-medium-gray hover:text-charcoal'
                }`}
              >
                Save as draft
              </button>
            </div>

            {customerMode === 'verify' ? (
              verified ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle2 size={20} className="text-green-700 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal">
                        {`${verified.firstName} ${verified.lastName}`.trim() || 'Customer'}
                        {verified.isNewCustomer && (
                          <span className="ml-2 text-xs font-normal text-green-700">(new)</span>
                        )}
                      </p>
                      <p className="text-xs text-medium-gray mt-0.5">
                        +91 {verified.phone}
                        {verified.email && !verified.email.endsWith('@phone.earthrevibe.com') && (
                          <span> · {verified.email}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetVerification}
                    className="text-xs text-medium-gray hover:text-charcoal underline"
                  >
                    Change customer
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      Phone <span className="text-red-600">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit Indian mobile"
                        disabled={otpSent}
                        className="flex-1 px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20 disabled:bg-light-gray/40 disabled:cursor-not-allowed"
                      />
                      {!otpSent && (
                        <Button
                          size="sm"
                          onClick={handleSendOtp}
                          disabled={sendCustomerOtp.isPending || phone.length !== 10}
                        >
                          {sendCustomerOtp.isPending ? 'Sending…' : 'Send OTP'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {otpSent && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-charcoal mb-1">
                          OTP <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                          placeholder="6-digit code from WhatsApp"
                          autoFocus
                          className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20 tracking-widest"
                        />
                      </div>

                      {!hasNameOnFile && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">
                              First name <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder={
                                isExistingCustomer
                                  ? 'Add to fill in profile'
                                  : 'Customer first name'
                              }
                              className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-charcoal mb-1">
                              Last name
                            </label>
                            <input
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="optional"
                              className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                            />
                          </div>
                        </>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleVerifyOtp}
                          disabled={verifyCustomerOtp.isPending || otpCode.length !== 6}
                        >
                          {verifyCustomerOtp.isPending ? 'Verifying…' : 'Verify'}
                        </Button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendCustomerOtp.isPending}
                          className="text-xs text-medium-gray hover:text-charcoal underline flex items-center gap-1"
                        >
                          <RefreshCw size={12} /> Resend
                        </button>
                        <button
                          type="button"
                          onClick={handleResetVerification}
                          className="text-xs text-medium-gray hover:text-charcoal underline ml-auto"
                        >
                          Change number
                        </button>
                      </div>

                      <p className="text-xs text-medium-gray">
                        {isExistingCustomer
                          ? 'Customer has an existing account — order will appear in their history.'
                          : 'New customer — an account will be created. They can log in via OTP later.'}
                      </p>
                    </>
                  )}
                </div>
              )
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-medium-gray">
                  Capture the customer now and verify by OTP later, after payment. No account is
                  created and no stock is held until you confirm the order.
                </p>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Phone <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={draftPhone}
                    onChange={(e) => setDraftPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit Indian mobile"
                    className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Order meta */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Order</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Order date</label>
                <input
                  type="date"
                  value={orderDate}
                  max={todayLocalDate()}
                  min="2020-01-01"
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
                <p className="text-xs text-medium-gray mt-1">
                  {orderDate && orderDate !== todayLocalDate()
                    ? 'Backdated — this sale will be recorded on this date for revenue & reports.'
                    : 'Defaults to today. Backdate a sale that was made earlier.'}
                </p>
              </div>
              {customerMode === 'verify' ? (
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
                  <Select
                    options={statusOptions}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                </div>
              ) : (
                <p className="text-xs text-medium-gray">
                  Saved as a <strong>draft</strong>. You&apos;ll pick the final status when you
                  confirm the order after payment.
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Payment method{customerMode === 'draft' ? ' (tentative)' : ''}
                </label>
                <Select
                  options={paymentOptions as { value: string; label: string }[]}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as '' | OfflinePaymentMethod)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything to remember about this sale…"
                  className="w-full px-3 py-2 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20 min-h-[80px]"
                />
              </div>
              <Badge variant="warning">
                {customerMode === 'draft'
                  ? 'Offline draft (confirm later)'
                  : 'Offline (manual) order'}
              </Badge>
            </div>
          </Card>

          {/* Submit */}
          {customerMode === 'verify' ? (
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={createManualOrder.isPending || items.length === 0 || !verified}
            >
              {createManualOrder.isPending
                ? 'Creating…'
                : !verified
                  ? 'Verify customer to continue'
                  : `Create order · ${formatPrice(total)}`}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleSaveDraft}
              disabled={createDraftOrder.isPending || !draftValid}
            >
              {createDraftOrder.isPending
                ? 'Saving…'
                : items.length === 0
                  ? 'Add at least one item'
                  : !draftValid
                    ? 'Add customer name & phone'
                    : `Save draft · ${formatPrice(total)}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
