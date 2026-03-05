"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { api } from "@/lib/api-client";

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { setMobileSidebarOpen } = useUIStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("adminRefreshToken");
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch {
      // Ignore errors on logout
    }
    logout();
    router.push("/login");
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "AD";

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

      {/* User dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-off-white transition-colors"
        >
          <div className="w-8 h-8 bg-deep-earth rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-white">{initials}</span>
          </div>
          <span className="hidden sm:block text-sm font-medium text-charcoal">
            {user?.firstName} {user?.lastName}
          </span>
          <ChevronDown size={16} className="text-medium-gray" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-light-gray shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b border-light-gray">
              <p className="text-sm font-medium text-charcoal">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-medium-gray">{user?.email}</p>
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
