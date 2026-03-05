import { Header, Footer, MobileBottomBar } from "@/components/layout";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileBottomBar />
    </>
  );
}
