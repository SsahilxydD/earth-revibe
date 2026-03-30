import Link from 'next/link';

export function BrandStory() {
  return (
    <section className="bg-[var(--color-primary)] text-white">
      <div className="grid md:grid-cols-2 min-h-[400px] md:min-h-[500px]">
        {/* Text */}
        <div className="flex flex-col justify-center px-6 md:px-12 lg:px-20 py-12 md:py-16">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-white/50 mb-4">
            Our Story
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
            WHERE COMFORT
            <br />
            MEETS CRAZY
          </h2>
          <p className="mt-5 md:mt-6 text-sm md:text-base text-white/70 leading-relaxed max-w-lg">
            Born in India, Earth Revibe is more than a brand &mdash; it&apos;s a feeling. We craft
            vacation-ready, minimal clothing that doesn&apos;t compromise on style. Every piece is
            designed for effortless living, rooted in Indian aesthetics and built for wherever life
            takes you.
          </p>
          <p className="mt-3 md:mt-4 text-sm md:text-base text-white/70 leading-relaxed max-w-lg">
            From relaxed silhouettes to clean aesthetics, we believe fashion should be effortless,
            minimal, and kind to the planet.
          </p>
          <div className="mt-6 md:mt-8">
            <Link
              href="/about"
              className="inline-block px-8 py-3 border border-white/30 text-xs md:text-sm font-semibold uppercase tracking-[0.15em] rounded-[var(--button-radius)] hover:bg-white hover:text-[var(--color-primary)] transition-colors duration-300"
            >
              Our Story
            </Link>
          </div>
        </div>

        {/* Decorative pattern */}
        <div className="hidden md:block relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-neutral-900 to-zinc-700" />
          <div className="absolute inset-0 opacity-10">
            <div
              className="w-full h-full"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.05) 20px, rgba(255,255,255,0.05) 40px)',
              }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[120px] lg:text-[180px] font-bold text-white/[0.03] leading-none tracking-tighter select-none">
              ER
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
