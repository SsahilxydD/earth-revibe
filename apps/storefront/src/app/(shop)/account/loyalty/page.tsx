'use client';

import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Gift, TrendingUp } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';

interface LoyaltySummary {
  currentBalance: number;
  totalEarned: number;
  totalRedeemed: number;
  pointValue: number;
}

interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string;
  createdAt: string;
}

interface LoyaltyHistory {
  transactions: LoyaltyTransaction[];
  total: number;
}

const TYPE_STYLES: Record<string, { color: string; prefix: string }> = {
  EARNED: { color: '#22C55E', prefix: '+' },
  BONUS: { color: '#22C55E', prefix: '+' },
  REDEEMED: { color: '#EF4444', prefix: '-' },
  EXPIRED: { color: '#EF4444', prefix: '-' },
  ADJUSTED: { color: '#3B82F6', prefix: '' },
};

const HOW_IT_WORKS = [
  {
    icon: ShoppingBag,
    title: 'Shop & Earn',
    description: 'Earn 1 point for every Rs.10 spent on eligible purchases.',
  },
  {
    icon: Gift,
    title: 'Redeem Rewards',
    description: 'Use your points at checkout. 100 points = Rs.10 discount.',
  },
  {
    icon: TrendingUp,
    title: 'Level Up',
    description: 'Higher tiers unlock bonus multipliers and exclusive perks.',
  },
] as const;

export default function LoyaltyPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['loyalty-summary'],
    queryFn: () => api.get<LoyaltySummary>('/loyalty/summary'),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['loyalty-history'],
    queryFn: () => api.get<LoyaltyHistory>('/loyalty/history'),
  });

  const isLoading = summaryLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const balance = summary?.currentBalance ?? 0;
  const transactions = history?.transactions ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Balance Card */}
      <div
        style={{
          backgroundColor: '#000',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            fontWeight: 400,
            color: '#666',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          AVAILABLE POINTS
        </p>
        <p
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: 40,
            fontWeight: 400,
            color: '#FFF',
            letterSpacing: '-1px',
            margin: 0,
            lineHeight: 1,
          }}
        >
          {balance.toLocaleString('en-IN')}
        </p>
        <div style={{ height: 1, backgroundColor: '#333' }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 10,
                fontWeight: 300,
                color: '#666',
                margin: 0,
                marginBottom: 4,
              }}
            >
              Total Earned
            </p>
            <p
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 16,
                fontWeight: 400,
                color: '#FFF',
                margin: 0,
              }}
            >
              {(summary?.totalEarned ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                fontFamily: 'var(--font-inter)',
                fontSize: 10,
                fontWeight: 300,
                color: '#666',
                margin: 0,
                marginBottom: 4,
              }}
            >
              Redeemed
            </p>
            <p
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 16,
                fontWeight: 400,
                color: '#FFF',
                margin: 0,
              }}
            >
              {(summary?.totalRedeemed ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div>
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            fontWeight: 400,
            color: '#999',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: 16,
          }}
        >
          HOW IT WORKS
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {HOW_IT_WORKS.map((item) => (
            <div
              key={item.title}
              style={{
                border: '1px solid #F0F0F0',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <item.icon size={18} color="#000" strokeWidth={1.5} />
              <p
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 11,
                  fontWeight: 400,
                  color: '#000',
                  margin: 0,
                }}
              >
                {item.title}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 10,
                  fontWeight: 300,
                  color: '#999',
                  lineHeight: 1.4,
                  margin: 0,
                  width: '100%',
                }}
              >
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            fontWeight: 400,
            color: '#999',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            margin: 0,
            marginBottom: 16,
          }}
        >
          RECENT ACTIVITY
        </p>
        {transactions.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 13,
              fontWeight: 300,
              color: '#999',
            }}
          >
            No transactions yet. Start shopping to earn points.
          </p>
        ) : (
          <div>
            {transactions.map((tx, index) => {
              const style = TYPE_STYLES[tx.type] || TYPE_STYLES.EARNED;
              const isPositive = style.prefix === '+';
              return (
                <div key={tx.id}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 14,
                      paddingBottom: 14,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: 12,
                          fontWeight: 400,
                          color: '#000',
                          margin: 0,
                          marginBottom: 2,
                        }}
                      >
                        {tx.description}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-inter)',
                          fontSize: 10,
                          fontWeight: 300,
                          color: '#999',
                          margin: 0,
                        }}
                      >
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <p
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: 13,
                        fontWeight: 400,
                        color: isPositive ? '#22C55E' : '#EF4444',
                        margin: 0,
                        flexShrink: 0,
                        marginLeft: 16,
                      }}
                    >
                      {style.prefix}
                      {Math.abs(tx.points).toLocaleString('en-IN')}
                    </p>
                  </div>
                  {index < transactions.length - 1 && (
                    <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
