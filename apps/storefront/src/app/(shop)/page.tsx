import { Hero } from '@/components/home/hero';
import { FeaturedSection } from '@/components/home/featured-section';
import { SpinWheel } from '@/components/home/spin-wheel';
import { SocialProofSection } from '@/components/home/social-proof-section';

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedSection
        title="Bestsellers"
        categorySlug="bestsellers"
        productsToShow={8}
      />
      <FeaturedSection
        title="New Arrivals"
        categorySlug="new-arrivals"
        productsToShow={8}
      />
      <SpinWheel />
      <SocialProofSection />
    </>
  );
}
