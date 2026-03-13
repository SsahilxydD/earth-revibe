"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Store,
  ShoppingCart,
  Truck,
  CreditCard,
  Users,
  Bell,
  Receipt,
  FileText,
  Shield,
  Globe,
  Palette,
  ChevronLeft,
} from "lucide-react";

const settingsNav = [
  { label: "General", href: "/settings", icon: Store, exact: true },
  { label: "Checkout", href: "/settings/checkout", icon: ShoppingCart },
  { label: "Shipping & delivery", href: "/settings/shipping", icon: Truck },
  { label: "Payments", href: "/settings/payments", icon: CreditCard },
  { label: "Users & permissions", href: "/settings/users", icon: Users },
  { label: "Notifications", href: "/settings/notifications", icon: Bell },
  { label: "Taxes", href: "/settings/taxes", icon: Receipt },
  { label: "Policies", href: "/settings/policies", icon: FileText },
  { label: "Legal", href: "/settings/legal", icon: Shield },
  { label: "Domains & SEO", href: "/settings/domains", icon: Globe },
  { label: "Brand & Theme", href: "/settings/brand", icon: Palette },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-1.5 rounded-lg hover:bg-off-white transition-colors"
        >
          <ChevronLeft size={20} className="text-dark-gray" />
        </Link>
        <h1 className="text-2xl font-semibold text-charcoal">Settings</h1>
      </div>

      {/* Mobile nav (horizontal scroll) */}
      <div className="md:hidden w-full overflow-x-auto pb-2 -mx-1 mb-2">
        <div className="flex gap-1 px-1 min-w-max">
          {settingsNav.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-deep-earth text-white"
                    : "bg-off-white text-dark-gray hover:bg-light-gray"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-56 flex-shrink-0 hidden md:block">
          <div className="space-y-0.5 sticky top-16">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-deep-earth/5 text-deep-earth font-medium"
                      : "text-dark-gray hover:bg-off-white hover:text-charcoal"
                  }`}
                >
                  <Icon size={16} className={active ? "text-deep-earth" : "text-medium-gray"} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
