import type { Metadata, Viewport } from "next";
import { Archivo_Narrow, Poppins } from "next/font/google";
import { Providers } from "@/providers";
import { LenisProvider } from "@/providers/lenis-provider";
import "./globals.css";

const archivoNarrow = Archivo_Narrow({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Earth Revibe | Streetwear for the Culture",
  description:
    "Shop the freshest Indian streetwear. Oversized tees, hoodies, joggers and more. Free shipping on orders above Rs.999.",
  keywords: [
    "streetwear",
    "Indian streetwear",
    "oversized tees",
    "hoodies",
    "earth revibe",
  ],
  openGraph: {
    title: "Earth Revibe | Streetwear for the Culture",
    description:
      "Shop the freshest Indian streetwear. Oversized tees, hoodies, joggers and more.",
    type: "website",
    locale: "en_IN",
    siteName: "Earth Revibe",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivoNarrow.variable} ${poppins.variable}`}
    >
      <body>
        <Providers>
          <LenisProvider>{children}</LenisProvider>
        </Providers>
      </body>
    </html>
  );
}
