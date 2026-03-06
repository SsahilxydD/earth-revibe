import { Header, Footer, MobileBottomBar } from "@/components/layout";
import { CartDrawer } from "@/components/cart/cart-drawer";
import SmoothScroll from "@/components/ui/smooth-scroll";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <Header />
      <main className="min-h-screen pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileBottomBar />
      <CartDrawer />
    </SmoothScroll>
  );
}
