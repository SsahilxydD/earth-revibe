import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Earth Revibe Admin",
    template: "%s | Earth Revibe Admin",
  },
  description: "Earth Revibe Admin Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-off-white text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
