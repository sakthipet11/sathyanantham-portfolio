'use client';

import Link from 'next/link';
import { Zap, ArrowLeft, Play, Cpu, Workflow } from 'lucide-react';

export default function AdminAutomationPage() {
  const workflows = [
    { id: 'wf-1', name: 'End-to-End Application Pipeline', agents: ['job_discovery_agent', 'job_scoring_agent', 'resume_agent', 'application_agent'], trigger: 'Daily @ 08:00 UTC', status: 'Active' },
    { id: 'wf-2', name: 'Recruiter Follow-up & Outreach Pipeline', agents: ['email_agent', 'referral_agent'], trigger: 'On Job Score > 90%', status: 'Active' },
    { id: 'wf-3', name: 'RAG Embedding Sync & Portfolio Vectorization', agents: ['resume_agent'], trigger: 'On CMS Content Change', status: 'Scheduled' },
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
              <Zap className="w-5 h-5 text-yellow-400" /> Multi-Agent Automation Workflows
            </h1>
            <p className="text-xs text-slate-400">Cloud Scheduler & Pub/Sub event-driven pipelines</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {workflows.map((wf) => (
          <div key={wf.id} className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-slate-100 text-sm">{wf.name}</span>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded transition-colors">
                <Play className="w-3.5 h-3.5" /> Execute Workflow
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {wf.agents.map((agent) => (
                <span key={agent} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                  {agent}
                </span>
              ))}
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Trigger: <span className="text-slate-300">{wf.trigger}</span> • Status: <span className="text-emerald-400">{wf.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
