'use client';

import Link from 'next/link';
import { FileText, ArrowLeft, Download, RefreshCw, FileCode } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AdminResumesPage() {
  const resumeVersions = [
    { id: 1, name: 'Sathyanantham_V_Frontend_Architect_2026.pdf', role: 'Frontend Architect', score: '99%', updated: '2026-08-16' },
    { id: 2, name: 'Sathyanantham_V_AI_FullStack_Lead.pdf', role: 'AI-Assisted Lead Engineer', score: '96%', updated: '2026-08-14' },
    { id: 3, name: 'Sathyanantham_V_MicroFrontend_Specialist.pdf', role: 'Micro Frontend Architect', score: '98%', updated: '2026-08-11' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans transition-colors duration-300">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Resume & Cover Letter Generator
            </h1>
            <p className="text-xs text-muted-foreground font-mono">Driven by resume_agent & Google Drive MCP</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /> Re-Tailor Resume
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {resumeVersions.map((item) => (
          <div key={item.id} className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <FileCode className="w-6 h-6 text-primary" />
              <div>
                <div className="font-semibold text-foreground text-sm">{item.name}</div>
                <div className="text-xs text-muted-foreground font-mono">Target Role: {item.role} • Score: <span className="text-primary font-semibold">{item.score}</span></div>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-foreground text-xs font-medium transition-colors cursor-pointer">
              <Download className="w-3.5 h-3.5 text-primary" /> Download PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
