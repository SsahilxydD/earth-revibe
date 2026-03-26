'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, Share2, Users, UserPlus, Gift } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { useToast } from '@/providers';

interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    invitesSent: number;
    signedUp: number;
    converted: number;
  };
  rewardsEarned: number;
}

export default function ReferralsPage() {
  const { addToast } = useToast();
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: referral, isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => api.get<ReferralData>('/referrals'),
  });

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
      `Hey! Use my referral code ${referral?.referralCode} to get a discount on Earth Revibe! ${referral?.referralLink}`
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

  const code = referral?.referralCode ?? '---';
  const link = referral?.referralLink ?? '';
  const stats = referral?.stats ?? { invitesSent: 0, signedUp: 0, converted: 0 };
  const rewardsEarned = referral?.rewardsEarned ?? 0;

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Referral Code */}
      <div className="rounded-xl border border-[var(--color-border)] p-4 md:p-6">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider">Your Referral Code</h2>
        <p className="mb-4 text-xs text-[var(--color-muted)]">
          Share your code with friends and earn rewards when they make their first purchase.
        </p>

        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-[var(--button-radius)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center text-lg font-bold tracking-[0.2em]">
            {code}
          </div>
          <button
            onClick={() => copyToClipboard(code, 'code')}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--button-radius)] bg-[var(--color-primary)] text-white transition-colors hover:bg-[#2a2a2a]"
            aria-label="Copy referral code"
          >
            {codeCopied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>
      </div>

      {/* Share Buttons */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Share</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-2 rounded-[var(--button-radius)] bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Share2 size={16} />
            WhatsApp
          </button>
          <button
            onClick={() => copyToClipboard(link, 'link')}
            className="flex items-center gap-2 rounded-[var(--button-radius)] border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
          >
            {linkCopied ? (
              <>
                <Check size={16} />
                Link Copied
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider">Your Stats</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[var(--color-border)] p-3 text-center md:p-4">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)]">
              <Share2 size={18} className="text-[var(--color-primary)]" />
            </div>
            <p className="text-2xl font-bold">{stats.invitesSent}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Invites Sent
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)]">
              <UserPlus size={18} className="text-[var(--color-primary)]" />
            </div>
            <p className="text-2xl font-bold">{stats.signedUp}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Signed Up
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)]">
              <Users size={18} className="text-[var(--color-primary)]" />
            </div>
            <p className="text-2xl font-bold">{stats.converted}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Converted
            </p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)]">
              <Gift size={18} className="text-[var(--color-primary)]" />
            </div>
            <p className="text-2xl font-bold">{rewardsEarned}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
              Points Earned
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
