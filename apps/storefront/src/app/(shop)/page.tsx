import Link from "next/link";
import Image from "next/image";

const categories = [
  {
    label: "NEW ARRIVALS",
    href: "/categories/new-arrivals",
    image: null,
    bg: "#1a1a1a",
  },
  {
    label: "SHIRTS",
    href: "/categories/shirts",
    image: null,
    bg: "#2c2416",
  },
  {
    label: "T-SHIRTS",
    href: "/categories/t-shirts",
    image: null,
    bg: "#1c2418",
  },
  {
    label: "OUTERWEAR",
    href: "/categories/outerwear",
    image: null,
    bg: "#18181f",
  },
  {
    label: "BESTSELLERS",
    href: "/categories/bestsellers",
    image: null,
    bg: "#211818",
  },
];

export default function HomePage() {
  return (
    <main>
      {categories.map((cat) => (
        <Link
          key={cat.href}
          href={cat.href}
          className="relative block w-full overflow-hidden"
          style={{ aspectRatio: "3 / 2" }}
        >
          {cat.image ? (
            <Image
              src={cat.image}
              alt={cat.label}
              fill
              sizes="100vw"
              quality={85}
              className="object-cover transition-transform duration-700 ease-in-out hover:scale-[1.03]"
            />
          ) : (
            <div
              className="absolute inset-0 transition-transform duration-700 ease-in-out hover:scale-[1.03]"
              style={{ backgroundColor: cat.bg }}
            />
          )}

          {/* Label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="select-none text-center font-['Archivo_Narrow'] text-3xl font-bold uppercase tracking-[0.25em] text-white md:text-5xl lg:text-6xl"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
            >
              {cat.label}
            </span>
          </div>
        </Link>
      ))}
    </main>
  );
}
