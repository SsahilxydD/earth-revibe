interface ProductGridSkeletonProps {
  count?: number;
}

export function ProductGridSkeleton({ count = 12 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-fade-in">
          <div className="skeleton aspect-[2/3] w-full rounded-sm" />
          <div className="mt-2 space-y-1.5 px-0.5">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="flex gap-1">
              <div className="skeleton h-3.5 w-3.5 rounded-full" />
              <div className="skeleton h-3.5 w-3.5 rounded-full" />
              <div className="skeleton h-3.5 w-3.5 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
