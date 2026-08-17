'use client';

import Link from 'next/link';
import { FileText, ArrowLeft, Download, RefreshCw, FileCode } from 'lucide-react';

export default function AdminResumesPage() {
  const resumeVersions = [
    { id: 1, name: 'Sathyanantham_V_Frontend_Architect_2026.pdf', role: 'Frontend Architect', score: '99%', updated: '2026-08-16' },
    { id: 2, name: 'Sathyanantham_V_AI_FullStack_Lead.pdf', role: 'AI-Assisted Lead Engineer', score: '96%', updated: '2026-08-14' },
    { id: 3, name: 'Sathyanantham_V_MicroFrontend_Specialist.pdf', role: 'Micro Frontend Architect', score: '98%', updated: '2026-08-11' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" /> Resume & Cover Letter Generator
            </h1>
            <p className="text-xs text-slate-400">Driven by resume_agent & Google Drive MCP</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Re-Tailor Resume
        </button>
      </div>

      <div className="space-y-3">
        {resumeVersions.map((item) => (
          <div key={item.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="w-6 h-6 text-cyan-400" />
              <div>
                <div className="font-semibold text-slate-100 text-sm">{item.name}</div>
                <div className="text-xs text-slate-400">Target Role: {item.role} • Score: <span className="text-emerald-400">{item.score}</span></div>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
