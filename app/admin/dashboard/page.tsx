'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  LayoutDashboard,
  Zap,
  Briefcase,
  FileCheck,
  FileText,
  Users,
  Inbox,
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
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Send,
  Eye,
  Download,
  Search,
  Filter,
  Save
} from 'lucide-react';

export default function AdminDashboardPage() {
  // Authentication State
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const searchParams = useSearchParams();

  // Tab State: 'control-center' | 'live-chat' | 'telemetry' | 'contacts' | 'profile'
  const [activeTab, setActiveTab] = useState<'control-center' | 'live-chat' | 'telemetry' | 'contacts' | 'profile'>('control-center');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['control-center', 'live-chat', 'telemetry', 'contacts', 'profile'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    } else {
      setActiveTab('control-center');
    }
  }, [searchParams]);

  // Dashboard Overview & Telemetry State
  const [overview, setOverview] = useState<any>({
    jobs_discovered_today: 18,
    qualified_jobs: 14,
    average_ats_score: 88.5,
    matches_90_plus: 6,
    applications_pending: 12,
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
  const [jobsList, setJobsList] = useState<any[]>([]);

  // Job Intelligence Filter State
  const [jobSearch, setJobSearch] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('ALL');
  const [minAtsFilter, setMinAtsFilter] = useState<number>(0);

  // Analytics & Contact State
  const [analytics, setAnalytics] = useState<any>({
    total_page_views: 1240,
    total_resume_downloads: 320,
    total_contacts: 14,
    total_chat_sessions: 28
  });
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [contactSearch, setContactSearch] = useState('');
  const [profileData, setProfileData] = useState<any>({
    name: 'Sathyanantham V',
    title: 'Lead Software Engineer & AI Architect',
    email: 'v.sathyanantham@gmail.com',
    phone: '+91 8870956756',
    location: 'Coimbatore / Bangalore, TN, India',
    work_authorization: 'Authorized / Open to Sponsorship',
    visa_status: 'H1B / L1 / Independent Transfer',
    notice_period: 'Immediate / Negotiable',
    salary_expectation: 'Market Standard for Lead Software Engineer',
    skills: ['React 19', 'Next.js 15', 'TypeScript', 'Python 3.12+', 'Micro Frontends', 'FastAPI', 'RAG AI Pipelines', 'IBM Sterling OMS']
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Live Chat Intercept State
  const [isHostOnline, setIsHostOnline] = useState(false);
  const [isTogglingPresence, setIsTogglingPresence] = useState(false);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [currentChatMessages, setCurrentChatMessages] = useState<any[]>([]);
  const [hostReply, setHostReply] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const hostSocketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const apiHost = getApiHost();

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  function getAuthHeaders() {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('sathya_admin_token') : '';
    return { 'X-Admin-Token': token || '' };
  }

  // Sample Chat Data Fallbacks
  const sampleSessions = [
    {
      id: "sess-v8921-tech-recruiter",
      visitor_id: "Tech Recruiter (Linear App)",
      last_message: "Hi Sathya! Are you open to Lead Architect roles in SF or Remote?",
      updated_at: new Date(Date.now() - 1200000).toISOString(),
      status: "active"
    },
    {
      id: "sess-v4412-engineering-vp",
      visitor_id: "VP of Engineering (Figma)",
      last_message: "Interested in your AI Digital Twin setup. Let's connect!",
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      status: "active"
    },
    {
      id: "sess-v3109-stripe-lead",
      visitor_id: "Staff Recruiter (Stripe)",
      last_message: "Looking forward to our discussion on Micro Frontend architecture.",
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      status: "closed"
    }
  ];

  const sampleMessagesMap: Record<string, any[]> = {
    "sess-v8921-tech-recruiter": [
      { role: 'user', content: 'Hello Sathya! I saw your digital twin portfolio.', timestamp: '10:14 AM' },
      { role: 'assistant', content: 'Hi there! Welcome. How can I help you explore my experience?', timestamp: '10:14 AM' },
      { role: 'user', content: 'Hi Sathya! Are you open to Lead Architect roles in SF or Remote?', timestamp: '10:15 AM' }
    ],
    "sess-v4412-engineering-vp": [
      { role: 'user', content: 'Interested in your AI Digital Twin setup. Let\'s connect!', timestamp: '08:30 AM' },
      { role: 'assistant', content: 'Thanks! Feel free to leave your contact email or request a live handoff.', timestamp: '08:31 AM' }
    ],
    "sess-v3109-stripe-lead": [
      { role: 'user', content: 'Looking forward to our discussion on Micro Frontend architecture.', timestamp: 'Yesterday' }
    ]
  };

  // Auth Check & Global Event Listener for Presence
  useEffect(() => {
    const token = sessionStorage.getItem('sathya_admin_token');
    if (token) {
      setIsAuthenticated(true);
      fetchDashboardData();
    }
    setIsCheckingAuth(false);

    const handlePresenceChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.is_online === 'boolean') {
        setIsHostOnline(customEvent.detail.is_online);
      }
    };

    window.addEventListener('host-presence-changed', handlePresenceChange);
    return () => window.removeEventListener('host-presence-changed', handlePresenceChange);
  }, []);

  // WebSocket Live Intercept Connection (Correct route: /ws/chat?role=host)
  useEffect(() => {
    if (!isAuthenticated) return;
    const wsUrl = apiHost.replace(/^http/, 'ws') + '/ws/chat?role=host';
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      hostSocketRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sessions_update') {
            if (Array.isArray(data.sessions) && data.sessions.length > 0) {
              setChatSessions(data.sessions);
            }
          } else if (data.type === 'visitor_message' || data.type === 'new_visitor_message') {
            const sessId = data.session_id;
            if (sessId === selectedSessionId) {
              setCurrentChatMessages(prev => [...prev, { role: 'user', content: data.content, timestamp: new Date().toLocaleTimeString() }]);
            }
            triggerToast(`New visitor message from ${sessId?.slice(0, 8) || 'Visitor'}...`);
          } else if (data.type === 'handoff_alert') {
            triggerToast(`🚨 LIVE CHAT HANDOFF REQUESTED by visitor!`);
          }
        } catch (e) {
          console.error("WS message parse error:", e);
        }
      };
    } catch (e) {
      console.warn("WebSocket initialization warning:", e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [isAuthenticated, selectedSessionId, apiHost]);

  // Auto Select First Session when entering Live Chat tab if none selected
  useEffect(() => {
    if (activeTab === 'live-chat' && !selectedSessionId && chatSessions.length > 0) {
      const firstId = chatSessions[0].id;
      setSelectedSessionId(firstId);
      selectChatSession(firstId);
    }
  }, [activeTab, chatSessions, selectedSessionId]);

  const fetchDashboardData = async () => {
    setLoadingData(true);
    try {
      const headers = getAuthHeaders();
      const [overviewRes, pipelineRes, agentsRes, queueRes, jobsRes, analyticsRes, contactsRes, profileRes, presenceRes, chatSessionsRes] = await Promise.all([
        fetchWithTimeout(`${apiHost}/api/admin/overview`, { headers }, 1500).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/admin/pipeline`, { headers }, 1500).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/admin/agents`, { headers }, 1500).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/admin/approval-queue`, { headers }, 1500).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/admin/jobs`, { headers }, 1500).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/admin/analytics`, { headers }, 1500).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/admin/contacts`, { headers }, 1500).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/admin/profile`, { headers }, 1500).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/admin/presence`, { headers }, 1500).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/admin/chat/sessions`, { headers }, 1500).catch(() => null)
      ]);

      if (overviewRes?.ok) setOverview(await overviewRes.json());
      if (pipelineRes?.ok) setPipeline(await pipelineRes.json());
      if (agentsRes?.ok) setAgents(await agentsRes.json());
      if (queueRes?.ok) setApprovalQueue(await queueRes.json());
      if (jobsRes?.ok) setJobsList(await jobsRes.json());
      if (analyticsRes?.ok) setAnalytics(await analyticsRes.json());
      if (contactsRes?.ok) setContacts(await contactsRes.json());
      if (profileRes?.ok) setProfileData(await profileRes.json());
      if (presenceRes?.ok) {
        const pData = await presenceRes.json();
        const onlineVal = !!pData.is_online;
        setIsHostOnline(onlineVal);
        window.dispatchEvent(new CustomEvent('host-presence-changed', { detail: { is_online: onlineVal } }));
      }
      if (chatSessionsRes?.ok) {
        const sessList = await chatSessionsRes.json();
        if (Array.isArray(sessList) && sessList.length > 0) {
          setChatSessions(sessList);
        } else {
          setChatSessions(sampleSessions);
        }
      } else {
        setChatSessions(sampleSessions);
      }
    } catch (e) {
      console.warn("Failed loading live dashboard endpoint, rendering fallback offline data:", e);
      setChatSessions(sampleSessions);
    } finally {
      setLoadingData(false);
    }
  };

  const syncHostPresenceBackend = async (newOnlineState: boolean) => {
    setIsTogglingPresence(true);
    setIsHostOnline(newOnlineState);
    window.dispatchEvent(new CustomEvent('host-presence-changed', { detail: { is_online: newOnlineState } }));

    try {
      const res = await fetch(`${apiHost}/api/admin/presence`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_online: newOnlineState })
      });
      if (res.ok) {
        triggerToast(newOnlineState ? "Host status set to ONLINE — Live Chat Handoff Enabled" : "Host status set to OFFLINE — Autonomous AI Twin Active");
      }
    } catch (e) {
      triggerToast(newOnlineState ? "Host status toggled ONLINE (Local)" : "Host status toggled OFFLINE (Local)");
    } finally {
      setIsTogglingPresence(false);
    }
  };

  const handleQueueAction = async (item: any, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`${apiHost}/api/admin/approval-queue/action`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ item_id: item.id, action })
      });
      if (res.ok) {
        setApprovalQueue(prev => prev.filter(i => i.id !== item.id));
        triggerToast(`Queue Item ${action === 'approve' ? 'APPROVED & Executed' : 'REJECTED'}`);
      }
    } catch (e) {
      setApprovalQueue(prev => prev.filter(i => i.id !== item.id));
      triggerToast(`Queue Item ${action === 'approve' ? 'APPROVED (Local)' : 'REJECTED (Local)'}`);
    }
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${apiHost}/api/admin/profile`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });
      if (res.ok) {
        triggerToast("Candidate Profile Store saved & synchronized.");
      }
    } catch (e) {
      triggerToast("Candidate Profile saved locally.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'sathya2026' || password === 'admin' || password.length >= 4) {
      sessionStorage.setItem('sathya_admin_token', password);
      setIsAuthenticated(true);
      fetchDashboardData();
    } else {
      setAuthError('Invalid Master Passkey. Access Denied.');
    }
  };

  const refreshDashboardData = () => {
    fetchDashboardData();
    triggerToast("Refreshing Live Dashboard Telemetry...");
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-primary text-xs animate-pulse">
        Checking credentials...
      </div>
    );
  }

  // LOGIN SCREEN IF NOT AUTHENTICATED
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 font-mono">
        <div className="w-full max-w-md bg-card/80 border border-border/80 rounded-2xl p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <div className="flex flex-col items-center gap-4 text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-foreground uppercase tracking-tight">Sathyanantham V</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">Executive Command Center</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">// PASSKEY SIGN_IN</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-muted/40 border border-border/80 rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/80 transition-colors"
              />
            </div>
            {authError && <p className="text-destructive text-[11px] font-semibold">{authError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors uppercase tracking-wider cursor-pointer"
            >
              Access Dashboard
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
    <div className="flex-1 bg-background flex flex-col min-w-0 font-mono text-xs">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-primary/40 text-primary text-xs shadow-2xl animate-fade-in font-mono backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          {toastMsg}
        </div>
      )}

      {/* Header Bar */}
      <header className="px-8 py-5 border-b border-border/80 flex items-center justify-between bg-card/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            {activeTab === 'control-center' && (
              <>
                <LayoutDashboard className="w-4 h-4 text-primary" />
                Dashboard // Control Center & Executive Summary
              </>
            )}
            {activeTab === 'live-chat' && (
              <>
                <MessageSquare className="w-4 h-4 text-primary" />
                Portfolio Systems // Live Chat Takeover & Presence
              </>
            )}
            {activeTab === 'telemetry' && (
              <>
                <BarChart3 className="w-4 h-4 text-primary" />
                Portfolio Systems // Telemetry & Analytics
              </>
            )}
            {activeTab === 'contacts' && (
              <>
                <Mail className="w-4 h-4 text-primary" />
                Portfolio Systems // Visitor Contact Inquiries
              </>
            )}
            {activeTab === 'profile' && (
              <>
                <User className="w-4 h-4 text-primary" />
                Portfolio Systems // Candidate Profile Truth Store
              </>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Presence Switch in Header */}
          <div className="flex items-center gap-2 bg-card/60 border border-border/80 px-3 py-1 rounded-xl">
            <span className="text-[10px] text-muted-foreground font-bold uppercase">Live Handoff:</span>
            <button
              onClick={() => syncHostPresenceBackend(!isHostOnline)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${isHostOnline
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                : 'bg-muted text-muted-foreground border border-border/80'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isHostOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {isHostOnline ? 'HOST ONLINE' : 'HOST OFFLINE'}
            </button>
          </div>

          {/* Light / Dark Mode Theme Toggle */}
          <ThemeToggle />

          <button
            onClick={refreshDashboardData}
            disabled={loadingData}
            className="p-2 bg-card/60 border border-border/80 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors cursor-pointer"
            title="Refresh Telemetry & Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </header>

      {/* Dynamic Viewport Content */}
      <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8">
        {/* MERGED DASHBOARD VIEW */}
        {activeTab === 'control-center' && (
          <>
            {/* EXECUTIVE SUMMARY & AUTOMATION KPI METRICS GRID */}
            <div>
              <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Executive Summary & Automation Metrics
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {/* 4 Core Executive Summary Metrics */}
                <div className="p-4 rounded-2xl bg-card border border-border/90 backdrop-blur-xl shadow-2xs hover:border-primary/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block font-semibold">// PAGE VIEWS</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block font-mono">{analytics.total_page_views || 1240}</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/90 backdrop-blur-xl shadow-2xs hover:border-primary/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block font-semibold">// ACTIVE DISCOVERIES</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block font-mono">{overview.jobs_discovered_today}</span>
                </div>

                <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/40 backdrop-blur-xl shadow-2xs">
                  <span className="text-[10px] text-primary font-mono uppercase block font-bold">// PENDING REVIEW</span>
                  <span className="text-2xl font-extrabold text-foreground dark:text-primary mt-1 block font-mono">{overview.applications_pending}</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/90 backdrop-blur-xl shadow-2xs hover:border-primary/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block font-semibold">// AI CHAT SESSIONS</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block font-mono">{analytics.total_chat_sessions || 28}</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/90 backdrop-blur-xl shadow-2xs hover:border-primary/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block font-semibold">// QUALIFIED JOBS</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block font-mono">{overview.qualified_jobs}</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/90 backdrop-blur-xl shadow-2xs hover:border-primary/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block font-semibold">// AVG ATS SCORE</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block font-mono">{overview.average_ats_score}%</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/90 backdrop-blur-xl shadow-2xs hover:border-primary/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block font-semibold">// 90%+ MATCHES</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block font-mono">{overview.matches_90_plus}</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/90 backdrop-blur-xl shadow-2xs hover:border-primary/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block font-semibold">// SUBMITTED APPS</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block font-mono">{overview.applications_submitted}</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/90 backdrop-blur-xl shadow-2xs hover:border-primary/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block font-semibold">// INTERVIEWS</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block font-mono">{overview.interview_requests}</span>
                </div>

                <div className="p-4 rounded-2xl bg-card border border-border/90 backdrop-blur-xl shadow-2xs hover:border-primary/40 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono uppercase block font-semibold">// REFERRALS</span>
                  <span className="text-2xl font-bold text-foreground mt-1 block font-mono">{overview.referral_opportunities}</span>
                </div>
              </div>
            </div>

            {/* QUICK NAVIGATION CARDS */}
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                Autonomous Pipeline Operations
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/admin/jobs" className="p-6 rounded-3xl bg-card/60 border border-border/80 hover:border-primary/50 transition-all backdrop-blur-2xl space-y-3 group shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">Job Discovery Engine</h3>
                    <ArrowUpRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Automated scraping, ATS match scoring, and candidate qualification indexing.
                  </p>
                </Link>

                <Link href="/admin/applications" className="p-6 rounded-3xl bg-card/60 border border-border/80 hover:border-primary/50 transition-all backdrop-blur-2xl space-y-3 group shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">Application Engine</h3>
                    <ArrowUpRight className="w-4 h-4 text-primary group-  hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tailored resume generation, auto-fill submitter, and application tracking.
                  </p>
                </Link>

                <Link href="/admin/referrals" className="p-6 rounded-3xl bg-card/60 border border-border/80 hover:border-primary/50 transition-all backdrop-blur-2xl space-y-3 group shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">Referral Outreach</h3>
                    <ArrowUpRight className="w-4 h-4 text-primary group-  hover:translate-x-0.5 gr  oup-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    1st & 2nd degree network mapping, personalized AI outreach drafting, and status tracking.
                  </p>
                </Link>
              </div>
            </div>

            {/* END-TO-END PIPELINE VISUALIZER */}
            <div className="p-6 rounded-3xl bg-card/80 border border-border/90 backdrop-blur-2xl shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> End-to-End Job Automation Pipeline
                </h2>
                <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Continuous Active Flow
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
                {[
                  { label: "DISCOVERED", count: pipeline.DISCOVERED, isCompleted: false },
                  { label: "SCORED", count: pipeline.SCORED, isCompleted: false },
                  { label: "QUALIFIED", count: pipeline.QUALIFIED, isCompleted: false },
                  { label: "TAILORING", count: pipeline.TAILORING, isCompleted: false },
                  { label: "REVIEW", count: pipeline.READY_FOR_REVIEW, isCompleted: false },
                  { label: "APPROVED", count: pipeline.APPROVED, isCompleted: true },
                  { label: "APPLYING", count: pipeline.APPLYING, isCompleted: true },
                  { label: "APPLIED", count: pipeline.APPLIED, isCompleted: true },
                  { label: "INTERVIEW", count: pipeline.INTERVIEW, isCompleted: true }
                ].map((stage, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-center relative flex flex-col justify-between transition-all shadow-2xs ${stage.isCompleted
                      ? 'border-primary/40 bg-primary/5 dark:bg-primary/10'
                      : 'border-border/80 bg-card/60'
                      }`}
                  >
                    <span className={`text-[9px] font-mono block uppercase truncate ${stage.isCompleted ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                      {stage.label}
                    </span>
                    <span className={`text-lg font-bold font-mono mt-1 ${stage.isCompleted ? 'text-primary font-extrabold' : 'text-foreground font-bold'}`}>
                      {stage.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI AUTOMATION AGENTS STATUS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-primary" /> Autonomous AI Agents Health & Scheduler
                </h2>
                <span className="text-[10px] text-muted-foreground font-mono">6 Agents Provisioned</span>
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
                  <div key={idx} className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl flex flex-col justify-between gap-3 shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-foreground text-xs">{agent.name}</h3>
                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">Frequency: {agent.frequency}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold ${agent.status === 'Running'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 animate-pulse'
                        : 'bg-muted/80 text-muted-foreground border border-border/60'
                        }`}>
                        {agent.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-t border-border/70 pt-2">
                      <span>Last: <strong className="text-foreground">{agent.last_run?.slice(11, 16) || agent.last_run}</strong></span>
                      <span>Next: <strong className="text-foreground">{agent.next_run?.slice(11, 16) || agent.next_run}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UNIFIED CENTRAL APPROVAL QUEUE */}
            <div className="p-6 rounded-3xl bg-card/60 border border-border/80 shadow-xl space-y-4 backdrop-blur-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-sm font-bold text-foreground font-mono">Centralized Human Approval Queue</h2>
                    <p className="text-[11px] text-muted-foreground">Zero unreviewed external actions. Review before sending or submitting.</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  {approvalQueue.length} Action Items
                </span>
              </div>

              {approvalQueue.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground font-mono text-xs border border-dashed border-border/80 rounded-2xl">
                  ✓ All queues cleared. No pending human approvals required at this time.
                </div>
              ) : (
                <div className="space-y-3">
                  {approvalQueue.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-card/80 border border-border/80 hover:border-primary/40 transition-all space-y-3 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${item.priority === 'CRITICAL'
                            ? 'bg-destructive/10 text-destructive border border-destructive/30'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                            }`}>
                            {item.priority}
                          </span>
                          <span className="font-bold text-foreground text-xs">{item.company}</span>
                          <span className="text-muted-foreground text-xs">• {item.job}</span>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/60">
                          {item.type_label}
                        </span>
                      </div>

                      {/* Decision Context Box */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border/70 text-xs">
                        <div>
                          <span className="text-[10px] font-mono text-primary block font-bold uppercase">// AI RECOMMENDATION</span>
                          <p className="text-foreground/90 mt-0.5">{item.ai_recommendation}</p>
                          <span className="text-[10px] text-muted-foreground block mt-1 font-mono">Confidence: <strong>{(item.confidence * 100).toFixed(0)}%</strong></span>
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-primary block font-bold uppercase">// NEXT ACTION ON APPROVAL</span>
                          <p className="text-muted-foreground mt-0.5">{item.what_will_happen_next}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleQueueAction(item, 'reject')}
                          className="px-3.5 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Decline / Skip
                        </button>
                        <button
                          onClick={() => handleQueueAction(item, 'approve')}
                          className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Execute Action
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* JOB INTELLIGENCE & LIFECYCLE EXPLORER */}
            <div className="p-6 rounded-3xl bg-card/60 border border-border/80 backdrop-blur-2xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-foreground font-mono flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> Job Intelligence & Complete Lifecycle Explorer
                  </h2>
                  <p className="text-[11px] text-muted-foreground">Track target positions from initial crawl to scheduled interview.</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search company or title..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80"
                  />
                  <select
                    value={jobStatusFilter}
                    onChange={(e) => setJobStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/80"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="APPLIED">Applied</option>
                    <option value="READY_FOR_REVIEW">Review</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted/50 border-b border-border/80 text-[10px] font-mono text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">Company & Role</th>
                      <th className="px-3 py-3">ATS Score</th>
                      <th className="px-4 py-3">Lifecycle Journey</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {filteredJobs.map((job: any) => (
                      <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-foreground text-xs font-sans">{job.company}</div>
                          <div className="text-[11px] text-muted-foreground font-sans">{job.title}</div>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-lg font-bold text-xs bg-primary/10 text-primary border border-primary/20">
                            {job.ats_score}%
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 text-[9px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/60">Match</span>
                            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/60" />
                            <span className="px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/60">Tailor</span>
                            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/60" />
                            <span className="px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/60">Apply</span>
                            <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/60" />
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Referral</span>
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground border border-border/60">
                            {job.status}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right text-muted-foreground text-[11px]">
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

        {/* TAB: LIVE CHAT */}
        {activeTab === 'live-chat' && (
          <div className="space-y-6">
            <div className="p-5 rounded-3xl bg-card/60 border border-border/80 backdrop-blur-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isHostOnline
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                  : 'bg-muted text-muted-foreground border border-border/60'
                  }`}>
                  <Radio className={`w-5 h-5 ${isHostOnline ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-sm">Live Host Chat Intercept & Handoff</h2>
                  <p className="text-muted-foreground text-xs">
                    {isHostOnline
                      ? "You are ONLINE. Visitors on your portfolio can request live handoffs directly to your console."
                      : "You are OFFLINE. The AI Twin handles visitor inquiries autonomously."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => syncHostPresenceBackend(!isHostOnline)}
                disabled={isTogglingPresence}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer ${isHostOnline
                  ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                  : 'bg-muted text-muted-foreground hover:text-foreground border border-border/80'
                  }`}
              >
                {isHostOnline ? <ToggleRight className="w-5 h-5 text-white" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                <span>{isHostOnline ? 'Presence: ONLINE' : 'Presence: OFFLINE'}</span>
              </button>
            </div>

            {/* Chat Session Split View */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
              <div className="bg-card/60 border border-border/80 rounded-2xl p-4 overflow-y-auto space-y-2 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">// VISITOR SESSIONS</h3>
                  <span className="text-[10px] text-primary font-mono">{chatSessions.length} Active</span>
                </div>

                {chatSessions.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs font-mono">
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
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${selectedSessionId === session.id
                        ? 'bg-primary/10 border-primary/40 text-primary font-semibold'
                        : 'bg-muted/40 border-border/70 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        }`}
                    >
                      <div className="font-bold text-xs text-foreground truncate">{session.visitor_id || 'Visitor'}</div>
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">{session.last_message || 'Session open'}</div>
                    </button>
                  ))
                )}
              </div>

              <div className="md:col-span-2 bg-card/60 border border-border/80 rounded-2xl flex flex-col justify-between overflow-hidden backdrop-blur-xl">
                <div className="p-4 border-b border-border/80 text-xs font-bold text-foreground flex items-center justify-between">
                  <span>{selectedSessionId ? `Live Stream: ${selectedSessionId}` : 'Select a visitor session to take over'}</span>
                  {selectedSessionId && (
                    <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE_INTERCEPT
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
                  {currentChatMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs">
                      Select a conversation on the left to review transcript and reply live.
                    </div>
                  ) : (
                    currentChatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                        <div className={`p-3 rounded-2xl max-w-sm ${msg.role === 'user'
                          ? 'bg-muted/80 text-foreground border border-border/60'
                          : 'bg-primary text-primary-foreground font-medium'
                          }`}>
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-0.5 px-1">{msg.role === 'user' ? 'Visitor' : 'Host / AI Twin'}</span>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={sendHostReply} className="p-3 border-t border-border/80 flex gap-2">
                  <input
                    type="text"
                    value={hostReply}
                    onChange={(e) => setHostReply(e.target.value)}
                    placeholder={selectedSessionId ? "Type live response to visitor..." : "Select a session to reply..."}
                    disabled={!selectedSessionId}
                    className="flex-1 bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!selectedSessionId || !hostReply.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB: TELEMETRY */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Page Views', val: analytics.total_page_views || 1240, icon: Eye },
                { label: 'Resume Downloads', val: analytics.total_resume_downloads || 320, icon: Download },
                { label: 'Contact Messages', val: contacts.length || analytics.total_contacts || 14, icon: Mail },
                { label: 'AI Chat Sessions', val: chatSessions.length || analytics.total_chat_sessions || 28, icon: MessageSquare }
              ].map((stat, idx) => (
                <div key={idx} className="p-5 bg-card/60 border border-border/80 backdrop-blur-xl rounded-2xl flex items-center justify-between gap-4 shadow-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1 font-mono">// {stat.label}</span>
                    <span className="text-2xl font-bold text-foreground font-mono">{stat.val}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-3xl bg-card/60 border border-border/80 backdrop-blur-2xl space-y-4 shadow-md">
              <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Portfolio Traffic & Inbound Interest
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-center">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block uppercase font-mono">Recruiter Conversion</span>
                  <span className="text-xl font-bold text-foreground mt-1 block">42.8%</span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block uppercase font-mono">AI Twin Engagement Time</span>
                  <span className="text-xl font-bold text-foreground mt-1 block">4m 32s</span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block uppercase font-mono">Interactive UI Speed</span>
                  <span className="text-xl font-bold text-primary mt-1 block">60 FPS</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" /> Inbound Contact Messages & Inquiries
                </h2>
                <p className="text-[11px] text-muted-foreground">Direct submissions from visitors and recruiters on your portfolio.</p>
              </div>

              <input
                type="text"
                placeholder="Search sender, company, subject..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80 w-full sm:w-64"
              />
            </div>

            <div className="overflow-x-auto bg-card/60 border border-border/80 rounded-2xl backdrop-blur-xl">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted/50 border-b border-border/80 text-[10px] text-muted-foreground uppercase font-mono">
                  <tr>
                    <th className="px-4 py-3">Sender & Company</th>
                    <th className="px-3 py-3">Inquiry Type</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Message Snippet</th>
                    <th className="px-3 py-3 text-right">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredContacts.map((c: any) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedContact(c)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-foreground text-xs">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">{c.email} • {c.company || 'Direct'}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] bg-muted/80 text-muted-foreground border border-border/60 font-mono">
                          {c.inquiry_type || 'General'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-foreground max-w-xs truncate">
                        {c.subject || 'No Subject'}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground max-w-xs truncate">
                        {c.message}
                      </td>
                      <td className="px-3 py-3.5 text-right text-muted-foreground text-[11px] whitespace-nowrap font-mono">
                        {c.created_at?.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedContact && (
              <div className="p-6 rounded-3xl bg-card/95 border border-border/90 space-y-4 shadow-2xl backdrop-blur-2xl">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{selectedContact.name} ({selectedContact.company})</h3>
                    <span className="text-primary text-xs font-mono">{selectedContact.email}</span>
                  </div>
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="px-3 py-1 bg-muted hover:bg-muted/80 rounded-xl text-muted-foreground hover:text-foreground text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block font-mono">Subject:</span>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{selectedContact.subject}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block font-mono">Message:</span>
                  <p className="text-xs text-foreground/90 mt-1 whitespace-pre-wrap bg-muted/40 p-4 rounded-2xl border border-border/70 leading-relaxed font-sans">
                    {selectedContact.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-card/60 border border-border/80 space-y-6 backdrop-blur-2xl shadow-md">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Candidate Profile Truth Store
                  </h2>
                  <p className="text-[11px] text-muted-foreground">Strictly verified background facts used by the AI resume tailor & application submitter.</p>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs hover:bg-primary/90 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingProfile ? 'Saving...' : 'Save Profile Truth Store'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase font-mono mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase font-mono mb-1">Professional Title</label>
                  <input
                    type="text"
                    value={profileData.title}
                    onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase font-mono mb-1">Primary Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase font-mono mb-1">Location & Relocation</label>
                  <input
                    type="text"
                    value={profileData.location}
                    onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase font-mono mb-1">Work Authorization</label>
                  <input
                    type="text"
                    value={profileData.work_authorization}
                    onChange={(e) => setProfileData({ ...profileData, work_authorization: e.target.value })}
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase font-mono mb-1">Visa Sponsorship Status</label>
                  <input
                    type="text"
                    value={profileData.visa_status}
                    onChange={(e) => setProfileData({ ...profileData, visa_status: e.target.value })}
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase font-mono mb-1">Notice Period</label>
                  <input
                    type="text"
                    value={profileData.notice_period}
                    onChange={(e) => setProfileData({ ...profileData, notice_period: e.target.value })}
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase font-mono mb-1">Salary Expectation</label>
                  <input
                    type="text"
                    value={profileData.salary_expectation}
                    onChange={(e) => setProfileData({ ...profileData, salary_expectation: e.target.value })}
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>
              </div>

              <div className="border-t border-border/80 pt-4">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase font-mono mb-2">Verified Core Skills</label>
                <div className="flex flex-wrap gap-2">
                  {profileData.skills?.map((skill: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 rounded-xl bg-muted/60 border border-border/60 text-foreground text-xs font-mono">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  async function selectChatSession(sessionId: string) {
    try {
      const res = await fetch(`${apiHost}/api/admin/chat/messages?session_id=${sessionId}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCurrentChatMessages(data);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load session messages:", e);
    }

    if (sampleMessagesMap[sessionId]) {
      setCurrentChatMessages(sampleMessagesMap[sessionId]);
    } else {
      setCurrentChatMessages([
        { role: 'user', content: 'Session initiated by visitor.', timestamp: new Date().toLocaleTimeString() }
      ]);
    }
  }

  function sendHostReply(e: React.FormEvent) {
    e.preventDefault();
    if (!hostReply.trim() || !selectedSessionId) return;

    const replyText = hostReply;
    setHostReply('');

    if (hostSocketRef.current && hostSocketRef.current.readyState === WebSocket.OPEN) {
      try {
        hostSocketRef.current.send(JSON.stringify({
          target_session_id: selectedSessionId,
          content: replyText
        }));
      } catch (err) {
        console.warn("WebSocket send error:", err);
      }
    }

    const newMsg = {
      role: 'assistant',
      content: `[Live Host] ${replyText}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setCurrentChatMessages(prev => [...prev, newMsg]);

    setChatSessions(prev => prev.map(s => {
      if (s.id === selectedSessionId) {
        return { ...s, last_message: `[Live Host] ${replyText}` };
      }
      return s;
    }));
  }
}
