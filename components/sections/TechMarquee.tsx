'use client';

import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

const TECH_ITEMS = [
  'NEXT.JS 15',
  'REACT 19',
  'TYPESCRIPT',
  'PYTHON 3.12+',
  'OPENROUTER AI',
  'RAG PIPELINES',
  'FASTAPI',
  'MICRO FRONTENDS',
  'CLAUDE SKILLS',
  'IBM STERLING OMS',
  'THREE.JS / WEBGL',
  'TAILWIND CSS V4'
];

const CONCEPT_ITEMS = [
  'SYSTEM ARCHITECTURE',
  'ENTERPRISE UI ECOSYSTEM',
  'ORDER MANAGEMENT',
  'AI AGENTS & MCP',
  'ACCESSIBILITY WCAG AA',
  'REUSEABLE FRAMEWORKS',
  'PROMISE ENGINE',
  'HIGH-SCALE COMMERCE',
  'TECHNICAL MENTORSHIP',
  'CODE GOVERNANCE',
  'STREAMING SSE',
  'PERFORMANCE VELOCITY'
];

function MarqueeRow({ items, direction = 'left' }: { items: string[]; direction?: 'left' | 'right' }) {
  const duplicatedItems = [...items, ...items, ...items, ...items];

  return (
    <div className="relative overflow-hidden py-4">
      <motion.div
        className={`flex items-center gap-6 ${direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'}`}
        style={{ width: 'fit-content' }}
      >
        {duplicatedItems.map((item, index) => (
          <div key={index} className="flex items-center gap-6 shrink-0">
            <Badge
              variant="outline"
              className="px-5 py-2.5 text-xs sm:text-sm font-mono tracking-wider font-semibold rounded-2xl bg-card/60 border-border/80 text-foreground shadow-xs backdrop-blur-md hover:border-primary hover:text-primary transition-all duration-200 cursor-default"
            >
              {item}
            </Badge>
            <span className="text-primary/40 font-mono text-sm">•</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function TechMarquee() {
  return (
    <section className="relative py-14 md:py-20 overflow-hidden bg-card/40 border-y border-border/70 backdrop-blur-xl z-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="px-6 md:px-12 mb-8 max-w-7xl mx-auto"
      >
        <Badge variant="default" className="font-mono text-xs tracking-wider uppercase mb-2 bg-primary/10 text-primary border-primary/20">
          TECHNICAL ARSENAL & CONCEPTS
        </Badge>
        <h2 className="font-sans text-3xl md:text-5xl font-black text-foreground uppercase tracking-tight">
          Engineering Matrix & Core Competencies
        </h2>
      </motion.div>

      {/* Marquee Rows */}
      <div className="space-y-4">
        <MarqueeRow items={TECH_ITEMS} direction="left" />
        <MarqueeRow items={CONCEPT_ITEMS} direction="right" />
      </div>
    </section>
  );
}
