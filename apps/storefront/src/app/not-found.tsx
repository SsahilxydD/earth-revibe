import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl font-bold tracking-wider text-[var(--color-border)]">404</p>
      <h1 className="mt-4 text-2xl font-bold uppercase tracking-wider">Page Not Found</h1>
      <p className="mt-3 max-w-md text-sm text-[var(--color-muted)]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you
        back on track.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-[var(--button-radius)] bg-[var(--color-primary)] px-7 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#2a2a2a]"
      >
        Go Home
      </Link>
    </div>
  );
}
