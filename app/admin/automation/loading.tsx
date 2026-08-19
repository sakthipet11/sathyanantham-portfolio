import { Sliders } from 'lucide-react';

export default function AutomationLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans animate-pulse">
      <div className="mb-8 flex items-center justify-between border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-card/60 border border-border/80" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary opacity-60" /> Automation Control Center
            </h1>
            <div className="h-3 w-64 bg-muted/60 rounded-md mt-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 rounded-2xl bg-card/60 border border-border/80 h-44 space-y-3">
            <div className="h-5 w-36 bg-muted/80 rounded" />
            <div className="h-3 w-64 bg-muted/60 rounded" />
            <div className="h-9 w-32 bg-primary/20 rounded-xl mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
