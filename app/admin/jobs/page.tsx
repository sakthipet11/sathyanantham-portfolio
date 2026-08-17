'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, Search, Filter, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function AdminJobsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [jobs] = useState([
    { id: 1, title: 'Lead Frontend Architect', company: 'TechCorp Enterprise', matchScore: '98%', source: 'LinkedIn', location: 'Remote / US', agent: 'job_discovery_agent', status: 'High Match' },
    { id: 2, title: 'Principal UI Platform Engineer', company: 'CloudCommerce Inc', matchScore: '95%', source: 'Indeed', location: 'Hybrid', agent: 'job_scoring_agent', status: 'Reviewed' },
    { id: 3, title: 'Staff Micro Frontend Architect', company: 'FinTech Dynamics', matchScore: '94%', source: 'Direct', location: 'Remote', agent: 'job_scoring_agent', status: 'Applied' },
    { id: 4, title: 'AI Applications Lead Engineer', company: 'NextGen AI Studio', matchScore: '91%', source: 'Glassdoor', location: 'Remote', agent: 'job_discovery_agent', status: 'New' },
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-400" /> Job Discovery & Match Engine
            </h1>
            <p className="text-xs text-slate-400">Powered by job_discovery_agent & job_scoring_agent</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors">
          <Sparkles className="w-3.5 h-3.5" /> Trigger Job Scan
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search discovered jobs, companies, or tech requirements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200">
          <Filter className="w-3.5 h-3.5" /> Filter by Match %
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-100 text-sm">{job.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {job.company}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                  {job.matchScore} Match
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {job.location} • Source: {job.source} • Discovered via <span className="font-mono text-cyan-300">{job.agent}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors">
                View Evaluation
              </button>
              <button className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition-colors flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tailor & Apply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
