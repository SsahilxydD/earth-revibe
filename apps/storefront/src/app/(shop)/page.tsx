import { Suspense } from 'react';
import { Hero } from '@/components/home/hero';
import { FeaturedSection } from '@/components/home/featured-section';
import { SocialProofSection } from '@/components/home/social-proof-section';
import { ProductGridSkeleton } from '@/components/home/product-grid-skeleton';

function FeaturedSectionSkeleton() {
  return (
    <section className="pt-16 lg:pt-24 pb-8 lg:pb-12 bg-white">
      <div className="text-center mb-12 lg:mb-16 px-6 lg:px-14">
        <p className="text-[10px] font-[var(--font-cinzel)] font-medium tracking-[0.2em] uppercase text-slate-400 mb-3">
          Customer Favorites
        </p>
        <h2 className="text-[24px] lg:text-[32px] font-[var(--font-cinzel)] font-medium tracking-[0.02em] text-black">
          Bestsellers
        </h2>
      </div>
      <ProductGridSkeleton count={4} />
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<FeaturedSectionSkeleton />}>
        <FeaturedSection />
      </Suspense>
      <SocialProofSection />
    </>
  );
}
