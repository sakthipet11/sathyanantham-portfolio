"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Ambient background for the black/white/terracotta system.
 * Two things happening, both quiet:
 *  1. Two slow-drifting terracotta blobs — same accent as the hero's
 *     "AI Twin Ready" status dot, just stretched out to room-sized scale.
 *  2. A fixed grain layer so pure black/white don't read flat on screens.
 *
 * Drop this once near the root layout, behind all page content:
 *   <AnimatedBackground />
 *   <main>...</main>
 */
export function BackgroundAurora() {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const blobTransition = (duration: number, delay = 0) =>
    prefersReducedMotion
      ? { duration: 0 }
      : {
        duration,
        delay,
        repeat: Infinity,
        repeatType: "mirror" as const,
        ease: "easeInOut" as const,
      };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {/* blob 1 */}
      <motion.div
        className="absolute -left-[10%] top-[8%] h-[38vw] w-[38vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
          filter: "blur(90px)",
          opacity: 0.12,
        }}
        animate={
          prefersReducedMotion
            ? undefined
            : {
              x: ["0%", "8%", "-4%", "0%"],
              y: ["0%", "6%", "10%", "0%"],
              scale: [1, 1.08, 0.96, 1],
            }
        }
        transition={blobTransition(24)}
      />

      {/* blob 2 */}
      <motion.div
        className="absolute -right-[8%] bottom-[4%] h-[32vw] w-[32vw] rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
          filter: "blur(100px)",
          opacity: 0.08,
        }}
        animate={
          prefersReducedMotion
            ? undefined
            : {
              x: ["0%", "-6%", "4%", "0%"],
              y: ["0%", "-8%", "-2%", "0%"],
              scale: [1, 0.94, 1.06, 1],
            }
        }
        transition={blobTransition(28, 2)}
      />

      {/* grain — fixed, not animated; keeps flat black/white from looking like a screenshot */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.035] dark:opacity-[0.05]">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </div>
  );
}