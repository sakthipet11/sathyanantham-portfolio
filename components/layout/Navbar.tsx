'use client';

import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { Sparkles, Download } from 'lucide-react';
import Link from 'next/link';
import { useAnalytics } from '@/components/providers';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function Navbar() {
  const { toggleAIDrawer, isSathyananthamOnline } = useAppStore();
  const { trackEvent } = useAnalytics();

  const handleResumeDownload = () => {
    trackEvent('resume_download', { source: 'navbar' });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-3.5 bg-background/70 backdrop-blur-2xl border-b border-border/60 transition-all duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo & Avatar */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-primary/60 group-hover:border-primary shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-colors shrink-0">
            <Image
              src="/avatar.jpg"
              alt="Sathyanantham V"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground tracking-tight group-hover:text-primary transition-colors font-mono">
              Sathyanantham V
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isSathyananthamOnline ? 'bg-emerald-400 animate-pulse' : 'bg-primary'}`} />
              <span className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
                {isSathyananthamOnline ? 'Status: Online' : 'Status: AI Twin Ready'}
              </span>
            </div>
          </div>
        </Link>

        {/* Glass Nav Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-mono text-muted-foreground uppercase tracking-wider bg-card/60 px-5 py-2 rounded-full border border-border/60 backdrop-blur-md">
          <Link href="#cover-letter" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="opacity-40">//</span> <span>01.Statement</span>
          </Link>
          <Link href="#experience" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="opacity-40">//</span> <span>02.Experience</span>
          </Link>
          <Link href="#projects" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="opacity-40">//</span> <span>03.Projects</span>
          </Link>
          <Link href="#skills" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="opacity-40">//</span> <span>04.Stack</span>
          </Link>
          <Link href="#contact" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="opacity-40">//</span> <span>05.Contact</span>
          </Link>
        </nav>

        {/* Action CTAs & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Light/Dark Mode Theme Toggle */}
          <ThemeToggle />

          {/* Resume Download Button */}
          <a
            href="/resume.pdf"
            download="Sathyanantham_V_Lead_Software_Engineer_Resume.pdf"
            onClick={handleResumeDownload}
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono font-bold rounded-xl">
              <Download className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Download Resume</span>
              <span className="sm:hidden">Resume</span>
            </Button>
          </a>

          {/* AI Twin Trigger CTA */}
          <Button
            onClick={toggleAIDrawer}
            size="sm"
            className="gap-2 text-xs font-mono font-bold rounded-xl group"
          >
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
            <span className="hidden sm:inline">Launch AI Twin</span>
            <span className="sm:hidden">AI Twin</span>
          </Button>
        </div>

      </div>
    </header>
  );
}
