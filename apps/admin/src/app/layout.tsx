import { Suspense } from 'react';
import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { QueryProvider } from '@/providers/query-provider';
import { PostHogProvider, PostHogPageview } from '@/providers/posthog-provider';
import { ToastContainer } from '@/components/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Earth Revibe Admin',
    template: '%s | Earth Revibe Admin',
  },
  description: 'Earth Revibe Admin Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-surface text-text-primary antialiased">
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageview />
          </Suspense>
          <QueryProvider>
            {children}
            <ToastContainer />
          </QueryProvider>
        </PostHogProvider>
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
