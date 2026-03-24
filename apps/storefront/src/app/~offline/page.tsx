export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="mt-4 text-xl font-bold uppercase tracking-wider">
        You&apos;re Offline
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Check your internet connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-[var(--button-radius)] bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white"
      >
        Retry
      </button>
    </div>
  );
}
