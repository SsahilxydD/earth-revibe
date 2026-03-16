import Link from "next/link";
import Image from "next/image";

interface HomepageSection {
  id: string;
  label: string;
  href: string;
  imageUrl: string | null;
  sortOrder: number;
}

const FALLBACK_COLORS = ["#1a1a1a", "#2c2416", "#1c2418", "#18181f", "#211818"];

async function getSections(): Promise<HomepageSection[]> {
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://earth-revibeapi-production.up.railway.app/api/v1";
    const base = apiBase.startsWith("http") ? apiBase : `https://${apiBase}`;
    const res = await fetch(`${base}/homepage`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const sections = await getSections();

  return (
    <div className="-mt-24">
      {sections.map((section, i) => (
        <Link
          key={section.id}
          href={section.href}
          className="relative block w-full overflow-hidden"
        >
          {section.imageUrl ? (
            <Image
              src={section.imageUrl}
              alt={section.label}
              width={1920}
              height={1080}
              sizes="100vw"
              quality={85}
              priority={i === 0}
              style={{ width: "100%", height: "auto" }}
              className="transition-transform duration-700 ease-in-out hover:scale-[1.03]"
            />
          ) : (
            <div
              className="aspect-[3/2] w-full transition-transform duration-700 ease-in-out hover:scale-[1.03]"
              style={{ backgroundColor: FALLBACK_COLORS[i % FALLBACK_COLORS.length] }}
            />
          )}

          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="select-none text-center font-['Archivo_Narrow'] text-3xl font-bold uppercase tracking-[0.25em] text-white md:text-5xl lg:text-6xl"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}
            >
              {section.label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
