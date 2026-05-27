'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import {
  Menu,
  LogOut,
  ChevronDown,
  Bell,
  Search,
  ShoppingBag,
  Package,
  CreditCard,
  Headset,
  AlertTriangle,
  Store,
  Leaf,
} from 'lucide-react';

import { api } from '@/lib/api-client';
import { useUIStore } from '@/stores/ui-store';
import {
  useNotifications,
  useNotificationCount,
  type AdminNotification,
} from '@/hooks/use-notifications';

const notificationConfig: Record<
  string,
  { icon: typeof ShoppingBag; href: string; iconColor: string; iconBg: string }
> = {
  NEW_ORDER: {
    icon: ShoppingBag,
    href: '/orders',
    iconColor: 'text-[#005bd3]',
    iconBg: 'bg-[#eaf4ff]',
  },
  LOW_STOCK: {
    icon: Package,
    href: '/inventory',
    iconColor: 'text-[#b07700]',
    iconBg: 'bg-[#fff1c3]',
  },
  OUT_OF_STOCK: {
    icon: AlertTriangle,
    href: '/inventory',
    iconColor: 'text-[#d72c0d]',
    iconBg: 'bg-[#fed3d1]',
  },
  FAILED_PAYMENT: {
    icon: CreditCard,
    href: '/orders',
    iconColor: 'text-[#d72c0d]',
    iconBg: 'bg-[#fed3d1]',
  },
  PENDING_SUPPORT: {
    icon: Headset,
    href: '/support-tickets',
    iconColor: 'text-[#5d2afa]',
    iconBg: 'bg-[#ebe4ff]',
  },
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
    api
      .get<{ email: string }>('/auth/me')
      .then((user) => {
        setUserEmail(user.email ?? null);
      })
      .catch(() => {});
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { logout } = useAuthStore();
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const displayName = userEmail?.split('@')[0] ?? 'Admin';
  const initials = displayName.slice(0, 2).toUpperCase();
  const platformShortcut =
    typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#ebebeb] h-14 flex items-center px-3 lg:px-4">
      {/* Brand — fixed width to align with sidebar below */}
      <div className="hidden lg:flex items-center gap-2 w-[228px] flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[#303030] flex items-center justify-center">
          <Leaf size={15} strokeWidth={2.25} className="text-white" />
        </div>
        <span className="text-[14px] font-semibold text-[#1a1a1a] truncate">Earth Revibe</span>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[#f1f1f1] mr-1"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-[#303030]" />
      </button>

      {/* Centered search bar — Polaris-exact: 36px tall, dark gray surface,
          ⌘ K shortcut chip on the right. */}
      <div className="flex-1 flex items-center justify-center px-2 lg:px-6">
        <button
          type="button"
          className="group flex items-center gap-2 w-full max-w-[640px] h-9 px-3 rounded-lg bg-[#f1f1f1] hover:bg-[#ebebeb] text-[13px] text-[#616161] [transition:background-color_100ms_ease]"
        >
          <Search size={15} strokeWidth={1.75} className="text-[#8a8a8a]" />
          <span className="flex-1 text-left">Search</span>
          <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 h-5 rounded bg-white text-[11px] font-medium text-[#616161] shadow-[inset_0_0_0_1px_#ebebeb]">
            {platformShortcut}
          </span>
        </button>
      </div>

      {/* Right cluster: store-view + notifications + store/user dropdown */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#f1f1f1] [transition:background-color_100ms_ease]"
          aria-label="Store view"
        >
          <Store size={16} strokeWidth={1.75} className="text-[#4a4a4a]" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setIsNotificationOpen(!isNotificationOpen);
              setIsDropdownOpen(false);
            }}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#f1f1f1] [transition:background-color_100ms_ease]"
            aria-label="Notifications"
          >
            <Bell size={16} strokeWidth={1.75} className="text-[#4a4a4a]" />
            {count > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] flex items-center justify-center bg-[#d72c0d] text-white text-[9px] font-semibold rounded-full px-1">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)] z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#ebebeb]">
                <h3 className="text-[13px] font-semibold text-[#303030]">Notifications</h3>
                <Link
                  href="/notifications"
                  onClick={() => setIsNotificationOpen(false)}
                  className="text-[12px] font-medium text-[#005bd3] hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notificationsLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="animate-pulse flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#f1f1f1]" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 rounded bg-[#f1f1f1] w-24" />
                          <div className="h-3 rounded bg-[#f1f1f1] w-40" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !notifications?.length ? (
                  <div className="p-8 text-center">
                    <Bell size={20} className="mx-auto text-[#8a8a8a] mb-2" />
                    <p className="text-[13px] text-[#616161]">No notifications</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {notifications.map((notification: AdminNotification, index: number) => {
                      const config = notificationConfig[notification.type];
                      const Icon = config?.icon ?? Bell;
                      const iconColor = config?.iconColor ?? 'text-[#616161]';
                      const iconBg = config?.iconBg ?? 'bg-[#f1f1f1]';
                      const href = config?.href ?? '/notifications';

                      return (
                        <Link
                          key={`${notification.type}-${index}`}
                          href={href}
                          onClick={() => setIsNotificationOpen(false)}
                          className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#f7f7f7]"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
                          >
                            <Icon size={14} className={iconColor} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13px] font-medium text-[#303030]">
                                {notification.title}
                              </p>
                              {notification.priority === 'high' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#d72c0d] flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[12px] text-[#616161] mt-0.5">
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

        {/* Store / user dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              setIsNotificationOpen(false);
            }}
            className="flex items-center gap-2 h-8 px-1.5 rounded-lg hover:bg-[#f1f1f1] [transition:background-color_100ms_ease]"
          >
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#ff8ab8] to-[#c91d6c] flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{initials}</span>
            </div>
            <span className="hidden sm:block text-[13px] font-medium text-[#303030] max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown size={12} className="text-[#616161]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)] py-1 z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-[#ebebeb]">
                <p className="text-[13px] font-medium text-[#303030]">{displayName}</p>
                <p className="text-[12px] text-[#616161] truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#d72c0d] hover:bg-[#f7f7f7]"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
