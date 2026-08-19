import { ShieldAlert } from 'lucide-react';

export default function RetentionLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans animate-pulse">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-card/60 border border-border/80" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary opacity-60" /> Data Retention & Hard-Purge Control
            </h1>
            <div className="h-3 w-80 bg-muted/60 rounded-md mt-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-card/60 border border-border/80 h-24 space-y-2">
            <div className="h-3 w-24 bg-muted/60 rounded" />
            <div className="h-6 w-16 bg-muted/80 rounded" />
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-6 rounded-2xl bg-card/60 border border-border/80 h-48 space-y-4">
            <div className="h-5 w-48 bg-muted/80 rounded" />
            <div className="h-10 w-full bg-muted/30 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
