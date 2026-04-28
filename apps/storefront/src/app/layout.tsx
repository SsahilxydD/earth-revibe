import { Suspense } from 'react';
import Script from 'next/script';
import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Providers } from '@/providers';
import { LenisProvider } from '@/providers/lenis-provider';
import { PrefetchProvider } from '@/providers/prefetch-provider';
import { PostHogProvider, PostHogPageview } from '@/providers/posthog-provider';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.earthrevibe.com'),
  alternates: {
    canonical: '/',
  },
  title: 'Earth Revibe | Vacation-Ready Minimal Fits',
  description:
    'Vacation-ready minimal fashion from India. 100% cashback on your first order. Shirts, polos, shorts, linen — free shipping, 1-year take-back.',
  applicationName: 'Earth Revibe',
  keywords: [
    'vacation wear',
    'minimal fashion',
    'relaxed fits',
    'resort wear',
    'earth revibe',
    'Indian fashion',
    'shirts',
    'polos',
    'bottomwear',
  ],
  icons: {
    icon: '/favicon.ico',
    apple: '/Earth Revibe Logo Black.png',
  },
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
      'Vacation-ready minimal fashion from India. 100% cashback on your first order. Free shipping, 1-year take-back.',
    type: 'website',
    locale: 'en_IN',
    siteName: 'Earth Revibe',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Earth Revibe — Vacation-Ready Minimal Fashion from India',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Earth Revibe | Vacation-Ready Minimal Fits',
    description:
      'Vacation-ready minimal fashion from India. 100% cashback on your first order. Free shipping, 1-year take-back.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  themeColor: '#121212',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Earth Revibe',
              url: 'https://www.earthrevibe.com',
              logo: 'https://www.earthrevibe.com/Earth Revibe Logo Black.png',
              description:
                'Vacation-ready minimal fashion from India. 100% cashback on your first order.',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'contact@earthrevibe.in',
                telephone: '+91-93287-06759',
                contactType: 'customer service',
              },
              sameAs: [
                'https://www.instagram.com/earthrevibe',
                'https://www.facebook.com/earthrevibe',
              ],
            }),
          }}
        />
      </head>
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
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="f850adc3-3314-491f-8993-da97186ec464"
          strategy="afterInteractive"
        />
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('set', 'autoConfig', false, '1263879098593572');
          fbq('init', '1263879098593572');
          fbq('track', 'PageView');
        `}</Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1263879098593572&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </body>
    </html>
  );
}
