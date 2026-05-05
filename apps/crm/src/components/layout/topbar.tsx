'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';

export function Topbar() {
  const router = useRouter();
  const { setMobileSidebarOpen } = useUIStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ email: string }>('/auth/me')
      .then((user) => setUserEmail(user.email ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
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

  const displayName = userEmail?.split('@')[0] ?? 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-border h-14 flex items-center px-4 lg:px-6">
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden p-2 -ml-2 hover:bg-surface-hover transition-colors mr-2"
      >
        <Menu size={20} className="text-text-secondary" />
      </button>

      <div className="flex-1" />

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
