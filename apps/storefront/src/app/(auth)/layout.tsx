import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="font-heading text-2xl font-bold text-deep-earth mb-8">
        Earth Revibe
      </Link>
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-light-gray p-8">
        {children}
      </div>
    </div>
  );
}
