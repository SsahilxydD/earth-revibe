import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Our Story | Earth Revibe',
  description:
    "Born from Indian street culture. Earth Revibe creates conscious streetwear that's built to last.",
};

export default function AboutPage() {
  return (
    <div>
      {/* Hero — full-bleed dark */}
      <section className="relative bg-[var(--color-primary)] py-24 md:py-32">
        <div className="mx-auto max-w-xl px-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
            Est. 2024 &mdash; India
          </p>
          <h1 className="mt-4 text-3xl font-bold uppercase tracking-[0.15em] text-white sm:text-4xl md:text-5xl">
            Our Story
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-white/60">
            Born from the streets of India, Earth Revibe is a celebration of culture, creativity,
            and conscious living. We blend the raw energy of Indian street culture with sustainable
            fashion practices to create clothing that feels as good as it looks.
          </p>
        </div>
      </section>

      {/* Mission + Vision — two-column centered */}
      <section className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Our Mission
            </p>
            <h2 className="mt-3 text-xl font-bold uppercase tracking-wider">
              Redefining Indian Streetwear
            </h2>
            <p className="mt-4 text-sm leading-[1.8] text-[var(--color-muted)]">
              We started Earth Revibe with a simple belief: Indian streetwear deserves to be
              world-class. Every design we create is rooted in Indian culture while pushing the
              boundaries of contemporary fashion.
            </p>
            <p className="mt-3 text-sm leading-[1.8] text-[var(--color-muted)]">
              From the colours of Holi to the geometry of Mughal architecture, India is our endless
              source of inspiration. But great style should never come at the expense of the planet.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Our Vision
            </p>
            <h2 className="mt-3 text-xl font-bold uppercase tracking-wider">
              Fashion for the Future
            </h2>
            <p className="mt-4 text-sm leading-[1.8] text-[var(--color-muted)]">
              We envision a world where fashion is a force for good. Where every purchase supports
              fair labour practices, where every garment is designed to last, and where style and
              sustainability are not mutually exclusive.
            </p>
            <p className="mt-3 text-sm leading-[1.8] text-[var(--color-muted)]">
              We are committed to using sustainable materials, ethical manufacturing processes, and
              packaging that does not add to the waste problem.
            </p>
          </div>
        </div>
      </section>

      {/* Values — horizontal strip */}
      <section className="border-y border-[var(--color-border)] py-14 md:py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-xl font-bold uppercase tracking-wider">
            What We Stand For
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              {
                title: 'Sustainability',
                desc: 'Organic cotton, eco-friendly dyes, recyclable packaging.',
              },
              {
                title: 'Fair Labour',
                desc: 'Skilled artisans, fair wages, safe working conditions.',
              },
              {
                title: 'Durability',
                desc: 'Built to last. Designed for timelessness, not trends.',
              },
              {
                title: 'Community',
                desc: 'More than a brand. A culture of conscious individuals.',
              },
            ].map((v) => (
              <div key={v.title}>
                <h3 className="text-xs font-bold uppercase tracking-[0.15em]">{v.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats — clean numbers */}
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <div className="grid grid-cols-3 gap-6 text-center">
          {[
            { num: '100%', label: 'Recyclable Packaging' },
            { num: '60%', label: 'Organic Materials' },
            { num: '0', label: 'Plastic in Packaging' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold md:text-3xl">{s.num}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[var(--color-muted)]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA — full-width dark strip */}
      <section className="bg-[var(--color-primary)] py-14 text-center md:py-16">
        <div className="mx-auto max-w-md px-6">
          <h2 className="text-lg font-bold uppercase tracking-[0.15em] text-white">
            Join the Movement
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-white/50">
            Explore our latest collections and be part of the culture.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-block border border-white px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-[var(--color-primary)]"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  );
}
