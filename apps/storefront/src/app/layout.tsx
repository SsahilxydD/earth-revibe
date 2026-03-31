import { Suspense } from 'react';
import Script from 'next/script';
import type { Metadata, Viewport } from 'next';
import { Archivo_Narrow, Poppins } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Providers } from '@/providers';
import { LenisProvider } from '@/providers/lenis-provider';
import { PrefetchProvider } from '@/providers/prefetch-provider';
import { PostHogProvider, PostHogPageview } from '@/providers/posthog-provider';
import './globals.css';

const archivoNarrow = Archivo_Narrow({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Earth Revibe | Vacation-Ready Minimal Fits',
  description:
    'Shop vacation-ready, minimal fashion from India. Relaxed-fit tees, breezy essentials and more. Free shipping on all orders.',
  applicationName: 'Earth Revibe',
  keywords: [
    'vacation wear',
    'minimal fashion',
    'relaxed fits',
    'resort wear',
    'earth revibe',
    'Indian fashion',
  ],
  verification: {
    google: 'bdBwgxCng0DKUGTBNhIQca-CzzCSz5m8dyCwKbQqCbw',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Earth Revibe',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Earth Revibe | Vacation-Ready Minimal Fits',
    description:
      'Shop vacation-ready, minimal fashion from India. Relaxed-fit tees, breezy essentials and more.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'Earth Revibe',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#121212',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivoNarrow.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <body>
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageview />
          </Suspense>
          <Providers>
            <PrefetchProvider>
              <LenisProvider>{children}</LenisProvider>
            </PrefetchProvider>
          </Providers>
        </PostHogProvider>
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1545475463535538');
          fbq('track', 'PageView');
        `}</Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1545475463535538&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}
