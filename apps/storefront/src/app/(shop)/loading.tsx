import { Spinner } from '@/components/ui/spinner';

// Route-segment loading boundary for the whole shop. Server-suspending
// navigations show this instead of a frozen/blank screen. Client pages with
// their own skeletons (products, search) still render those once mounted.
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
