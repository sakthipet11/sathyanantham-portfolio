'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Download, FileText, Sparkles, UserCheck, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const PHILOSOPHY_STATEMENTS = [
  "I architect frontend systems that scale effortlessly.",
  "Interfaces should feel immediate and inevitable.",
  "Engineering standards are crystallized quality.",
  "AI agents augment human engineering velocity.",
  "13+ years delivering high-availability software."
];

export function CoverLetterSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-50%']);
  const smoothX = useSpring(x, { stiffness: 100, damping: 30 });

  return (
    <section id="cover-letter" className="py-20 relative z-10 overflow-hidden">
      
      {/* Horizontal Philosophy Marquee Scroll */}
      <div ref={containerRef} className="relative py-12 bg-card/40 border-y border-border/80 backdrop-blur-xl mb-16">
        <div className="px-6 md:px-12 mb-4 max-w-7xl mx-auto">
          <Badge variant="outline" className="font-mono text-xs tracking-[0.3em] uppercase text-primary border-primary/30 bg-primary/10">
            // 01. PHILOSOPHY & INTENT
          </Badge>
        </div>
        <div className="flex items-center overflow-hidden whitespace-nowrap">
          <motion.div style={{ x: smoothX }} className="flex gap-16 md:gap-24 px-6 md:px-12">
            {PHILOSOPHY_STATEMENTS.map((stmt, idx) => (
              <p
                key={idx}
                className="text-3xl md:text-5xl lg:text-6xl font-mono font-bold tracking-tight text-foreground/90"
                style={{
                  WebkitTextStroke: idx % 2 === 0 ? 'none' : '1px currentColor',
                  color: idx % 2 === 0 ? 'var(--color-primary)' : 'transparent'
                }}
              >
                {stmt}
              </p>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Main Glass Cover Letter Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="p-8 sm:p-12 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-2xl relative overflow-hidden shadow-2xl space-y-8"
        >
          {/* Glass Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/5 pointer-events-none" />

          <div className="relative flex flex-wrap items-center justify-between gap-6 border-b border-border/80 pb-8">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 text-primary font-mono text-xs font-bold shadow-sm">
                STATEMENT
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  Sathyanantham V — Lead Software Engineer Statement
                </h3>
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  Target: Lead Software Engineer / Frontend Architect / AI-Enabled Full Stack Lead
                </p>
              </div>
            </div>

            {/* Download Action Button */}
            <a
              href="/resume.pdf"
              download="Sathyanantham_V_Lead_Software_Engineer_Resume.pdf"
            >
              <Button size="default" className="gap-2 rounded-xl px-5 text-xs font-mono font-bold uppercase tracking-wider">
                <Download className="w-4 h-4" />
                <span>Download Resume PDF</span>
              </Button>
            </a>
          </div>

          {/* Letter Body */}
          <div className="relative space-y-4 text-foreground/80 text-sm sm:text-base leading-relaxed">
            <p>
              With over <strong className="text-foreground">13+ years of enterprise software engineering experience</strong>, I specialize in designing, architecting, and delivering high-performance frontend applications, digital commerce platforms, and Order Management solutions for global clients across <strong className="text-primary font-mono">Retail, E-Commerce, Banking, and Life Sciences</strong>.
            </p>
            <p>
              My core passion centers on <strong className="text-foreground">Frontend Architecture</strong>—building scalable React.js applications, Micro Frontend platforms, reusable UI Extensibility frameworks, and enterprise design systems that dramatically boost developer velocity and system maintainability.
            </p>
            <p>
              In my current role at <strong className="text-primary font-mono">Nextuple Private Ltd</strong>, I lead an engineering team of 8 developers. My responsibilities span mentoring frontend and backend engineers, driving technical architecture, reviewing code, setting engineering governance standards, and delivering Nextuple Enterprise Order Management Systems (SKU Ranking Service, Promise Engine, and Staging Apps).
            </p>
          </div>

          {/* Strategic Initiatives Grid */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/80">
            <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-md hover:border-primary/40 transition-colors space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-primary font-bold">
                <Sparkles className="w-4 h-4" />
                <span>// ENTERPRISE AI & CLAUDE SKILLS</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Integrated IBM AI-powered chatbots into Call Center applications and built custom <strong className="text-foreground">Claude Skills</strong> for engineering teams to automate architectural reviews and code generation workflows.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-md hover:border-indigo-500/40 transition-colors space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-indigo-500 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>// FULL-STACK INTEGRATION & OMS</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Contributed to backend development using Node.js, Python, and Spring Boot, integrating with <strong className="text-foreground">IBM Sterling OMS</strong> and high-throughput commerce services.
              </p>
            </div>
          </div>

          {/* Footer Status */}
          <div className="relative pt-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Available for Lead Engineering & Architectural Roles</span>
            </div>

            <a
              href="/resume.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline transition-all"
            >
              <span>View Full Resume Online</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </motion.div>
      </div>

    </section>
  );
}
