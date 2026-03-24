export default function ProductLoading() {
  return (
    <div className="animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-[3/4] w-full bg-[#f8f8f8] md:aspect-[4/5]" />

      {/* Content skeleton */}
      <div className="px-4 py-5 md:px-8">
        <div className="h-5 w-3/4 rounded bg-[#f8f8f8]" />
        <div className="mt-3 h-4 w-1/3 rounded bg-[#f8f8f8]" />
        <div className="mt-6 h-10 w-full rounded bg-[#f8f8f8]" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded bg-[#f8f8f8]" />
          <div className="h-3 w-5/6 rounded bg-[#f8f8f8]" />
          <div className="h-3 w-2/3 rounded bg-[#f8f8f8]" />
        </div>
      </div>
    </div>
  );
}
