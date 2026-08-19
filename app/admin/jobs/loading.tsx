import { Briefcase, RefreshCw } from 'lucide-react';

export default function JobsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans animate-pulse">
      {/* Top Header Skeleton */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-card/60 border border-border/80" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary opacity-60" /> Job Discovery Radar
            </h1>
            <div className="h-3 w-64 bg-muted/60 rounded-md mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-primary/20 rounded-xl" />
          <div className="h-9 w-9 bg-card border border-border/80 rounded-xl" />
        </div>
      </div>

      {/* HUD Metrics Banner Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-card/60 border border-border/80 h-20 space-y-2">
            <div className="h-2 w-16 bg-muted/60 rounded" />
            <div className="h-6 w-12 bg-muted/80 rounded" />
          </div>
        ))}
      </div>

      {/* Search & Filter Skeleton */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="h-10 flex-1 bg-muted/40 border border-border/80 rounded-xl" />
        <div className="h-10 w-40 bg-muted/40 border border-border/80 rounded-xl" />
        <div className="h-10 w-40 bg-muted/40 border border-border/80 rounded-xl" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-card/60 border border-border/80 overflow-hidden p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-muted/30 border border-border/60 rounded-xl w-full" />
        ))}
      </div>
    </div>
  );
}
