'use client';

import { motion } from 'framer-motion';

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
        className={`flex gap-8 ${direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'}`}
        style={{ width: 'fit-content' }}
      >
        {duplicatedItems.map((item, index) => (
          <span
            key={index}
            className="group font-mono text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight whitespace-nowrap cursor-default transition-all duration-300"
            style={{
              WebkitTextStroke: '1px rgba(255,255,255,0.25)',
              color: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#38bdf8';
              (e.currentTarget.style as any).WebkitTextStroke = 'none';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'transparent';
              (e.currentTarget.style as any).WebkitTextStroke = '1px rgba(255,255,255,0.25)';
            }}
          >
            {item}
            <span className="mx-8 text-cyan-500/30">•</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function TechMarquee() {
  return (
    <section className="relative py-24 overflow-hidden md:py-32 bg-slate-950/60 border-y border-slate-800/80 z-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="px-6 md:px-12 mb-8 max-w-7xl mx-auto"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-cyan-400 mb-2 uppercase">
          // 05. TECHNICAL ARSENAL & CONCEPTS
        </p>
        <h2 className="font-sans text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
          Engineering Matrix & Core Competencies
        </h2>
      </motion.div>

      {/* Marquee Rows */}
      <div className="space-y-2">
        <MarqueeRow items={TECH_ITEMS} direction="left" />
        <MarqueeRow items={CONCEPT_ITEMS} direction="right" />
      </div>
    </section>
  );
}
