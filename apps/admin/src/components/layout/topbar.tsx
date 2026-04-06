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
  ShoppingCart,
  Package,
  CreditCard,
  Headset,
  AlertTriangle,
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
  { icon: typeof ShoppingCart; href: string; iconColor: string; iconBg: string }
> = {
  NEW_ORDER: { icon: ShoppingCart, href: '/orders', iconColor: 'text-info', iconBg: 'bg-info-bg' },
  LOW_STOCK: {
    icon: Package,
    href: '/inventory',
    iconColor: 'text-warning',
    iconBg: 'bg-warning-bg',
  },
  OUT_OF_STOCK: {
    icon: AlertTriangle,
    href: '/inventory',
    iconColor: 'text-error',
    iconBg: 'bg-error-bg',
  },
  FAILED_PAYMENT: {
    icon: CreditCard,
    href: '/orders',
    iconColor: 'text-error',
    iconBg: 'bg-error-bg',
  },
  PENDING_SUPPORT: {
    icon: Headset,
    href: '/support-tickets',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
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

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-border h-14 flex items-center px-4 lg:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden p-2 -ml-2 hover:bg-surface-hover transition-colors mr-2"
      >
        <Menu size={20} className="text-text-secondary" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search icon */}
      <button className="p-2 hover:bg-surface-hover transition-colors mr-1">
        <Search size={18} className="text-text-secondary" />
      </button>

      {/* Notification bell */}
      <div className="relative mr-1" ref={notificationRef}>
        <button
          onClick={() => {
            setIsNotificationOpen(!isNotificationOpen);
            setIsDropdownOpen(false);
          }}
          className="relative p-2 hover:bg-surface-hover transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} className="text-text-secondary" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-error text-white text-[9px] font-bold px-1">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>

        {isNotificationOpen && (
          <div className="absolute right-0 mt-1 w-80 bg-surface border border-border shadow-lg z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-heading text-sm font-semibold text-text-primary">
                Notifications
              </h3>
              <Link
                href="/notifications"
                onClick={() => setIsNotificationOpen(false)}
                className="text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                View all
              </Link>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notificationsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse flex items-start gap-3">
                      <div className="w-9 h-9 bg-surface-tint" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-surface-tint w-24" />
                        <div className="h-3 bg-surface-tint w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !notifications?.length ? (
                <div className="p-8 text-center">
                  <Bell size={24} className="mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-muted">No notifications</p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((notification: AdminNotification, index: number) => {
                    const config = notificationConfig[notification.type];
                    const Icon = config?.icon ?? Bell;
                    const iconColor = config?.iconColor ?? 'text-text-secondary';
                    const iconBg = config?.iconBg ?? 'bg-surface-tint';
                    const href = config?.href ?? '/notifications';

                    return (
                      <Link
                        key={`${notification.type}-${index}`}
                        href={href}
                        onClick={() => setIsNotificationOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-surface-hover transition-colors"
                      >
                        <div
                          className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${iconBg}`}
                        >
                          <Icon size={16} className={iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text-primary">
                              {notification.title}
                            </p>
                            {notification.priority === 'high' && (
                              <span className="w-1.5 h-1.5 bg-error flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">{notification.message}</p>
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
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-hover transition-colors"
        >
          <div className="w-8 h-8 bg-primary flex items-center justify-center">
            <span className="text-xs font-semibold text-text-on-dark">{initials}</span>
          </div>
          <span className="hidden sm:block font-heading text-sm font-medium text-text-primary">
            {displayName}
          </span>
          <ChevronDown size={14} className="text-text-muted" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-surface border border-border shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b border-border">
              <p className="font-heading text-sm font-medium text-text-primary">{displayName}</p>
              <p className="text-xs text-text-muted">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-surface-hover transition-colors"
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
