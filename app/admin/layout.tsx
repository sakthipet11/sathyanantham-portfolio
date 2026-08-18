import { Suspense } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-mono text-xs transition-colors duration-300">
      <Suspense fallback={
        <div className="w-full md:w-64 bg-card/90 border-r border-border/80 min-h-screen p-4 flex flex-col justify-between shrink-0">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded-xl w-3/4" />
            <div className="h-6 bg-muted rounded-xl" />
            <div className="h-6 bg-muted rounded-xl" />
            <div className="h-6 bg-muted rounded-xl" />
          </div>
        </div>
      }>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 bg-background flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
