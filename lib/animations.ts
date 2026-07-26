export const fadeInUp: any = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeInDown: any = {
  initial: { opacity: 0, y: -30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeInLeft: any = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export const fadeInRight: any = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export const scaleIn: any = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const scaleInSpring: any = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export const textReveal: any = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export const textRevealFast: any = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export const staggerContainer: any = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerSlow: any = {
  animate: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

export const staggerContainerFast: any = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const slideInFromBottom: any = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export const slideInFromTop: any = {
  initial: { opacity: 0, y: -60 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export const rotateIn: any = {
  initial: { opacity: 0, rotate: -10, scale: 0.9 },
  animate: { opacity: 1, rotate: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export const lineDraw: any = {
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1, transition: { duration: 1.5, ease: 'easeInOut' } },
};

export const counterUp: any = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export const float: any = {
  animate: {
    y: [0, -10, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const floatSlow: any = {
  animate: {
    y: [0, -20, 0],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const floatFast: any = {
  animate: {
    y: [0, -5, 0],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const pulse: any = {
  animate: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const pulseGlow: any = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(6, 182, 212, 0.3)',
      '0 0 40px rgba(6, 182, 212, 0.5)',
      '0 0 20px rgba(6, 182, 212, 0.3)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const magnetic: any = {
  initial: { x: 0, y: 0 },
  animate: { x: 0, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

export const hoverLift: any = {
  initial: { y: 0 },
  hover: { y: -8, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

export const hoverScale: any = {
  initial: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
};

export const tapScale: any = {
  tap: { scale: 0.98, transition: { duration: 0.1 } },
};

export const focusRing: any = {
  focus: { boxShadow: '0 0 0 3px rgba(6, 182, 212, 0.4)' },
};

export const pageTransition: any = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

export const modalTransition: any = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
};

export const backdropTransition: any = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const listItem: any = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.3 } },
};

export const accordion: any = {
  open: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  closed: { height: 0, opacity: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

export const tabIndicator: any = {
  initial: { x: 0, width: 0 },
  animate: (i: number) => ({
    x: i * 100,
    width: 100,
    transition: { type: 'spring', stiffness: 500, damping: 30 },
  }),
};

export const progressRing: any = {
  initial: { pathLength: 0 },
  animate: (progress: number) => ({
    pathLength: progress,
    transition: { duration: 1, ease: [0.16, 1, 0.3, 1] },
  }),
};

export const shimmer: any = {
  initial: { backgroundPosition: '200% 0' },
  animate: {
    backgroundPosition: '-200% 0',
    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
  },
};

export const skeleton: any = {
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const revealOnScroll = (
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  delay = 0
): any => {
  const transforms = {
    up: { y: 50 },
    down: { y: -50 },
    left: { x: 50 },
    right: { x: -50 },
  };

  return {
    initial: { opacity: 0, ...transforms[direction] },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
    },
  };
};

export const createStagger = (stagger = 0.1, delayChildren = 0.1): any => ({
  animate: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

export const springConfig = {
  gentle: { type: 'spring', stiffness: 120, damping: 14 },
  wobbly: { type: 'spring', stiffness: 180, damping: 12 },
  stiff: { type: 'spring', stiffness: 500, damping: 30 },
  smooth: { type: 'spring', stiffness: 300, damping: 30 },
};