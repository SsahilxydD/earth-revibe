'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const DEFAULT_CODE = 'SCAN500';
// Where we stash the campaign code across the login redirect so the claim
// resumes automatically after the visitor signs in. Read by AuthInitializer.
export const PENDING_PROMO_KEY = 'pendingPromo';

interface ClaimResult {
  alreadyClaimed: boolean;
  pointsAwarded: number;
  newBalance: number;
  expiresAt?: string;
}

type View =
  | { phase: 'loading' }
  | { phase: 'claiming' }
  | { phase: 'done'; result: ClaimResult }
  | { phase: 'error'; message: string };

/**
 * QR landing: /spinner?spin=true (optionally &c=CODE). A scanner lands here,
 * logs in (the real goal — capturing their contact), and is auto-credited the
 * campaign's loyalty points, once per account. Points sit in their wallet for
 * 6 months and are redeemable via /account/loyalty.
 */
export default function SpinnerPage() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [view, setView] = useState<View>({ phase: 'loading' });
  const claimedRef = useRef(false);

  useEffect(() => {
    // Wait until the session check finishes before deciding logged-in vs out.
    if (isLoading) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('c') || DEFAULT_CODE;

    // Logged out → remember the campaign and send them to log in. The
    // AuthInitializer brings them back here once authenticated.
    if (!isAuthenticated) {
      try {
        localStorage.setItem(PENDING_PROMO_KEY, code);
      } catch {
        // localStorage can be unavailable (private mode); claim still works if
        // they return to this URL after logging in.
      }
      router.replace('/auth/login');
      return;
    }

    // Authenticated → claim exactly once.
    if (claimedRef.current) return;
    claimedRef.current = true;
    setView({ phase: 'claiming' });

    api
      .post<ClaimResult>('/promo/claim', { code })
      .then((result) => {
        setView({ phase: 'done', result });
      })
      .catch((e: unknown) => {
        const err = e as { message?: string; details?: { message?: string }[] };
        setView({
          phase: 'error',
          message: err.details?.[0]?.message || err.message || 'Could not claim this offer',
        });
      })
      .finally(() => {
        try {
          localStorage.removeItem(PENDING_PROMO_KEY);
        } catch {
          // ignore
        }
      });
  }, [isLoading, isAuthenticated, router]);

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          border: '1px solid #E5E5E5',
          padding: '40px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          textAlign: 'center',
        }}
      >
        {view.phase === 'loading' || view.phase === 'claiming' ? (
          <>
            <Spinner className="h-6 w-6" />
            <span style={{ fontSize: 12, fontWeight: 300, color: '#777', letterSpacing: 0.5 }}>
              {view.phase === 'claiming' ? 'Adding your points…' : 'Just a moment…'}
            </span>
          </>
        ) : view.phase === 'error' ? (
          <>
            <span style={{ fontSize: 28 }}>✦</span>
            <span style={{ fontSize: 14, fontWeight: 400, color: '#000', lineHeight: 1.5 }}>
              {view.message}
            </span>
            <Link
              href="/products"
              style={{
                width: '100%',
                height: 46,
                backgroundColor: '#000',
                color: '#FFF',
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              SHOP NOW
            </Link>
          </>
        ) : (
          <>
            <span style={{ fontSize: 32 }}>✦</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 300, color: '#777', letterSpacing: 1 }}>
                {view.result.alreadyClaimed ? "YOU'VE ALREADY CLAIMED THIS" : "YOU'VE GOT"}
              </span>
              {!view.result.alreadyClaimed && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
                    fontSize: 40,
                    fontWeight: 400,
                    color: '#000',
                    letterSpacing: -1,
                  }}
                >
                  {view.result.pointsAwarded} POINTS
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 300, color: '#777', lineHeight: 1.5 }}>
                {view.result.alreadyClaimed
                  ? `You have ${Math.round(view.result.newBalance).toLocaleString('en-IN')} points in your wallet.`
                  : 'Added to your wallet · valid for 6 months'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              <Link
                href="/products"
                style={{
                  width: '100%',
                  height: 46,
                  backgroundColor: '#000',
                  color: '#FFF',
                  fontSize: 11,
                  fontWeight: 400,
                  letterSpacing: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                SHOP NOW
              </Link>
              <Link
                href="/account/loyalty"
                style={{
                  width: '100%',
                  height: 46,
                  border: '1px solid #E5E5E5',
                  color: '#000',
                  fontSize: 11,
                  fontWeight: 400,
                  letterSpacing: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                VIEW WALLET
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
