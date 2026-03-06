export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="aspect-[3/4] bg-slate-100 animate-pulse" />
      ))}
    </div>
  );
}
