'use client';

import Link from 'next/link';
import { Settings, ArrowLeft, Key, Database, Cpu, Server } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/dashboard" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" /> System Configuration & MCP Settings
          </h1>
          <p className="text-xs text-slate-400">Environment variables, API credentials, and MCP endpoints</p>
        </div>
      </div>

      <div className="space-y-4 max-w-3xl">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" /> OpenRouter API Configuration
          </h2>
          <div className="text-xs text-slate-400 space-y-2 font-mono">
            <div>Model: <span className="text-cyan-300">anthropic/claude-3.5-sonnet</span></div>
            <div>Status: <span className="text-emerald-400">Active</span></div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" /> Supabase Database & Vector Store
          </h2>
          <div className="text-xs text-slate-400 space-y-2 font-mono">
            <div>URL: <span className="text-purple-300">https://your-supabase-project.supabase.co</span></div>
            <div>Status: <span className="text-emerald-400">Connected</span></div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" /> MCP Servers Configured
          </h2>
          <div className="text-xs text-slate-400 space-y-2 font-mono">
            <div>browserbase: <span className="text-slate-200">http://localhost:8001/mcp/browserbase</span></div>
            <div>google_drive: <span className="text-slate-200">http://localhost:8002/mcp/google_drive</span></div>
            <div>gmail: <span className="text-slate-200">http://localhost:8003/mcp/gmail</span></div>
            <div>postgres: <span className="text-slate-200">http://localhost:8004/mcp/postgres</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
