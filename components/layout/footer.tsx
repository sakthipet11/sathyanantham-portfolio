'use client';

import { Github, Linkedin, Mail, ArrowUpRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-2xl py-12 px-4 text-slate-400 text-sm font-mono relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Brand info */}
        <div className="flex flex-col gap-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2.5 text-white font-bold tracking-tight">
            <span>Sathyanantham V</span>
            <Badge variant="outline" className="font-mono text-[10px] uppercase text-cyan-400 border-cyan-500/30 bg-cyan-950/40">
              Lead Software Engineer
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Sathyanantham V. Built with Next.js 15, FastAPI & OpenRouter RAG.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
          <a
            href="/resume.pdf"
            download="Sathyanantham_V_Lead_Software_Engineer_Resume.pdf"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 hover:text-cyan-200 transition-colors backdrop-blur-sm shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Resume PDF</span>
          </a>

          <a
            href="mailto:v.sathyanantham@gmail.com"
            className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>v.sathyanantham@gmail.com</span>
          </a>

          <a
            href="https://www.linkedin.com/in/sathyanantham-v-646b911b/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span>LinkedIn</span>
            <ArrowUpRight className="w-3 h-3 text-slate-600" />
          </a>
          <a
            href="https://github.com/sakthipet11"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
            <ArrowUpRight className="w-3 h-3 text-slate-600" />
          </a>
        </div>

      </div>
    </footer>
  );
}