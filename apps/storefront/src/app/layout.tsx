import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Poppins, Playfair_Display, Cinzel } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { ToastContainer } from "@/components/ui/toast";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
});

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: true,
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: true,
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "Earth Revibe | Sustainable Fashion Essentials",
    template: "%s | Earth Revibe",
  },
  description:
    "Natural landscapes, minimal product shots, and authentic storytelling. Sustainable fashion essentials crafted with care.",
  keywords: ["sustainable fashion", "earth tones", "natural clothing", "eco-friendly", "minimal fashion"],
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/Earth%20Revibe%20Logo%20Black.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${poppins.variable} ${playfair.variable} ${cinzel.variable}`}>
      <body className="font-[var(--font-sans)] antialiased bg-[var(--background)]">
        <QueryProvider>
          {children}
          <ToastContainer />
        </QueryProvider>
      </body>
    </html>
  );
}
