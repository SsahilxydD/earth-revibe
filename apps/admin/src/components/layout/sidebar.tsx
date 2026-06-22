'use client';

import { useState, type ComponentType, type SVGProps } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  OrderIcon,
  ReturnIcon,
  ProductIcon,
  PersonIcon,
  MegaphoneIcon,
  DiscountIcon,
  ContentIcon,
  ChartLineIcon,
  GlobeIcon,
  ChatIcon,
  SettingsIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from '@shopify/polaris-icons';
import { useUIStore } from '@/stores/ui-store';

type PolarisIcon = ComponentType<SVGProps<SVGSVGElement>>;

type NavLeaf = { kind: 'leaf'; label: string; href: string; icon: PolarisIcon };
type NavGroup = {
  kind: 'group';
  label: string;
  icon: PolarisIcon;
  href: string;
  children: { label: string; href: string }[];
};
type NavItem = NavLeaf | NavGroup;

const navItems: NavItem[] = [
  { kind: 'leaf', label: 'Home', href: '/dashboard', icon: HomeIcon },
  {
    kind: 'group',
    label: 'Orders',
    icon: OrderIcon,
    href: '/orders',
    children: [
      { label: 'Active', href: '/orders' },
      { label: 'Archived', href: '/orders/archived' },
    ],
  },
  {
    kind: 'group',
    label: 'Returns',
    icon: ReturnIcon,
    href: '/returns',
    children: [
      { label: 'All returns', href: '/returns' },
      { label: 'Pending', href: '/returns?status=REQUESTED' },
    ],
  },
  {
    kind: 'group',
    label: 'Products',
    icon: ProductIcon,
    href: '/products',
    children: [
      { label: 'Catalog', href: '/products' },
      { label: 'Cost Prices', href: '/products/cost-prices' },
      { label: 'Categories', href: '/categories' },
      { label: 'Inventory', href: '/inventory' },
      { label: 'Reviews', href: '/reviews' },
    ],
  },
  {
    kind: 'group',
    label: 'Customers',
    icon: PersonIcon,
    href: '/customers',
    children: [
      { label: 'Customers', href: '/customers' },
      { label: 'Loyalty redemptions', href: '/loyalty-redemptions' },
    ],
  },
  {
    kind: 'group',
    label: 'Marketing',
    icon: MegaphoneIcon,
    href: '/funnels',
    children: [
      { label: 'Funnels', href: '/funnels' },
      { label: 'Notifications', href: '/notifications' },
      { label: 'Referral payouts', href: '/referrals' },
    ],
  },
  { kind: 'leaf', label: 'Discounts', href: '/discounts', icon: DiscountIcon },
  {
    kind: 'group',
    label: 'Content',
    icon: ContentIcon,
    href: '/homepage',
    children: [
      { label: 'Homepage', href: '/homepage' },
      { label: 'Blog', href: '/blog' },
      { label: 'Travel applications', href: '/travel-applications' },
    ],
  },
  { kind: 'leaf', label: 'Analytics', href: '/analytics', icon: ChartLineIcon },
  { kind: 'leaf', label: 'Website Analytics', href: '/web-analytics', icon: GlobeIcon },
  { kind: 'leaf', label: 'Support', href: '/support-tickets', icon: ChatIcon },
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

const itemBase =
  'flex items-center gap-2 mx-1.5 px-2 h-8 rounded-lg text-[13px] font-medium select-none';
const itemActive =
  'bg-white text-[#303030] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_1px_rgba(0,0,0,0.04)]';
const itemIdle = 'text-[#303030] hover:bg-[#ebebeb]';

const iconClassActive = 'w-[18px] h-[18px] flex-shrink-0 fill-[#1a1a1a]';
const iconClassIdle = 'w-[18px] h-[18px] flex-shrink-0 fill-[#4a4a4a]';

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
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleNavigate}
        title={isSidebarCollapsed ? item.label : undefined}
        className={`${itemBase} ${active ? itemActive : itemIdle}`}
      >
        <Icon className={active ? iconClassActive : iconClassIdle} />
        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const renderGroup = (item: NavGroup) => {
    const open = isGroupOpen(item);
    const groupActive = isGroupActive(pathname, item);
    const parentSelfActive = isPathActive(pathname, item.href);
    const Icon = item.icon;

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
            <Icon className={groupActive ? iconClassActive : iconClassIdle} />
            {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
          </Link>
          {!isSidebarCollapsed && (
            <button
              type="button"
              onClick={() => toggleGroup(item.label)}
              aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
              className="h-6 w-6 mr-1 flex items-center justify-center rounded text-[#616161] hover:text-[#1a1a1a]"
            >
              <ChevronDownIcon
                className={`w-3 h-3 fill-current [transition:transform_80ms_ease] ${open ? '' : '-rotate-90'}`}
              />
            </button>
          )}
        </div>

        {open && !isSidebarCollapsed && (
          <div className="mt-0.5 mb-0.5 space-y-px">
            {(() => {
              // Longest matching child href wins, so a nested child (e.g.
              // /orders/archived) doesn't also light up a parent-prefix sibling
              // (/orders → Active) as active.
              const activeChildHref = item.children
                .filter((c) => isPathActive(pathname, c.href))
                .reduce((best, c) => (c.href.length > best.length ? c.href : best), '');
              return item.children.map((child) => {
                const active = child.href === activeChildHref;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={handleNavigate}
                    className={`flex items-center mx-1.5 pl-9 pr-2 h-7 rounded-lg text-[13px] ${
                      active
                        ? `${itemActive} font-medium`
                        : 'text-[#616161] hover:bg-[#ebebeb] hover:text-[#303030]'
                    }`}
                  >
                    <span className="truncate">{child.label}</span>
                  </Link>
                );
              });
            })()}
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
        {renderLeaf({ kind: 'leaf', label: 'Settings', href: '/settings', icon: SettingsIcon })}
      </div>

      <div className="hidden lg:block border-t border-[#ebebeb] p-1.5">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-1.5 h-7 px-2 rounded text-[12px] text-[#616161] hover:text-[#1a1a1a] hover:bg-[#ebebeb]"
        >
          {isSidebarCollapsed ? (
            <ChevronRightIcon className="w-3 h-3 fill-current" />
          ) : (
            <ChevronLeftIcon className="w-3 h-3 fill-current" />
          )}
          {!isSidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col bg-[#f1f1f1] border-r border-[#ebebeb] sticky top-14 self-start [transition:width_100ms_ease] ${
          isSidebarCollapsed ? 'w-[56px]' : 'w-[228px]'
        }`}
        style={{ height: 'calc(100vh - 56px)' }}
      >
        {sidebarContent}
      </aside>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-[260px] bg-[#f1f1f1] border-r border-[#ebebeb] flex flex-col z-50">
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute top-2 right-2 p-1 text-[#616161] hover:text-[#1a1a1a]"
              aria-label="Close menu"
            >
              <XIcon className="w-4 h-4 fill-current" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
