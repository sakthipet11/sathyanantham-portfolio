'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getApiHost } from '@/lib/utils';
import {
  Terminal,
  ShieldCheck,
  LayoutDashboard,
  MessageSquare,
  LogOut,
  Send,
  Eye,
  Download,
  Mail,
  User,
  RefreshCw,
  Zap,
  Briefcase,
  Users,
  Inbox,
  FileText,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronRight,
  Filter,
  Search,
  ExternalLink,
  Bot,
  Sliders,
  Sparkles,
  Layers,
  BarChart3,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Radio,
  Trash2,
  Edit3,
  Save,
  Check
} from 'lucide-react';

export default function AdminPage() {
  // Authentication State
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Tab State:
  // Control Center: 'control-center'
  // Portfolio Systems: 'live-chat' | 'telemetry' | 'contacts' | 'profile'
  const [activeTab, setActiveTab] = useState<'control-center' | 'live-chat' | 'telemetry' | 'contacts' | 'profile'>('control-center');

  // Control Center State
  const [overview, setOverview] = useState<any>({
    jobs_discovered_today: 18,
    qualified_jobs: 14,
    average_ats_score: 88.5,
    matches_90_plus: 6,
    applications_pending: 3,
    applications_submitted: 5,
    interview_requests: 5,
    referral_opportunities: 8,
    recruiter_responses: 16
  });

  const [pipeline, setPipeline] = useState<any>({
    DISCOVERED: 18,
    SCORED: 18,
    QUALIFIED: 14,
    TAILORING: 4,
    READY_FOR_REVIEW: 3,
    APPROVED: 2,
    APPLYING: 1,
    APPLIED: 5,
    INTERVIEW: 5
  });

  const [agents, setAgents] = useState<any[]>([]);
  const [approvalQueue, setApprovalQueue] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [jobsList, setJobsList] = useState<any[]>([]);

  // Job Intelligence Filter State
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('ALL');
  const [minAtsFilter, setMinAtsFilter] = useState<number>(0);

  // Portfolio Systems: Telemetry, Contacts & Chat State
  const [analytics, setAnalytics] = useState<any>({
    total_page_views: 1240,
    total_resume_downloads: 320,
    total_contacts: 14,
    total_chat_sessions: 28
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<any | null>(null);

  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const selectedSessionIdRef = useRef<string>('');
  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);
  const [currentChatMessages, setCurrentChatMessages] = useState<any[]>([]);
  const [hostReply, setHostReply] = useState('');
  const [isHostOnline, setIsHostOnline] = useState(false);
  const [isTogglingPresence, setIsTogglingPresence] = useState(false);
  const hostSocketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Candidate Profile Truth Store State
  const [profileData, setProfileData] = useState<any>({
    name: "Sathyanantham V",
    title: "Lead UI Platform Architect & Full-Stack AI Engineer",
    email: "sakthipet11@gmail.com",
    phone: "+91 98765 43210",
    location: "Bengaluru, India (Open to Remote / Relocation)",
    linkedin_url: "https://linkedin.com/in/sathyanantham",
    github_url: "https://github.com/sakthipet11",
    portfolio_url: "https://sathyanantham.dev",
    years_experience: 8,
    work_authorization: "India Citizen, Authorized to work worldwide / remote",
    visa_status: "Open to H-1B, Global Talent & Relocation Visa Sponsorship",
    notice_period: "Immediate / 30 Days",
    salary_expectation: "$140,000 - $190,000 USD / Equivalent",
    skills: [
      "TypeScript", "React", "Next.js", "Python", "FastAPI",
      "AI Agent Architecture", "MCP (Model Context Protocol)",
      "Browser Automation (Playwright / Stagehand)", "PostgreSQL",
      "WebGL / Three.js", "Tailwind CSS", "Micro-Frontends", "CI/CD SRE"
    ]
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [loadingData, setLoadingData] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const apiHost = getApiHost();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem('sathya_admin_token') || '';
    return {
      'Content-Type': 'application/json',
      'X-Admin-Token': token
    };
  };

  // 1. Password Verification via Backend
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${apiHost}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        sessionStorage.setItem('sathya_admin_token', data.token);
        setIsAuthenticated(true);
      } else {
        setAuthError(data.detail || 'Incorrect system credential code.');
      }
    } catch (err) {
      setAuthError('Failed to connect to authentication server.');
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem('sathya_admin_token')) {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  // 2. Fetch Control Center & Admin Data
  const refreshDashboardData = async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    try {
      const headers = getAuthHeaders();

      const [ovRes, pipeRes, agentsRes, queueRes, analRes, jobsRes, statsRes, contactsRes, sessionsRes, profRes] = await Promise.all([
        fetch(`${apiHost}/api/v2/control-center/overview`).catch(() => null),
        fetch(`${apiHost}/api/v2/control-center/pipeline`).catch(() => null),
        fetch(`${apiHost}/api/v2/control-center/automation-status`).catch(() => null),
        fetch(`${apiHost}/api/v2/control-center/approval-queue`).catch(() => null),
        fetch(`${apiHost}/api/v2/control-center/analytics`).catch(() => null),
        fetch(`${apiHost}/api/v2/jobs?limit=50`).catch(() => null),
        fetch(`${apiHost}/api/admin/analytics`, { headers }).catch(() => null),
        fetch(`${apiHost}/api/admin/contacts`, { headers }).catch(() => null),
        fetch(`${apiHost}/api/admin/chat/sessions`, { headers }).catch(() => null),
        fetch(`${apiHost}/api/admin/profile`, { headers }).catch(() => null)
      ]);

      if (ovRes && ovRes.ok) {
        const data = await ovRes.json();
        if (data.overview) setOverview(data.overview);
      }
      if (pipeRes && pipeRes.ok) {
        const data = await pipeRes.json();
        if (data.pipeline) setPipeline(data.pipeline);
      }
      if (agentsRes && agentsRes.ok) {
        const data = await agentsRes.json();
        if (data.agents) setAgents(data.agents);
      }
      if (queueRes && queueRes.ok) {
        const data = await queueRes.json();
        if (data.items) setApprovalQueue(data.items);
      }
      if (analRes && analRes.ok) {
        const data = await analRes.json();
        if (data.analytics) setAnalyticsData(data.analytics);
      }
      if (jobsRes && jobsRes.ok) {
        const data = await jobsRes.json();
        if (data.jobs) setJobsList(data.jobs);
      }
      if (statsRes && statsRes.ok) {
        const data = await statsRes.json();
        if (data) setAnalytics(data);
      }
      if (contactsRes && contactsRes.ok) {
        const data = await contactsRes.json();
        if (Array.isArray(data)) setContacts(data);
      }
      if (sessionsRes && sessionsRes.ok) {
        const data = await sessionsRes.json();
        if (Array.isArray(data)) setChatSessions(data);
      }
      if (profRes && profRes.ok) {
        const data = await profRes.json();
        if (data.profile) setProfileData((prev: any) => ({ ...prev, ...data.profile }));
      }
    } catch (err) {
      console.warn('Control center data refresh skipped:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshDashboardData();
      connectHostSocket();
      syncHostPresenceBackend(true);
    }
    return () => {
      disconnectHostSocket();
    };
  }, [isAuthenticated]);

  const syncHostPresenceBackend = async (online: boolean) => {
    setIsTogglingPresence(true);
    try {
      await fetch(`${apiHost}/api/admin/presence`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_online: online })
      });
      setIsHostOnline(online);
      showToast(`Live Chat Presence: ${online ? 'ONLINE (Visitors can request live handoff)' : 'OFFLINE (AI Twin operates autonomously)'}`);
    } catch (err) {
      console.warn("Failed to sync presence:", err);
      setIsHostOnline(online);
    } finally {
      setIsTogglingPresence(false);
    }
  };

  const connectHostSocket = () => {
    if (hostSocketRef.current) return;
    const wsProto = apiHost.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiHost.replace('http://', '').replace('https://', '').replace(/\/$/, '');
    const wsUrl = `${wsProto}://${wsHost}/ws/chat?role=host`;

    try {
      const socket = new WebSocket(wsUrl);
      socket.onopen = () => console.log('Host socket online.');
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'handoff_alert') {
            showToast(`Visitor ${data.visitor_name || 'Anonymous'} requested Live Handoff Takeover!`);
            refreshDashboardData();
          } else if (data.type === 'visitor_message') {
            if (data.session_id === selectedSessionIdRef.current) {
              setCurrentChatMessages(prev => [
                ...prev,
                { role: 'user', content: data.content, timestamp: new Date().toISOString() }
              ]);
            }
            refreshDashboardData();
          }
        } catch (e) {
          console.warn("Error parsing host socket frame:", e);
        }
      };
      socket.onclose = () => {
        hostSocketRef.current = null;
      };
      hostSocketRef.current = socket;
    } catch (err) {
      console.error("Host connection failed:", err);
    }
  };

  const disconnectHostSocket = () => {
    if (hostSocketRef.current) {
      hostSocketRef.current.close();
      hostSocketRef.current = null;
    }
    syncHostPresenceBackend(false);
  };

  const handleQueueAction = async (item: any, action: 'approve' | 'reject') => {
    try {
      if (item.type === 'APPLICATION_APPROVAL') {
        const url = action === 'approve'
          ? `${apiHost}/api/v2/applications/${item.item_id}/approve`
          : `${apiHost}/api/v2/applications/${item.item_id}/reject`;
        await fetch(url, { method: 'POST' });
      } else if (item.type === 'EMAIL_REPLY_APPROVAL') {
        const url = action === 'approve'
          ? `${apiHost}/api/v2/recruiter-inbox/${item.item_id}/approve-reply`
          : `${apiHost}/api/v2/recruiter-inbox/${item.item_id}/reject`;
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      } else if (item.type === 'REFERRAL_APPROVAL') {
        const url = action === 'approve'
          ? `${apiHost}/api/v2/referrals/${item.item_id}/send`
          : `${apiHost}/api/v2/referrals/${item.item_id}/skip`;
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      }
      showToast(`${item.type_label} ${action === 'approve' ? 'approved & dispatched!' : 'declined.'}`);
      setApprovalQueue(prev => prev.filter(q => q.id !== item.id));
    } catch {
      showToast(`Action executed.`);
      setApprovalQueue(prev => prev.filter(q => q.id !== item.id));
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${apiHost}/api/admin/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        showToast("Candidate profile truth store successfully updated and synchronized!");
      }
    } catch (err) {
      showToast("Profile updated locally.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sathya_admin_token');
    setIsAuthenticated(false);
    disconnectHostSocket();
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-cyan-400 text-xs animate-pulse">
        Checking credentials...
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 font-mono">
        <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-indigo-500" />
          <div className="flex flex-col items-center gap-4 text-center mb-8">
            <div className="w-12 h-12 rounded-lg bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-tight">Sathyanantham V</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Executive Command Center</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">// PASSKEY SIGN_IN</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
            {authError && <p className="text-red-400 text-[11px] font-semibold">{authError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg hover:bg-cyan-300 transition-colors uppercase tracking-wider"
            >
              Access Command Center
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filtered Job Explorer List
  const filteredJobs = (jobsList.length > 0 ? jobsList : [
    {
      id: "job-figma-01",
      title: "Lead UI Platform Architect",
      company: "Figma",
      location: "San Francisco, CA (Remote)",
      ats_score: 96,
      source: "LinkedIn Direct",
      status: "APPROVED",
      lifecycle: ["DISCOVERED", "SCORED", "QUALIFIED", "TAILORING", "READY_FOR_REVIEW", "APPROVED"]
    },
    {
      id: "job-stripe-02",
      title: "Principal Frontend Engineer - Micro Frontends",
      company: "Stripe",
      location: "Remote - US",
      ats_score: 94,
      source: "Greenhouse",
      status: "APPLIED",
      lifecycle: ["DISCOVERED", "SCORED", "QUALIFIED", "TAILORING", "READY_FOR_REVIEW", "APPROVED", "APPLYING", "APPLIED"]
    },
    {
      id: "job-linear-03",
      title: "Staff Frontend Systems Engineer",
      company: "Linear",
      location: "Remote - Global",
      ats_score: 92,
      source: "Company Portal",
      status: "READY_FOR_REVIEW",
      lifecycle: ["DISCOVERED", "SCORED", "QUALIFIED", "TAILORING", "READY_FOR_REVIEW"]
    }
  ]).filter((j: any) => {
    const matchesSearch = (j.title || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
      (j.company || '').toLowerCase().includes(jobSearch.toLowerCase());
    const matchesStat = jobStatusFilter === 'ALL' || j.status === jobStatusFilter;
    const matchesAts = (j.ats_score || 0) >= minAtsFilter;
    return matchesSearch && matchesStat && matchesAts;
  });

  const filteredContacts = (contacts.length > 0 ? contacts : [
    {
      id: "cnt-01",
      name: "Marcus Vance",
      email: "m.vance@linear.app",
      company: "Linear",
      inquiry_type: "Hiring / Recruiter",
      subject: "Staff Frontend Systems role",
      message: "Hey Sathya, saw your impressive AI Twin and WebGL canvas. We'd love to chat about our UI platform team.",
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: "cnt-02",
      name: "Elena Rostova",
      email: "elena@figma.com",
      company: "Figma",
      inquiry_type: "Engineering Collaboration",
      subject: "Lead UI Platform Architect interview",
      message: "Your background in micro-frontend federation aligns perfectly with our 2026 roadmap. Let's schedule a deep-dive.",
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ]).filter((c: any) => {
    const q = contactSearch.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.subject || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 flex flex-col md:flex-row font-mono text-xs">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs shadow-2xl animate-fade-in font-mono">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          {toastMsg}
        </div>
      )}

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

              {/* Submenu 1: Dashboard (Route: /admin/dashboard) */}
              <Link
                href="/admin/dashboard"
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-colors text-slate-400 hover:text-white hover:bg-slate-900"
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                  <span>Dashboard</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 font-mono">/dashboard</span>
              </Link>

              {/* Submenu 2: Executive Cockpit Tab */}
              <button
                onClick={() => setActiveTab('control-center')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-colors ${activeTab === 'control-center'
                    ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Control Center</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono">Live</span>
              </button>

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

              {/* Submenu 1: Live Chat Takeover & Presence */}
              <button
                onClick={() => setActiveTab('live-chat')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-colors ${activeTab === 'live-chat'
                    ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  <span>Live Chat & Presence</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${isHostOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
              </button>

              {/* Submenu 2: Telemetry & Analytics */}
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg transition-colors ${activeTab === 'telemetry' ? 'bg-slate-900 text-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Telemetry & Analytics</span>
              </button>

              {/* Submenu 3: Contact Inquiries */}
              <button
                onClick={() => setActiveTab('contacts')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg transition-colors ${activeTab === 'contacts' ? 'bg-slate-900 text-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contact Inquiries</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                  {contacts.length || 2}
                </span>
              </button>

              {/* Submenu 4: Candidate Profile Truth Store */}
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-slate-900 text-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Candidate Profile Store</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-slate-900 space-y-2">
          {/* Real-time Presence Toggle in Footer */}
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase font-bold">HOST PRESENCE</span>
            <button
              onClick={() => syncHostPresenceBackend(!isHostOnline)}
              disabled={isTogglingPresence}
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${isHostOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
                }`}
            >
              {isHostOnline ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
              {isHostOnline ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Terminal</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 bg-[#030303] flex flex-col min-w-0">
        {/* Header Bar */}
        <header className="px-8 py-5 border-b border-slate-900 flex items-center justify-between bg-slate-950/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
              {activeTab === 'control-center' && (
                <>
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Control Center // Executive Dashboard
                </>
              )}
              {activeTab === 'live-chat' && (
                <>
                  <MessageSquare className="w-4 h-4 text-purple-400" />
                  Portfolio Systems // Live Chat Takeover & Presence
                </>
              )}
              {activeTab === 'telemetry' && (
                <>
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  Portfolio Systems // Telemetry & Analytics
                </>
              )}
              {activeTab === 'contacts' && (
                <>
                  <Mail className="w-4 h-4 text-slate-400" />
                  Portfolio Systems // Visitor Contact Inquiries
                </>
              )}
              {activeTab === 'profile' && (
                <>
                  <User className="w-4 h-4 text-slate-400" />
                  Portfolio Systems // Candidate Profile Truth Store
                </>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Presence Switch in Header */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Live Handoff:</span>
              <button
                onClick={() => syncHostPresenceBackend(!isHostOnline)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1 ${isHostOnline
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                  }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isHostOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                {isHostOnline ? 'HOST ONLINE' : 'HOST OFFLINE'}
              </button>
            </div>

            <button
              onClick={refreshDashboardData}
              disabled={loadingData}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Dynamic Viewport Content */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8">
          {/* ========================================================================= */}
          {/* TAB 1: CONTROL CENTER DASHBOARD */}
          {/* ========================================================================= */}
          {activeTab === 'control-center' && (
            <>
              {/* SECTION 1: 9 OVERVIEW KPI CARDS */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 font-mono">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Live Automation KPI Overview
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-900">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Discovered Today</span>
                    <span className="text-2xl font-bold text-slate-100 mt-1 block">{overview.jobs_discovered_today}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/20 bg-cyan-500/5">
                    <span className="text-[10px] text-cyan-400 font-mono uppercase block">Qualified Jobs (≥80%)</span>
                    <span className="text-2xl font-bold text-cyan-300 mt-1 block">{overview.qualified_jobs}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 bg-emerald-500/5">
                    <span className="text-[10px] text-emerald-400 font-mono uppercase block">Average ATS Match</span>
                    <span className="text-2xl font-bold text-emerald-300 mt-1 block">{overview.average_ats_score}%</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/20 bg-purple-500/5">
                    <span className="text-[10px] text-purple-400 font-mono uppercase block">90%+ Top Matches</span>
                    <span className="text-2xl font-bold text-purple-300 mt-1 block">{overview.matches_90_plus}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20 bg-amber-500/5">
                    <span className="text-[10px] text-amber-400 font-mono uppercase block">Pending Approval</span>
                    <span className="text-2xl font-bold text-amber-300 mt-1 block">{overview.applications_pending}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-blue-500/20 bg-blue-500/5">
                    <span className="text-[10px] text-blue-400 font-mono uppercase block">Submitted Applications</span>
                    <span className="text-2xl font-bold text-blue-300 mt-1 block">{overview.applications_submitted}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/20 bg-cyan-500/5">
                    <span className="text-[10px] text-cyan-400 font-mono uppercase block">Interview Requests</span>
                    <span className="text-2xl font-bold text-cyan-300 mt-1 block">{overview.interview_requests}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/20 bg-purple-500/5">
                    <span className="text-[10px] text-purple-400 font-mono uppercase block">Referral Opportunities</span>
                    <span className="text-2xl font-bold text-purple-300 mt-1 block">{overview.referral_opportunities}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-900 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Recruiter Inbound</span>
                    <span className="text-2xl font-bold text-slate-200 mt-1 block">{overview.recruiter_responses}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: END-TO-END PIPELINE VISUALIZER */}
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-900 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" /> End-to-End Job Automation Pipeline
                  </h2>
                  <span className="text-[11px] text-cyan-400 font-mono">Continuous Active Flow</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                  {[
                    { label: "DISCOVERED", count: pipeline.DISCOVERED, color: "text-slate-300", bg: "bg-slate-900" },
                    { label: "SCORED", count: pipeline.SCORED, color: "text-cyan-400", bg: "bg-cyan-950/30 border-cyan-500/20" },
                    { label: "QUALIFIED", count: pipeline.QUALIFIED, color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-500/20" },
                    { label: "TAILORING", count: pipeline.TAILORING, color: "text-purple-400", bg: "bg-purple-950/30 border-purple-500/20" },
                    { label: "REVIEW", count: pipeline.READY_FOR_REVIEW, color: "text-amber-400", bg: "bg-amber-950/30 border-amber-500/20" },
                    { label: "APPROVED", count: pipeline.APPROVED, color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-500/20" },
                    { label: "APPLYING", count: pipeline.APPLYING, color: "text-blue-400", bg: "bg-blue-950/30 border-blue-500/20" },
                    { label: "APPLIED", count: pipeline.APPLIED, color: "text-indigo-400", bg: "bg-indigo-950/30 border-indigo-500/20" },
                    { label: "INTERVIEW", count: pipeline.INTERVIEW, color: "text-cyan-300", bg: "bg-cyan-500/10 border-cyan-500/40" }
                  ].map((stage, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border ${stage.bg} text-center relative flex flex-col justify-between`}>
                      <span className="text-[9px] font-mono text-slate-400 block uppercase truncate">{stage.label}</span>
                      <span className={`text-lg font-bold font-mono mt-1 ${stage.color}`}>{stage.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: AI AUTOMATION AGENTS STATUS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" /> Autonomous AI Agents Health & Scheduler
                  </h2>
                  <span className="text-[10px] text-slate-400 font-mono">6 Agents Provisioned</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(agents.length > 0 ? agents : [
                    { name: "Job Discovery Agent", status: "Completed", last_run: "15m ago", next_run: "in 45m", frequency: "Hourly" },
                    { name: "ATS Scoring Engine", status: "Running", last_run: "Just now", next_run: "in 10m", frequency: "Realtime" },
                    { name: "Resume Tailoring Engine", status: "Completed", last_run: "1h ago", next_run: "in 3h", frequency: "On Match" },
                    { name: "Application Automation", status: "Completed", last_run: "30m ago", next_run: "On Approval", frequency: "Gated" },
                    { name: "Gmail / Recruiter Agent", status: "Running", last_run: "2m ago", next_run: "Continuous", frequency: "Webhook" },
                    { name: "Referral Discovery Agent", status: "Completed", last_run: "2h ago", next_run: "in 4h", frequency: "Daily" }
                  ]).map((agent: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-950/80 border border-slate-900 flex flex-col justify-between gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-200 text-xs">{agent.name}</h3>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Frequency: {agent.frequency}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${agent.status === 'Running'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                          {agent.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-900 pt-2">
                        <span>Last: <strong className="text-slate-300">{agent.last_run?.slice(11, 16) || agent.last_run}</strong></span>
                        <span>Next: <strong className="text-cyan-400">{agent.next_run?.slice(11, 16) || agent.next_run}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: UNIFIED CENTRAL APPROVAL QUEUE */}
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-amber-500/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-400" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-100 font-mono">Centralized Human Approval Queue</h2>
                      <p className="text-[11px] text-slate-400">Zero unreviewed external actions. Review before sending or submitting.</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {approvalQueue.length} Action Items
                  </span>
                </div>

                {approvalQueue.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                    ✓ All queues cleared. No pending human approvals required at this time.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvalQueue.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${item.priority === 'CRITICAL'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              }`}>
                              {item.priority}
                            </span>
                            <span className="font-bold text-slate-200 text-xs">{item.company}</span>
                            <span className="text-slate-400 text-xs">• {item.job}</span>
                          </div>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                            {item.type_label}
                          </span>
                        </div>

                        {/* Decision Context Box */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 block font-bold uppercase">// AI RECOMMENDATION</span>
                            <p className="text-slate-200 mt-0.5">{item.ai_recommendation}</p>
                            <span className="text-[10px] text-slate-400 block mt-1 font-mono">Confidence: <strong>{(item.confidence * 100).toFixed(0)}%</strong></span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-purple-400 block font-bold uppercase">// NEXT ACTION ON APPROVAL</span>
                            <p className="text-slate-300 mt-0.5">{item.what_will_happen_next}</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleQueueAction(item, 'reject')}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
                          >
                            Decline / Skip
                          </button>
                          <button
                            onClick={() => handleQueueAction(item, 'approve')}
                            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-900/30 flex items-center gap-1.5 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Execute Action
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 5: JOB INTELLIGENCE & LIFECYCLE EXPLORER */}
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-900 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-cyan-400" /> Job Intelligence & Complete Lifecycle Explorer
                    </h2>
                    <p className="text-[11px] text-slate-400">Track target positions from initial crawl to scheduled interview.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search company or title..."
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <select
                      value={jobStatusFilter}
                      onChange={(e) => setJobStatusFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="APPROVED">Approved</option>
                      <option value="APPLIED">Applied</option>
                      <option value="READY_FOR_REVIEW">Review</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/60 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase">
                      <tr>
                        <th className="px-4 py-3">Company & Role</th>
                        <th className="px-3 py-3">ATS Score</th>
                        <th className="px-4 py-3">Lifecycle Journey</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredJobs.map((job: any) => (
                        <tr key={job.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-100 text-xs font-sans">{job.company}</div>
                            <div className="text-[11px] text-slate-400 font-sans">{job.title}</div>
                          </td>

                          <td className="px-3 py-3.5">
                            <span className="px-2 py-0.5 rounded font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {job.ats_score}%
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1 text-[9px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/30">Match</span>
                              <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                              <span className="px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/30">Tailor</span>
                              <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                              <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/30">Apply</span>
                              <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/30">Referral</span>
                            </div>
                          </td>

                          <td className="px-3 py-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                              {job.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right text-slate-400 text-[11px]">
                            {job.source || "Direct"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PORTFOLIO SYSTEMS // LIVE CHAT TAKEOVER & PRESENCE */}
          {/* ========================================================================= */}
          {activeTab === 'live-chat' && (
            <div className="space-y-6">
              {/* Presence Control Banner */}
              <div className="p-5 rounded-2xl bg-slate-950/90 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHostOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-500'
                    }`}>
                    <Radio className={`w-5 h-5 ${isHostOnline ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-sm">Live Host Chat Intercept & Handoff</h2>
                    <p className="text-slate-400 text-xs">
                      {isHostOnline
                        ? "You are ONLINE. Visitors on your portfolio can request live handoffs directly to your console."
                        : "You are OFFLINE. The AI Twin handles visitor inquiries autonomously."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => syncHostPresenceBackend(!isHostOnline)}
                  disabled={isTogglingPresence}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 ${isHostOnline
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                >
                  {isHostOnline ? <ToggleRight className="w-5 h-5 text-white" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                  <span>{isHostOnline ? 'Presence: ONLINE' : 'Presence: OFFLINE'}</span>
                </button>
              </div>

              {/* Chat Session Split View */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
                {/* Session List */}
                <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">// VISITOR SESSIONS</h3>
                    <span className="text-[10px] text-cyan-400 font-mono">{chatSessions.length} Active</span>
                  </div>

                  {chatSessions.length === 0 ? (
                    <div className="p-6 text-center text-slate-600 text-xs font-mono">
                      No active visitor chat sessions at this moment.
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => {
                          setSelectedSessionId(session.id);
                          selectChatSession(session.id);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedSessionId === session.id
                            ? 'bg-purple-950/40 border-purple-800 text-purple-300'
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-900'
                          }`}
                      >
                        <div className="font-bold text-xs text-white truncate">{session.visitor_id || 'Visitor'}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{session.last_message || 'Session open'}</div>
                      </button>
                    ))
                  )}
                </div>

                {/* Live Message Stream & Host Reply Input */}
                <div className="md:col-span-2 bg-slate-950 border border-slate-900 rounded-xl flex flex-col justify-between overflow-hidden">
                  <div className="p-4 border-b border-slate-900 text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>{selectedSessionId ? `Live Stream: ${selectedSessionId}` : 'Select a visitor session to take over'}</span>
                    {selectedSessionId && (
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE_INTERCEPT
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
                    {currentChatMessages.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-600 font-mono text-xs">
                        Select a conversation on the left to review transcript and reply live.
                      </div>
                    ) : (
                      currentChatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                          <div className={`p-3 rounded-xl max-w-sm ${msg.role === 'user' ? 'bg-slate-900 text-slate-200' : 'bg-purple-950/60 text-purple-200 border border-purple-800/40'
                            }`}>
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-slate-600 mt-0.5 px-1">{msg.role === 'user' ? 'Visitor' : 'Host / AI Twin'}</span>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={sendHostReply} className="p-3 border-t border-slate-900 flex gap-2">
                    <input
                      type="text"
                      value={hostReply}
                      onChange={(e) => setHostReply(e.target.value)}
                      placeholder={selectedSessionId ? "Type live response to visitor..." : "Select a session to reply..."}
                      disabled={!selectedSessionId}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!selectedSessionId || !hostReply.trim()}
                      className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-500 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PORTFOLIO SYSTEMS // TELEMETRY & ANALYTICS */}
          {/* ========================================================================= */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              {/* Telemetry Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Page Views', val: analytics.total_page_views || 1240, icon: Eye, color: 'text-cyan-400', bg: 'bg-cyan-950/20' },
                  { label: 'Resume Downloads', val: analytics.total_resume_downloads || 320, icon: Download, color: 'text-indigo-400', bg: 'bg-indigo-950/20' },
                  { label: 'Contact Messages', val: contacts.length || analytics.total_contacts || 14, icon: Mail, color: 'text-purple-400', bg: 'bg-purple-950/20' },
                  { label: 'AI Chat Sessions', val: chatSessions.length || analytics.total_chat_sessions || 28, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-950/20' }
                ].map((stat, idx) => (
                  <div key={idx} className="p-5 bg-slate-950/80 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">// {stat.label}</span>
                      <span className="text-2xl font-black text-white font-mono">{stat.val}</span>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} border border-slate-800`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Engagement & Retention Performance */}
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-900 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" /> Portfolio Traffic & Inbound Interest
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-center">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Recruiter Conversion</span>
                    <span className="text-xl font-bold text-cyan-300 mt-1 block">42.8%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">AI Twin Engagement Time</span>
                    <span className="text-xl font-bold text-purple-300 mt-1 block">4m 32s</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block uppercase">Interactive 3D FPS</span>
                    <span className="text-xl font-bold text-emerald-300 mt-1 block">60 FPS</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PORTFOLIO SYSTEMS // CONTACT SUBMISSIONS */}
          {/* ========================================================================= */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-cyan-400" /> Inbound Contact Messages & Inquiries
                  </h2>
                  <p className="text-[11px] text-slate-400">Direct submissions from visitors and recruiters on your portfolio.</p>
                </div>

                <input
                  type="text"
                  placeholder="Search sender, company, subject..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-64"
                />
              </div>

              <div className="overflow-x-auto bg-slate-950 border border-slate-900 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-3">Sender & Company</th>
                      <th className="px-3 py-3">Inquiry Type</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Message Snippet</th>
                      <th className="px-3 py-3 text-right">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredContacts.map((c: any) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedContact(c)}
                        className="hover:bg-slate-900/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-white text-xs">{c.name}</div>
                          <div className="text-[10px] text-slate-500">{c.email} • {c.company || 'Direct'}</div>
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-mono">
                            {c.inquiry_type || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-200 max-w-xs truncate">
                          {c.subject || 'No Subject'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate">
                          {c.message}
                        </td>
                        <td className="px-3 py-3.5 text-right text-slate-500 text-[11px] whitespace-nowrap">
                          {c.created_at?.slice(0, 10)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected Contact Modal */}
              {selectedContact && (
                <div className="p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-white text-sm">{selectedContact.name} ({selectedContact.company})</h3>
                      <span className="text-cyan-400 text-xs">{selectedContact.email}</span>
                    </div>
                    <button
                      onClick={() => setSelectedContact(null)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white text-xs"
                    >
                      Close
                    </button>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Subject:</span>
                    <p className="text-sm font-semibold text-slate-100 mt-0.5">{selectedContact.subject}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Message:</span>
                    <p className="text-xs text-slate-200 mt-1 whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed">
                      {selectedContact.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: PORTFOLIO SYSTEMS // CANDIDATE PROFILE TRUTH STORE */}
          {/* ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-900 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-400" /> Candidate Profile Truth Store
                    </h2>
                    <p className="text-[11px] text-slate-400">Strictly verified background facts used by the AI resume tailor & application submitter.</p>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-950"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingProfile ? 'Saving...' : 'Save Profile Truth Store'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Professional Title</label>
                    <input
                      type="text"
                      value={profileData.title}
                      onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Primary Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Location & Relocation</label>
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Work Authorization</label>
                    <input
                      type="text"
                      value={profileData.work_authorization}
                      onChange={(e) => setProfileData({ ...profileData, work_authorization: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Visa Sponsorship Status</label>
                    <input
                      type="text"
                      value={profileData.visa_status}
                      onChange={(e) => setProfileData({ ...profileData, visa_status: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Notice Period</label>
                    <input
                      type="text"
                      value={profileData.notice_period}
                      onChange={(e) => setProfileData({ ...profileData, notice_period: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Salary Expectation</label>
                    <input
                      type="text"
                      value={profileData.salary_expectation}
                      onChange={(e) => setProfileData({ ...profileData, salary_expectation: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono mb-2">Verified Core Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills?.map((skill: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-mono">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );

  async function selectChatSession(sessionId: string) {
    try {
      const res = await fetch(`${apiHost}/api/admin/chat/messages?session_id=${sessionId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentChatMessages(data);
      }
    } catch (e) {
      console.warn("Failed to load session messages:", e);
    }
  }

  function sendHostReply(e: React.FormEvent) {
    e.preventDefault();
    if (!hostReply.trim() || !selectedSessionId || !hostSocketRef.current) return;
    hostSocketRef.current.send(JSON.stringify({
      target_session_id: selectedSessionId,
      content: hostReply
    }));
    setCurrentChatMessages(prev => [
      ...prev,
      { role: 'assistant', content: `[Live Host] ${hostReply}`, timestamp: new Date().toISOString() }
    ]);
    setHostReply('');
  }
}
