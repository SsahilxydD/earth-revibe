'use client';

import { PageIcon } from '@shopify/polaris-icons';
import { PageHeader } from '@earth-revibe/ui';
import { useHomepageBlocks } from '@/hooks/use-homepage';
import { HeroEditor } from '@/components/homepage/hero-editor';
import { StoryStacksEditor } from '@/components/homepage/story-stacks-editor';
import { VibeCardsEditor } from '@/components/homepage/vibe-cards-editor';
import { FeaturedProductsEditor } from '@/components/homepage/featured-products-editor';

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold text-deep-earth">{title}</h2>
        <p className="text-[12px] text-medium-gray">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export default function HomepagePage() {
  const { data: blocks, isLoading } = useHomepageBlocks();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <PageHeader icon={PageIcon} title="Homepage" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-white animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        icon={PageIcon}
        title="Homepage"
        subtitle="Every section goes live on the storefront the moment you save — no deploy needed. Sections you haven't configured fall back to the storefront's built-in content."
      />

      <Section
        title="Hero"
        subtitle="Full-bleed cover at the top of the homepage — image, headline and call-to-action."
      >
        <HeroEditor blocks={blocks ?? []} />
      </Section>

      <Section
        title="Destination stories"
        subtitle="The Instagram-style story circles under the hero. Each destination holds a stack of full-screen stories with an optional shop button."
      >
        <StoryStacksEditor blocks={blocks ?? []} />
      </Section>

      <Section
        title="Shop by Vibe cards"
        subtitle="The horizontal vibe cards. Each links to its vibe filter on /products; piece counts are computed automatically."
      >
        <VibeCardsEditor blocks={blocks ?? []} />
      </Section>

      <Section
        title="Featured pieces"
        subtitle="Hand-pick and order the products in the Featured rail. Empty = falls back to products flagged “Featured” in the product editor."
      >
        <FeaturedProductsEditor blocks={blocks ?? []} />
      </Section>
    </div>
  );
}
