'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Home, ArrowLeft, Terminal } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotFoundProps {
  title?: string;
  description?: string;
  className?: string;
}

export function NotFound({
  title = '404: Node Unreachable',
  description = "The neural coordinate or page you requested could not be located across the studio clusters.",
  className,
}: NotFoundProps) {
  return (
    <div
      className={cn(
        'relative min-h-[70vh] w-full flex items-center justify-center p-6',
        className
      )}
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/70 bg-card/60 p-8 md:p-12 shadow-2xl backdrop-blur-2xl text-center">
        {/* Ambient radial glows */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-secondary/30 blur-3xl" />

        {/* Status code badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-mono text-primary mb-6">
          <Terminal className="h-3.5 w-3.5" />
          <span>HTTP 404 / RESOURCE_NOT_FOUND</span>
        </div>

        {/* Big Glitch / Number Display */}
        <div className="relative my-2 select-none">
          <span className="text-7xl md:text-9xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-foreground/90 via-foreground/40 to-transparent font-mono">
            404
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-mono">
          {title}
        </h1>

        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          {description}
        </p>

        {/* Quick Links / CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className={cn(buttonVariants({ size: 'lg' }), 'gap-2 shadow-lg')}
          >
            <Home className="h-4 w-4" />
            Return Home
          </Link>

          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              if (typeof window !== 'undefined') window.history.back();
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous Page
          </Button>
        </div>
      </div>
    </div>
  );
}
