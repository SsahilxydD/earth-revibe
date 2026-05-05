'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Send,
  MessageSquare,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

// V1 nav: only the screens that ship in the scaffold + placeholders for the
// pages that move/get built in subsequent commits. Disabled entries render
// dimmed and don't link anywhere yet.
type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Abandoned Carts', href: '/abandoned-carts', icon: ShoppingBag, disabled: true },
  { label: 'Broadcasts', href: '/broadcasts', icon: Send, disabled: true },
  { label: 'Inbox', href: '/inbox', icon: MessageSquare, disabled: true },
  { label: 'Templates', href: '/templates', icon: Sparkles, disabled: true },
  { label: 'Settings', href: '/settings', icon: Settings, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen } =
    useUIStore();

  const isActive = (href: string) => pathname.startsWith(href);

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 h-16">
        <div className="w-7 h-7 bg-accent flex-shrink-0" />
        {!isSidebarCollapsed && (
          <div className="flex flex-col">
            <span className="font-heading text-base font-semibold text-text-primary whitespace-nowrap leading-tight">
              Earth Revibe
            </span>
            <span className="text-[10px] uppercase tracking-wide text-text-muted">CRM</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-6 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const baseClasses = `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors`;
          const stateClasses = item.disabled
            ? 'text-text-muted opacity-60 cursor-not-allowed'
            : active
              ? 'text-text-primary font-medium'
              : 'text-text-secondary hover:text-text-primary';

          const inner = (
            <>
              <div
                className={`w-1.5 h-1.5 flex-shrink-0 ${active && !item.disabled ? 'bg-accent' : 'bg-transparent'}`}
              />
              {!isSidebarCollapsed && (
                <span className="font-heading flex-1">
                  {item.label}
                  {item.disabled && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-text-muted">
                      soon
                    </span>
                  )}
                </span>
              )}
              {isSidebarCollapsed && <item.icon size={18} className="flex-shrink-0" />}
            </>
          );

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className={`${baseClasses} ${stateClasses}`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                {inner}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={`${baseClasses} ${stateClasses}`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="hidden lg:block border-t border-border p-3">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
        >
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isSidebarCollapsed && <span className="font-heading">Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col bg-surface border-r border-border h-screen sticky top-0 transition-all duration-200 ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-surface border-r border-border flex flex-col z-50">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
            >
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
