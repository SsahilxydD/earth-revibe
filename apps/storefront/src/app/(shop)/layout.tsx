import { AnnouncementBar } from '@/components/layout/announcement-bar';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { NewsletterPopup } from '@/components/layout/newsletter-popup';
import { PageTransition } from '@/components/layout/page-transition';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
      <MobileMenu />
      <NewsletterPopup />
    </div>
  );
}
