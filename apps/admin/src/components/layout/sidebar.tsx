'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  FileText,
  Headset,
  ChevronLeft,
  ChevronRight,
  X,
  Tags,
  Warehouse,
  Bell,
  LayoutTemplate,
  GitBranchPlus,
  Plane,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Homepage', href: '/homepage', icon: LayoutTemplate },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Categories', href: '/categories', icon: FolderTree },
  { label: 'Orders', href: '/orders', icon: ShoppingCart },
  { label: 'Inventory', href: '/inventory', icon: Warehouse },
  { label: 'Discounts', href: '/discounts', icon: Tags },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Travel Applications', href: '/travel-applications', icon: Plane },
  { label: 'Blog', href: '/blog', icon: FileText },
  { label: 'Support', href: '/support-tickets', icon: Headset },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Funnels', href: '/funnels', icon: GitBranchPlus },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, isMobileSidebarOpen, setMobileSidebarOpen } =
    useUIStore();

  const isActive = (href: string) => pathname.startsWith(href);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16">
        <div className="w-7 h-7 bg-accent flex-shrink-0" />
        {!isSidebarCollapsed && (
          <span className="font-heading text-base font-semibold text-text-primary whitespace-nowrap">
            Earth Revibe
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              {/* Active dot indicator */}
              <div
                className={`w-1.5 h-1.5 flex-shrink-0 ${active ? 'bg-accent' : 'bg-transparent'}`}
              />
              {!isSidebarCollapsed && <span className="font-heading">{item.label}</span>}
              {isSidebarCollapsed && <item.icon size={18} className="flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
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
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-surface border-r border-border h-screen sticky top-0 transition-all duration-200 ${
          isSidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
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
