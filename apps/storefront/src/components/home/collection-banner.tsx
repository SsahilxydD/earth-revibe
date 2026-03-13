import Link from "next/link";

interface CollectionCard {
  title: string;
  href: string;
  gradient: string;
}

const COLLECTIONS: CollectionCard[] = [
  {
    title: "New Arrivals",
    href: "/categories/new-arrivals",
    gradient: "from-zinc-900 to-zinc-700",
  },
  {
    title: "Oversized Tees",
    href: "/categories/oversized-tees",
    gradient: "from-neutral-800 to-stone-600",
  },
  {
    title: "Streetwear",
    href: "/categories/streetwear",
    gradient: "from-gray-900 to-gray-600",
  },
  {
    title: "Sale",
    href: "/categories/sale",
    gradient: "from-red-900 to-red-700",
  },
];

export function CollectionBanner() {
  return (
    <section className="px-4 md:px-8 lg:px-12 xl:px-20 py-[var(--section-spacing-mobile)] md:py-[var(--section-spacing-desktop)]">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {COLLECTIONS.map((collection) => (
          <Link
            key={collection.title}
            href={collection.href}
            className="group relative aspect-[3/4] md:aspect-[2/3] rounded-lg overflow-hidden"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${collection.gradient} transition-transform duration-500 group-hover:scale-105`}
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300" />

            <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 md:pb-8 px-4 text-center">
              <h3 className="text-white text-sm md:text-base font-semibold uppercase tracking-[0.15em]">
                {collection.title}
              </h3>
              <span className="mt-2 text-white/70 text-[10px] md:text-xs uppercase tracking-[0.2em] border-b border-white/40 pb-0.5 group-hover:border-white/70 transition-colors">
                Shop Now
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
