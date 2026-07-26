'use client';

import { MotionConfig } from 'framer-motion';
import { type ReactNode } from 'react';

interface MotionProviderProps {
  children: ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <MotionConfig
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      reducedMotion="user"
    >
      {children}
    </MotionConfig>
  );
}