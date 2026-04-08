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
      `Hey! Use my referral code ${code} to get a discount on Earth Revibe! ${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Referral Code Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-inter)',
            fontSize: 10,
            fontWeight: 400,
            color: '#999',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            margin: 0,
            textAlign: 'center',
          }}
        >
          YOUR REFERRAL CODE
        </p>

        {/* Code Box */}
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
              fontFamily: 'var(--font-geist-mono)',
              fontSize: 16,
              fontWeight: 400,
              color: '#000',
              letterSpacing: '2px',
            }}
          >
            {code}
          </span>
        </div>

        {/* Copy Code Button */}
        <button
          onClick={() => copyToClipboard(code, 'code')}
          style={{
            width: '100%',
            height: 46,
            backgroundColor: '#000',
            color: '#FFF',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: 'var(--font-inter)',
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: '2px',
          }}
        >
          {codeCopied ? <Check size={14} /> : <Copy size={14} />}
          {codeCopied ? 'COPIED' : 'COPY CODE'}
        </button>

        {/* Share Row */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button
            onClick={shareWhatsApp}
            style={{
              flex: 1,
              height: 46,
              backgroundColor: '#25D366',
              color: '#FFF',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: '1.5px',
            }}
          >
            WHATSAPP
          </button>
          <button
            onClick={() => copyToClipboard(referralLink, 'link')}
            style={{
              flex: 1,
              height: 46,
              backgroundColor: 'transparent',
              color: '#000',
              border: '1px solid #E5E5E5',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter)',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: '1.5px',
            }}
          >
            {linkCopied ? 'COPIED' : 'COPY LINK'}
          </button>
        </div>
      </div>

      {/* Stats Section */}
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
          YOUR STATS
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          {[
            { value: stats.total, label: 'Referrals' },
            { value: stats.signedUp, label: 'Signed Up' },
            { value: stats.converted, label: 'Converted' },
            { value: stats.totalRewardsEarned, label: 'Points Earned' },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: '#F5F5F5',
                padding: 16,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 20,
                  fontWeight: 400,
                  color: '#000',
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-inter)',
                  fontSize: 9,
                  fontWeight: 300,
                  color: '#999',
                  letterSpacing: '0.5px',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
