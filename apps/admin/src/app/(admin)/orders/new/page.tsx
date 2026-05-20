'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Search, Trash2, Package, AlertCircle } from 'lucide-react';
import { Button, Badge, Card, Select } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import { useInventory } from '@/hooks/use-inventory';
import { useCreateManualOrder } from '@/hooks/use-orders';
import type { CreateManualOrderInput, OfflinePaymentMethod } from '@/types';

type LineItem = {
  variantId: string;
  productName: string;
  productImage: string | null;
  variantSize: string;
  variantColor: string;
  stock: number;
  quantity: number;
  unitPrice: number;
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

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [shippingAmount, setShippingAmount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');
  const [status, setStatus] = useState('DELIVERED');
  const [paymentMethod, setPaymentMethod] = useState<'' | OfflinePaymentMethod>('CASH');
  const [note, setNote] = useState('');

  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: pickerData, isLoading: pickerLoading } = useInventory({
    search: pickerSearch || undefined,
    limit: 8,
  });

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items]
  );
  const discountNum = Number(discountAmount) || 0;
  const shippingNum = Number(shippingAmount) || 0;
  const taxNum = Number(taxAmount) || 0;
  const total = Math.max(subtotal - discountNum + shippingNum + taxNum, 0);

  const addVariant = (variant: any) => {
    setItems((current) => {
      const existing = current.find((i) => i.variantId === variant.id);
      if (existing) {
        return current.map((i) =>
          i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      const unitPrice = Number(variant.price) || Number(variant.product?.price) || 0;
      return [
        ...current,
        {
          variantId: variant.id,
          productName: variant.product?.name ?? '—',
          productImage: variant.product?.images?.[0]?.url ?? null,
          variantSize: variant.size ?? '',
          variantColor: variant.color ?? '',
          stock: variant.stock ?? 0,
          quantity: 1,
          unitPrice,
        },
      ];
    });
    setPickerOpen(false);
    setPickerSearch('');
  };

  const updateItem = (variantId: string, patch: Partial<LineItem>) => {
    setItems((current) => current.map((i) => (i.variantId === variantId ? { ...i, ...patch } : i)));
  };

  const removeItem = (variantId: string) => {
    setItems((current) => current.filter((i) => i.variantId !== variantId));
  };

  const validate = (): string | null => {
    if (!customerName.trim()) return 'Customer name is required';
    if (!/^[6-9]\d{9}$/.test(customerPhone.trim())) {
      return 'Customer phone must be a 10-digit Indian mobile number';
    }
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
    if (error) {
      toast.error(error);
      return;
    }
    const payload: CreateManualOrderInput = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
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
    };
    try {
      const created = await createManualOrder.mutateAsync(payload);
      toast.success(`Offline order #${created.orderNumber} created`);
      router.push(`/orders/${created.orderNumber}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
    }
  };

  const pickerVariants: any[] = pickerData?.variants ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 rounded-lg hover:bg-off-white transition-colors">
          <ArrowLeft size={20} className="text-dark-gray" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-charcoal">New manual order</h1>
          <p className="text-sm text-medium-gray mt-1">
            Record an offline / in-person sale. Stock will be decremented; no Razorpay payment is
            created.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column: items + totals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-charcoal">Items</h3>
              <Button size="sm" onClick={() => setPickerOpen((v) => !v)}>
                <Plus size={14} /> Add item
              </Button>
            </div>

            {pickerOpen && (
              <div className="mb-4 p-3 border border-light-gray rounded-lg bg-off-white/40">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray"
                  />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search products by name or SKU…"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                  />
                </div>
                <div className="mt-2 max-h-64 overflow-y-auto divide-y divide-light-gray">
                  {pickerLoading && <p className="text-sm text-medium-gray py-3">Searching…</p>}
                  {!pickerLoading && pickerVariants.length === 0 && (
                    <p className="text-sm text-medium-gray py-3">
                      {pickerSearch ? 'No matching variants' : 'Type to search'}
                    </p>
                  )}
                  {pickerVariants.map((variant) => {
                    const label = [variant.size, variant.color].filter(Boolean).join(' / ');
                    const price = Number(variant.price) || Number(variant.product?.price) || 0;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => addVariant(variant)}
                        disabled={(variant.stock ?? 0) <= 0}
                        className="w-full flex items-center gap-3 py-2 px-1 text-left hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {variant.product?.images?.[0]?.url ? (
                          <img
                            src={variant.product.images[0].url}
                            alt={variant.product?.name ?? ''}
                            className="w-9 h-9 rounded-md object-cover bg-off-white flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-off-white flex items-center justify-center flex-shrink-0">
                            <Package size={16} className="text-medium-gray" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-charcoal truncate">
                            {variant.product?.name}
                          </p>
                          <p className="text-xs text-medium-gray">
                            {label || '—'} &middot; SKU {variant.sku || '—'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm text-charcoal">{formatPrice(price)}</p>
                          <p
                            className={`text-xs ${
                              (variant.stock ?? 0) > 0 ? 'text-medium-gray' : 'text-red-600'
                            }`}
                          >
                            {variant.stock ?? 0} in stock
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <p className="text-sm text-medium-gray text-center py-8">
                No items yet. Click <strong>Add item</strong> to pick a product variant.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const overStock = item.quantity > item.stock;
                  return (
                    <div
                      key={item.variantId}
                      className="flex items-start gap-3 py-3 border-b border-light-gray last:border-0"
                    >
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-12 h-12 rounded-md object-cover bg-off-white flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-off-white flex items-center justify-center flex-shrink-0">
                          <Package size={18} className="text-medium-gray" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-charcoal truncate">{item.productName}</p>
                        <p className="text-xs text-medium-gray">
                          {[item.variantSize, item.variantColor].filter(Boolean).join(' / ') || '—'}
                          {' · '}
                          {item.stock} in stock
                        </p>
                        {overStock && (
                          <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                            <AlertCircle size={12} /> Exceeds available stock
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-xs text-medium-gray text-right">
                          <p>Qty</p>
                          <input
                            type="number"
                            min={1}
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.variantId, {
                                quantity: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-16 px-2 py-1 h-8 rounded border border-light-gray bg-white text-sm text-charcoal text-right outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                          />
                        </div>
                        <div className="text-xs text-medium-gray text-right">
                          <p>Unit ₹</p>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(item.variantId, {
                                unitPrice: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-24 px-2 py-1 h-8 rounded border border-light-gray bg-white text-sm text-charcoal text-right outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                          />
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-xs text-medium-gray">Total</p>
                          <p className="text-sm font-medium text-charcoal">
                            {formatPrice(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                          title="Remove"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Totals */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Totals</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-medium-gray">Subtotal</span>
                <span className="text-charcoal font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-medium-gray">Discount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-32 px-2 py-1 h-8 rounded border border-light-gray bg-white text-sm text-charcoal text-right outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-medium-gray">Shipping</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={shippingAmount}
                  onChange={(e) => setShippingAmount(e.target.value)}
                  className="w-32 px-2 py-1 h-8 rounded border border-light-gray bg-white text-sm text-charcoal text-right outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-medium-gray">Tax</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-32 px-2 py-1 h-8 rounded border border-light-gray bg-white text-sm text-charcoal text-right outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-light-gray text-base font-semibold">
                <span className="text-charcoal">Total</span>
                <span className="text-charcoal">{formatPrice(total)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Customer</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Full name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in customer name"
                  className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Phone <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit Indian mobile"
                  className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="optional"
                  className="w-full px-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                />
              </div>
            </div>
          </Card>

          {/* Order meta */}
          <Card>
            <h3 className="text-base font-semibold text-charcoal mb-4">Order</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
                <Select
                  options={statusOptions}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Payment method
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
              <Badge variant="warning">Offline (manual) order</Badge>
            </div>
          </Card>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createManualOrder.isPending || items.length === 0}
          >
            {createManualOrder.isPending ? 'Creating…' : `Create order · ${formatPrice(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
