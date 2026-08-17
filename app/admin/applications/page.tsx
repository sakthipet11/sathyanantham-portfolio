'use client';

import Link from 'next/link';
import { FileCheck, ArrowLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminApplicationsPage() {
  const applications = [
    { id: 'APP-101', role: 'Frontend Architect', company: 'Nextuple Inc.', status: 'Offer Stage', submitted: '2026-08-10', agent: 'application_agent' },
    { id: 'APP-102', role: 'Principal Micro Frontend Engineer', company: 'O\'Reilly Media', status: 'Interviewing', submitted: '2026-08-12', agent: 'application_agent' },
    { id: 'APP-103', role: 'Staff UI Platform Architect', company: 'Tapestry Brands', status: 'Submitted', submitted: '2026-08-15', agent: 'application_agent' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/dashboard" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-purple-400" /> Application Pipeline & Auto-Tracker
          </h1>
          <p className="text-xs text-slate-400">Browserbase MCP integration & status synchronization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400">Total Applications</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">12 Active</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400">Interviews Scheduled</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">4 Confirmed</div>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400">Auto-filled via MCP</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">8 Submissions</div>
        </div>
      </div>

      <div className="space-y-3">
        {applications.map((app) => (
          <div key={app.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-purple-400">{app.id}</span>
                <span className="font-semibold text-slate-100 text-sm">{app.role}</span>
                <span className="text-xs text-slate-400">@ {app.company}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Submitted {app.submitted} via <span className="font-mono text-cyan-300">{app.agent}</span>
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
              {app.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
