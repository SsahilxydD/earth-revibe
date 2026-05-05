import type { Metadata } from 'next';
import { QueryProvider } from '@/providers/query-provider';
import { ToastContainer } from '@earth-revibe/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Earth Revibe CRM',
    template: '%s | Earth Revibe CRM',
  },
  description: 'Customer engagement and outreach for Earth Revibe',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-text-primary antialiased">
        <QueryProvider>
          {children}
          <ToastContainer />
        </QueryProvider>
      </body>
    </html>
  );
}
