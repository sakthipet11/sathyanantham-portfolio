import { FileText } from 'lucide-react';

export default function ResumesLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans animate-pulse">
      {/* Top Header Skeleton */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-card/60 border border-border/80" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary opacity-60" /> Resumes & Packages
            </h1>
            <div className="h-3 w-60 bg-muted/60 rounded-md mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 bg-primary/20 rounded-xl" />
        </div>
      </div>

      {/* Cards Skeleton List */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-card/60 border border-border/80 flex items-center justify-between h-20">
            <div className="flex items-center gap-3.5">
              <div className="w-6 h-6 bg-muted/80 rounded" />
              <div className="space-y-2">
                <div className="h-4 w-48 bg-muted/80 rounded" />
                <div className="h-3 w-32 bg-muted/60 rounded" />
              </div>
            </div>
            <div className="h-9 w-28 bg-card border border-border/80 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
