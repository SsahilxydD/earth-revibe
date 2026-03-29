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
  title: 'Earth Revibe | Streetwear for the Culture',
  description:
    'Shop the freshest Indian streetwear. Oversized tees, hoodies, joggers and more. Free shipping on all orders.',
  applicationName: 'Earth Revibe',
  keywords: ['streetwear', 'Indian streetwear', 'oversized tees', 'hoodies', 'earth revibe'],
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
    title: 'Earth Revibe | Streetwear for the Culture',
    description: 'Shop the freshest Indian streetwear. Oversized tees, hoodies, joggers and more.',
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
          <PostHogPageview />
          <Providers>
            <PrefetchProvider>
              <LenisProvider>{children}</LenisProvider>
            </PrefetchProvider>
          </Providers>
        </PostHogProvider>
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
