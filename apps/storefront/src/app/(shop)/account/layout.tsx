'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Spinner } from '@/components/ui/spinner';

const NAV_ITEMS = [
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="font-[family-name:var(--font-inter)] bg-white min-h-screen">
      {/* Top bar: 56px height, back arrow left, centered title, spacer right */}
      <div className="flex items-center h-[56px] px-[28px]">
        <Link href="/" className="flex items-center justify-center w-6 h-6">
          <ArrowLeft size={18} strokeWidth={1.5} color="#000" />
        </Link>
        <span className="flex-1 text-center text-[11px] font-normal tracking-[2px] text-black uppercase">
          MY ACCOUNT
        </span>
        {/* Spacer to balance back arrow */}
        <div className="w-6 h-6" />
      </div>

      {/* Tab navigation: 44px height, horizontal scroll */}
      <div className="h-[44px] px-[28px] overflow-x-auto hide-scrollbar">
        <nav className="flex gap-[24px] h-full">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center shrink-0 h-full text-[12px] tracking-[0.5px] transition-colors border-b-2',
                  isActive
                    ? 'font-normal text-black border-black'
                    : 'font-light text-[#999] border-transparent hover:text-[#666]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Hairline divider */}
      <div className="h-px bg-[#F0F0F0]" />

      {/* Content area */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
