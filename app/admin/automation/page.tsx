'use client';

import Link from 'next/link';
import { Zap, ArrowLeft, Play, Workflow, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AdminAutomationPage() {
  const workflows = [
    { id: 'wf-1', name: 'End-to-End Application Pipeline', agents: ['job_discovery_agent', 'job_scoring_agent', 'resume_agent', 'application_agent'], trigger: 'Daily @ 08:00 UTC', status: 'Active' },
    { id: 'wf-2', name: 'Recruiter Follow-up & Outreach Pipeline', agents: ['email_agent', 'referral_agent'], trigger: 'On Job Score > 90%', status: 'Active' },
    { id: 'wf-3', name: 'RAG Embedding Sync & Portfolio Vectorization', agents: ['resume_agent'], trigger: 'On CMS Content Change', status: 'Scheduled' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans transition-colors duration-300">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Multi-Agent Automation Workflows
            </h1>
            <p className="text-xs text-muted-foreground font-mono">Cloud Scheduler & Pub/Sub event-driven pipelines</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/automation/retention"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card/60 border border-border/80 text-foreground hover:bg-muted/80 text-xs font-semibold transition-colors font-mono"
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Data Retention & Purge Manager</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="space-y-4">
        {workflows.map((wf) => (
          <div key={wf.id} className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground text-sm">{wf.name}</span>
              </div>
              <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs">
                <Play className="w-3.5 h-3.5" /> Execute Workflow
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {wf.agents.map((agent) => (
                <span key={agent} className="text-[10px] px-2.5 py-0.5 rounded-lg bg-card border border-border/80 text-muted-foreground font-mono">
                  {agent}
                </span>
              ))}
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              Trigger: <span className="text-foreground font-medium">{wf.trigger}</span> • Status: <span className="text-emerald-500 font-bold">{wf.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
