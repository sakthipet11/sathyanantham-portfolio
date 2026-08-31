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

        // Store reference globally for body scroll locking coordination
        (window as any).__lenis = lenisInstance;

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

    const handleLock = () => {
      if (lenisInstance) {
        try {
          lenisInstance.stop();
        } catch {}
      }
    };

    const handleUnlock = () => {
      if (lenisInstance) {
        try {
          lenisInstance.start();
        } catch {}
      }
    };

    window.addEventListener('lock-body-scroll', handleLock);
    window.addEventListener('unlock-body-scroll', handleUnlock);

    return () => {
      isMounted = false;
      window.removeEventListener('lock-body-scroll', handleLock);
      window.removeEventListener('unlock-body-scroll', handleUnlock);
      if (lenisInstance) {
        if ((window as any).__lenis === lenisInstance) {
          delete (window as any).__lenis;
        }
        lenisInstance.destroy();
      }
    };
  }, []);

  return <>{children}</>;
}
