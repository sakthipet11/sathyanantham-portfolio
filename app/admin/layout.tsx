import { Suspense } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-mono text-xs transition-colors duration-300">
      <Suspense fallback={null}>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 bg-background flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
