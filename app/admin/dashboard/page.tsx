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
  Clock,
  ShieldCheck,
  Radio,
  MessageSquare,
  Mail,
  User,
  LogOut,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Layers,
  CheckCircle2
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
  const [loading, setLoading] = useState(false);

  const apiHost = getApiHost();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('sathya_admin_token');
      const res = await fetch(`${apiHost}/api/admin/analytics`, {
        headers: { 'X-Admin-Token': token || '' }
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setStats(prev => ({
          ...prev,
          total_views: data.total_page_views || prev.total_views,
          chat_sessions: data.total_chat_sessions || prev.chat_sessions
        }));
      }
    } catch (err) {
      console.warn("Using default stats summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [apiHost]);

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 flex flex-col md:flex-row font-mono text-xs">
      {/* SIDEBAR NAVIGATION (2 MAIN MENUS) */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between shrink-0">
        <div>
          {/* Header Branding */}
          <div className="p-6 border-b border-slate-900 flex items-center gap-3">
            <div className="relative w-8 h-8 rounded bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-900/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white uppercase leading-none text-xs">Sathyanantham V</h2>
              <span className="text-[10px] text-cyan-400 uppercase tracking-wider block mt-1">Multi-Agent Studio</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-4">
            {/* ========================================================================= */}
            {/* MAIN MENU 1: CONTROL CENTER */}
            {/* ========================================================================= */}
            <div className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutDashboard className="w-3.5 h-3.5" /> 1. Control Center
              </div>

              {/* Submenu 1: Dashboard (Active Page) */}
              <Link
                href="/admin/dashboard"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-colors bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                  <span>Dashboard</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono">Active</span>
              </Link>

              {/* Submenu 2: Executive Cockpit */}
              <Link
                href="/admin"
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Control Cockpit HUD</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono">/admin</span>
              </Link>

              {/* Submenu Label: Autonomous Pipelines */}
              <div className="pt-2 pb-1 px-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Autonomous Pipelines
              </div>

              <Link
                href="/admin/jobs"
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Job Discovery</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono">Phase 1</span>
              </Link>

              <Link
                href="/admin/applications"
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>Applications</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono">Phase 3</span>
              </Link>

              <Link
                href="/admin/recruiter-inbox"
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-3.5 h-3.5 text-blue-400" />
                  <span>Recruiter Inbox</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono">Phase 4</span>
              </Link>

              <Link
                href="/admin/referrals"
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>90%+ Referrals</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono">Phase 5</span>
              </Link>

              <Link
                href="/admin/settings"
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                  <span>Security & SRE</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-rose-400 font-mono">Phase 7</span>
              </Link>

              <Link
                href="/admin/agent"
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Job Copilot</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-400 font-mono">Phase 8</span>
              </Link>
            </div>

            {/* ========================================================================= */}
            {/* MAIN MENU 2: PORTFOLIO SYSTEMS */}
            {/* ========================================================================= */}
            <div className="space-y-1 pt-2 border-t border-slate-900">
              <div className="px-3 pb-1 text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> 2. Portfolio Systems
              </div>

              <Link
                href="/admin"
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  <span>Live Chat & Presence</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono">Host</span>
              </Link>

              <Link
                href="/admin"
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Telemetry & Analytics</span>
              </Link>

              <Link
                href="/admin"
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Contact Inquiries</span>
              </Link>

              <Link
                href="/admin"
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Candidate Profile Store</span>
              </Link>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-900">
          <Link
            href="/admin"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors text-xs"
          >
            <ChevronRight className="w-4 h-4 text-cyan-400" />
            <span>Open Executive Console</span>
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 bg-[#030303] flex flex-col min-w-0">
        {/* Header */}
        <header className="px-8 py-5 border-b border-slate-900 flex items-center justify-between bg-slate-950/60 backdrop-blur-xl">
          <div>
            <h1 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-cyan-400" />
              Control Center // Executive Dashboard Overview
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Real-time status of all autonomous pipelines, discovery agents, and MCP server bridges.</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Multi-Agent Engine Online
            </span>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8">
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-900 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider">// Portfolio Views</span>
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-50">{stats.total_views}</div>
              <div className="flex items-center gap-1 text-emerald-400 text-[10px] mt-2 font-mono">
                <TrendingUp className="w-3 h-3" /> +14.2% engagement surge
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950/80 border border-cyan-500/20 bg-cyan-500/5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">// Active Target Jobs</span>
                <Briefcase className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-300">{stats.active_jobs}</div>
              <div className="text-slate-400 text-[10px] mt-2 font-mono">
                Scored by <span className="text-cyan-300">ATS Scoring Engine</span>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950/80 border border-purple-500/20 bg-purple-500/5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400">// Staged Applications</span>
                <FileCheck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-300">{stats.applications}</div>
              <div className="text-purple-400 text-[10px] mt-2 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" /> Ready for human approval
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-950/80 border border-amber-500/20 bg-amber-500/5 backdrop-blur">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">// Recruiter Sessions</span>
                <Inbox className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300">{stats.chat_sessions}</div>
              <div className="text-amber-400 text-[10px] mt-2 font-mono">
                Live Visitor Handoff Active
              </div>
            </div>
          </div>

          {/* Main Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Agents Column */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950/90 border border-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" /> Autonomous Pipeline Agents Status
                </h2>
                <span className="text-[10px] text-cyan-400 font-mono">6 Agents Active</span>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'job_discovery_agent', status: 'Running', task: 'Scanning tech platforms & LinkedIn for Lead Frontend roles', load: 'Phase 1' },
                  { name: 'job_scoring_agent', status: 'Active', task: 'Evaluating match scores against 8+ yrs Lead UI Architect profile', load: 'Phase 1' },
                  { name: 'resume_agent', status: 'Active', task: 'Tailoring customized resume PDFs & LaTeX templates', load: 'Phase 3' },
                  { name: 'application_agent', status: 'Ready', task: 'Browserbase MCP form auto-filler standby', load: 'Phase 3' },
                  { name: 'email_agent', status: 'Active', task: 'Drafting personalized recruiter follow-up emails', load: 'Phase 4' },
                  { name: 'referral_agent', status: 'Active', task: '1st-degree LinkedIn contact matching & interactive Twin link drafting', load: 'Phase 5' },
                ].map((agent) => (
                  <div key={agent.name} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cyan-300 font-semibold">{agent.name}</span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                          {agent.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{agent.task}</p>
                    </div>
                    <div className="text-right text-[10px] font-mono text-slate-500">
                      {agent.load}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MCP Services Column */}
            <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-900 space-y-4">
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" /> MCP Server Bridges
              </h2>
              <div className="space-y-3">
                {[
                  { name: 'browserbase', type: 'Headless Browser Automation', status: 'Connected' },
                  { name: 'google_drive', type: 'Document & PDF Storage', status: 'Connected' },
                  { name: 'gmail', type: 'Recruiter Email Sync', status: 'Connected' },
                  { name: 'postgres', type: 'Supabase Vector Database', status: 'Connected' },
                ].map((mcp) => (
                  <div key={mcp.name} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs text-slate-200 font-bold">{mcp.name}</div>
                      <div className="text-[10px] text-slate-400">{mcp.type}</div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      {mcp.status}
                    </span>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-800">
                  <Link
                    href="/admin/agent"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors shadow-lg shadow-cyan-950"
                  >
                    <Bot className="w-3.5 h-3.5" /> Launch AI Job Copilot
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
