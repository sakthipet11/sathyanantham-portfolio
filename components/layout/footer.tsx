'use client';

import { Github, Linkedin, Mail, ArrowUpRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-card/60 backdrop-blur-xl py-10 px-4 text-muted-foreground text-xs relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">

        {/* Brand info */}
        <div className="flex flex-col gap-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2.5 text-foreground font-semibold tracking-tight">
            <span>Sathyanantham V</span>
            <Badge variant="default" className="text-[10px] font-mono uppercase bg-primary/10 text-primary border-primary/20">
              Lead Software Engineer
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-sans">
            © {new Date().getFullYear()} Sathyanantham V. Built with Next.js 15, FastAPI & OpenRouter RAG.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
          <a
            href="/resume.pdf"
            download="Sathyanantham_V_Lead_Software_Engineer_Resume.pdf"
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl font-medium">
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Download Resume PDF</span>
            </Button>
          </a>

          <a
            href="mailto:v.sathyanantham@gmail.com"
            className="flex items-center gap-1.5 hover:text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-muted/50"
          >
            <Mail className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono">v.sathyanantham@gmail.com</span>
          </a>

          <a
            href="https://www.linkedin.com/in/sathyanantham-v-646b911b/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-muted/50"
          >
            <Linkedin className="w-3.5 h-3.5 text-primary" />
            <span>LinkedIn</span>
            <ArrowUpRight className="w-3 h-3 text-primary opacity-80" />
          </a>
          <a
            href="https://github.com/sakthipet11"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-muted/50"
          >
            <Github className="w-3.5 h-3.5 text-primary" />
            <span>GitHub</span>
            <ArrowUpRight className="w-3 h-3 text-primary opacity-80" />
          </a>
        </div>

      </div>
    </footer>
  );
}