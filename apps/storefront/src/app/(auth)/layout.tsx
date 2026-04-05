import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-4 py-10 sm:py-12">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, #121212 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative z-10 w-full max-w-sm sm:max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-block text-xl font-bold uppercase tracking-[0.3em] text-[var(--color-primary)] sm:text-2xl"
          >
            Earth Revibe
          </Link>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white px-5 py-7 shadow-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
