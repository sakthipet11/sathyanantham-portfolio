import { Inbox } from 'lucide-react';

export default function RecruiterInboxLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans animate-pulse">
      {/* Top Header Skeleton */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-card/60 border border-border/80" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Inbox className="w-5 h-5 text-primary opacity-60" /> Recruiter Email Inbox
            </h1>
            <div className="h-3 w-64 bg-muted/60 rounded-md mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-primary/20 rounded-xl" />
        </div>
      </div>

      {/* List Skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-card/60 border border-border/80 h-24 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-4 w-40 bg-muted/80 rounded" />
              <div className="h-3 w-20 bg-muted/60 rounded" />
            </div>
            <div className="h-3 w-64 bg-muted/60 rounded" />
            <div className="h-3 w-full bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
