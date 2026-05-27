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
  FolderTree,
  Warehouse,
  Star,
  Coins,
  GitBranchPlus,
  Bell,
  LayoutTemplate,
  Plane,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import type { LucideIcon } from 'lucide-react';

type NavLeaf = {
  kind: 'leaf';
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  kind: 'group';
  label: string;
  icon: LucideIcon;
  href: string; // parent click target (defaults to first child's route)
  children: { label: string; href: string; icon: LucideIcon }[];
};

type NavItem = NavLeaf | NavGroup;

// Shopify admin sidebar order: Home, Orders, Products, Customers, Marketing,
// Discounts, Content, Analytics. Settings pinned bottom. We slot our extras
// (Reviews, Loyalty, Funnels, Notifications, Travel) inside the matching
// groups so the top-level stays compact.
const navItems: NavItem[] = [
  { kind: 'leaf', label: 'Home', href: '/dashboard', icon: Home },
  { kind: 'leaf', label: 'Orders', href: '/orders', icon: ShoppingBag },
  {
    kind: 'group',
    label: 'Products',
    icon: Tag,
    href: '/products',
    children: [
      { label: 'Products', href: '/products', icon: Tag },
      { label: 'Categories', href: '/categories', icon: FolderTree },
      { label: 'Inventory', href: '/inventory', icon: Warehouse },
      { label: 'Reviews', href: '/reviews', icon: Star },
    ],
  },
  {
    kind: 'group',
    label: 'Customers',
    icon: Users,
    href: '/customers',
    children: [
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Loyalty redemptions', href: '/loyalty-redemptions', icon: Coins },
    ],
  },
  {
    kind: 'group',
    label: 'Marketing',
    icon: Megaphone,
    href: '/funnels',
    children: [
      { label: 'Funnels', href: '/funnels', icon: GitBranchPlus },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  { kind: 'leaf', label: 'Discounts', href: '/discounts', icon: Percent },
  {
    kind: 'group',
    label: 'Content',
    icon: FileText,
    href: '/homepage',
    children: [
      { label: 'Homepage', href: '/homepage', icon: LayoutTemplate },
      { label: 'Blog', href: '/blog', icon: FileText },
      { label: 'Travel applications', href: '/travel-applications', icon: Plane },
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

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen } =
    useUIStore();

  // Track explicitly-opened groups. A group also opens automatically when the
  // current route lives inside it — so the user always sees their location's
  // siblings without manual toggling.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isGroupOpen = (group: NavGroup) =>
    openGroups[group.label] ?? isGroupActive(pathname, group);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !(prev[label] ?? false) }));

  const handleNavigate = () => setMobileSidebarOpen(false);

  const renderLeaf = (item: NavLeaf) => {
    const active = isPathActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleNavigate}
        title={isSidebarCollapsed ? item.label : undefined}
        className={`group flex items-center gap-3 mx-2 px-2 py-1.5 rounded-lg text-[13px] transition-colors ${
          active
            ? 'bg-white text-[#303030] font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'
            : 'text-[#303030] hover:bg-[#ebebeb]'
        }`}
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
        {/* Parent row: click on icon/label navigates to the group's href,
            click on chevron toggles open/close. Mirrors Shopify's pattern. */}
        <div
          className={`group flex items-center mx-2 rounded-lg ${
            parentSelfActive
              ? 'bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'
              : 'hover:bg-[#ebebeb]'
          }`}
        >
          <Link
            href={item.href}
            onClick={handleNavigate}
            title={isSidebarCollapsed ? item.label : undefined}
            className={`flex-1 flex items-center gap-3 px-2 py-1.5 text-[13px] ${
              groupActive ? 'text-[#303030] font-semibold' : 'text-[#303030]'
            }`}
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
              className="p-1.5 mr-1 rounded text-[#616161] hover:text-[#1a1a1a]"
            >
              <ChevronDown
                size={14}
                strokeWidth={2}
                className={`transition-transform ${open ? '' : '-rotate-90'}`}
              />
            </button>
          )}
        </div>

        {/* Sub-items */}
        {open && !isSidebarCollapsed && (
          <div className="mt-0.5 mb-1 space-y-0.5">
            {item.children.map((child) => {
              const childActive = isPathActive(pathname, child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={handleNavigate}
                  className={`flex items-center gap-3 mx-2 pl-8 pr-2 py-1.5 rounded-lg text-[13px] transition-colors ${
                    childActive
                      ? 'bg-white text-[#303030] font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04)]'
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
      {/* Brand */}
      <div className="flex items-center gap-2 h-14 px-4 border-b border-[#ebebeb]">
        <div className="w-6 h-6 rounded-md bg-[#303030] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[11px] font-bold tracking-tight">ER</span>
        </div>
        {!isSidebarCollapsed && (
          <span className="text-[13px] font-semibold text-[#1a1a1a] whitespace-nowrap">
            Earth Revibe
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (item.kind === 'leaf' ? renderLeaf(item) : renderGroup(item)))}
      </nav>

      {/* Settings — pinned bottom, matches Shopify */}
      <div className="border-t border-[#ebebeb] py-2">
        {renderLeaf({ kind: 'leaf', label: 'Settings', href: '/settings', icon: Settings })}
      </div>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:block border-t border-[#ebebeb] p-2">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded text-[#616161] hover:text-[#1a1a1a] hover:bg-[#ebebeb] text-[12px]"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          {!isSidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#f1f1f1] border-r border-[#ebebeb] h-screen sticky top-0 transition-all duration-150 ${
          isSidebarCollapsed ? 'w-[56px]' : 'w-[240px]'
        }`}
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
              className="absolute top-3 right-3 text-[#616161] hover:text-[#1a1a1a]"
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
