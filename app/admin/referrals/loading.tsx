import { Users } from 'lucide-react';

export default function ReferralsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans animate-pulse">
      {/* Top Header Skeleton */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-card/60 border border-border/80" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary opacity-60" /> Referral Discovery & Outreach
            </h1>
            <div className="h-3 w-80 bg-muted/60 rounded-md mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-44 bg-primary/20 rounded-xl" />
        </div>
      </div>

      {/* HUD Metrics Banner Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-card/60 border border-border/80 h-20 space-y-2">
            <div className="h-2 w-20 bg-muted/60 rounded" />
            <div className="h-6 w-10 bg-muted/80 rounded" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl bg-card/60 border border-border/80 p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/30 border border-border/60 rounded-xl w-full" />
        ))}
      </div>
    </div>
  );
}
