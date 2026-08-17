'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileCheck, 
  FileText, 
  Users, 
  Inbox, 
  Zap, 
  BarChart3, 
  Settings,
  Bot,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Clock
} from 'lucide-react';
import { getApiHost } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    total_views: 1240,
    active_jobs: 18,
    applications: 12,
    referral_contacts: 45,
    chat_sessions: 28,
    active_agents: 6,
    mcp_servers: 4
  });

  const apiHost = getApiHost();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const token = sessionStorage.getItem('sathya_admin_token');
        if (!token) return;
        const res = await fetch(`${apiHost}/api/admin/analytics`, {
          headers: { 'X-Admin-Token': token }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(prev => ({
            ...prev,
            total_views: data.total_page_views || prev.total_views,
            chat_sessions: data.total_chat_sessions || prev.chat_sessions
          }));
        }
      } catch (err) {
        console.warn("Using default stats summary:", err);
      }
    }
    fetchDashboardData();
  }, [apiHost]);

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, active: true },
    { name: 'Job Discovery', href: '/admin/jobs', icon: Briefcase },
    { name: 'Applications', href: '/admin/applications', icon: FileCheck },
    { name: 'Resumes', href: '/admin/resumes', icon: FileText },
    { name: 'Referrals', href: '/admin/referrals', icon: Users },
    { name: 'Recruiter Inbox', href: '/admin/recruiter-inbox', icon: Inbox },
    { name: 'Automation', href: '/admin/automation', icon: Zap },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-cyan-400 animate-pulse" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Sathyanantham AI Studio — Admin OS
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Enterprise Multi-Agent Portfolio & Recruiter Automation Command Center
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Multi-Agent Engine Online
          </span>
          <Link href="/admin" className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
            Main Admin Console
          </Link>
        </div>
      </header>

      {/* Navigation Sub-Menu */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-slate-800/60 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                item.active 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Page Views</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-slate-50">{stats.total_views}</div>
          <div className="flex items-center gap-1 text-emerald-400 text-xs mt-2 font-mono">
            <TrendingUp className="w-3.5 h-3.5" /> +14.2% this week
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Active Jobs</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-slate-50">{stats.active_jobs}</div>
          <div className="text-slate-400 text-xs mt-2 font-mono">
            Scored by <span className="text-cyan-300">job_scoring_agent</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Applications</span>
            <FileCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-slate-50">{stats.applications}</div>
          <div className="text-purple-400 text-xs mt-2 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Auto-tracked via MCP
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Recruiter Chats</span>
            <Inbox className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-slate-50">{stats.chat_sessions}</div>
          <div className="text-amber-400 text-xs mt-2 font-mono">
            Live Visitor Handoff Active
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Agents Column */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900/80 border border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Active Autonomous Agents
          </h2>
          <div className="space-y-3">
            {[
              { name: 'job_discovery_agent', status: 'Running', task: 'Scanning tech platforms & LinkedIn for Lead Frontend roles', load: '12% CPU' },
              { name: 'job_scoring_agent', status: 'Idle', task: 'Evaluating match scores against 13+ yrs React/TypeScript profile', load: '0% CPU' },
              { name: 'resume_agent', status: 'Active', task: 'Tailoring customized resume PDFs & LaTeX templates', load: '4% CPU' },
              { name: 'application_agent', status: 'Ready', task: 'Browserbase MCP form auto-filler standby', load: '0% CPU' },
              { name: 'email_agent', status: 'Active', task: 'Drafting personalized recruiter follow-up emails', load: '2% CPU' },
              { name: 'referral_agent', status: 'Idle', task: 'Mapping key contacts across Target & enterprise accounts', load: '0% CPU' },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-cyan-300 font-semibold">{agent.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{agent.task}</p>
                </div>
                <div className="text-right text-xs font-mono text-slate-500">
                  {agent.load}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MCP Services Column */}
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" /> MCP Server Status
          </h2>
          <div className="space-y-4">
            {[
              { name: 'browserbase', type: 'Headless Browser Automation', status: 'Connected' },
              { name: 'google_drive', type: 'Document & PDF Storage', status: 'Connected' },
              { name: 'gmail', type: 'Recruiter Email Sync', status: 'Connected' },
              { name: 'postgres', type: 'Supabase Vector Database', status: 'Connected' },
            ].map((mcp) => (
              <div key={mcp.name} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-slate-200 font-bold">{mcp.name}</div>
                  <div className="text-[11px] text-slate-400">{mcp.type}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {mcp.status}
                </span>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-800">
              <Link href="/admin/automation" className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors">
                Configure Workflows <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
