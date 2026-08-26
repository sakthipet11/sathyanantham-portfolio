import React from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

interface LoadingFallbackProps {
  label?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingFallback({
  label = 'Loading Studio Assets...',
  className,
  fullScreen = false,
}: LoadingFallbackProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background/50 backdrop-blur-xl border border-border/60 transition-all duration-300',
        fullScreen
          ? 'fixed inset-0 z-50 min-h-screen w-screen'
          : 'min-h-[280px] w-full rounded-3xl p-8',
        className
      )}
    >
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}
