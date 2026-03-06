"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { User, Package, Heart, Star, Gift, MapPin, Headset } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Spinner } from "@/components/ui";

const accountNav = [
  { label: "Profile", href: "/account/profile", icon: User },
  { label: "Orders", href: "/account/orders", icon: Package },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
  { label: "Loyalty Points", href: "/account/loyalty", icon: Star },
  { label: "Referrals", href: "/account/referrals", icon: Gift },
  { label: "Support", href: "/account/support", icon: Headset },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="bg-white min-h-screen">
    <div className="h-16 lg:h-20" aria-hidden="true" />
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-6 pb-24 lg:pb-12">
      <div className="flex flex-col lg:flex-row lg:gap-12">
        {/* Sidebar */}
        <aside className="lg:w-48 flex-shrink-0">
          <p className="hidden lg:block text-[10px] font-[var(--font-cinzel)] tracking-[0.15em] uppercase text-slate-400 mb-4">
            My Account
          </p>
          <nav className="flex lg:flex-col gap-0 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 border-b border-slate-100 lg:border-b-0 mb-6 lg:mb-0">
            {accountNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2.5 lg:px-0 text-[12px] tracking-[0.04em] whitespace-nowrap transition-colors lg:border-l-2 ${
                    isActive
                      ? "text-black lg:border-black lg:pl-3 font-medium"
                      : "text-slate-500 hover:text-black lg:border-transparent lg:hover:pl-3 lg:hover:border-slate-200"
                  }`}
                >
                  <item.icon size={14} className="shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
    </div>
  );
}
