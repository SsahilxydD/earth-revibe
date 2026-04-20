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

const HOW_IT_WORKS = [
  { icon: ShoppingBag, title: 'Shop', desc: '1 pt per ₹100 spent' },
  { icon: Gift, title: 'Redeem', desc: '1 pt = ₹1 off' },
  { icon: TrendingUp, title: 'Refer', desc: '20% of friend\'s first order' },
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

  if (summaryLoading || historyLoading) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '40vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const balance = summary?.currentBalance ?? 0;
  const totalEarned = summary?.totalEarned ?? 0;
  const totalRedeemed = summary?.totalRedeemed ?? 0;
  const transactions = history?.transactions ?? [];

  return (
    <div
      style={{ padding: '32px 28px 28px 28px', display: 'flex', flexDirection: 'column', gap: 32 }}
    >
      {/* Balance card — black bg, 24px padding */}
      <div
        style={{
          backgroundColor: '#000',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 400, color: '#666', letterSpacing: 1.5 }}>
          AVAILABLE POINTS
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
            fontSize: 40,
            fontWeight: 400,
            color: '#FFF',
            letterSpacing: -1,
          }}
        >
          {(balance ?? 0).toLocaleString('en-IN')}
        </span>
        <div style={{ height: 1, backgroundColor: '#333' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                fontSize: 16,
                fontWeight: 400,
                color: '#FFF',
              }}
            >
              {(totalEarned ?? 0).toLocaleString('en-IN')}
            </span>
            <span style={{ fontSize: 10, fontWeight: 300, color: '#666' }}>Total Earned</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                fontSize: 16,
                fontWeight: 400,
                color: '#FFF',
              }}
            >
              {(totalRedeemed ?? 0).toLocaleString('en-IN')}
            </span>
            <span style={{ fontSize: 10, fontWeight: 300, color: '#666' }}>Redeemed</span>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS label */}
      <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
        HOW IT WORKS
      </span>

      {/* 3-column grid — gap=12, 1px border, 16px padding */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
            <span style={{ fontSize: 11, fontWeight: 400, color: '#000' }}>{item.title}</span>
            <span style={{ fontSize: 10, fontWeight: 300, color: '#999', lineHeight: 1.4 }}>
              {item.desc}
            </span>
          </div>
        ))}
      </div>

      {/* RECENT ACTIVITY label */}
      <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
        RECENT ACTIVITY
      </span>

      {/* Transaction list — 14px padding per row, 1px dividers */}
      {transactions.length === 0 ? (
        <p style={{ fontSize: 12, fontWeight: 300, color: '#999' }}>No transactions yet</p>
      ) : (
        <div>
          {transactions.map((tx, i) => {
            const isPositive =
              tx.type === 'EARNED' || tx.type === 'BONUS' || tx.type === 'ADJUSTED';
            return (
              <div key={tx.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 0',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 400, color: '#000' }}>
                      {tx.description}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 300, color: '#999' }}>
                      {formatDate(tx.createdAt)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                      fontSize: 13,
                      fontWeight: 400,
                      color: isPositive ? '#22C55E' : '#EF4444',
                    }}
                  >
                    {isPositive ? '+' : '-'}
                    {Math.abs(tx.points).toLocaleString('en-IN')}
                  </span>
                </div>
                {i < transactions.length - 1 && (
                  <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
