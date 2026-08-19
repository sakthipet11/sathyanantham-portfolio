import { Bot } from 'lucide-react';

export default function AgentLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans animate-pulse">
      <div className="mb-6 flex items-center justify-between border-b border-border/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-card/60 border border-border/80" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary opacity-60" /> AI Job Copilot
            </h1>
            <div className="h-3 w-64 bg-muted/60 rounded-md mt-1" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card/60 border border-border/80 p-6 h-[500px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="h-12 w-64 bg-muted/50 rounded-xl" />
          <div className="h-12 w-80 bg-primary/10 rounded-xl ml-auto" />
        </div>
        <div className="h-12 w-full bg-muted/40 rounded-xl" />
      </div>
    </div>
  );
}
