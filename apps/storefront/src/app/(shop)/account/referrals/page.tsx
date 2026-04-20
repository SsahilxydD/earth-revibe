'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { useToast } from '@/providers';

interface ReferralCodeData {
  referralCode: string;
}
interface ReferralStats {
  total: number;
  signedUp: number;
  converted: number;
  totalRewardsEarned: number;
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

  const isLoading = codeLoading || referralsLoading;
  const code = codeData?.referralCode ?? '---';
  const referralLink =
    typeof window !== 'undefined' && code !== '---' ? `${window.location.origin}?ref=${code}` : '';
  const stats = referralsData?.stats ?? {
    total: 0,
    signedUp: 0,
    converted: 0,
    totalRewardsEarned: 0,
  };

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
      `Check out Earth Revibe — use my code ${code} at checkout on your first order for 15% off + 100% cashback in loyalty points. ${referralLink}`
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
          { value: stats.totalRewardsEarned, label: 'Points' },
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
