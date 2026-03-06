import { Suspense } from "react";
import { Hero } from "@/components/home/hero";
import { FeaturedSection } from "@/components/home/featured-section";
import { SocialProofSection } from "@/components/home/social-proof-section";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <FeaturedSection />
      </Suspense>
      <SocialProofSection />
    </>
  );
}
