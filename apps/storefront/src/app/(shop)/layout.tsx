import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomBar } from "@/components/layout/mobile-bottom-bar";
import { NewsletterPopup } from "@/components/layout/newsletter-popup";
import { PageTransition } from "@/components/layout/page-transition";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main className="min-h-[100dvh]">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <MobileBottomBar />
      <NewsletterPopup />
    </>
  );
}
