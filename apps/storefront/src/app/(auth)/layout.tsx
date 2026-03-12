import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #121212 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block text-2xl font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]"
          >
            Earth Revibe
          </Link>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
