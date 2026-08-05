'use client';

import Link from 'next/link';
import { Github, Linkedin, Mail, ArrowUpRight, Download, FileText } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-12 px-4 text-slate-400 text-sm font-mono">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Brand info */}
        <div className="flex flex-col gap-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-white font-bold tracking-tight">
            <span>Sathyanantham V</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
              Lead Software Engineer
            </span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Resume PDF</span>
          </a>

          <a
            href="mailto:v.sathyanantham@gmail.com"
            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
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
          <a href='https://github.com/sakthipet11'
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