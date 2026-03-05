import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Earth Revibe | Sustainable Clothing",
    template: "%s | Earth Revibe",
  },
  description:
    "Discover sustainable, earth-friendly clothing. Premium quality tops, bottoms, and outerwear made from organic and recycled materials.",
  keywords: ["sustainable clothing", "organic fashion", "eco-friendly", "earth revibe"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${inter.variable}`}>
      <body className="bg-cream text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
