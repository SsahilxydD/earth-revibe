'use client';

import { useState, useCallback } from 'react';
import { Package } from 'lucide-react';
import { SearchIcon, ProductIcon } from '@shopify/polaris-icons';
import { Button, Card, PageHeader } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import { useProducts, useUpdateProduct } from '@/hooks/use-products';

// Bulk cost-price editor. The catalog list endpoint returns costPrice only in
// adminMode, so it's safe to read here. We set it row-by-row via the existing
// PUT /products/:id (partial update) so there's no new write path to maintain.

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Decimal fields can arrive as number or numeric string — normalise for display
// and math without losing a legitimate 0.
const costToStr = (v: unknown) => (v === null || v === undefined ? '' : String(v));

// A draft is worth saving only when it's a valid, non-negative number AND it
// actually differs from what's stored. Blank is treated as "no change" (the API
// can't null a cost back out anyway), so tabbing through fields never wipes one.
function parseCost(raw: string): { ok: boolean; value: number } {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, value: NaN };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return { ok: false, value: NaN };
  return { ok: true, value: n };
}

export default function CostPricesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useProducts({
    page,
    limit: 100,
    search: search || undefined,
  });
  const updateProduct = useUpdateProduct();

  const products: any[] = data?.products || [];
  const totalPages: number = data?.totalPages || 1;

  const currentVal = (p: any) => (p.id in drafts ? drafts[p.id] : costToStr(p.costPrice));
  const isDirty = (p: any) => {
    if (!(p.id in drafts)) return false;
    const parsed = parseCost(drafts[p.id]);
    return parsed.ok && drafts[p.id].trim() !== costToStr(p.costPrice);
  };
  const isInvalid = (p: any) =>
    p.id in drafts && drafts[p.id].trim() !== '' && !parseCost(drafts[p.id]).ok;

  const dirtyRows = products.filter(isDirty);
  const withCost = products.filter((p) => p.costPrice !== null && p.costPrice !== undefined).length;

  const setDraft = (id: string, val: string) => setDrafts((d) => ({ ...d, [id]: val }));

  const saveRows = useCallback(
    async (rows: any[]) => {
      const targets = rows.filter(isDirty);
      if (!targets.length) return;
      setSavingIds((s) => new Set([...s, ...targets.map((t) => t.id)]));

      const results = await Promise.allSettled(
        targets.map((p) =>
          updateProduct.mutateAsync({
            id: p.id,
            data: { costPrice: parseCost(drafts[p.id]).value },
          })
        )
      );

      const okIds = new Set<string>();
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') okIds.add(targets[i].id);
      });
      const failed = targets.length - okIds.size;

      // Drop saved drafts (the refetch will show the stored value); keep failed
      // ones so the edit isn't lost.
      setDrafts((d) => {
        const next = { ...d };
        okIds.forEach((id) => delete next[id]);
        return next;
      });
      setSavingIds((s) => {
        const next = new Set(s);
        targets.forEach((t) => next.delete(t.id));
        return next;
      });

      if (okIds.size)
        toast.success(`Saved cost for ${okIds.size} product${okIds.size > 1 ? 's' : ''}`);
      if (failed) toast.error(`${failed} failed to save`);
    },
    [drafts, updateProduct]
  );

  const visible = onlyMissing
    ? products.filter((p) => (p.costPrice === null || p.costPrice === undefined) && !isDirty(p))
    : products;

  return (
    <div className="space-y-3">
      <PageHeader
        icon={ProductIcon}
        title="Cost Prices"
        subtitle={
          isLoading ? 'Loading…' : `${withCost} of ${products.length} on this page have a cost set`
        }
        actions={
          <Button
            size="sm"
            onClick={() => saveRows(dirtyRows)}
            isLoading={savingIds.size > 0}
            disabled={!dirtyRows.length || savingIds.size > 0}
          >
            Save all{dirtyRows.length ? ` (${dirtyRows.length})` : ''}
          </Button>
        }
      />

      {/* Filters */}
      <Card padding={false}>
        <div className="flex flex-col sm:flex-row gap-2 p-3 sm:items-center">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 fill-[#8a8a8a] pointer-events-none" />
            <input
              type="text"
              placeholder="Search products"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-white text-[13px] text-[#303030] placeholder:text-[#8a8a8a] outline-none transition-shadow shadow-[inset_0_0_0_1px_#ebebeb] focus:shadow-[inset_0_0_0_1px_#005bd3,0_0_0_2px_rgba(0,91,211,0.2)]"
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-dark-gray select-none px-1 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
              className="h-4 w-4 rounded border-light-gray text-forest-green focus:ring-deep-earth/20 cursor-pointer"
            />
            Only missing cost
          </label>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <p className="text-charcoal font-medium mb-1">Failed to load products</p>
            <p className="text-sm text-medium-gray mb-4">Something went wrong. Please try again.</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : !visible.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">
              {onlyMissing ? 'Every product on this page has a cost price 🎉' : 'No products found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-gray bg-off-white/50">
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Product</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">
                    Selling price
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Cost price</th>
                  <th className="text-left px-6 py-3 font-medium text-medium-gray">Margin</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((product: any) => {
                  const val = currentVal(product);
                  const parsed = parseCost(val);
                  const price = Number(product.price);
                  const margin =
                    parsed.ok && price > 0
                      ? Math.round(((price - parsed.value) / price) * 100)
                      : null;
                  const dirty = isDirty(product);
                  const invalid = isInvalid(product);
                  const saving = savingIds.has(product.id);

                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-light-gray last:border-0 hover:bg-off-white/50 ${
                        dirty ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0].url}
                              alt={product.images[0].altText || product.name}
                              className="w-9 h-9 rounded-md object-cover bg-off-white flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-off-white flex items-center justify-center flex-shrink-0">
                              <Package size={16} className="text-medium-gray" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-charcoal truncate">{product.name}</p>
                            <p className="text-xs text-medium-gray truncate">{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-charcoal whitespace-nowrap">
                        {formatPrice(price)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray text-sm pointer-events-none">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={val}
                            onChange={(e) => setDraft(product.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveRows([product]);
                              }
                            }}
                            placeholder="—"
                            disabled={saving}
                            className={`w-full pl-7 pr-3 py-2 h-9 rounded-lg border bg-white text-sm text-charcoal outline-none focus:ring-2 disabled:opacity-50 ${
                              invalid
                                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-light-gray focus:border-deep-earth focus:ring-deep-earth/20'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {margin === null ? (
                          <span className="text-medium-gray">—</span>
                        ) : (
                          <span
                            className={
                              margin < 0
                                ? 'text-red-600 font-medium'
                                : margin < 20
                                  ? 'text-amber-600 font-medium'
                                  : 'text-forest-green font-medium'
                            }
                          >
                            {margin}%
                          </span>
                        )}
                      </td>
                      <td className="w-20 px-4 py-3 text-right">
                        {dirty && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => saveRows([product])}
                            isLoading={saving}
                            disabled={saving}
                          >
                            Save
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination — catalog can exceed one page of 100. Drafts are kept in
          state across pages; Save all acts on the rows currently shown. */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[13px] text-medium-gray">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
