export default function ProductLoading() {
  return (
    <div className="animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-[3/4] w-full bg-[#f0f0f0] md:aspect-[4/5]" />

      {/* Content skeleton */}
      <div className="px-4 py-5 md:px-8">
        <div className="h-5 w-3/4 rounded bg-[#f0f0f0]" />
        <div className="mt-3 h-4 w-1/3 rounded bg-[#f0f0f0]" />
        <div className="mt-6 h-10 w-full rounded bg-[#f0f0f0]" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-[#f0f0f0]" />
          <div className="h-3 w-5/6 rounded bg-[#f0f0f0]" />
          <div className="h-3 w-2/3 rounded bg-[#f0f0f0]" />
        </div>
      </div>
    </div>
  );
}
