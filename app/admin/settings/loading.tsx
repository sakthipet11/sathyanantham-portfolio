import { Settings } from 'lucide-react';

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans animate-pulse">
      <div className="mb-8 flex items-center justify-between border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-card/60 border border-border/80" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary opacity-60" /> System Settings
            </h1>
            <div className="h-3 w-64 bg-muted/60 rounded-md mt-1" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card/60 border border-border/80 p-6 h-96 space-y-4">
        <div className="h-6 w-48 bg-muted/80 rounded" />
        <div className="h-10 w-full bg-muted/30 rounded-xl" />
        <div className="h-10 w-full bg-muted/30 rounded-xl" />
      </div>
    </div>
  );
}
