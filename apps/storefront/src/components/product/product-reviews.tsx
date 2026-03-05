"use client";

import { Star } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  content?: string | null;
  isVerified: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

interface ProductReviewsProps {
  reviews: Review[];
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= rating ? "fill-warning text-warning" : "text-light-gray"}
        />
      ))}
    </div>
  );
}

export function ProductReviews({ reviews }: ProductReviewsProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-medium-gray">No reviews yet. Be the first to review this product!</p>
      </div>
    );
  }

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-deep-earth">{avgRating.toFixed(1)}</p>
          <StarRating rating={Math.round(avgRating)} />
          <p className="text-sm text-medium-gray mt-1">{reviews.length} reviews</p>
        </div>
      </div>

      {/* Individual reviews */}
      <div className="space-y-4 divide-y divide-light-gray">
        {reviews.map((review) => (
          <div key={review.id} className="pt-4 first:pt-0">
            <div className="flex items-center gap-2 mb-2">
              <StarRating rating={review.rating} size={14} />
              {review.isVerified && (
                <span className="text-[11px] font-medium text-success bg-success/10 px-2 py-0.5 rounded">Verified</span>
              )}
            </div>
            {review.title && <p className="font-medium text-sm text-deep-earth">{review.title}</p>}
            {review.content && <p className="text-sm text-dark-gray mt-1">{review.content}</p>}
            <p className="text-xs text-medium-gray mt-2">
              {review.user.firstName} {review.user.lastName.charAt(0)}. &middot; {new Date(review.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
