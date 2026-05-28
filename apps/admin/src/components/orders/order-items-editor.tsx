'use client';

import { useState } from 'react';
import { Plus, Search, Trash2, Package, AlertCircle } from 'lucide-react';
import { Button, Card } from '@earth-revibe/ui';
import { useInventoryProducts } from '@/hooks/use-inventory';

export type LineItem = {
  lineId: string;
  variantId: string;
  productName: string;
  productImage: string | null;
  variantSize: string;
  variantColor: string;
  stock: number;
  quantity: number;
  unitPrice: number;
  // Fixed offline price for this product's category (null if none). Kept on the
  // line so size changes don't lose it and the UI can flag a manual override.
  offlinePrice: number | null;
  // Sibling variants of the product, so the line item can offer a size selector.
  variants: any[];
};

function formatPrice(amount: number | string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

// Natural apparel size order for the size selectors (S → M → L → XL → XXL),
// with numeric sizes (28/30/32…) after lettered ones and unknowns last.
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
function sizeRank(size?: string | null) {
  let s = (size ?? '').trim().toUpperCase().replace(/\s+/g, '');
  s = s.replace('2XL', 'XXL').replace('3XL', 'XXXL').replace('4XL', 'XXXXL');
  const i = SIZE_ORDER.indexOf(s);
  if (i !== -1) return i;
  const n = parseFloat(s);
  if (!Number.isNaN(n)) return 100 + n;
  return 1000;
}
export function sortVariantsBySize(variants: any[]) {
  return [...variants].sort((a, b) => sizeRank(a?.size) - sizeRank(b?.size));
}

/** Single source of truth for offline-order totals (used for display + submit). */
export function computeOrderTotals(
  items: LineItem[],
  discountAmount: number,
  shippingAmount: number,
  taxAmount: number
) {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = Math.max(subtotal - discountAmount + shippingAmount + taxAmount, 0);
  return { subtotal, total };
}

interface OrderItemsEditorProps {
  items: LineItem[];
  onItemsChange: (items: LineItem[]) => void;
  discountAmount: string;
  shippingAmount: string;
  taxAmount: string;
  onDiscountChange: (value: string) => void;
  onShippingChange: (value: string) => void;
  onTaxChange: (value: string) => void;
  // When false (editing a saved draft) the live stock of pre-filled lines is
  // unknown, so don't cap quantities or show stock counts / over-stock warnings.
  // Stock is re-validated at confirm time regardless.
  enforceStock?: boolean;
}

/**
 * Shared offline-order line editor: product picker + per-line size/qty/price
 * controls + totals. Controlled via `items` / `onItemsChange`. Used by the
 * "new offline order" page and the draft inline-edit on the order detail page.
 */
export function OrderItemsEditor({
  items,
  onItemsChange,
  discountAmount,
  shippingAmount,
  taxAmount,
  onDiscountChange,
  onShippingChange,
  onTaxChange,
  enforceStock = true,
}: OrderItemsEditorProps) {
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Product-grouped picker: one row per product with a size selector, backed
  // by the lean /admin/inventory/products endpoint (no count, small page).
  const { data: pickerData, isLoading: pickerLoading } = useInventoryProducts({
    search: pickerSearch || undefined,
    limit: 10,
  });

  const discountNum = Number(discountAmount) || 0;
  const shippingNum = Number(shippingAmount) || 0;
  const taxNum = Number(taxAmount) || 0;
  const { subtotal, total } = computeOrderTotals(items, discountNum, shippingNum, taxNum);

  const addProductVariant = (product: any, variant: any) => {
    const existing = items.find((i) => i.variantId === variant.id);
    if (existing) {
      onItemsChange(
        items.map((i) => (i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i))
      );
      return;
    }
    // Offline orders default to the category's fixed offline price; fall back
    // to the variant/product (online) price when the category has none.
    const offlinePrice =
      product?.category?.offlinePrice != null ? Number(product.category.offlinePrice) : null;
    const unitPrice = offlinePrice ?? (Number(variant.price) || Number(product?.price) || 0);
    onItemsChange([
      ...items,
      {
        lineId: crypto.randomUUID(),
        variantId: variant.id,
        productName: product?.name ?? '—',
        productImage: product?.images?.[0]?.url ?? null,
        variantSize: variant.size ?? '',
        variantColor: variant.color ?? '',
        stock: variant.stock ?? 0,
        quantity: 1,
        unitPrice,
        offlinePrice,
        variants: sortVariantsBySize(product?.variants ?? []),
      },
    ]);
    // Keep the picker open so the admin can add several sizes/products in a row.
  };

  const updateItem = (lineId: string, patch: Partial<LineItem>) => {
    onItemsChange(items.map((i) => (i.lineId === lineId ? { ...i, ...patch } : i)));
  };

  const removeItem = (lineId: string) => {
    onItemsChange(items.filter((i) => i.lineId !== lineId));
  };

  // Switch the size/variant of an already-added line (the line-item size selector).
  const changeLineSize = (lineId: string, newVariantId: string) => {
    onItemsChange(
      items.map((i) => {
        if (i.lineId !== lineId) return i;
        const v = i.variants.find((x: any) => x.id === newVariantId);
        if (!v) return i;
        return {
          ...i,
          variantId: v.id,
          variantSize: v.size ?? '',
          variantColor: v.color ?? '',
          stock: v.stock ?? 0,
          // Offline price is per-category, so it holds across sizes; only fall
          // back to the variant price when this product has no offline price.
          unitPrice: i.offlinePrice ?? (Number(v.price) || i.unitPrice),
        };
      })
    );
  };

  const pickerProducts: any[] = pickerData?.products ?? [];

  return (
    <>
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
                placeholder="Search products by name…"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 h-9 rounded-lg border border-light-gray bg-white text-sm text-charcoal placeholder:text-medium-gray outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
              />
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-light-gray">
              {pickerLoading && <p className="text-sm text-medium-gray py-3">Searching…</p>}
              {!pickerLoading && pickerProducts.length === 0 && (
                <p className="text-sm text-medium-gray py-3">
                  {pickerSearch ? 'No matching products' : 'Type to search'}
                </p>
              )}
              {pickerProducts.map((product) => {
                const price = Number(product.price) || 0;
                const variants: any[] = sortVariantsBySize(product.variants ?? []);
                return (
                  <div key={product.id} className="flex items-start gap-3 py-3 px-1">
                    {product.images?.[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name ?? ''}
                        className="w-9 h-9 rounded-md object-cover bg-off-white flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-md bg-off-white flex items-center justify-center flex-shrink-0">
                        <Package size={16} className="text-medium-gray" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-charcoal truncate">{product.name}</p>
                        <p className="text-sm text-charcoal flex-shrink-0">{formatPrice(price)}</p>
                      </div>
                      {/* Size selector — one button per variant; pick a size to add it */}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {variants.length === 0 && (
                          <span className="text-xs text-medium-gray">No sizes</span>
                        )}
                        {variants.map((variant) => {
                          const label =
                            [variant.size, variant.color].filter(Boolean).join(' / ') || 'Add';
                          const outOfStock = (variant.stock ?? 0) <= 0;
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => addProductVariant(product, variant)}
                              disabled={outOfStock}
                              title={outOfStock ? 'Out of stock' : `${variant.stock} in stock`}
                              className="px-2 py-1 rounded-md border border-light-gray bg-white text-xs text-charcoal hover:border-deep-earth hover:bg-off-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:line-through"
                            >
                              {label}
                              <span className="ml-1 text-medium-gray">({variant.stock ?? 0})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
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
              const overStock = enforceStock && item.quantity > item.stock;
              return (
                <div
                  key={item.lineId}
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
                    {/* Size selector — change the size/variant of this line */}
                    <div className="mt-1 flex items-center gap-2">
                      {item.variants.length > 1 ? (
                        <select
                          value={item.variantId}
                          onChange={(e) => changeLineSize(item.lineId, e.target.value)}
                          className="h-7 px-2 rounded border border-light-gray bg-white text-xs text-charcoal outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
                        >
                          {item.variants.map((v: any) => (
                            <option key={v.id} value={v.id}>
                              {[v.size, v.color].filter(Boolean).join(' / ') || 'One size'}
                              {enforceStock ? ` · ${v.stock ?? 0} in stock` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-medium-gray">
                          {[item.variantSize, item.variantColor].filter(Boolean).join(' / ') || '—'}
                          {enforceStock ? ` · ${item.stock} in stock` : ''}
                        </span>
                      )}
                    </div>
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
                        max={enforceStock ? item.stock : undefined}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.lineId, {
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
                          updateItem(item.lineId, {
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
                      onClick={() => removeItem(item.lineId)}
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
              onChange={(e) => onDiscountChange(e.target.value)}
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
              onChange={(e) => onShippingChange(e.target.value)}
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
              onChange={(e) => onTaxChange(e.target.value)}
              className="w-32 px-2 py-1 h-8 rounded border border-light-gray bg-white text-sm text-charcoal text-right outline-none focus:border-deep-earth focus:ring-2 focus:ring-deep-earth/20"
            />
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-light-gray text-base font-semibold">
            <span className="text-charcoal">Total</span>
            <span className="text-charcoal">{formatPrice(total)}</span>
          </div>
        </div>
      </Card>
    </>
  );
}
