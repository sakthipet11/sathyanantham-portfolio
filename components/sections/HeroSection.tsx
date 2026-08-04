'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAITwin } from '@/hooks/useAITwin';
import { SentientSphereCanvas } from '@/components/canvas/SentientSphereCanvas';
import { Sparkles, Terminal, ArrowRight, Code2, ShieldCheck, Layers, Send, Download, FileText } from 'lucide-react';
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
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-4 sm:px-6 overflow-hidden bg-[#050505]">
      
      {/* 3D Noise Shader Sentient Sphere Background matching Reference Template */}
      <SentientSphereCanvas />

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center gap-8">
        
        {/* Terminal Header Tag */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md bg-slate-950/90 border border-slate-800 text-xs font-mono text-cyan-400 shadow-2xl backdrop-blur-md"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>SYSTEM_INIT :: SATHYANANTHAM_V_DIGITAL_TWIN</span>
        </motion.div>

        {/* Oversized Brutalist Headline matching Reference Template Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white uppercase leading-[0.95]"
        >
          SYSTEM ARCHITECT & <br />
          <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent italic font-light">
            AI FRONTEND LEAD
          </span>
        </motion.h1>

        {/* Career Summary Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-300 text-sm sm:text-base md:text-lg max-w-3xl leading-relaxed font-normal"
        >
          Over <strong className="text-white">13+ years of experience</strong> engineering high-scale enterprise systems. Currently leading a team of 8 engineers at <strong className="text-cyan-400">Nextuple</strong> (OMS & Micro Frontends), formerly Senior Associate at <strong className="text-white">Cognizant</strong> (30+ Bayer platforms & US Bank), and Dev Lead at <strong className="text-white">Skava/Infosys</strong>. Practitioner in Generative AI, Claude Skills, & IBM AI integrations.
        </motion.p>

        {/* Hero Interactive Terminal Input Box */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          onSubmit={handlePromptSubmit}
          className="w-full max-w-2xl bg-slate-950/90 border border-cyan-500/30 rounded-xl p-2 flex items-center gap-2 shadow-[0_0_30px_rgba(56,189,248,0.15)] focus-within:border-cyan-400 transition-all backdrop-blur-md"
        >
          <div className="pl-3 text-cyan-400 font-mono text-sm font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>AI&gt;</span>
          </div>
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ask AI Twin: 'Tell me about Nextuple Order Management or Bayer platforms...'"
            className="flex-1 bg-transparent border-none text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-400 text-slate-950 font-mono font-bold text-xs rounded-lg hover:bg-cyan-300 transition-colors flex items-center gap-1 shrink-0"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </motion.form>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="/resume.pdf"
            download="Sathyanantham_V_Lead_Software_Engineer_Resume.pdf"
            onClick={() => trackEvent('resume_download', { source: 'hero' })}
            className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-mono font-bold tracking-wider uppercase text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all duration-300"
          >
            <Download className="w-4 h-4" />
            <span>Download Resume PDF</span>
          </a>

          <button
            onClick={toggleAIDrawer}
            className="group relative inline-flex items-center gap-2 px-6 py-3.5 text-xs font-mono font-bold tracking-wider uppercase text-slate-200 bg-slate-950 border border-slate-700/80 rounded-lg hover:border-cyan-400 hover:text-cyan-300 transition-all duration-300"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform" />
            <span>Interactive AI Twin</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <a
            href="#cover-letter"
            className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-mono font-bold tracking-wider uppercase text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg hover:border-slate-600 hover:text-white transition-all duration-300"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Cover Letter</span>
          </a>
        </motion.div>

        {/* Brutalist Stat Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full pt-10"
        >
          {[
            { tag: '01 // EXP', val: '13+ Years', label: 'Lead Full-Stack & AI', icon: Terminal },
            { tag: '02 // WORK', val: '50+ Projects', label: 'Nextuple, Bayer, Kohls', icon: Layers },
            { tag: '03 // STACK', val: '30+ Tools', label: 'React 19, Python, RAG', icon: Code2 },
            { tag: '04 // AWARDS', val: '5x Top Star', label: 'Nextuple 2023 & Cognizant', icon: ShieldCheck }
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl hover:border-cyan-500/50 transition-all duration-300 flex flex-col items-start text-left gap-1 group"
            >
              <span className="text-[10px] font-mono text-slate-500 tracking-widest">{item.tag}</span>
              <span className="text-2xl font-black text-white tracking-tight font-mono group-hover:text-cyan-400 transition-colors">
                {item.val}
              </span>
              <span className="text-xs text-slate-400 font-medium">{item.label}</span>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
