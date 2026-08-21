'use client';

import { useEffect } from 'react';

// Global reference counter for active modal locks to prevent race conditions when multiple modals open/close
let lockCount = 0;

export function useLockBodyScroll(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    lockCount++;
    if (lockCount === 1) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = '';
        document.body.style.removeProperty('overflow');
        document.documentElement.style.overflow = '';
        document.documentElement.style.removeProperty('overflow');
      }
    };
  }, [isLocked]);
}
