"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Package,
  MapPin,
  Heart,
  Star,
  Gift,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { Spinner } from "@/components/ui/spinner";

const NAV_ITEMS = [
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/loyalty", label: "Loyalty Points", icon: Star },
  { href: "/account/referrals", label: "Referrals", icon: Gift },
  { href: "/account/support", label: "Support", icon: HelpCircle },
] as const;

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated, checkAuth, logout } =
    useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/auth/login");
  };

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
    <div className="px-4 py-6 md:px-8 lg:px-12 xl:px-20 md:py-12">
      <h1 className="mb-5 text-lg font-bold uppercase tracking-wider md:mb-8 md:text-2xl">
        My Account
      </h1>

      {/* Mobile tabs — compact icon + short label, horizontal scroll */}
      <div className="mb-8 flex gap-0 overflow-x-auto border-b border-[var(--color-border)] pb-px md:hidden hide-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 flex-col items-center gap-0.5 border-b-2 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                isActive
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="flex gap-8 md:gap-12">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--button-radius)] px-4 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 border-t border-[var(--color-border)] pt-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-[var(--button-radius)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-sale)]"
            >
              <LogOut size={18} />
              Log Out
            </button>
          </div>
        </aside>

        {/* Main content — pt-2 on mobile gives breathing room after tabs */}
        <main className="min-w-0 flex-1 pt-2 md:pt-0">{children}</main>
      </div>
    </div>
  );
}
