'use client';

import { useEffect } from 'react';
import { GlobalErrorFallback } from '@/components/ui/GlobalErrorFallback';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console / error reporting service
    console.error('Root Route Error Captured:', error);
  }, [error]);

  return (
    <main className="flex min-h-[80vh] w-full items-center justify-center p-4">
      <GlobalErrorFallback error={error} reset={reset} />
    </main>
  );
}
