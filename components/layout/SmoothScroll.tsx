// @ts-nocheck
'use client';

import { useEffect, ReactNode } from 'react';

interface SmoothScrollProps {
  children: ReactNode;
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  useEffect(() => {
    // Enable CSS smooth scrolling as native fallback
    document.documentElement.style.scrollBehavior = 'smooth';

    let lenisInstance: any = null;
    let isMounted = true;

    // Dynamically attempt lenis initialization
    async function initLenis() {
      try {
        const lenisPkg = await import('lenis').catch(() => null);
        if (!lenisPkg || !isMounted) return;

        const Lenis = lenisPkg.default || lenisPkg;
        lenisInstance = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          wheelMultiplier: 1,
        });

        function raf(time: number) {
          if (lenisInstance && isMounted) {
            lenisInstance.raf(time);
            requestAnimationFrame(raf);
          }
        }
        requestAnimationFrame(raf);
      } catch (err) {
        // Fallback to native smooth scrolling
      }
    }

    initLenis();

    return () => {
      isMounted = false;
      if (lenisInstance) {
        lenisInstance.destroy();
      }
    };
  }, []);

  return <>{children}</>;
}
