'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GlobalErrorFallbackProps {
  error: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

export function GlobalErrorFallback({
  error,
  reset,
  title = 'System Anomaly Encountered',
  description = 'An unexpected runtime exception occurred while rendering this view. The AI system has captured the trace.',
  className,
}: GlobalErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={cn(
        'relative min-h-[450px] w-full flex items-center justify-center p-6',
        className
      )}
      role="alert"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-destructive/30 bg-background/80 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-300">
        {/* Glow effect */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-44 w-44 rounded-full bg-destructive/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          {/* Warning Icon Badge */}
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive shadow-inner">
            <AlertTriangle className="h-8 w-8 animate-pulse" />
          </div>

          {/* Heading */}
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl font-mono">
            {title}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Error Digest/Message Preview */}
          {error?.message && (
            <div className="mt-4 w-full text-left">
              <button
                type="button"
                onClick={() => setShowDetails((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Diagnostic Info</span>
                {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showDetails && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border/80 bg-muted/50 p-3 font-mono text-[11px] text-destructive-foreground/90 whitespace-pre-wrap break-all">
                  <p className="font-semibold text-destructive">{error.name}: {error.message}</p>
                  {error.digest && <p className="mt-1 text-muted-foreground">Digest: {error.digest}</p>}
                  {error.stack && <p className="mt-1 text-muted-foreground/80 opacity-75">{error.stack}</p>}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
            {reset && (
              <Button
                variant="default"
                onClick={reset}
                className="flex-1 min-w-[130px] gap-2 font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Process
              </Button>
            )}

            <Link
              href="/"
              className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 min-w-[130px] gap-2')}
            >
              <Home className="h-4 w-4" />
              Return to Studio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
