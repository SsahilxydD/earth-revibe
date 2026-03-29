import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { QueryProvider } from '@/providers/query-provider';
import { PostHogProvider, PostHogPageview } from '@/providers/posthog-provider';
import { ToastContainer } from '@/components/ui/toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Earth Revibe Admin',
    template: '%s | Earth Revibe Admin',
  },
  description: 'Earth Revibe Admin Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-surface text-text-primary antialiased">
        <PostHogProvider>
          <PostHogPageview />
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
