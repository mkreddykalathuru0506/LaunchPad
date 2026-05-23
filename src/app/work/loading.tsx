export default function WorkLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="shimmer h-6 w-48 rounded-md" />
          <div className="shimmer h-3 w-64 rounded-md" />
        </div>
        <div className="shimmer h-9 w-32 rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-5">
            <div className="shimmer h-3 w-24 rounded-md" />
            <div className="shimmer h-7 w-16 rounded-md" />
            <div className="shimmer h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <div className="shimmer h-4 w-40 rounded-md" />
        </div>
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="shimmer h-9 w-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="shimmer h-3 w-2/5 rounded-md" />
                <div className="shimmer h-3 w-3/5 rounded-md" />
              </div>
              <div className="shimmer h-6 w-24 rounded-full" />
              <div className="shimmer hidden h-3 w-20 rounded-md sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
