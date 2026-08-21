'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, ArrowLeft, Play, Workflow, ShieldAlert, FileSpreadsheet, Clock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AdminAutomationPage() {
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [scheduleTime, setScheduleTime] = useState('07:00 AM IST');
  const [frequency, setFrequency] = useState('DAILY');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  
  const getTodayFileName = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return `job_tracker_${todayStr}.xlsx`;
  };

  const [lastRun, setLastRun] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string>('IDLE');
  const [lastFile, setLastFile] = useState<string>(getTodayFileName());
  const [jobsCount, setJobsCount] = useState<number>(0);

  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('sathya_admin_token') || 'sathya123' : 'sathya123';

  // Fetch current Google Drive sync status and settings on mount
  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/admin/gdrive-sync/status', {
        headers: { 'X-Admin-Token': adminToken }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setSyncEnabled(data.enabled ?? true);
          setScheduleTime(data.schedule_time || '07:00 AM IST');
          setFrequency(data.frequency || 'DAILY');
          setLastRun(data.last_run || null);
          setLastStatus(data.last_status || 'IDLE');
          setLastFile(data.last_file || getTodayFileName());
          setJobsCount(data.last_jobs_count || 0);
        }
      }
    } catch (e) {
      console.error('Failed to fetch GDrive sync status:', e);
    }
  };

  const handleSaveSchedule = async () => {
    setIsSaving(true);
    setToastMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify({
          gdrive_sync_enabled: syncEnabled,
          gdrive_sync_schedule_time: scheduleTime,
          gdrive_sync_frequency: frequency
        })
      });
      if (res.ok) {
        setToastMsg({ type: 'success', text: `Schedule updated to ${scheduleTime} (${frequency}). Background job updated!` });
      } else {
        setToastMsg({ type: 'error', text: 'Error updating schedule settings' });
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Error updating schedule' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunNow = async () => {
    setIsRunningNow(true);
    setToastMsg(null);
    try {
      const res = await fetch('/api/admin/gdrive-sync/run', {
        method: 'POST',
        headers: { 'X-Admin-Token': adminToken }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'SUCCESS') {
          setToastMsg({ type: 'success', text: `Run Now Successful! Ingested ${data.jobs_processed} jobs from ${data.file_name} directly into Database.` });
          setLastRun(data.last_run);
          setLastStatus('SUCCESS');
          setLastFile(data.file_name);
          setJobsCount(data.jobs_processed);
        } else {
          setToastMsg({ type: 'error', text: data.message || 'Error during Run Now ingestion' });
        }
      } else {
        setToastMsg({ type: 'error', text: 'Run Now request failed' });
      }
    } catch (err: any) {
      setToastMsg({ type: 'error', text: err.message || 'Failed to trigger Run Now' });
    } finally {
      setIsRunningNow(false);
    }
  };

  const workflows = [
    { id: 'wf-1', name: 'Google Drive Excel -> Database Ingestion Sync', agents: ['job_discovery_agent', 'job_scoring_agent'], trigger: `${scheduleTime} (${frequency})`, status: syncEnabled ? 'Active' : 'Paused' },
    { id: 'wf-2', name: 'End-to-End Application Pipeline', agents: ['job_discovery_agent', 'job_scoring_agent', 'resume_agent', 'application_agent'], trigger: 'Daily @ 08:00 UTC', status: 'Active' },
    { id: 'wf-3', name: 'Recruiter Follow-up & Outreach Pipeline', agents: ['email_agent', 'referral_agent'], trigger: 'On Job Score > 90%', status: 'Active' }
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
            <p className="text-xs text-muted-foreground font-mono">Server-hosted background cron scheduler & on-demand execution</p>
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

      {toastMsg && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-xs font-mono transition-all ${
          toastMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Google Drive Excel -> DB Sync Dedicated Control Panel */}
      <div className="mb-8 p-6 rounded-2xl bg-card/80 border border-primary/30 backdrop-blur-xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Google Drive → Database Sync Job
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Automated ingestion for <code className="px-1.5 py-0.5 rounded bg-muted text-primary">job_tracker_YYYY-MM-DD.xlsx</code> into <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">jobs</code> DB table.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">Status:</span>
            <span className={`px-2.5 py-1 rounded-full font-bold ${syncEnabled ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'}`}>
              {syncEnabled ? 'SCHEDULER ACTIVE' : 'PAUSED'}
            </span>
          </div>
        </div>

        {/* Two Dedicated Action & Config Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Option 1: Schedule Configuration */}
          <div className="p-5 rounded-xl bg-muted/40 border border-border/70 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">Option 1: Schedule Configuration</h3>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-medium text-foreground font-mono">Enable Auto Sync:</label>
              <button
                type="button"
                onClick={() => setSyncEnabled(!syncEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${syncEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${syncEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-muted-foreground block mb-1">Schedule Time</label>
                <input
                  type="text"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  placeholder="07:00 AM IST"
                  className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-muted-foreground block mb-1">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-card border border-border/80 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="DAILY">DAILY (Default)</option>
                  <option value="HOURLY">HOURLY</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSaveSchedule}
              disabled={isSaving}
              className="w-full py-2 bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              <span>Save Schedule Settings</span>
            </button>
          </div>

          {/* Option 2: Run Now Action */}
          <div className="p-5 rounded-xl bg-muted/40 border border-border/70 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-border/60 pb-2 mb-3">
                <Play className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">Option 2: Run Now (Instant Manual Ingestion)</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono leading-relaxed mb-4">
                Trigger immediate Google Drive scan and Excel parsing for <code className="text-primary font-bold">job_tracker_{new Date().toISOString().split('T')[0]}.xlsx</code> to test database insertion instantly without waiting for the scheduled time.
              </p>
            </div>

            <button
              onClick={handleRunNow}
              disabled={isRunningNow}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              {isRunningNow ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>RUN NOW (TEST INSTANT INGESTION)</span>
            </button>
          </div>

        </div>

        {/* Sync Status HUD Footer */}
        <div className="p-3.5 rounded-xl bg-card border border-border/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-muted-foreground block text-[10px]">Target File:</span>
            <span className="text-foreground font-bold truncate block">{lastFile}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[10px]">Last Status:</span>
            <span className={`font-bold ${lastStatus === 'SUCCESS' ? 'text-emerald-500' : 'text-muted-foreground'}`}>{lastStatus}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[10px]">Jobs Processed:</span>
            <span className="text-foreground font-bold">{jobsCount} Jobs Ingested</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[10px]">Last Run Time:</span>
            <span className="text-muted-foreground truncate block">{lastRun ? new Date(lastRun).toLocaleTimeString() : 'Not triggered yet'}</span>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider mb-3">All Active Server Workflows</h2>

      <div className="space-y-4">
        {workflows.map((wf) => (
          <div key={wf.id} className="p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground text-sm">{wf.name}</span>
              </div>
              <button 
                onClick={wf.id === 'wf-1' ? handleRunNow : undefined}
                disabled={wf.id === 'wf-1' && isRunningNow}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Play className="w-3.5 h-3.5" /> {wf.id === 'wf-1' ? 'Run Now' : 'Execute Workflow'}
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
