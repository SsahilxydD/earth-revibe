import { Star, BadgeCheck } from 'lucide-react';
import type { Product } from '@/types';
import { formatDate } from '@/lib/utils';

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < Math.round(value);
        return (
          <Star
            key={i}
            size={size}
            color={filled ? '#121212' : '#D4D4D4'}
            fill={filled ? '#121212' : 'none'}
          />
        );
      })}
    </div>
  );
}

/**
 * Ratings & reviews section for the PDP. Summary (average + count + 1–5 star
 * breakdown) is computed across all approved ratings; the list shows only the
 * written reviews (product.reviews). Renders nothing until a product has ratings.
 */
export function ProductReviews({
  product,
  embedded = false,
}: {
  product: Product;
  embedded?: boolean;
}) {
  const count = product.reviewCount ?? 0;
  const avg = product.averageRating;
  if (!count || avg == null) return null;

  const breakdown = product.ratingBreakdown ?? [];
  const written = product.reviews ?? [];
  // Separators must stay visible: the tab card sits on #F5F5F5, where the
  // standalone #F5F5F5 divider would vanish.
  const rowDivider = embedded ? '#E5E5E5' : '#F5F5F5';

  return (
    <div
      style={
        embedded
          ? { padding: 0 }
          : { padding: '32px 20px 8px 20px', borderTop: '1px solid #F0F0F0' }
      }
    >
      {!embedded && (
        <p style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
          RATINGS &amp; REVIEWS
        </p>
      )}

      {/* Summary: big average + breakdown bars */}
      <div
        style={{ display: 'flex', gap: 24, marginTop: embedded ? 0 : 16, alignItems: 'flex-start' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 40, fontWeight: 500, color: '#000', lineHeight: 1 }}>
            {avg.toFixed(1)}
          </span>
          <Stars value={avg} size={14} />
          <span style={{ fontSize: 11, fontWeight: 300, color: '#999' }}>{count} ratings</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
          {breakdown.map(({ star, count: c }) => {
            const pct = count > 0 ? (c / count) * 100 : 0;
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#666', width: 8 }}>{star}</span>
                <Star size={10} color="#D4D4D4" fill="#D4D4D4" />
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: '#F0F0F0',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: `${pct}%`, height: '100%', background: '#121212' }} />
                </div>
                <span style={{ fontSize: 10, color: '#999', width: 28, textAlign: 'right' }}>
                  {c}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Written reviews */}
      {written.length > 0 && (
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column' }}>
          {written.map((r, i) => {
            const lastInitial = r.user.lastName ? `${r.user.lastName.charAt(0)}.` : '';
            const name = `${r.user.firstName} ${lastInitial}`.trim();
            return (
              <div
                key={r.id}
                style={{
                  padding: '16px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${rowDivider}`,
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Stars value={r.rating} size={12} />
                  <span style={{ fontSize: 10, fontWeight: 300, color: '#BBB' }}>
                    {formatDate(r.createdAt)}
                  </span>
                </div>
                {r.title && (
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#000', marginTop: 8 }}>
                    {r.title}
                  </p>
                )}
                {r.content && (
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 300,
                      color: '#555',
                      lineHeight: 1.6,
                      marginTop: 4,
                    }}
                  >
                    {r.content}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#000' }}>
                    {name || 'Verified buyer'}
                  </span>
                  {r.isVerified && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 9,
                        fontWeight: 400,
                        color: '#16a34a',
                      }}
                    >
                      <BadgeCheck size={11} /> Verified
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
