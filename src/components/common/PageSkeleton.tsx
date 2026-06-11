import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse" role="status" aria-label="Loading">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48 bg-muted" />
        <Skeleton className="h-8 w-24 bg-muted" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-3">
            <Skeleton className="h-4 w-24 bg-muted" />
            <Skeleton className="h-8 w-16 bg-muted" />
            <Skeleton className="h-3 w-32 bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border p-5 space-y-3">
          <Skeleton className="h-5 w-36 bg-muted" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full bg-muted" />
                <Skeleton className="h-3 w-2/3 bg-muted" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border p-5 space-y-3">
          <Skeleton className="h-5 w-28 bg-muted" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full bg-muted" />
              <Skeleton className="h-4 flex-1 bg-muted" />
              <Skeleton className="h-4 w-12 bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
