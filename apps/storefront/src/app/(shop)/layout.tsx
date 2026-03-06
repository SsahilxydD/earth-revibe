import { Header, Footer, MobileBottomBar } from "@/components/layout";
import { CartDrawer } from "@/components/cart/cart-drawer";
import SmoothScroll from "@/components/ui/smooth-scroll";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <Header />
      <main>{children}</main>
      <Footer />
      <MobileBottomBar />
      <CartDrawer />
    </SmoothScroll>
  );
}
