'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react';
import { homepageFeaturedContentSchema, type HomepageBlockRecord } from '@earth-revibe/shared';
import { Button, Input } from '@earth-revibe/ui';
import { toast } from '@earth-revibe/ui/toast';
import { useUpsertFeatured } from '@/hooks/use-homepage';
import { useProducts } from '@/hooks/use-products';

const MAX_PICKS = 12;

interface AdminProductLite {
  id: string;
  name: string;
  status: string;
  price: string | number;
  images?: { url: string; isPrimary?: boolean }[];
}

function productImage(p: AdminProductLite): string | null {
  return p.images?.find((i) => i.isPrimary)?.url ?? p.images?.[0]?.url ?? null;
}

export function FeaturedProductsEditor({ blocks }: { blocks: HomepageBlockRecord[] }) {
  const featuredBlock = blocks.find((b) => b.type === 'FEATURED_PRODUCTS');
  const savedIds = useMemo(() => {
    if (!featuredBlock) return [] as string[];
    const parsed = homepageFeaturedContentSchema.safeParse(featuredBlock.content);
    return parsed.success ? parsed.data.productIds : [];
  }, [featuredBlock]);

  // The whole catalog is ~50 products — load once, search client-side.
  const { data: productsData, isLoading } = useProducts({ limit: 100 });
  const catalog: AdminProductLite[] = productsData?.products ?? [];
  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);

  const [picks, setPicks] = useState<string[]>(savedIds);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');

  // Track server state until the admin starts editing.
  useEffect(() => {
    if (!dirty) setPicks(savedIds);
  }, [savedIds, dirty]);

  const upsertFeatured = useUpsertFeatured();

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog
      .filter((p) => !picks.includes(p.id))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .slice(0, q ? 20 : 8);
  }, [catalog, picks, search]);

  const move = (i: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? i - 1 : i + 1;
    if (target < 0 || target >= picks.length) return;
    const next = [...picks];
    [next[i], next[target]] = [next[target], next[i]];
    setPicks(next);
    setDirty(true);
  };

  const save = async () => {
    try {
      await upsertFeatured.mutateAsync({ productIds: picks });
      setDirty(false);
      toast.success('Featured pieces saved — live on the storefront');
    } catch {
      toast.error('Failed to save featured pieces');
    }
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-4">
      {picks.length === 0 && (
        <p className="rounded bg-stone-50 px-3 py-2 text-[12px] text-medium-gray">
          No curated picks — the storefront falls back to products flagged “Featured” in the product
          editor.
        </p>
      )}

      {/* Curated list */}
      {picks.length > 0 && (
        <div className="space-y-2">
          {picks.map((id, i) => {
            const product = byId.get(id);
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-lg border border-stone-100 bg-stone-50/60 p-2"
              >
                <span className="w-5 text-center text-[11px] font-semibold text-medium-gray">
                  {i + 1}
                </span>
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-stone-100">
                  {product && productImage(product) && (
                    <Image
                      src={productImage(product)!}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-deep-earth">
                    {product?.name ?? 'Unknown product'}
                  </p>
                  {product && product.status !== 'ACTIVE' && (
                    <p className="text-[11px] text-amber-600">
                      {product.status} — hidden on the storefront until active
                    </p>
                  )}
                  {!product && !isLoading && (
                    <p className="text-[11px] text-red-500">
                      Not found in catalog — will be skipped
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => move(i, 'up')}
                    disabled={i === 0}
                    className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-white disabled:opacity-30 transition-colors"
                    title="Move up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => move(i, 'down')}
                    disabled={i === picks.length - 1}
                    className="flex h-6 w-6 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-white disabled:opacity-30 transition-colors"
                    title="Move down"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setPicks((p) => p.filter((x) => x !== id));
                    setDirty(true);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded border border-stone-200 text-medium-gray hover:bg-stone-50 transition-colors"
                  title="Remove"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add products */}
      <div className="space-y-2 border-t border-stone-100 pt-4">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-medium-gray"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pieces to feature…"
            className="pl-8"
            disabled={picks.length >= MAX_PICKS}
          />
        </div>
        {isLoading ? (
          <p className="py-2 text-[12px] text-medium-gray">Loading catalog…</p>
        ) : (
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  if (picks.length >= MAX_PICKS) {
                    toast.error(`Maximum ${MAX_PICKS} featured pieces`);
                    return;
                  }
                  setPicks((prev) => [...prev, p.id]);
                  setDirty(true);
                }}
                className="flex items-center gap-2.5 rounded-lg border border-stone-100 p-2 text-left hover:border-stone-300 hover:bg-stone-50 transition-colors"
              >
                <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded bg-stone-100">
                  {productImage(p) && (
                    <Image
                      src={productImage(p)!}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-[12px] text-deep-earth">
                  {p.name}
                </span>
                <Plus size={13} className="shrink-0 text-medium-gray" />
              </button>
            ))}
            {results.length === 0 && (
              <p className="py-2 text-[12px] text-medium-gray">No matching pieces.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button size="sm" isLoading={upsertFeatured.isPending} disabled={!dirty} onClick={save}>
          Save featured pieces
        </Button>
      </div>
    </div>
  );
}
