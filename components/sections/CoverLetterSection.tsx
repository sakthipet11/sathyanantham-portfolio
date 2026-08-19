'use client';

import { motion } from 'framer-motion';
import { Download, Sparkles, UserCheck, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CoverLetterSection() {
  return (
    <section id="cover-letter" className="py-16 md:py-24 relative z-10 overflow-hidden">
      
      {/* EDITORIAL SECTION 1: PHILOSOPHY & INTENT */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 mb-12 md:mb-16">
        
        {/* Subtle Non-Numbered Label */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="font-serif italic text-base sm:text-lg text-primary/90 tracking-wide block">
            Philosophy & Intent
          </span>
        </motion.div>

        {/* Two-Zone Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          
          {/* Main Isolated Pull-Quote (Left / Primary Zone - 7 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-7 space-y-6"
          >
            <blockquote className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal leading-[1.2] text-foreground tracking-tight">
              Interfaces should feel{' '}
              <span className="text-primary italic font-serif">immediate</span> and{' '}
              <span className="underline decoration-primary/40 underline-offset-8">inevitable</span>.
            </blockquote>
            
            <div className="w-16 h-px bg-primary/40 my-6" />
          </motion.div>

          {/* Supporting Philosophy Statements (Right / Secondary Zone - 5 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 space-y-6 pt-2 lg:pt-4"
          >
            <p className="text-base sm:text-lg text-muted-foreground font-sans leading-relaxed">
              I architect frontend systems that scale effortlessly across enterprise boundaries, crystallizing engineering quality into reusable frameworks.
            </p>

            <ul className="space-y-4 text-sm text-muted-foreground font-sans border-l border-border/80 pl-5">
              <li className="leading-relaxed">
                <strong className="text-foreground font-medium">Scalable Micro Frontends:</strong> Modular architecture for 30+ enterprise platforms.
              </li>
              <li className="leading-relaxed">
                <strong className="text-foreground font-medium">AI Engineering Velocity:</strong> Augmenting developer workflows with custom Claude skills.
              </li>
              <li className="leading-relaxed">
                <strong className="text-foreground font-medium">13+ Years Proven Scale:</strong> Nextuple Order Management, Bayer, and Kohl&apos;s E-Commerce.
              </li>
            </ul>

            <div className="pt-2">
              <a href="#contact">
                <Button variant="outline" size="sm" className="gap-2 rounded-xl text-xs font-medium border-border/80 hover:border-primary/50">
                  <span>Explore Direct Collaboration</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                </Button>
              </a>
            </div>
          </motion.div>

        </div>
      </div>

      {/* EDITORIAL SECTION 2: STATEMENT */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="p-8 sm:p-14 rounded-3xl border border-border/80 bg-card/60 backdrop-blur-2xl relative overflow-hidden shadow-xl space-y-10"
        >
          {/* Subtle Ambient Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          {/* Header Row */}
          <div className="relative flex flex-wrap items-center justify-between gap-6 border-b border-border/70 pb-8">
            <div>
              <span className="font-serif italic text-sm text-primary block mb-1">Architectural Statement</span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Sathyanantham V — Lead Software Engineer
              </h3>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Target: Lead Software Engineer / Frontend Architect / AI-Enabled Full Stack Lead
              </p>
            </div>

            {/* Download Action Button */}
            <a
              href="/resume.pdf"
              download="Sathyanantham_V_Lead_Software_Engineer_Resume.pdf"
            >
              <Button size="default" className="gap-2 rounded-xl px-5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs">
                <Download className="w-4 h-4" />
                <span>Download Resume PDF</span>
              </Button>
            </a>
          </div>

          {/* Featured Serif Pull-Quote */}
          <div className="relative">
            <p className="font-serif text-2xl sm:text-3xl text-foreground font-normal leading-snug tracking-tight max-w-3xl">
              &ldquo;Engineering standards are <span className="text-primary italic font-serif">crystallized quality</span> — built over 13+ years delivering high-availability enterprise platforms.&rdquo;
            </p>
          </div>

          {/* Supporting Letter Body */}
          <div className="relative space-y-5 text-muted-foreground text-sm sm:text-base leading-relaxed font-sans max-w-3xl">
            <p>
              With over <strong className="text-foreground font-semibold">13+ years of enterprise software engineering experience</strong>, I specialize in designing, architecting, and delivering high-performance frontend applications, digital commerce platforms, and Order Management solutions for global leaders across <strong className="text-foreground font-semibold">Retail, E-Commerce, Banking, and Life Sciences</strong>.
            </p>
            <p>
              My core passion centers on <strong className="text-foreground font-semibold">Frontend Architecture</strong>—building scalable React.js applications, Micro Frontend platforms, reusable UI Extensibility frameworks, and enterprise design systems that dramatically boost developer velocity and system maintainability.
            </p>
            <p>
              At <strong className="text-foreground font-semibold">Nextuple Private Ltd</strong>, I lead an engineering team of 8 developers. My responsibilities span mentoring engineers, driving technical architecture, setting engineering governance standards, and delivering Nextuple Enterprise Order Management Systems (SKU Ranking Service, Promise Engine, and Staging Apps).
            </p>
          </div>

          {/* Strategic Initiatives Grid */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-border/70">
            <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-md hover:border-primary/40 transition-colors space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-primary font-semibold">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>ENTERPRISE AI & CLAUDE SKILLS</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Integrated IBM AI-powered chatbots into Call Center applications and built custom <strong className="text-foreground">Claude Skills</strong> for engineering teams to automate architectural reviews and code generation workflows.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-muted/40 border border-border/60 backdrop-blur-md hover:border-primary/40 transition-colors space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-primary font-semibold">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>FULL-STACK INTEGRATION & OMS</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Contributed to backend development using Node.js, Python, and Spring Boot, integrating with <strong className="text-foreground">IBM Sterling OMS</strong> and high-throughput commerce services.
              </p>
            </div>
          </div>

          {/* Footer Status */}
          <div className="relative pt-4 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground font-mono border-t border-border/60">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              <span>Available for Lead Engineering & Architectural Roles</span>
            </div>

            <a
              href="/resume.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline transition-all font-medium"
            >
              <span>View Full Resume Online</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
            </a>
          </div>

        </motion.div>
      </div>

    </section>
  );
}
