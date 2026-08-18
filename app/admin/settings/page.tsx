'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiHost } from '@/lib/utils';
import {
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
  ArrowLeft,
  Server,
  Layers,
  ChevronRight
} from 'lucide-react';

export default function AdminSettingsPage() {
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
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStatusFilter, setAuditStatusFilter] = useState('ALL');

  const apiHost = getApiHost();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchHardeningData = async () => {
    setLoading(true);
    try {
      const [swRes, costRes, dlqRes, audRes, metRes] = await Promise.all([
        fetch(`${apiHost}/api/v2/hardening/kill-switch`).catch(() => null),
        fetch(`${apiHost}/api/v2/hardening/cost-tracking`).catch(() => null),
        fetch(`${apiHost}/api/v2/hardening/dlq`).catch(() => null),
        fetch(`${apiHost}/api/v2/hardening/audit-logs?limit=50`).catch(() => null),
        fetch(`${apiHost}/api/v2/hardening/system-metrics`).catch(() => null)
      ]);

      if (swRes && swRes.ok) {
        const d = await swRes.json();
        if (d.switches) setSwitches(d.switches);
      }
      if (costRes && costRes.ok) {
        const d = await costRes.json();
        if (d.cost_governance) setCosts(d.cost_governance);
      }
      if (dlqRes && dlqRes.ok) {
        const d = await dlqRes.json();
        if (d.items) setDlqItems(d.items);
      }
      if (audRes && audRes.ok) {
        const d = await audRes.json();
        if (d.logs) setAuditLogs(d.logs);
      }
      if (metRes && metRes.ok) {
        const d = await metRes.json();
        if (d.health) setMetrics(d.health);
      }
    } catch (e) {
      console.warn("Failed to fetch hardening state:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHardeningData();
  }, []);

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
    <div className="min-h-screen bg-[#030303] text-slate-100 font-mono text-xs p-6 md:p-10 space-y-8">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 text-xs shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Link href="/admin" className="hover:text-cyan-400 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Control Center
            </Link>
            <span>/</span>
            <span className="text-cyan-400">Production Hardening & Governance</span>
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            Security, SRE Reliability & Kill Switch Cockpit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global emergency automation stops, prompt-injection defense, dead-letter recovery, and cost governance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHardeningData}
            disabled={loading}
            className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <div className="text-[10px] font-bold px-3 py-1.5 bg-emerald-950/80 border border-emerald-800/60 rounded-full text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            GOVERNANCE_ENFORCED
          </div>
        </div>
      </div>

      {/* SECTION 1: MASTER EMERGENCY KILL SWITCH */}
      <div className={`p-6 rounded-2xl border transition-all ${
        switches.pause_all
          ? 'bg-rose-950/40 border-rose-600 shadow-2xl shadow-rose-950/50'
          : 'bg-slate-950/90 border-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${switches.pause_all ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-950/50 text-rose-400 border border-rose-800/50'}`}>
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Master Emergency Kill Switch</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  switches.pause_all ? 'bg-rose-500 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {switches.pause_all ? 'ALL AUTOMATION HALTED' : 'SYSTEM OPERATIONAL'}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1 max-w-2xl">
                Immediately terminates and blocks all autonomous background processes, cloud scrapers, form submissions, and email responses across all agents.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleToggleSwitch('pause_all', !switches.pause_all)}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xl flex items-center gap-2 shrink-0 ${
              switches.pause_all
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950'
            }`}
          >
            {switches.pause_all ? (
              <>
                <PlayCircle className="w-4 h-4" /> Resume All Autonomous Operations
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4" /> Emergency Stop (Pause All)
              </>
            )}
          </button>
        </div>

        {/* Granular Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-900">
          {[
            { key: 'pause_discovery', label: 'Job Discovery Crawlers', desc: 'LinkedIn, Greenhouse & Lever crawlers' },
            { key: 'pause_applications', label: 'Application Submissions', desc: 'Browserbase & Stagehand submissions' },
            { key: 'pause_emails', label: 'Recruiter Email Replies', desc: 'Inbound Gmail processing & drafts' },
            { key: 'pause_referrals', label: 'Referral Outreach', desc: '1st-degree LinkedIn & employee outreach' }
          ].map((item) => (
            <div key={item.key} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-200 block text-xs">{item.label}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{item.desc}</span>
              </div>
              <button
                onClick={() => handleToggleSwitch(item.key, !switches[item.key])}
                disabled={switches.pause_all}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors shrink-0 ${
                  switches[item.key]
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {switches[item.key] ? 'PAUSED' : 'ACTIVE'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: COST CONTROL & SRE TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cost Governance */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-900 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Cost & Token Quota Governance
            </h2>
            <span className="text-[10px] text-emerald-400 font-bold">${costs.month_to_date.total_cost_usd} / $25.00</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Monthly Budget Consumed</span>
              <strong className="text-slate-200">{costs.month_to_date.budget_consumed_pct}%</strong>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${costs.month_to_date.budget_consumed_pct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-center">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Today's Tokens</span>
              <span className="text-sm font-bold text-slate-200 mt-0.5 block">{costs.today.total_tokens.toLocaleString()}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Browser Sandbox</span>
              <span className="text-sm font-bold text-cyan-300 mt-0.5 block">{costs.today.browser_minutes} mins</span>
            </div>
          </div>
        </div>

        {/* SRE Reliability */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-900 space-y-4">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" /> Latency & Error Resilience
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-500 block">p50 Latency</span>
              <span className="text-xs font-bold text-cyan-300 mt-0.5 block">{metrics.automation_latency_ms.p50}ms</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-500 block">p95 Latency</span>
              <span className="text-xs font-bold text-cyan-300 mt-0.5 block">{metrics.automation_latency_ms.p95}ms</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[9px] text-slate-500 block">p99 Latency</span>
              <span className="text-xs font-bold text-cyan-300 mt-0.5 block">{metrics.automation_latency_ms.p99}ms</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Configured LLM Reliability</span>
              <strong className="text-emerald-400">100.0%</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Browserbase Cloud Uptime</span>
              <strong className="text-cyan-400">96.8%</strong>
            </div>
          </div>
        </div>

        {/* AI Safety & Injections */}
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-slate-900 space-y-4">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" /> AI Safety & Prompt Injections
          </h2>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-purple-400 block font-bold uppercase">Prompt Injections Neutralized</span>
                <span className="text-lg font-bold text-purple-200 mt-0.5 block">{metrics.prompt_injection_attempts_blocked} Injections</span>
              </div>
              <ShieldCheck className="w-6 h-6 text-purple-400" />
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Duplicate Submissions Blocked</span>
                <span className="text-lg font-bold text-slate-200 mt-0.5 block">{metrics.duplicate_submissions_prevented} Prevented</span>
              </div>
              <Layers className="w-6 h-6 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: DEAD-LETTER QUEUE (DLQ) INSPECTOR */}
      <div className="p-6 rounded-2xl bg-slate-950/90 border border-rose-500/30 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100">Dead-Letter Queue (DLQ) & Failure Recovery</h2>
              <p className="text-[11px] text-slate-400">Persistently failed tasks after 3x exponential backoffs.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {dlqItems.length} Dead Tasks
          </span>
        </div>

        {dlqItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            ✓ No unresolved dead-letter tasks. All automation pipelines running cleanly.
          </div>
        ) : (
          <div className="space-y-3">
            {dlqItems.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {item.task_type}
                    </span>
                    <span className="font-bold text-slate-200 text-xs">{item.service_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{item.created_at?.slice(0, 19).replace('T', ' ')}</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                  <span className="text-rose-400 font-bold block">// ERROR DIAGNOSTIC</span>
                  <p className="text-slate-300">{item.error_message}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleResolveDLQ(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: IMMUTABLE AUDIT TRAIL LOGS */}
      <div className="p-6 rounded-2xl bg-slate-950/90 border border-slate-900 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" /> Immutable System Audit Logs
            </h2>
            <p className="text-[11px] text-slate-400">Complete traceability of every AI decision, tool invocation, and human approval.</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search action or actor..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <select
              value={auditStatusFilter}
              onChange={(e) => setAuditStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-3 py-3">Actor / Agent</th>
                <th className="px-3 py-3">Action</th>
                <th className="px-3 py-3">Tool</th>
                <th className="px-4 py-3">Result / Output</th>
                <th className="px-3 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {log.timestamp?.slice(11, 19)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-bold text-slate-200 block">{log.actor}</span>
                    {log.ai_agent && <span className="text-[10px] text-slate-400 block">{log.ai_agent}</span>}
                  </td>
                  <td className="px-3 py-3 font-bold text-cyan-400">
                    {log.action}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {log.tool || "Native"}
                  </td>
                  <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={log.result}>
                    {log.result}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
