'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Download, FileText, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';

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
      
      {/* Horizontal Philosophy Marquee Scroll matching template About.tsx */}
      <div ref={containerRef} className="relative py-12 bg-slate-950/80 border-y border-slate-800/80 mb-16">
        <div className="px-6 md:px-12 mb-4 max-w-7xl mx-auto">
          <p className="font-mono text-xs tracking-[0.3em] text-cyan-400 uppercase">// 01. PHILOSOPHY & INTENT</p>
        </div>
        <div className="flex items-center overflow-hidden whitespace-nowrap">
          <motion.div style={{ x: smoothX }} className="flex gap-16 md:gap-24 px-6 md:px-12">
            {PHILOSOPHY_STATEMENTS.map((stmt, idx) => (
              <p
                key={idx}
                className="text-3xl md:text-5xl lg:text-6xl font-mono font-bold tracking-tight text-white/90"
                style={{
                  WebkitTextStroke: idx % 2 === 0 ? 'none' : '1px rgba(255,255,255,0.3)',
                  color: idx % 2 === 0 ? '#38bdf8' : 'transparent'
                }}
              >
                {stmt}
              </p>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Main Cover Letter Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="p-8 sm:p-10 rounded-2xl bg-slate-950/90 border border-slate-800 backdrop-blur-xl relative overflow-hidden group shadow-2xl space-y-6"
        >
          {/* Ambient Top Laser Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500" />

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">
                STATEMENT
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight font-mono">
                  Sathyanantham V — Lead Software Engineer Statement
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Application: Lead Software Engineer / Frontend Architect / AI-Enabled Full Stack Engineer
                </p>
              </div>
            </div>

            {/* Resume Download Action Button */}
            <a
              href="/resume.pdf"
              download="Sathyanantham_V_Lead_Software_Engineer_Resume.pdf"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-mono font-bold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all duration-300 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Resume PDF</span>
            </a>
          </div>

          {/* Letter Body */}
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p>
              With over <strong className="text-white">13+ years of enterprise software engineering experience</strong>, I specialize in designing, architecting, and delivering high-performance frontend applications, digital commerce platforms, and Order Management solutions for global clients across <strong className="text-cyan-300 font-mono">Retail, E-Commerce, Banking, and Life Sciences</strong>.
            </p>
            <p>
              My core passion centers on <strong className="text-white">Frontend Architecture</strong>—building scalable React.js applications, Micro Frontend platforms, reusable UI Extensibility frameworks, and enterprise design systems that dramatically boost developer velocity and system maintainability.
            </p>
            <p>
              In my current role at <strong className="text-cyan-400 font-mono">Nextuple Private Ltd</strong>, I lead an engineering team of 8 developers. My responsibilities span mentoring frontend and backend engineers, driving technical architecture, reviewing code, setting engineering governance standards, and delivering Nextuple Enterprise Order Management Systems (SKU Ranking Service, Promise Engine, and Staging Apps).
            </p>
          </div>

          {/* Key Strategic Initiatives Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-cyan-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>// ENTERPRISE AI & CLAUDE SKILLS</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Integrated IBM AI-powered chatbots into Call Center applications and built custom <strong className="text-white">Claude Skills</strong> for engineering teams to automate architectural reviews and code generation workflows.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-indigo-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>// FULL-STACK INTEGRATION & OMS</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Contributed to backend development using Node.js, Python, and Spring Boot, integrating with <strong className="text-white">IBM Sterling OMS</strong> and high-throughput commerce services.
              </p>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Available for Lead Engineering & Architectural Roles</span>
            </div>

            <a
              href="/resume.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Full Resume PDF Online</span>
            </a>
          </div>

        </motion.div>
      </div>

    </section>
  );
}
