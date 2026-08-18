'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAITwin } from '@/hooks/useAITwin';
import { SentientSphereCanvas } from '@/components/canvas/SentientSphereCanvas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Terminal, ArrowRight, ArrowUpRight, Code2, ShieldCheck, Layers, Send, Download, FileText, Github, Linkedin, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAnalytics } from '@/components/providers';

export function HeroSection() {
  const { toggleAIDrawer, setAIDrawerOpen } = useAppStore();
  const { sendMessage } = useAITwin();
  const { trackEvent } = useAnalytics();
  const [promptInput, setPromptInput] = useState('');

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setAIDrawerOpen(true);
    sendMessage(promptInput);
    setPromptInput('');
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      {/* 3D Sentient Sphere Canvas */}
      <SentientSphereCanvas />

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        
        {/* Main Glassmorphism Card Wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/45 p-6 sm:p-10 md:p-12 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)]"
        >
          {/* Glass Gradient Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-indigo-500/5 pointer-events-none" />

          <div className="relative grid gap-10 lg:grid-cols-12 lg:gap-12 items-center">
            
            {/* Left Column: Hero Information */}
            <div className="space-y-6 lg:col-span-7 text-left">
              
              {/* Badge Header */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="inline-flex items-center gap-2 rounded-full border-cyan-500/40 bg-cyan-950/40 px-4 py-1.5 text-xs font-mono tracking-widest uppercase text-cyan-300 backdrop-blur">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  SYSTEM ARCHITECT & AI FRONTEND LEAD
                </Badge>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-[1.05]"
                >
                  Sathyanantham V
                  <span className="block bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent italic font-light text-2xl sm:text-4xl md:text-5xl mt-1">
                    AI Studio & Micro Frontends
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal"
                >
                  Over <strong className="text-white font-semibold">13+ years of enterprise experience</strong>. Currently leading 8 engineers at <strong className="text-cyan-400">Nextuple</strong> (OMS & Micro Frontends), formerly Senior Associate at <strong className="text-white">Cognizant</strong> (30+ Bayer AG global platforms & US Bank), and Dev Lead at <strong className="text-white">Skava/Infosys</strong>.
                </motion.p>
              </div>

              {/* Interactive AI Prompt Bar */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                onSubmit={handlePromptSubmit}
                className="w-full bg-slate-900/80 border border-slate-700/60 focus-within:border-cyan-400/80 rounded-2xl p-2 flex items-center gap-2 shadow-lg backdrop-blur-xl transition-all"
              >
                <div className="pl-3 text-cyan-400 font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5 shrink-0">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>AI Twin&gt;</span>
                </div>
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Ask: 'Tell me about Nextuple OMS or Bayer 30+ platforms...'"
                  className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono min-w-0"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="px-4 py-2 bg-cyan-400 text-slate-950 font-mono font-bold text-xs rounded-xl hover:bg-cyan-300 flex items-center gap-1 shrink-0"
                >
                  <span>Ask</span>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </motion.form>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap items-center gap-3 pt-2"
              >
                <a
                  href="/resume.pdf"
                  download="Sathyanantham_V_Lead_Software_Engineer_Resume.pdf"
                  onClick={() => trackEvent('resume_download', { source: 'hero' })}
                >
                  <Button size="default" className="gap-2 rounded-xl px-5 text-xs font-mono font-bold uppercase tracking-wider">
                    <Download className="w-4 h-4" />
                    <span>Download Resume PDF</span>
                  </Button>
                </a>

                <Button
                  variant="outline"
                  size="default"
                  onClick={toggleAIDrawer}
                  className="gap-2 rounded-xl border-slate-700/80 bg-slate-900/60 px-5 text-xs font-mono font-bold uppercase tracking-wider text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Interactive AI Twin</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <a href="#cover-letter">
                  <Button
                    variant="ghost"
                    size="default"
                    className="gap-2 rounded-xl px-4 text-xs font-mono text-slate-400 hover:text-white"
                  >
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Cover Letter</span>
                  </Button>
                </a>
              </motion.div>

            </div>

            {/* Right Column: Glass Profile Card */}
            <div className="lg:col-span-5 relative w-full">
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-cyan-500/20 via-indigo-500/10 to-transparent blur-3xl" />
              
              <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
                
                <div className="flex flex-col items-center text-center">
                  
                  {/* Glowing Avatar */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative mb-5"
                  >
                    <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/30 blur-2xl" />
                    <img
                      src="/avatar.jpg"
                      alt="Sathyanantham V"
                      className="relative h-28 w-28 rounded-full border-2 border-cyan-400/80 object-cover shadow-[0_0_30px_rgba(56,189,248,0.3)]"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="space-y-1"
                  >
                    <h3 className="text-xl font-bold tracking-tight text-white">
                      Sathyanantham V
                    </h3>
                    <p className="text-xs font-mono uppercase tracking-[0.25em] text-cyan-400">
                      Lead Engineer · Architect
                    </p>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mt-3 text-xs leading-relaxed text-slate-300 max-w-xs"
                  >
                    Specializing in high-scale Micro Frontends, Order Management Systems, and AI Digital Twin automation.
                  </motion.p>

                </div>

                {/* Social & Contact Glass Links */}
                <div className="mt-6 flex flex-col gap-2.5">
                  {[
                    { label: 'LinkedIn', handle: 'Sathyanantham V', href: 'https://linkedin.com/in/sathyanantham-v', icon: Linkedin },
                    { label: 'GitHub', handle: 'sakthipet11', href: 'https://github.com/sakthipet11', icon: Github },
                    { label: 'Email', handle: 'sakthipet11@gmail.com', href: 'mailto:sakthipet11@gmail.com', icon: Mail }
                  ].map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-2.5 text-left transition-all hover:border-cyan-500/50 hover:bg-slate-900/90 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-950 text-cyan-400 shadow-sm group-hover:border-cyan-400/50 transition-colors">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-white font-mono">{social.label}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{social.handle}</p>
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-cyan-400" />
                      </a>
                    );
                  })}
                </div>

              </div>
            </div>

          </div>

          {/* Brutalist Glass Stat Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-10 mt-8 border-t border-slate-800/80"
          >
            {[
              { tag: '01 // EXP', val: '13+ Years', label: 'Lead Full-Stack & AI', icon: Terminal },
              { tag: '02 // WORK', val: '50+ Projects', label: 'Nextuple, Bayer, Kohls', icon: Layers },
              { tag: '03 // STACK', val: '30+ Tools', label: 'React 19, Python, RAG', icon: Code2 },
              { tag: '04 // AWARDS', val: '5x Top Star', label: 'Nextuple 2023 & Cognizant', icon: ShieldCheck }
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/70 backdrop-blur-md hover:border-cyan-500/50 transition-all duration-300 flex flex-col items-start text-left gap-1 group hover:-translate-y-0.5"
              >
                <span className="text-[10px] font-mono text-cyan-400/80 tracking-widest">{item.tag}</span>
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight font-mono group-hover:text-cyan-300 transition-colors">
                  {item.val}
                </span>
                <span className="text-xs text-slate-400 font-medium">{item.label}</span>
              </div>
            ))}
          </motion.div>

        </motion.div>

      </div>
    </section>
  );
}
