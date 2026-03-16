import { prisma } from "@earth-revibe/db";

const sections = [
  { label: "NEW ARRIVALS", href: "/categories/new-arrivals", sortOrder: 0 },
  { label: "SHIRTS", href: "/categories/shirts", sortOrder: 1 },
  { label: "T-SHIRTS", href: "/categories/t-shirts", sortOrder: 2 },
  { label: "OUTERWEAR", href: "/categories/outerwear", sortOrder: 3 },
  { label: "BESTSELLERS", href: "/categories/bestsellers", sortOrder: 4 },
];

async function main() {
  for (const s of sections) {
    await prisma.homepageSection.upsert({
      where: { id: s.label.toLowerCase().replace(/\s+/g, "-") },
      update: { label: s.label, href: s.href, sortOrder: s.sortOrder },
      create: {
        id: s.label.toLowerCase().replace(/\s+/g, "-"),
        label: s.label,
        href: s.href,
        sortOrder: s.sortOrder,
        isActive: true,
      },
    });
    console.log(`Seeded: ${s.label}`);
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
