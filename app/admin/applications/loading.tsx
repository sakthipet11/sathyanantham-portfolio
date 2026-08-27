export default function ApplicationsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-8 w-64 bg-muted/60 rounded-xl mb-2" />
          <div className="h-4 w-96 bg-muted/40 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-muted/60 rounded-xl" />
          <div className="h-10 w-32 bg-muted/60 rounded-xl" />
        </div>
      </div>

      {/* Metrics HUD Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-card border border-border/40 h-24 flex flex-col justify-between">
            <div className="h-4 w-20 bg-muted/60 rounded" />
            <div className="h-7 w-12 bg-muted/80 rounded" />
          </div>
        ))}
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="h-12 w-full bg-card border border-border/40 rounded-2xl" />

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <div className="h-12 bg-muted/30 border-b border-border/40" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 border-b border-border/30 px-4 flex items-center justify-between">
            <div className="h-5 w-48 bg-muted/50 rounded" />
            <div className="h-5 w-32 bg-muted/40 rounded" />
            <div className="h-5 w-24 bg-muted/40 rounded" />
            <div className="h-8 w-20 bg-muted/60 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
