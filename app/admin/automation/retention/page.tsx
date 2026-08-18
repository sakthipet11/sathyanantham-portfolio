'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Play,
  Pause,
  Save,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Layers,
  Sparkles,
  Database,
  Sliders,
  Calendar,
  Activity
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface RetentionPolicy {
  pipeline: string;
  enabled: boolean;
  retention_days: number;
  status_filter: string[] | null;
  last_purge_at: string | null;
  last_purged_count: number;
  total_purged_count: number;
  updated_at: string;
  updated_by: string;
}

const PIPELINE_LABELS: Record<string, { title: string; desc: string; icon: any }> = {
  jobs: {
    title: "Job Discovery Radar",
    desc: "Scraped jobs, ATS match score breakdowns, and portal metadata",
    icon: Layers
  },
  applications: {
    title: "Applications Engine",
    desc: "Automated candidate application payloads, form submissions & verification logs",
    icon: Sparkles
  },
  resumes: {
    title: "Resumes & Packages",
    desc: "Tailored PDF resume versions, cover letter packages & Drive links",
    icon: Database
  },
  referrals: {
    title: "Referrals & Outreach",
    desc: "1st/2nd-degree contact matches, drafted referral messages & history",
    icon: Activity
  },
  emails: {
    title: "Recruiter Inbox",
    desc: "Categorized recruiter emails, AI classifications & drafted responses",
    icon: Sliders
  }
};

export default function RetentionManagementPage() {
  const apiHost = getApiHost();
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Edit State per pipeline
  const [editState, setEditState] = useState<Record<string, { retention_days: number; status_filter_text: string }>>({});
  
  // Preview Modal
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Run Now Modal
  const [runNowPipeline, setRunNowPipeline] = useState<string | null>(null);
  const [isRunningPurge, setIsRunningPurge] = useState(false);

  useLockBodyScroll(!!previewData || !!runNowPipeline);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetchWithTimeout(`${apiHost}/api/v2/automation/retention-policies`, {}, 1500);
      if (res.ok) {
        const data = await res.json();
        const pols: RetentionPolicy[] = data.policies || [];
        setPolicies(pols);

        const initialEdits: Record<string, { retention_days: number; status_filter_text: string }> = {};
        pols.forEach((p) => {
          initialEdits[p.pipeline] = {
            retention_days: p.retention_days,
            status_filter_text: p.status_filter ? p.status_filter.join(', ') : ''
          };
        });
        setEditState(initialEdits);
      }
    } catch {
      showToast("Error loading retention policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [apiHost]);

  const handleToggleEnable = async (pipeline: string, currentEnabled: boolean) => {
    const endpoint = currentEnabled ? 'pause' : 'resume';
    try {
      const res = await fetch(`${apiHost}/api/v2/automation/retention-policies/${pipeline}/${endpoint}`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast(`Policy for '${pipeline}' ${currentEnabled ? 'PAUSED' : 'RESUMED'}.`);
        fetchPolicies();
      }
    } catch {
      showToast("Failed to toggle policy state");
    }
  };

  const handleSavePolicy = async (pipeline: string) => {
    const state = editState[pipeline];
    if (!state) return;

    const currentPol = policies.find((p) => p.pipeline === pipeline);
    const filterArray = state.status_filter_text.trim()
      ? state.status_filter_text.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : null;

    try {
      const res = await fetch(`${apiHost}/api/v2/automation/retention-policies/${pipeline}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: currentPol ? currentPol.enabled : false,
          retention_days: Number(state.retention_days),
          status_filter: filterArray
        })
      });
      if (res.ok) {
        showToast(`Retention policy for '${pipeline}' saved successfully.`);
        fetchPolicies();
      }
    } catch {
      showToast("Error saving retention policy");
    }
  };

  const handlePreview = async (pipeline: string) => {
    const state = editState[pipeline];
    if (!state) return;
    setPreviewLoading(true);

    const filterArray = state.status_filter_text.trim()
      ? state.status_filter_text.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : null;

    try {
      const res = await fetch(`${apiHost}/api/v2/automation/retention-policies/${pipeline}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retention_days: Number(state.retention_days),
          status_filter: filterArray
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.preview);
      }
    } catch {
      showToast("Error generating preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteRunNow = async () => {
    if (!runNowPipeline) return;
    setIsRunningPurge(true);

    try {
      const res = await fetch(`${apiHost}/api/v2/automation/retention-policies/${runNowPipeline}/run-now`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        const deleted = data.result?.deleted_count || 0;
        showToast(`Purge completed: ${deleted} record(s) hard-deleted from '${runNowPipeline}'.`);
        fetchPolicies();
      }
    } catch {
      showToast("Error running retention purge");
    } finally {
      setIsRunningPurge(false);
      setRunNowPipeline(null);
    }
  };

  const grandTotalPurged = policies.reduce((acc, p) => acc + (p.total_purged_count || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans transition-colors duration-300">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-primary/40 text-primary text-xs shadow-2xl animate-fade-in font-mono backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          {toastMsg}
        </div>
      )}

      {/* Top Navigation & Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" /> Automated Data Retention & Hard-Purge Control
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Independent retention schedules, audit log snapshots, and Cloud Scheduler triggers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={fetchPolicies}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/80 text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} /> Refresh Policies
          </button>
        </div>
      </div>

      {/* HUD Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Active Pipelines</span>
          <span className="text-2xl font-bold text-foreground font-mono mt-1 block">
            {policies.filter((p) => p.enabled).length} / {policies.length}
          </span>
          <span className="text-xs text-emerald-500 font-mono mt-1 block">Scheduled Purges Active</span>
        </div>

        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Total Records Purged</span>
          <span className="text-2xl font-bold text-primary font-mono mt-1 block">
            {grandTotalPurged}
          </span>
          <span className="text-xs text-muted-foreground font-mono mt-1 block">Audit Log Snapshots Archived</span>
        </div>

        <div className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Cloud Scheduler Trigger</span>
          <span className="text-xs font-mono text-foreground font-bold mt-2 block flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" /> Daily @ 02:00 AM UTC
          </span>
          <span className="text-[11px] text-muted-foreground font-mono mt-1 block">POST /api/v2/automation/retention/run</span>
        </div>
      </div>

      {/* Policy Grid */}
      <div className="space-y-6">
        {policies.map((pol) => {
          const info = PIPELINE_LABELS[pol.pipeline] || {
            title: pol.pipeline,
            desc: "Pipeline retention policy",
            icon: Layers
          };
          const IconComp = info.icon;
          const edit = editState[pol.pipeline] || { retention_days: pol.retention_days, status_filter_text: '' };

          return (
            <div key={pol.pipeline} className="p-6 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-lg space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground font-sans flex items-center gap-2">
                      {info.title}
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                        {pol.pipeline}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">{info.desc}</p>
                  </div>
                </div>

                {/* Enable / Disable Switch */}
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-bold ${pol.enabled ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {pol.enabled ? 'SCHEDULED ACTIVE' : 'PAUSED'}
                  </span>
                  <button
                    onClick={() => handleToggleEnable(pol.pipeline, pol.enabled)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                      pol.enabled
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                    }`}
                  >
                    {pol.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {pol.enabled ? 'Pause Schedule' : 'Enable Schedule'}
                  </button>
                </div>
              </div>

              {/* Form Config Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-muted-foreground uppercase font-semibold">
                    Retention Window (Days):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={edit.retention_days}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        [pol.pipeline]: { ...prev[pol.pipeline], retention_days: Number(e.target.value) }
                      }))
                    }
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-4 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                  />
                  <p className="text-[11px] text-muted-foreground font-sans">
                    Records older than {edit.retention_days} day{edit.retention_days > 1 ? 's' : ''} will be permanently deleted during purges.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-muted-foreground uppercase font-semibold">
                    Status Filter (Comma Separated, Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REJECTED, FAILED, QUALIFIED (Leave blank for all)"
                    value={edit.status_filter_text}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        [pol.pipeline]: { ...prev[pol.pipeline], status_filter_text: e.target.value }
                      }))
                    }
                    className="w-full bg-muted/40 border border-border/80 rounded-xl px-4 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                  />
                  <p className="text-[11px] text-muted-foreground font-sans">
                    If set, only records with these statuses will be purged.
                  </p>
                </div>
              </div>

              {/* Execution Stats & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-border/60">
                <div className="text-xs font-mono text-muted-foreground space-y-1">
                  <div>
                    Last Run: <span className="text-foreground">{pol.last_purge_at ? new Date(pol.last_purge_at).toLocaleString() : 'Never'}</span>
                  </div>
                  <div>
                    Last Purged: <span className="text-primary font-bold">{pol.last_purged_count}</span> | Cumulative Total: <span className="text-foreground font-bold">{pol.total_purged_count}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleSavePolicy(pol.pipeline)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border/80 hover:border-primary text-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-primary" /> Save Config
                  </button>

                  <button
                    onClick={() => handlePreview(pol.pipeline)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border/80 hover:border-primary text-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary" /> Preview
                  </button>

                  <button
                    onClick={() => setRunNowPipeline(pol.pipeline)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold transition-all hover:bg-destructive/90 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Run Purge Now
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in font-sans">
          <div className="w-full max-w-lg bg-card/95 border border-primary/40 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> Retention Purge Preview: {previewData.pipeline}
              </h3>
              <button
                onClick={() => setPreviewData(null)}
                className="p-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-foreground space-y-1">
                <div className="text-muted-foreground">Matching Expired Records:</div>
                <div className="text-2xl font-bold text-primary">{previewData.preview_delete_count}</div>
                <div className="text-[11px] text-muted-foreground">
                  Cutoff: Older than {previewData.retention_days} days
                  {previewData.status_filter ? ` (Filter: ${previewData.status_filter.join(', ')})` : ''}
                </div>
              </div>

              {previewData.sample_expired_ids && previewData.sample_expired_ids.length > 0 && (
                <div className="space-y-1">
                  <span className="text-muted-foreground font-semibold">Sample Target IDs:</span>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-[11px] space-y-1 max-h-36 overflow-y-auto">
                    {previewData.sample_expired_ids.map((id: string) => (
                      <div key={id} className="truncate text-foreground font-mono">• {id}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs font-mono"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Run Purge Now */}
      <ConfirmDeleteModal
        isOpen={Boolean(runNowPipeline)}
        itemCount={1}
        pipelineName={`Retention Purge (${runNowPipeline})`}
        onClose={() => setRunNowPipeline(null)}
        onConfirm={handleExecuteRunNow}
        isDeleting={isRunningPurge}
      />
    </div>
  );
}
