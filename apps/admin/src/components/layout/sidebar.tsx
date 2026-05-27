'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  Tag,
  Users,
  Megaphone,
  Percent,
  FileText,
  BarChart3,
  Headset,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import type { LucideIcon } from 'lucide-react';

type NavLeaf = { kind: 'leaf'; label: string; href: string; icon: LucideIcon };
type NavGroup = {
  kind: 'group';
  label: string;
  icon: LucideIcon;
  href: string;
  children: { label: string; href: string }[];
};
type NavItem = NavLeaf | NavGroup;

const navItems: NavItem[] = [
  { kind: 'leaf', label: 'Home', href: '/dashboard', icon: Home },
  { kind: 'leaf', label: 'Orders', href: '/orders', icon: ShoppingBag },
  {
    kind: 'group',
    label: 'Products',
    icon: Tag,
    href: '/products',
    children: [
      { label: 'Catalog', href: '/products' },
      { label: 'Categories', href: '/categories' },
      { label: 'Inventory', href: '/inventory' },
      { label: 'Reviews', href: '/reviews' },
    ],
  },
  {
    kind: 'group',
    label: 'Customers',
    icon: Users,
    href: '/customers',
    children: [
      { label: 'Customers', href: '/customers' },
      { label: 'Loyalty redemptions', href: '/loyalty-redemptions' },
    ],
  },
  {
    kind: 'group',
    label: 'Marketing',
    icon: Megaphone,
    href: '/funnels',
    children: [
      { label: 'Funnels', href: '/funnels' },
      { label: 'Notifications', href: '/notifications' },
    ],
  },
  { kind: 'leaf', label: 'Discounts', href: '/discounts', icon: Percent },
  {
    kind: 'group',
    label: 'Content',
    icon: FileText,
    href: '/homepage',
    children: [
      { label: 'Homepage', href: '/homepage' },
      { label: 'Blog', href: '/blog' },
      { label: 'Travel applications', href: '/travel-applications' },
    ],
  },
  { kind: 'leaf', label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { kind: 'leaf', label: 'Support', href: '/support-tickets', icon: Headset },
];

function isPathActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function isGroupActive(pathname: string, group: NavGroup) {
  return (
    isPathActive(pathname, group.href) || group.children.some((c) => isPathActive(pathname, c.href))
  );
}

// Polaris item style: 8px radius pill, 28-32px tall, transparent until hover/active.
// Active gets white surface with the multi-layer Polaris shadow.
const itemBase =
  'flex items-center gap-2 mx-1.5 px-2 h-8 rounded-lg text-[13px] font-medium select-none';
const itemActive =
  'bg-white text-[#303030] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.04)]';
const itemIdle = 'text-[#303030] hover:bg-[#ebebeb]';

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen } =
    useUIStore();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isGroupOpen = (g: NavGroup) => openGroups[g.label] ?? isGroupActive(pathname, g);
  const toggleGroup = (label: string) =>
    setOpenGroups((p) => ({ ...p, [label]: !(p[label] ?? false) }));
  const handleNavigate = () => setMobileSidebarOpen(false);

  const renderLeaf = (item: NavLeaf) => {
    const active = isPathActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleNavigate}
        title={isSidebarCollapsed ? item.label : undefined}
        className={`${itemBase} ${active ? itemActive : itemIdle}`}
      >
        <item.icon
          size={16}
          strokeWidth={1.75}
          className={active ? 'text-[#1a1a1a]' : 'text-[#4a4a4a]'}
        />
        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const renderGroup = (item: NavGroup) => {
    const open = isGroupOpen(item);
    const groupActive = isGroupActive(pathname, item);
    const parentSelfActive = isPathActive(pathname, item.href);

    return (
      <div key={item.label}>
        <div
          className={`flex items-center mx-1.5 rounded-lg ${parentSelfActive ? itemActive : 'hover:bg-[#ebebeb]'}`}
        >
          <Link
            href={item.href}
            onClick={handleNavigate}
            title={isSidebarCollapsed ? item.label : undefined}
            className="flex-1 flex items-center gap-2 px-2 h-8 text-[13px] font-medium text-[#303030]"
          >
            <item.icon
              size={16}
              strokeWidth={1.75}
              className={groupActive ? 'text-[#1a1a1a]' : 'text-[#4a4a4a]'}
            />
            {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
          </Link>
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => toggleGroup(item.label)}
              aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
              className="h-6 w-6 mr-1 flex items-center justify-center rounded text-[#616161] hover:text-[#1a1a1a]"
            >
              <ChevronDown
                size={12}
                strokeWidth={2.25}
                className={`[transition:transform_80ms_ease] ${open ? '' : '-rotate-90'}`}
              />
            </button>
          )}
        </div>

        {open && !isSidebarCollapsed && (
          <div className="mt-0.5 mb-0.5 space-y-px">
            {item.children.map((child) => {
              const active = isPathActive(pathname, child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={handleNavigate}
                  className={`flex items-center mx-1.5 pl-8 pr-2 h-7 rounded-lg text-[13px] ${
                    active
                      ? `${itemActive} font-medium`
                      : 'text-[#616161] hover:bg-[#ebebeb] hover:text-[#303030]'
                  }`}
                >
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <>
      <nav className="flex-1 py-2 space-y-px overflow-y-auto">
        {navItems.map((item) => (item.kind === 'leaf' ? renderLeaf(item) : renderGroup(item)))}
      </nav>

      <div className="border-t border-[#ebebeb] py-1">
        {renderLeaf({ kind: 'leaf', label: 'Settings', href: '/settings', icon: Settings })}
      </div>

      <div className="hidden lg:block border-t border-[#ebebeb] p-1.5">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-1.5 h-7 px-2 rounded text-[12px] text-[#616161] hover:text-[#1a1a1a] hover:bg-[#ebebeb]"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!isSidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — sticky under the topbar (top-14 = topbar height). */}
      <aside
        className={`hidden lg:flex flex-col bg-[#f1f1f1] border-r border-[#ebebeb] sticky top-14 self-start [transition:width_100ms_ease] ${
          isSidebarCollapsed ? 'w-[56px]' : 'w-[228px]'
        }`}
        style={{ height: 'calc(100vh - 56px)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-[#f1f1f1] border-r border-[#ebebeb] flex flex-col z-50">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-2 right-2 p-1 text-[#616161] hover:text-[#1a1a1a]"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
