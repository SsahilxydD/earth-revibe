'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Gift, TrendingUp, Copy, Check } from 'lucide-react';
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

interface ActiveCode {
  id: string;
  code: string;
  value: number;
  type: string;
  expiresAt: string | null;
  createdAt: string;
}

interface ActiveCodesResponse {
  codes: ActiveCode[];
}

const HOW_IT_WORKS = [
  { icon: ShoppingBag, title: 'Earn', desc: '100% cashback on your first order' },
  { icon: Gift, title: 'Redeem', desc: 'Email support to get a single-use code' },
  { icon: TrendingUp, title: 'Refer', desc: '20% cash to your bank + 15% off for them' },
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

  const { data: codesData } = useQuery({
    queryKey: ['loyalty-codes'],
    queryFn: () => api.get<ActiveCodesResponse>('/loyalty/codes'),
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // navigator.clipboard can fail on insecure contexts / iOS private mode.
      // The code text is visible on-screen already so the copy failing is
      // a paper-cut, not a blocker.
    }
  };

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

      {/* Redemption codes — issued when admin approves a redemption request */}
      {codesData?.codes && codesData.codes.length > 0 && (
        <>
          <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
            YOUR REDEMPTION CODES
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {codesData.codes.map((c) => {
              const expiryLabel = c.expiresAt
                ? `Valid until ${formatDate(c.expiresAt)}`
                : 'No expiry';
              const isCopied = copiedId === c.id;
              return (
                <div
                  key={c.id}
                  style={{
                    border: '1px solid #E5E5E5',
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                        fontSize: 15,
                        fontWeight: 500,
                        color: '#000',
                        letterSpacing: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.code}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 300, color: '#666' }}>
                      ₹{c.value.toLocaleString('en-IN')} off · {expiryLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(c.id, c.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      border: '1px solid #000',
                      background: isCopied ? '#000' : '#FFF',
                      color: isCopied ? '#FFF' : '#000',
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: 1,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    {isCopied ? 'COPIED' : 'COPY'}
                  </button>
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: 11, fontWeight: 300, color: '#777', marginTop: -24 }}>
            Paste any code at checkout. Each code works once.
          </span>
        </>
      )}

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

      {/* Fine print */}
      <div
        style={{
          padding: 14,
          border: '1px solid #F0F0F0',
          fontSize: 11,
          lineHeight: 1.6,
          color: '#777',
        }}
      >
        <strong style={{ color: '#000' }}>How redemption works:</strong>{' '}
        Email{' '}
        <a href="mailto:support@earthrevibe.com" style={{ color: '#000' }}>
          support@earthrevibe.com
        </a>{' '}
        with the number of points you&apos;d like to cash out. A manager will review and issue you a single-use discount code by email, usable at checkout with no minimum order value. Points expire 6 months from the date they were earned.
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
