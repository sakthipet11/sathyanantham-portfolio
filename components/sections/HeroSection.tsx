'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAITwin } from '@/hooks/useAITwin';
import { SentientSphereCanvas } from '@/components/canvas/SentientSphereCanvas';
import { TripleDTopBar } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowDown, Mail, Terminal, Send, ShieldCheck, Layers, Code2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function HeroSection() {
  const { toggleAIDrawer, setAIDrawerOpen } = useAppStore();
  const { sendMessage } = useAITwin();
  const [promptInput, setPromptInput] = useState('');

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setAIDrawerOpen(true);
    sendMessage(promptInput);
    setPromptInput('');
  };

  return (
    <section id="hero" className="relative min-h-[92vh] flex flex-col items-center justify-center pt-24 pb-16 px-4 sm:px-6 bg-grid-pattern overflow-hidden">
      
      {/* 3D Shader Sphere Canvas Background */}
      <SentientSphereCanvas />

      {/* TripleD Top Floating Tool Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-6 left-6 z-30"
      >
        <TripleDTopBar />
      </motion.div>

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
        
        {/* Centered Avatar Sphere Holder matching TripleD sample image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative mt-4 mb-2"
        >
          <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full border-2 border-primary/60 p-1 bg-background/80 shadow-[0_0_40px_rgba(56,189,248,0.25)] backdrop-blur-xl">
            <img
              src="/avatar.jpg"
              alt="Sathyanantham V"
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        </motion.div>

        {/* System Tag */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Badge variant="outline" className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-primary border-primary/30 bg-primary/10 backdrop-blur-md">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            SYSTEM ARCHITECT & LEAD FRONTEND ENGINEER
          </Badge>
        </motion.div>

        {/* TripleD Oversized Title Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-foreground uppercase leading-[1.0]"
        >
          Full Stack Lead <br />
          <span className="bg-gradient-to-r from-primary via-sky-400 to-indigo-500 bg-clip-text text-transparent italic font-light">
            & System Architect
          </span>
        </motion.h1>

        {/* Subtitle matching TripleD styling */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-muted-foreground text-base sm:text-lg max-w-2xl leading-relaxed font-normal"
        >
          Crafting high-scale enterprise applications with modern technologies. Over 13+ years experience leading <strong className="text-foreground font-semibold">Nextuple Order Management</strong>, <strong className="text-primary font-semibold">30+ Bayer platforms</strong>, and <strong className="text-foreground font-semibold">Kohl’s E-Commerce</strong>.
        </motion.p>

        {/* Dual Primary & Secondary Action CTAs matching TripleD Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <a href="#contact">
            <Button size="lg" className="gap-2 rounded-xl font-medium px-7 shadow-lg">
              <Mail className="w-4 h-4" />
              <span>Get in Touch</span>
            </Button>
          </a>

          <a href="#projects">
            <Button variant="outline" size="lg" className="gap-2 rounded-xl font-medium px-7">
              <span>View Projects</span>
              <ArrowDown className="w-4 h-4" />
            </Button>
          </a>
        </motion.div>

        {/* Interactive AI Twin Prompt Bar */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          onSubmit={handlePromptSubmit}
          className="w-full max-w-xl mt-4 bg-card/80 border border-border/80 rounded-2xl p-2 flex items-center gap-2 shadow-lg backdrop-blur-xl transition-all focus-within:border-primary/80"
        >
          <div className="pl-3 text-primary font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-4 h-4" />
            <span>AI Twin&gt;</span>
          </div>
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ask AI: 'Tell me about Nextuple OMS or Bayer 30+ platforms...'"
            className="flex-1 bg-transparent border-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none font-mono min-w-0"
          />
          <Button
            type="submit"
            size="sm"
            className="px-4 py-2 font-mono font-bold text-xs rounded-xl flex items-center gap-1 shrink-0"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </motion.form>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-8 mt-4 border-t border-border/60"
        >
          {[
            { tag: '01 // EXP', val: '13+ Years', label: 'Lead Full-Stack & AI', icon: Terminal },
            { tag: '02 // WORK', val: '50+ Projects', label: 'Nextuple, Bayer, Kohls', icon: Layers },
            { tag: '03 // STACK', val: '30+ Tools', label: 'React 19, Python, RAG', icon: Code2 },
            { tag: '04 // AWARDS', val: '5x Top Star', label: 'Nextuple 2023 & Cognizant', icon: ShieldCheck }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-card/60 border border-border/60 backdrop-blur-md hover:border-primary/50 transition-all duration-300 flex flex-col items-center sm:items-start text-center sm:text-left gap-1 group"
            >
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">{item.tag}</span>
              <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-mono group-hover:text-primary transition-colors">
                {item.val}
              </span>
              <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
