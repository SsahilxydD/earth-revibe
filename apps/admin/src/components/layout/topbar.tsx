"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  LogOut,
  ChevronDown,
  Bell,
  ShoppingCart,
  Package,
  CreditCard,
  Headset,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";
import {
  useNotifications,
  useNotificationCount,
  type AdminNotification,
} from "@/hooks/use-notifications";

const notificationConfig: Record<
  string,
  { icon: typeof ShoppingCart; href: string; color: string }
> = {
  NEW_ORDER: { icon: ShoppingCart, href: "/orders", color: "text-blue-600 bg-blue-50" },
  LOW_STOCK: { icon: Package, href: "/inventory", color: "text-amber-600 bg-amber-50" },
  OUT_OF_STOCK: { icon: AlertTriangle, href: "/inventory", color: "text-red-600 bg-red-50" },
  FAILED_PAYMENT: { icon: CreditCard, href: "/orders", color: "text-red-600 bg-red-50" },
  PENDING_SUPPORT: { icon: Headset, href: "/support-tickets", color: "text-purple-600 bg-purple-50" },
};

export function Topbar() {
  const router = useRouter();
  const { setMobileSidebarOpen } = useUIStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { data: notificationCount } = useNotificationCount();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications();

  const count = notificationCount?.count ?? 0;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const displayName = userEmail?.split("@")[0] ?? "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-light-gray h-16 flex items-center px-4 lg:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden p-2 -ml-2 rounded-md hover:bg-off-white transition-colors mr-2"
      >
        <Menu size={20} className="text-dark-gray" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification bell */}
      <div className="relative mr-2" ref={notificationRef}>
        <button
          onClick={() => {
            setIsNotificationOpen(!isNotificationOpen);
            setIsDropdownOpen(false);
          }}
          className="relative p-2 rounded-lg hover:bg-off-white transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} className="text-dark-gray" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>

        {isNotificationOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-light-gray shadow-lg z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-light-gray">
              <h3 className="text-sm font-semibold text-charcoal">Notifications</h3>
              <Link
                href="/notifications"
                onClick={() => setIsNotificationOpen(false)}
                className="text-xs font-medium text-deep-earth hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notificationsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-100 rounded w-24" />
                        <div className="h-3 bg-gray-100 rounded w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !notifications?.length ? (
                <div className="p-8 text-center">
                  <Bell size={24} className="mx-auto text-medium-gray mb-2" />
                  <p className="text-sm text-medium-gray">No notifications</p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((notification: AdminNotification, index: number) => {
                    const config = notificationConfig[notification.type];
                    const Icon = config?.icon ?? Bell;
                    const colorClass = config?.color ?? "text-gray-600 bg-gray-50";
                    const href = config?.href ?? "/notifications";
                    const [iconColor, iconBg] = colorClass.split(" ");

                    return (
                      <Link
                        key={`${notification.type}-${index}`}
                        href={href}
                        onClick={() => setIsNotificationOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-off-white transition-colors"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
                        >
                          <Icon size={18} className={iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-charcoal">
                              {notification.title}
                            </p>
                            {notification.priority === "high" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-medium-gray mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            setIsNotificationOpen(false);
          }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-off-white transition-colors"
        >
          <div className="w-8 h-8 bg-deep-earth rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-white">{initials}</span>
          </div>
          <span className="hidden sm:block text-sm font-medium text-charcoal">
            {displayName}
          </span>
          <ChevronDown size={16} className="text-medium-gray" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-light-gray shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b border-light-gray">
              <p className="text-sm font-medium text-charcoal">{displayName}</p>
              <p className="text-xs text-medium-gray">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-off-white transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
