import { Skeleton } from "@/components/v2/skeleton";

export default function WorkLoading() {
  return (
    <div className="space-y-8">
      {/* Section heading */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>

      {/* Queue list */}
      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="hidden h-3 w-20 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
