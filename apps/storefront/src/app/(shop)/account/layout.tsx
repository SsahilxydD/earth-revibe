'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Spinner } from '@/components/ui/spinner';

const TABS = [
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/loyalty', label: 'Loyalty' },
  { href: '/account/referrals', label: 'Referrals' },
  { href: '/account/support', label: 'Support' },
] as const;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div
      className="min-h-screen bg-white font-[family-name:var(--font-inter)]"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* Top bar — 56px, px-28 */}
      <div
        style={{
          height: 56,
          paddingLeft: 28,
          paddingRight: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          style={{
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={20} strokeWidth={1.5} color="#000" />
        </Link>
        <span
          style={{
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: 2,
            color: '#000',
          }}
        >
          MY ACCOUNT
        </span>
        <div style={{ width: 20, height: 20 }} />
      </div>

      {/* Tab nav — 44px, px-28, gap-24 */}
      <div
        className="hide-scrollbar"
        style={{
          height: 44,
          paddingLeft: 28,
          paddingRight: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                height: 44,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                flexShrink: 0,
                position: 'relative',
                fontSize: 12,
                fontWeight: isActive ? 400 : 300,
                letterSpacing: 0.5,
                color: isActive ? '#000' : '#999',
                textDecoration: 'none',
              }}
            >
              {tab.label}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: '#000',
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Hairline divider */}
      <div style={{ height: 1, backgroundColor: '#F0F0F0' }} />

      {/* Content */}
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
