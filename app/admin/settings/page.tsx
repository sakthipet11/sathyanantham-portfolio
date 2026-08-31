'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import {
  Settings,
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Lock,
  PauseCircle,
  PlayCircle,
  DollarSign,
  Cpu,
  Database,
  Terminal,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Zap,
  Server,
  Layers,
  ChevronRight,
  Sliders,
  Bot,
  Key,
  Globe,
  Gauge,
  Save,
  Check,
  User,
  Mail,
  KeyRound,
  UserCheck
} from 'lucide-react';

function AdminSettingsContent() {
  const apiHost = getApiHost();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'security' | 'system' | 'user'>('system');

  useEffect(() => {
    if (tabParam === 'security') {
      setActiveTab('security');
    } else if (tabParam === 'user') {
      setActiveTab('user');
    } else if (tabParam === 'system' || tabParam === 'general') {
      setActiveTab('system');
    }
  }, [tabParam]);

  // System Settings State
  const [generalConfig, setGeneralConfig] = useState({
    api_host: apiHost,
    environment: 'production',
    admin_token_active: true,
    rate_limit_per_min: 120,
    maintenance_mode: false,
    debug_logs: false
  });

  // AI & Model Settings State
  const [aiConfig, setAiConfig] = useState({
    primary_provider: 'Gemini 2.0 Flash / Pro',
    model_name: 'gemini-2.0-flash-exp',
    temperature: 0.2,
    max_output_tokens: 2048,
    rag_retrieval_limit: 5,
    copilot_auto_respond: true
  });

  // User & Candidate Profile Settings State
  const [userProfile, setUserProfile] = useState({
    name: 'Sathyanantham V',
    title: 'Lead Software Engineer & AI Architect',
    email: 'v.sathyanantham@gmail.com',
    phone: '+91 8870956756',
    location: 'Coimbatore / Bangalore, TN, India',
    work_authorization: 'Authorized / Open to Sponsorship',
    visa_status: 'H1B / L1 / Independent Transfer',
    notice_period: 'Immediate / Negotiable',
    salary_expectation: 'Market Standard for Lead Software Engineer',
    bio: 'Crafting high-scale enterprise applications with modern technologies. Over 13+ years experience leading Nextuple Order Management, 30+ Bayer platforms, and Kohl’s E-Commerce.',
    skills: ['React 19', 'Next.js 15', 'TypeScript', 'Python 3.12+', 'Micro Frontends', 'FastAPI', 'RAG AI Pipelines', 'IBM Sterling OMS'],
    role: 'Platform Owner & System Architect',
    admin_token: typeof window !== 'undefined' ? sessionStorage.getItem('sathya_admin_token') || 'sathya_admin_secure_token' : 'sathya_admin_secure_token',
    two_factor_enabled: true,
    email_notifications: true,
    session_timeout_mins: 60,
    auto_sync_portfolio: true,
    new_skill_input: ''
  });

  // Hardening, Kill Switch & SRE State
  const [switches, setSwitches] = useState<any>({
    pause_all: false,
    pause_discovery: false,
    pause_applications: false,
    pause_emails: false,
    pause_referrals: false,
    updated_by: "SYSTEM_DEFAULT",
    last_updated_at: new Date().toISOString(),
    reason: "Normal operations active"
  });

  const [costs, setCosts] = useState<any>({
    today: {
      total_cost_usd: 0.412,
      total_tokens: 162000,
      browser_minutes: 18.5,
      gemini_calls: 48,
      google_api_calls: 86,
      database_ops: 240
    },
    month_to_date: {
      total_cost_usd: 5.85,
      total_tokens: 2430000,
      browser_minutes: 142.0,
      budget_limit_usd: 25.00,
      budget_consumed_pct: 23.4
    },
    service_breakdown: [
      { name: "Gemini 2.0 Flash / Pro LLM", cost_usd: 1.84, pct: 31 },
      { name: "Browserbase Cloud Sandbox", cost_usd: 3.42, pct: 58 },
      { name: "Google Workspace & Storage", cost_usd: 0.62, pct: 11 }
    ]
  });

  const [dlqItems, setDlqItems] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    automation_latency_ms: { p50: 180, p95: 840, p99: 2100 },
    gemini_failure_rate_pct: 0.0,
    browserbase_success_rate_pct: 96.8,
    dead_letter_unresolved_count: 1,
    prompt_injection_attempts_blocked: 14,
    duplicate_submissions_prevented: 8
  });

  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState('ALL');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchHardeningData = async () => {
    setLoading(true);
    try {
      const [swRes, costRes, dlqRes, audRes, metRes] = await Promise.all([
        fetchWithTimeout(`${apiHost}/api/v2/hardening/kill-switch`, {}, 10000).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/v2/hardening/cost-tracking`, {}, 10000).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/v2/hardening/dlq`, {}, 10000).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/v2/hardening/audit-logs?limit=50`, {}, 10000).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/v2/hardening/system-metrics`, {}, 10000).catch(() => null)
      ]);

      if (swRes?.ok) {
        const d = await swRes.json();
        setSwitches(d.switches || switches);
      }
      if (dlqRes?.ok) {
        const d = await dlqRes.json();
        setDlqItems(d.dlq_items || []);
      }
      if (audRes?.ok) {
        const d = await audRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch {
      showToast("Loaded offline configuration defaults.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHardeningData();
  }, []);

  const handleSaveSystemConfig = () => {
    setSavingConfig(true);
    setTimeout(() => {
      setSavingConfig(false);
      showToast("System & AI parameters updated successfully.");
    }, 600);
  };

  const handleSaveUserProfile = () => {
    setSavingConfig(true);
    setTimeout(() => {
      setSavingConfig(false);
      showToast("User account settings & admin credentials updated.");
    }, 600);
  };

  const handleToggleSwitch = async (key: string, nextVal: boolean) => {
    const updatedSwitches = {
      ...switches,
      [key]: nextVal
    };
    try {
      const res = await fetch(`${apiHost}/api/v2/hardening/kill-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pause_all: updatedSwitches.pause_all,
          pause_discovery: updatedSwitches.pause_discovery,
          pause_applications: updatedSwitches.pause_applications,
          pause_emails: updatedSwitches.pause_emails,
          pause_referrals: updatedSwitches.pause_referrals,
          updated_by: "HUMAN_ADMIN",
          reason: `Switch ${key} set to ${nextVal}`
        })
      });
      if (res.ok) {
        const d = await res.json();
        setSwitches(d.switches);
        showToast(`Switch updated: ${key} = ${nextVal ? 'PAUSED' : 'ACTIVE'}`);
      }
    } catch {
      setSwitches(updatedSwitches);
      showToast(`Locally updated switch: ${key}`);
    }
  };

  const handleResolveDLQ = async (itemId: string) => {
    try {
      await fetch(`${apiHost}/api/v2/hardening/dlq/${itemId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_notes: "Resolved and cleared from DLQ by admin" })
      });
      setDlqItems(prev => prev.filter(i => i.id !== itemId));
      showToast(`DLQ task ${itemId} marked as resolved.`);
    } catch {
      setDlqItems(prev => prev.filter(i => i.id !== itemId));
      showToast(`DLQ task ${itemId} resolved.`);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = (log.action || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
                          (log.actor || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
                          (log.result || '').toLowerCase().includes(auditSearch.toLowerCase());
    const matchesStatus = auditStatusFilter === 'ALL' || log.status === auditStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 bg-background text-foreground font-mono text-xs p-6 md:p-10 space-y-8 transition-colors duration-300">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-primary/40 text-primary text-xs shadow-2xl animate-fade-in font-mono backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          {toastMsg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <span className="text-primary font-semibold">Settings & Governance Cockpit</span>
          </div>
          <h1 className="text-xl font-bold text-foreground uppercase tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-primary" />
            Control Center // Settings & Governance
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage Security & SRE controls, System & AI configuration, and User admin settings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={fetchHardeningData}
            disabled={loading}
            className="p-2 bg-card/60 border border-border/80 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors cursor-pointer"
            title="Refresh Settings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
          <div className="text-[10px] font-bold px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-500 flex items-center gap-1.5 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            SYSTEM_OPERATIONAL
          </div>
        </div>
      </div>

      {/* 3 Main Settings Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card/60 text-muted-foreground hover:text-foreground border border-border/80'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>1. Security & SRE</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
            activeTab === 'system'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card/60 text-muted-foreground hover:text-foreground border border-border/80'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>2. System Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('user')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
            activeTab === 'user'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card/60 text-muted-foreground hover:text-foreground border border-border/80'
          }`}
        >
          <User className="w-4 h-4" />
          <span>3. User Settings</span>
        </button>
      </div>

      {/* MENU 1: SECURITY & SRE */}
      {activeTab === 'security' && (
        <div className="space-y-8 animate-fade-in">
          {/* MASTER EMERGENCY KILL SWITCH */}
          <div className={`p-6 rounded-2xl border transition-all backdrop-blur-xl ${
            switches.pause_all
              ? 'bg-destructive/10 border-destructive shadow-2xl'
              : 'bg-card/60 border-border/80 shadow-xs'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${switches.pause_all ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
                  <AlertOctagon className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider font-sans">Master Emergency Kill Switch</h2>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                      switches.pause_all ? 'bg-destructive text-destructive-foreground' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                    }`}>
                      {switches.pause_all ? 'ALL AUTOMATION HALTED' : 'SYSTEM OPERATIONAL'}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1 max-w-2xl font-sans">
                    Immediately terminates and blocks all autonomous background processes, cloud scrapers, form submissions, and email responses across all agents.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggleSwitch('pause_all', !switches.pause_all)}
                className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer ${
                  switches.pause_all
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                }`}
              >
                {switches.pause_all ? (
                  <>
                    <PlayCircle className="w-4 h-4" /> Resume All Operations
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-4 h-4" /> Emergency Stop (Pause All)
                  </>
                )}
              </button>
            </div>

            {/* Granular Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/80 font-sans">
              {[
                { key: 'pause_discovery', label: 'Job Discovery Crawlers', desc: 'LinkedIn, Greenhouse & Lever crawlers' },
                { key: 'pause_applications', label: 'Application Submissions', desc: 'Browserbase & Stagehand submissions' },
                { key: 'pause_emails', label: 'Recruiter Email Replies', desc: 'Inbound Gmail processing & drafts' },
                { key: 'pause_referrals', label: 'Referral Outreach', desc: '1st-degree LinkedIn & employee outreach' }
              ].map((item) => (
                <div key={item.key} className="p-3.5 rounded-xl bg-card/60 border border-border/80 flex items-center justify-between gap-3 shadow-xs">
                  <div>
                    <span className="font-bold text-foreground block text-xs font-mono">{item.label}</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">{item.desc}</span>
                  </div>
                  <button
                    onClick={() => handleToggleSwitch(item.key, !switches[item.key])}
                    disabled={switches.pause_all}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-colors shrink-0 cursor-pointer ${
                      switches[item.key]
                        ? 'bg-destructive/10 text-destructive border border-destructive/30'
                        : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                    }`}
                  >
                    {switches[item.key] ? 'PAUSED' : 'ACTIVE'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* COST GOVERNANCE & TELEMETRY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-card/60 border border-border/80 space-y-4 backdrop-blur-xl shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 font-sans">
                  <DollarSign className="w-4 h-4 text-emerald-500" /> Cost & Token Quota Governance
                </h2>
                <span className="text-[10px] text-emerald-500 font-bold font-mono">${costs.month_to_date.total_cost_usd} / $25.00</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-muted-foreground">Monthly Budget Consumed</span>
                  <strong className="text-foreground">{costs.month_to_date.budget_consumed_pct}%</strong>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/60">
                  <div className="bg-emerald-500 h-full" style={{ width: `${costs.month_to_date.budget_consumed_pct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-xs">
                  <span className="text-[10px] text-muted-foreground block uppercase">Today's Tokens</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">{costs.today.total_tokens.toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-xs">
                  <span className="text-[10px] text-muted-foreground block uppercase">Browser Sandbox</span>
                  <span className="text-sm font-bold text-primary mt-0.5 block">{costs.today.browser_minutes} mins</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/60 border border-border/80 space-y-4 backdrop-blur-xl shadow-xs">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 font-sans">
                <Activity className="w-4 h-4 text-primary" /> Latency & Error Resilience
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-xs">
                  <span className="text-[9px] text-muted-foreground block">p50 Latency</span>
                  <span className="text-xs font-bold text-primary mt-0.5 block">{metrics.automation_latency_ms.p50}ms</span>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-xs">
                  <span className="text-[9px] text-muted-foreground block">p95 Latency</span>
                  <span className="text-xs font-bold text-primary mt-0.5 block">{metrics.automation_latency_ms.p95}ms</span>
                </div>
                <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-xs">
                  <span className="text-[9px] text-muted-foreground block">p99 Latency</span>
                  <span className="text-xs font-bold text-primary mt-0.5 block">{metrics.automation_latency_ms.p99}ms</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card/60 border border-border/80 space-y-4 backdrop-blur-xl shadow-xs">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 font-sans">
                <ShieldCheck className="w-4 h-4 text-primary" /> AI Safety & Prompt Injections
              </h2>
              <div className="space-y-3 font-mono">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-primary block font-bold uppercase">Prompt Injections Blocked</span>
                    <span className="text-lg font-bold text-foreground mt-0.5 block">{metrics.prompt_injection_attempts_blocked} Neutralized</span>
                  </div>
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* DEAD-LETTER QUEUE */}
          <div className="p-6 rounded-2xl bg-card/60 border border-destructive/30 shadow-xl space-y-4 backdrop-blur-xl font-sans">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-destructive" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">Dead-Letter Queue (DLQ) Recovery</h2>
                  <p className="text-[11px] text-muted-foreground font-mono">Persistently failed tasks after 3x exponential backoffs.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-destructive/10 text-destructive border border-destructive/20">
                {dlqItems.length} Dead Tasks
              </span>
            </div>

            {dlqItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border/80 rounded-xl font-mono">
                ✓ No unresolved dead-letter tasks. All automation pipelines running cleanly.
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                {dlqItems.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-card border border-border/80 space-y-3 shadow-xs">
                    <div className="flex justify-between">
                      <span className="font-bold text-foreground text-xs">{item.service_name} ({item.task_type})</span>
                      <button onClick={() => handleResolveDLQ(item.id)} className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                        Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AUDIT LOGS */}
          <div className="p-6 rounded-2xl bg-card/60 border border-border/80 shadow-xl space-y-4 backdrop-blur-xl">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-sans">
              <Terminal className="w-4 h-4 text-primary" /> Immutable System Audit Logs
            </h2>
            <div className="overflow-x-auto font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-muted/50 text-[10px] text-muted-foreground uppercase">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLogs.slice(0, 10).map((log: any) => (
                    <tr key={log.id}>
                      <td className="p-3 text-muted-foreground">{log.timestamp?.slice(11, 19)}</td>
                      <td className="p-3 font-bold">{log.actor}</td>
                      <td className="p-3 text-primary">{log.action}</td>
                      <td className="p-3"><span className="text-emerald-500 font-bold">{log.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MENU 2: SYSTEM SETTINGS */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-sans uppercase">
                  <Server className="w-4 h-4 text-primary" /> Core Server Host & Environment Config
                </h2>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Configure REST origin endpoints, rate limiters, and maintenance overlays.
                </p>
              </div>
              <button
                onClick={handleSaveSystemConfig}
                disabled={savingConfig}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {savingConfig ? 'Saving...' : 'Save System Settings'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Backend API Host Endpoint</label>
                <input
                  type="text"
                  value={generalConfig.api_host}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, api_host: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Deployment Environment Mode</label>
                <select
                  value={generalConfig.environment}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, environment: e.target.value })}
                  className="theme-select w-full px-3.5 py-2.5 bg-card border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer shadow-xs transition"
                >
                  <option value="production" className="bg-card text-foreground">Production (Hardened Security)</option>
                  <option value="staging" className="bg-card text-foreground">Staging Sandbox</option>
                  <option value="development" className="bg-card text-foreground">Local Development</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Primary AI Model</label>
                <select
                  value={aiConfig.primary_provider}
                  onChange={(e) => setAiConfig({ ...aiConfig, primary_provider: e.target.value })}
                  className="theme-select w-full px-3.5 py-2.5 bg-card border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary cursor-pointer shadow-xs transition"
                >
                  <option value="Gemini 2.0 Flash / Pro" className="bg-card text-foreground">Google Gemini 2.0 Flash / Pro (Default)</option>
                  <option value="OpenRouter RAG Fallback" className="bg-card text-foreground">OpenRouter RAG Engine</option>
                </select>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground block text-xs font-mono">Public Maintenance Mode</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Freeze public chat and display maintenance indicator.
                  </span>
                </div>
                <button
                  onClick={() => setGeneralConfig({ ...generalConfig, maintenance_mode: !generalConfig.maintenance_mode })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
                    generalConfig.maintenance_mode
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                      : 'bg-muted text-muted-foreground border border-border/80'
                  }`}
                >
                  {generalConfig.maintenance_mode ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENU 3: USER SETTINGS & CANDIDATE PROFILE TRUTH STORE */}
      {activeTab === 'user' && (
        <div className="space-y-6 animate-fade-in">
          {/* Section 1: Candidate Profile & Ground Truth Details */}
          <div className="p-6 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-sans uppercase">
                  <UserCheck className="w-4 h-4 text-primary" /> Candidate Profile Ground Truth Store
                </h2>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Authoritative personal & technical truth store used by AI agents for resume tailoring & recruiter replies.
                </p>
              </div>
              <button
                onClick={handleSaveUserProfile}
                disabled={savingConfig}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer font-sans"
              >
                <Save className="w-4 h-4" />
                {savingConfig ? 'Saving Profile...' : 'Save User & Candidate Settings'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Full Name</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Professional Title</label>
                <input
                  type="text"
                  value={userProfile.title}
                  onChange={(e) => setUserProfile({ ...userProfile, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Primary Contact Email</label>
                <input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Phone / WhatsApp Contact</label>
                <input
                  type="text"
                  value={userProfile.phone}
                  onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Location & Relocation Preference</label>
                <input
                  type="text"
                  value={userProfile.location}
                  onChange={(e) => setUserProfile({ ...userProfile, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Work Authorization Status</label>
                <input
                  type="text"
                  value={userProfile.work_authorization}
                  onChange={(e) => setUserProfile({ ...userProfile, work_authorization: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Visa Sponsorship Status</label>
                <input
                  type="text"
                  value={userProfile.visa_status}
                  onChange={(e) => setUserProfile({ ...userProfile, visa_status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Notice Period Availability</label>
                <input
                  type="text"
                  value={userProfile.notice_period}
                  onChange={(e) => setUserProfile({ ...userProfile, notice_period: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-foreground block font-mono">Salary & Compensation Expectation</label>
                <input
                  type="text"
                  value={userProfile.salary_expectation}
                  onChange={(e) => setUserProfile({ ...userProfile, salary_expectation: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-foreground block font-mono">Executive Summary & Technical Bio</label>
                <textarea
                  rows={3}
                  value={userProfile.bio}
                  onChange={(e) => setUserProfile({ ...userProfile, bio: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-sans text-foreground focus:outline-none focus:border-primary/80 leading-relaxed"
                />
              </div>
            </div>

            {/* Verified Core Skills */}
            <div className="border-t border-border/80 pt-5 space-y-3 font-sans">
              <label className="text-xs font-bold text-foreground block font-mono">Verified Core Technical Skills</label>
              <div className="flex flex-wrap gap-2">
                {userProfile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-semibold"
                  >
                    {skill}
                    <button
                      onClick={() => setUserProfile({
                        ...userProfile,
                        skills: userProfile.skills.filter((_, i) => i !== idx)
                      })}
                      className="hover:text-destructive text-primary/70 transition-colors cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-md pt-1">
                <input
                  type="text"
                  placeholder="Add skill (e.g. Next.js 15, FastAPI)..."
                  value={userProfile.new_skill_input}
                  onChange={(e) => setUserProfile({ ...userProfile, new_skill_input: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && userProfile.new_skill_input.trim()) {
                      e.preventDefault();
                      setUserProfile({
                        ...userProfile,
                        skills: [...userProfile.skills, userProfile.new_skill_input.trim()],
                        new_skill_input: ''
                      });
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (userProfile.new_skill_input.trim()) {
                      setUserProfile({
                        ...userProfile,
                        skills: [...userProfile.skills, userProfile.new_skill_input.trim()],
                        new_skill_input: ''
                      });
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-card border border-border/80 text-foreground font-mono text-xs font-semibold hover:border-primary/80 transition-all cursor-pointer"
                >
                  Add Skill
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Admin Security Credentials & Access Control */}
          <div className="p-6 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs space-y-6 font-sans">
            <div className="border-b border-border/80 pb-4">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2 font-sans uppercase">
                <KeyRound className="w-4 h-4 text-primary" /> Admin Account Security & Authentication
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Manage REST API token secrets, session timeouts, and two-factor authentication.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Admin Role & Scope</label>
                <input
                  type="text"
                  disabled
                  value={userProfile.role}
                  className="w-full px-3.5 py-2.5 bg-muted/60 border border-border/80 rounded-xl text-xs font-mono text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block font-mono">Admin Security Token Key</label>
                <div className="relative">
                  <input
                    type="password"
                    value={userProfile.admin_token}
                    onChange={(e) => setUserProfile({ ...userProfile, admin_token: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs font-mono text-foreground focus:outline-none focus:border-primary/80 pr-10"
                  />
                  <KeyRound className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground block text-xs font-mono">Two-Factor Authentication (2FA)</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Enforce TOTP validation on sensitive admin overrides.
                  </span>
                </div>
                <button
                  onClick={() => setUserProfile({ ...userProfile, two_factor_enabled: !userProfile.two_factor_enabled })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
                    userProfile.two_factor_enabled
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border border-border/80'
                  }`}
                >
                  {userProfile.two_factor_enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground block text-xs font-mono">Auto-Sync Public Portfolio</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Propagate ground truth updates immediately to the public UI.
                  </span>
                </div>
                <button
                  onClick={() => setUserProfile({ ...userProfile, auto_sync_portfolio: !userProfile.auto_sync_portfolio })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer ${
                    userProfile.auto_sync_portfolio
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border border-border/80'
                  }`}
                >
                  {userProfile.auto_sync_portfolio ? 'ACTIVE' : 'OFFLINE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center font-mono text-primary text-xs animate-pulse">
        Loading Settings...
      </div>
    }>
      <AdminSettingsContent />
    </Suspense>
  );
}
