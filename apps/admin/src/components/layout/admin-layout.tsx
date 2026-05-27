'use client';

import { AuthGuard } from './auth-guard';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

// Shopify-style chrome: Topbar spans the full width across the top; sidebar
// docks below it on the left, main content fills the rest.
export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f1f1f1] flex flex-col">
        <Topbar />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <main className="flex-1 min-w-0 p-3 lg:p-4 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
