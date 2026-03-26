import type { Metadata } from 'next';
import { Leaf, Heart, Recycle, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us | Earth Revibe',
  description:
    "Learn about Earth Revibe's mission to deliver fresh, conscious Indian streetwear. Our story, values, and commitment to sustainability.",
};

const VALUES = [
  {
    icon: Leaf,
    title: 'Sustainability First',
    description:
      'Every piece we create considers its environmental footprint. We use organic cotton, recycled materials, and eco-friendly dyes wherever possible.',
  },
  {
    icon: Heart,
    title: 'Made with Love',
    description:
      'Our garments are crafted by skilled artisans across India. We ensure fair wages and safe working conditions throughout our supply chain.',
  },
  {
    icon: Recycle,
    title: 'Circular Fashion',
    description:
      'We believe in clothes that last. Our pieces are designed for durability and timelessness, reducing the cycle of fast fashion waste.',
  },
  {
    icon: Globe,
    title: 'Community Driven',
    description:
      "Earth Revibe is more than a brand. We're a community of conscious individuals who believe fashion can be a force for good.",
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-[var(--color-primary)] py-20 text-white">
        <div className="px-4 text-center md:px-8 lg:px-12 xl:px-20">
          <h1 className="text-3xl font-bold uppercase tracking-[0.2em] sm:text-4xl">Our Story</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
            Born from the streets of India, Earth Revibe is a celebration of culture, creativity,
            and conscious living. We blend the raw energy of Indian street culture with sustainable
            fashion practices to create clothing that feels as good as it looks.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="grid gap-12 px-4 md:px-8 lg:grid-cols-2 lg:px-12 xl:px-20">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Our Mission
            </h2>
            <h3 className="mt-2 text-2xl font-bold uppercase tracking-wider">
              Redefining Indian Streetwear
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
              We started Earth Revibe with a simple belief: Indian streetwear deserves to be
              world-class. Every design we create is rooted in Indian culture while pushing the
              boundaries of contemporary fashion. From the colours of Holi to the geometry of Mughal
              architecture, India is our endless source of inspiration.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
              But great style should never come at the expense of the planet. That is why we are
              committed to using sustainable materials, ethical manufacturing processes, and
              packaging that does not add to the waste problem.
            </p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Our Vision
            </h2>
            <h3 className="mt-2 text-2xl font-bold uppercase tracking-wider">
              Fashion for the Future
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
              We envision a world where fashion is a force for good. Where every purchase supports
              fair labour practices, where every garment is designed to last, and where style and
              sustainability are not mutually exclusive.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
              By 2030, we aim to make our entire supply chain carbon neutral. We are already on the
              path with organic cotton, water-saving dyeing techniques, and recyclable packaging.
              Join us in making fashion that respects both people and planet.
            </p>
          </div>
        </div>
      </section>

      {/* Values Grid */}
      <section className="bg-[var(--color-surface)] py-16">
        <div className="px-4 md:px-8 lg:px-12 xl:px-20">
          <h2 className="text-center text-2xl font-bold uppercase tracking-wider">
            What We Stand For
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="rounded-[var(--button-radius)] bg-white p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface)]">
                  <value.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-sm font-bold uppercase tracking-wider">{value.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sustainability Section */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="text-2xl font-bold uppercase tracking-wider">
            Our Sustainability Commitment
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">
            We understand that the fashion industry is one of the largest polluters on the planet.
            That is why every decision we make, from sourcing materials to shipping your order, is
            guided by our commitment to reducing our environmental impact.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-[var(--button-radius)] border border-[var(--color-border)] p-5">
              <p className="text-3xl font-bold">100%</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
                Recyclable packaging
              </p>
            </div>
            <div className="rounded-[var(--button-radius)] border border-[var(--color-border)] p-5">
              <p className="text-3xl font-bold">60%</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
                Organic materials used
              </p>
            </div>
            <div className="rounded-[var(--button-radius)] border border-[var(--color-border)] p-5">
              <p className="text-3xl font-bold">0</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-muted)]">
                Plastic in our packaging
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
