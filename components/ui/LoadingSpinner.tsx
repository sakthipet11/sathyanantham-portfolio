'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-[3px]',
};

export function LoadingSpinner({ className, size = 'md', label }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center gap-2',
        className
      )}
      role="status"
      aria-label={label ?? 'Loading'}
    >
      <div
        className={cn(
          'animate-spin rounded-full border-primary border-t-transparent',
          sizeClasses[size]
        )}
      />
      {label && (
        <span className="text-xs text-muted-foreground font-mono">{label}</span>
      )}
    </div>
  );
}
