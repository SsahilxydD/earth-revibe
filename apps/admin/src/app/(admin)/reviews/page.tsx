'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, ChevronRight, ImageOff } from 'lucide-react';
import { SearchIcon, StarIcon } from '@shopify/polaris-icons';
import { Button, Badge, Card, Select, PageHeader } from '@earth-revibe/ui';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import { useReviewProducts } from '@/hooks/use-reviews';

const sortOptions = [
  { value: 'pendingCount-desc', label: 'Most pending' },
  { value: 'reviewCount-desc', label: 'Most reviewed' },
  { value: 'avgRating-desc', label: 'Highest rated' },
  { value: 'avgRating-asc', label: 'Lowest rated' },
  { value: 'name-asc', label: 'Name (A → Z)' },
  { value: 'name-desc', label: 'Name (Z → A)' },
];

function formatRating(rating: number | null) {
  if (rating == null) return '—';
  return rating.toFixed(1);
}

export default function ReviewsProductListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('pendingCount-desc');

  const [sortBy, sortOrder] = sortKey.split('-') as [
    'pendingCount' | 'reviewCount' | 'avgRating' | 'name',
    'asc' | 'desc',
  ];

  const { data, isLoading, isError } = useReviewProducts({
    page,
    limit: 20,
    search: search || undefined,
    sortBy,
    sortOrder,
  });

  return (
    <div className="space-y-3">
      <PageHeader
        icon={StarIcon}
        title="Reviews"
        subtitle="Pick a product to view and moderate its reviews"
      />

      {/* Filters */}
      <Card padding={false}>
        <div className="flex flex-col sm:flex-row gap-2 p-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 fill-[#8a8a8a] pointer-events-none" />
            <input
              type="text"
              placeholder="Search products by name or slug"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-white text-[13px] text-[#303030] placeholder:text-[#8a8a8a] outline-none transition-shadow shadow-[inset_0_0_0_1px_#ebebeb] focus:shadow-[inset_0_0_0_1px_#005bd3,0_0_0_2px_rgba(0,91,211,0.2)]"
            />
          </div>
          <Select
            options={sortOptions}
            value={sortKey}
            onChange={(e) => {
              setSortKey(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Products table */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
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
        ) : !data?.items?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">No products found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-gray bg-off-white/50">
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Product</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Status</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Reviews</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Pending</th>
                    <th className="text-left px-6 py-3 font-medium text-medium-gray">Avg rating</th>
                    <th className="text-right px-6 py-3 font-medium text-medium-gray">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-light-gray last:border-0 hover:bg-off-white/50"
                    >
                      <td className="px-6 py-3">
                        <Link
                          href={`/reviews/${product.id}`}
                          className="flex items-center gap-3 group"
                        >
                          {product.images[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover bg-off-white"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-off-white flex items-center justify-center">
                              <ImageOff size={16} className="text-medium-gray" />
                            </div>
                          )}
                          <span className="font-medium text-charcoal group-hover:text-deep-earth">
                            {product.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <Badge
                          variant={
                            product.status === 'ACTIVE'
                              ? 'success'
                              : product.status === 'ARCHIVED'
                                ? 'error'
                                : 'default'
                          }
                        >
                          {product.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-charcoal">{product.reviewCount}</td>
                      <td className="px-6 py-3">
                        {product.pendingCount > 0 ? (
                          <Badge variant="warning">{product.pendingCount} pending</Badge>
                        ) : (
                          <span className="text-medium-gray">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-charcoal">
                        <span className="inline-flex items-center gap-1">
                          {product.avgRating != null && (
                            <Star size={14} className="text-amber-500 fill-amber-500" />
                          )}
                          {formatRating(product.avgRating)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end">
                          <Link
                            href={`/reviews/${product.id}`}
                            className="inline-flex items-center gap-1 text-sm text-deep-earth hover:underline"
                          >
                            View reviews
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
                <p className="text-sm text-medium-gray">
                  Page {data.page} of {data.totalPages} ({data.total} products)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
