'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { ChevronLeft, Star, Check, X, ShieldCheck, Trash2, AlertCircle } from 'lucide-react';
import { Button, Badge, Card, Select } from '@earth-revibe/ui';
import { Skeleton } from '@earth-revibe/ui/skeleton';
import { toast } from '@earth-revibe/ui/toast';
import {
  useProductReviews,
  useUpdateReviewApproval,
  useDeleteReview,
  type ReviewRow,
} from '@/hooks/use-reviews';

const statusOptions = [
  { value: 'all', label: 'All reviews' },
  { value: 'pending', label: 'Pending only' },
  { value: 'approved', label: 'Approved only' },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fullName(user: ReviewRow['user']) {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          className={
            n <= rating ? 'text-amber-500 fill-amber-500' : 'text-light-gray fill-light-gray'
          }
        />
      ))}
    </span>
  );
}

export default function ProductReviewsPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const [status, setStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useProductReviews(productId, {
    status,
    page,
    limit: 20,
  });

  const updateApproval = useUpdateReviewApproval();
  const deleteReview = useDeleteReview();

  const handleApprove = async (id: string, currentApproved: boolean) => {
    try {
      await updateApproval.mutateAsync({ id, isApproved: !currentApproved });
      toast.success(currentApproved ? 'Review unapproved' : 'Review approved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update review');
    }
  };

  const handleDelete = async (id: string, author: string) => {
    if (!confirm(`Delete the review by ${author}? This cannot be undone.`)) return;
    try {
      await deleteReview.mutateAsync(id);
      toast.success('Review deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete review');
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/reviews"
        className="inline-flex items-center gap-1 text-sm text-medium-gray hover:text-charcoal"
      >
        <ChevronLeft size={14} />
        All products
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          {data?.product?.name ?? 'Loading…'}
        </h1>
        <p className="text-sm text-medium-gray mt-1">
          Moderate reviews for this product. New reviews start in Pending until you approve them.
        </p>
      </div>

      {/* Stats */}
      {data?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <p className="text-xs uppercase tracking-wide text-medium-gray">Total</p>
            <p className="text-2xl font-semibold text-charcoal mt-1">{data.stats.reviewCount}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-medium-gray">Approved</p>
            <p className="text-2xl font-semibold text-success mt-1">{data.stats.approvedCount}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-medium-gray">Pending</p>
            <p className="text-2xl font-semibold text-amber-600 mt-1">{data.stats.pendingCount}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase tracking-wide text-medium-gray">Avg rating</p>
            <p className="text-2xl font-semibold text-charcoal mt-1 inline-flex items-center gap-1">
              {data.stats.avgRating != null && (
                <Star size={16} className="text-amber-500 fill-amber-500" />
              )}
              {data.stats.avgRating == null ? '—' : data.stats.avgRating.toFixed(1)}
            </p>
          </Card>
        </div>
      )}

      {/* Filter */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <span className="text-sm text-medium-gray">Show:</span>
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'all' | 'approved' | 'pending');
              setPage(1);
            }}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Reviews list */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <AlertCircle size={24} className="text-error mx-auto mb-2" />
            <p className="text-charcoal font-medium mb-1">Failed to load reviews</p>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : !data?.reviews?.length ? (
          <div className="p-12 text-center">
            <p className="text-medium-gray">
              {status === 'pending'
                ? 'No pending reviews.'
                : status === 'approved'
                  ? 'No approved reviews yet.'
                  : 'No reviews for this product yet.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-light-gray">
            {data.reviews.map((review) => (
              <li key={review.id} className="p-6 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <StarRow rating={review.rating} />
                    <span className="font-medium text-charcoal">{fullName(review.user)}</span>
                    <span className="text-xs text-medium-gray">{review.user.email}</span>
                    <span className="text-xs text-medium-gray">·</span>
                    <span className="text-xs text-medium-gray">{formatDate(review.createdAt)}</span>
                    {review.isVerified && (
                      <Badge variant="success">
                        <ShieldCheck size={12} />
                        Verified
                      </Badge>
                    )}
                    <Badge variant={review.isApproved ? 'success' : 'warning'}>
                      {review.isApproved ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={review.isApproved ? 'ghost' : 'primary'}
                      size="sm"
                      onClick={() => handleApprove(review.id, review.isApproved)}
                      disabled={updateApproval.isPending}
                    >
                      {review.isApproved ? (
                        <>
                          <X size={14} />
                          Unapprove
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          Approve
                        </>
                      )}
                    </Button>
                    <button
                      onClick={() => handleDelete(review.id, fullName(review.user))}
                      className="p-1.5 rounded-md hover:bg-error/10 transition-colors"
                      title="Delete review"
                      disabled={deleteReview.isPending}
                    >
                      <Trash2 size={16} className="text-error" />
                    </button>
                  </div>
                </div>
                {review.title && (
                  <p className="text-sm font-medium text-charcoal">{review.title}</p>
                )}
                {review.content && (
                  <p className="text-sm text-dark-gray whitespace-pre-wrap">{review.content}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-light-gray">
            <p className="text-sm text-medium-gray">
              Page {data.page} of {data.totalPages} ({data.total} reviews)
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
      </Card>
    </div>
  );
}
