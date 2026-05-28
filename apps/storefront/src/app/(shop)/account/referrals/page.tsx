'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, Share2, ShoppingBag, Wallet, Pencil } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { useToast } from '@/providers';

const HOW_IT_WORKS = [
  { icon: Share2, title: 'Share', desc: 'Send your code to friends via WhatsApp or link' },
  {
    icon: ShoppingBag,
    title: 'They Order',
    desc: 'They get 15% off their first order with your code',
  },
  { icon: Wallet, title: 'You Earn', desc: '20% of their order, paid as cash to your UPI' },
] as const;

interface ReferralCodeData {
  referralCode: string;
  upiId?: string | null;
}
interface ReferralStats {
  total: number;
  signedUp: number;
  converted: number;
  totalRewardsEarned: number;
  pendingPayout: number;
  paidPayout: number;
}
interface ReferralsData {
  referrals: unknown[];
  stats: ReferralStats;
}

export default function ReferralsPage() {
  const { addToast } = useToast();
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: codeData, isLoading: codeLoading } = useQuery({
    queryKey: ['referral-code'],
    queryFn: () => api.get<ReferralCodeData>('/referrals/code'),
  });

  const { data: referralsData, isLoading: referralsLoading } = useQuery({
    queryKey: ['my-referrals'],
    queryFn: () => api.get<ReferralsData>('/referrals/my-referrals'),
  });

  const queryClient = useQueryClient();
  const [upi, setUpi] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    if (codeData?.upiId) setUpi(codeData.upiId);
  }, [codeData?.upiId]);
  const saveUpi = useMutation({
    mutationFn: (upiId: string) => api.put('/referrals/upi', { upiId }),
    onSuccess: () => {
      addToast('UPI saved. Your referral cash will be sent here.', 'success');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['referral-code'] });
    },
    onError: (e: unknown) => {
      // The api client throws a plain { message, details } object (not an Error).
      // For validation failures the useful text is in details[].message (e.g.
      // "Enter a valid UPI ID (e.g. name@bank)"); the top-level message is just
      // "Validation failed", so surface the field detail first.
      const err = e as { message?: string; details?: { message?: string }[] };
      addToast(err.details?.[0]?.message || err.message || 'Failed to save UPI', 'error');
    },
  });

  const isLoading = codeLoading || referralsLoading;
  const code = codeData?.referralCode ?? '---';
  const referralLink =
    typeof window !== 'undefined' && code !== '---' ? `${window.location.origin}?ref=${code}` : '';
  const stats = referralsData?.stats ?? {
    total: 0,
    signedUp: 0,
    converted: 0,
    totalRewardsEarned: 0,
    pendingPayout: 0,
    paidPayout: 0,
  };

  const savedUpi = codeData?.upiId ?? '';
  const showSaved = !!savedUpi && !isEditing;

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 2000);
      } else {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }
      addToast('Copied to clipboard', 'success');
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  const shareWhatsApp = () => {
    const message = encodeURIComponent(
      `Check out Earth Revibe! Use my code ${code} at checkout on your first order for 15% off + 100% cashback in loyalty points. ${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (isLoading) {
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

  return (
    <div
      style={{ padding: '32px 28px 28px 28px', display: 'flex', flexDirection: 'column', gap: 32 }}
    >
      {/* Code section — 12px internal gap, centered */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
          YOUR REFERRAL CODE
        </span>
        {/* Dashed code box — 56px height */}
        <div
          style={{
            width: '100%',
            height: 56,
            border: '1px dashed #E5E5E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
              fontSize: 16,
              fontWeight: 400,
              color: '#000',
              letterSpacing: 2,
            }}
          >
            {code}
          </span>
        </div>
        {/* Copy Code button — 46px, black */}
        <button
          onClick={() => copyToClipboard(code, 'code')}
          style={{
            width: '100%',
            height: 46,
            backgroundColor: '#000',
            color: '#FFF',
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: 2,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {codeCopied ? <Check size={14} /> : <Copy size={14} />}
          {codeCopied ? 'COPIED' : 'COPY CODE'}
        </button>
      </div>

      {/* Share row — 2 buttons, gap=12, 46px height */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={shareWhatsApp}
          style={{
            flex: 1,
            height: 46,
            backgroundColor: '#25D366',
            color: '#FFF',
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: 1.5,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          WHATSAPP
        </button>
        <button
          onClick={() => copyToClipboard(referralLink, 'link')}
          style={{
            flex: 1,
            height: 46,
            border: '1px solid #E5E5E5',
            backgroundColor: 'transparent',
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: 1.5,
            color: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {linkCopied ? 'COPIED' : 'COPY LINK'}
        </button>
      </div>

      {/* HOW IT WORKS label */}
      <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
        HOW IT WORKS
      </span>

      {/* 3-column grid — mirrors the loyalty page's steps */}
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

      {/* UPI for payouts. A saved UPI shows read-only with an edit pencil so it's */}
      {/* obviously stored; editing swaps in the input + save (and a cancel). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#000', letterSpacing: 1.5 }}>
          {showSaved ? 'YOUR UPI' : 'YOUR UPI FOR PAYOUTS'}
        </span>

        {showSaved ? (
          <div
            style={{
              width: '100%',
              height: 46,
              border: '1px solid #E5E5E5',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                fontSize: 14,
                color: '#000',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {savedUpi}
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="Edit UPI"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#000',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                flexShrink: 0,
              }}
            >
              <Pencil size={14} strokeWidth={1.5} />
              EDIT
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={upi}
              onChange={(e) => setUpi(e.target.value.trim())}
              placeholder="name@bank"
              style={{
                width: '100%',
                height: 46,
                border: '1px solid #E5E5E5',
                padding: '0 14px',
                fontSize: 14,
                color: '#000',
                outline: 'none',
                fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => saveUpi.mutate(upi)}
                disabled={saveUpi.isPending || !upi}
                style={{
                  flex: 1,
                  height: 46,
                  backgroundColor: '#000',
                  color: '#FFF',
                  fontSize: 11,
                  fontWeight: 400,
                  letterSpacing: 2,
                  border: 'none',
                  cursor: saveUpi.isPending || !upi ? 'not-allowed' : 'pointer',
                  opacity: saveUpi.isPending || !upi ? 0.5 : 1,
                }}
              >
                {saveUpi.isPending ? 'SAVING…' : 'SAVE UPI'}
              </button>
              {savedUpi && (
                <button
                  type="button"
                  onClick={() => {
                    setUpi(savedUpi);
                    setIsEditing(false);
                  }}
                  style={{
                    flex: 1,
                    height: 46,
                    border: '1px solid #E5E5E5',
                    backgroundColor: 'transparent',
                    color: '#000',
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: 2,
                    cursor: 'pointer',
                  }}
                >
                  CANCEL
                </button>
              )}
            </div>
          </>
        )}

        <span style={{ fontSize: 11, fontWeight: 700, color: '#000', lineHeight: 1.5 }}>
          We send your 20% referral cash here once a friend completes their first order.
          {stats.pendingPayout > 0 ? ` ₹${stats.pendingPayout} pending.` : ''}
        </span>
      </div>

      {/* Why we ask for your UPI — fine print, mirrors loyalty's redemption note */}
      <div
        style={{
          padding: 14,
          border: '1px solid #F0F0F0',
          fontSize: 11,
          lineHeight: 1.6,
          color: '#777',
        }}
      >
        <strong style={{ color: '#000' }}>Why we ask for your UPI:</strong> Referral rewards are
        paid as real cash, not points. We send your 20% straight to your UPI after each
        friend&apos;s first order is confirmed. A UPI ID is just a payment handle, like an email,
        never your bank account number or card details, so it&apos;s safe to share. Add it once and
        your payouts are automatic.
      </div>

      {/* YOUR STATS label */}
      <span style={{ fontSize: 10, fontWeight: 400, color: '#999', letterSpacing: 1.5 }}>
        YOUR STATS
      </span>

      {/* 4-column stats grid — gap=10, #F5F5F5 fill, 16px padding */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
        {[
          { value: stats.total, label: 'Referred' },
          { value: stats.signedUp, label: 'Signed Up' },
          { value: stats.converted, label: 'Converted' },
          { value: `₹${stats.totalRewardsEarned}`, label: 'Earned' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              backgroundColor: '#F5F5F5',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                fontSize: 20,
                fontWeight: 400,
                color: '#000',
              }}
            >
              {s.value}
            </span>
            <span style={{ fontSize: 9, fontWeight: 300, color: '#999', letterSpacing: 0.5 }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
