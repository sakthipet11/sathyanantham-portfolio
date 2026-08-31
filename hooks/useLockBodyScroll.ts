'use client';

import { useEffect } from 'react';

// Global reference counter for active modal locks to prevent race conditions when multiple modals open/close
let lockCount = 0;
let originalPaddingRight = '';

export function useLockBodyScroll(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined') return;

    lockCount++;
    if (lockCount === 1) {
      // 1. Coordinate with Lenis smooth scroll if active
      window.dispatchEvent(new CustomEvent('lock-body-scroll'));
      if ((window as any).__lenis) {
        try {
          (window as any).__lenis.stop();
        } catch {
          // Ignore if lenis is not initialized yet
        }
      }

      // 2. Measure scrollbar width to prevent desktop layout shifts
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      originalPaddingRight = document.body.style.paddingRight || '';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // 3. Lock both html and body scroll
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        // 1. Remove modal-open class and restore styles
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        document.documentElement.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overscroll-behavior');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('overscroll-behavior');
        document.body.style.paddingRight = originalPaddingRight;
        originalPaddingRight = '';

        // 2. Resume Lenis smooth scroll if active
        window.dispatchEvent(new CustomEvent('unlock-body-scroll'));
        if ((window as any).__lenis) {
          try {
            (window as any).__lenis.start();
          } catch {
            // Ignore
          }
        }
      }
    };
  }, [isLocked]);
}
