import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import './apply.css';

// The apply flow uses its own editorial typography (Fraunces display + Inter
// sans) that differs from the storefront shell. Loading these only for the
// (apply) route group keeps the rest of the site lean.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-fraunces',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-apply-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Earth Revibe — Travel Circle Application',
  description:
    'A small, hand-picked circle of travelers chasing mountains, beaches and quiet luxury — together.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1a1714',
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  // The `apply-scope` class gates our body-level styles (ink background,
  // antialiased rendering, font utilities) to this subtree so they never
  // leak into the rest of the storefront.
  return <div className={`apply-scope ${fraunces.variable} ${inter.variable}`}>{children}</div>;
}
