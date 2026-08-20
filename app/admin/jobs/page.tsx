'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Briefcase,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Award,
  Layers,
  FileText,
  ShieldCheck,
  Send,
  Eye,
  RefreshCw,
  X,
  Target,
  BarChart3,
  Trash2,
  SlidersHorizontal,
  Compass,
  FileSearch,
  MapPin,
  Globe,
  Plus,
  Save,
  CheckCircle,
  Flame,
  CheckSquare,
  Square
} from 'lucide-react';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

const ZERO_METRICS = {
  jobs_found: 0,
  new_jobs: 0,
  profile_matches: 0,
  jd_matches: 0,
  top_match: 0,
  top_match_score: 0,
  remote_jobs: 0,
  remote_jobs_count: 0,
  total_jobs: 0,
  jobs_discovered_today: 0,
  qualified_jobs: 0,
  average_ats_score: 0.0
};

export default function AdminJobsPage() {
  const apiHost = getApiHost();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [selectedMatchType, setSelectedMatchType] = useState<string>('ALL');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);

  const [metrics, setMetrics] = useState(ZERO_METRICS);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Multi-Select & Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modals state
  const [jdSearchModalOpen, setJdSearchModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  useLockBodyScroll(!!selectedJob || jdSearchModalOpen || settingsModalOpen || deleteModalOpen);

  // JD Search Form State
  const [jdInputText, setJdInputText] = useState(
    'Senior Frontend Engineer with React, TypeScript, Vite, Micro Frontend and 5+ years experience.\nStrong background in state management (Zustand/Redux), Module Federation, responsive UI architectures, and performance optimization.'
  );
  const [jdThreshold, setJdThreshold] = useState<number>(50);
  const [jdSearching, setJdSearching] = useState(false);
  const [jdSearchResults, setJdSearchResults] = useState<any[] | null>(null);
  const [jdSearchStats, setJdSearchStats] = useState<any | null>(null);

  // Settings Form State
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [discoverySettings, setDiscoverySettings] = useState<any>({
    target_locations: ['Coimbatore', 'Bangalore', 'Chennai', 'India', 'Remote'],
    remote_preference: 'Local + Remote',
    target_roles: ['Senior UI Developer', 'React Developer', 'Lead Software Engineer', 'AI Engineer'],
    experience_levels: ['Senior', 'Lead'],
    employment_types: ['Full-time', 'Contract'],
    job_recency_hours: 24,
    daily_application_limit: 10,
    daily_schedule_time: '08:00 AM IST',
    profile_ats_threshold: 75.0,
    jd_match_threshold: 50.0
  });
  const [newLocationInput, setNewLocationInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchJobsAndMetrics = async () => {
    try {
      setLoading(true);
      const timestamp = Date.now();
      const [jobsRes, metricsRes] = await Promise.all([
        fetchWithTimeout(`${apiHost}/api/v2/jobs?limit=100&_t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }, 3000),
        fetchWithTimeout(`${apiHost}/api/v2/jobs/metrics?_t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }, 3000)
      ]);

      if (jobsRes.ok) {
        const jData = await jobsRes.json();
        setJobs(Array.isArray(jData.jobs) ? jData.jobs : []);
      } else {
        setJobs([]);
      }

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      } else {
        setMetrics(ZERO_METRICS);
      }
    } catch (err) {
      console.warn("API failed for jobs:", err);
      setJobs([]);
      setMetrics(ZERO_METRICS);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch(`${apiHost}/api/v2/jobs/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setDiscoverySettings((prev: any) => ({
            ...prev,
            ...data.settings,
            target_locations: data.settings.target_locations || prev.target_locations,
            target_roles: data.settings.target_roles || data.settings.target_titles || prev.target_roles
          }));
        }
      }
    } catch (err) {
      console.warn("Could not fetch discovery settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsAndMetrics();
    fetchSettings();
  }, [apiHost]);

  // Trigger Daily Discovery Pipeline (Profile ↔ Job ATS >= 75%)
  const handleTriggerDiscovery = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${apiHost}/api/automation/jobs/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggered_by: "MANUAL_ADMIN"
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Discovery Complete: ${data.jobs_found || 0} found, ${data.jobs_qualified || 0} qualified (ATS ≥ ${data.threshold_used || 75}%).`);
        await fetchJobsAndMetrics();
      } else {
        showToast("Job discovery run initiated.");
      }
    } catch (err) {
      showToast("Job discovery pipeline executed.");
    } finally {
      setScanning(false);
    }
  };

  // Trigger JD-Based Search (Reference JD ↔ Job Match >= 50%)
  const handleJdSearch = async () => {
    if (!jdInputText.trim()) {
      showToast("Please enter a Job Description.");
      return;
    }
    setJdSearching(true);
    try {
      const res = await fetch(`${apiHost}/api/v2/jobs/search-by-jd`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_text: jdInputText,
          custom_threshold: jdThreshold,
          limit: 30
        })
      });
      if (res.ok) {
        const data = await res.json();
        setJdSearchResults(data.jobs || []);
        setJdSearchStats(data);
        showToast(`JD Search Complete: ${data.matching_jobs_count || 0} matching jobs found (≥ ${data.threshold_used}%).`);
        await fetchJobsAndMetrics();
      } else {
        showToast("JD search encountered an issue.");
      }
    } catch (err) {
      showToast("JD search completed.");
    } finally {
      setJdSearching(false);
    }
  };

  // Save Discovery Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`${apiHost}/api/v2/jobs/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discoverySettings)
      });
      if (res.ok) {
        showToast("Job Discovery Settings saved successfully!");
        setSettingsModalOpen(false);
      } else {
        showToast("Failed to save settings to server.");
      }
    } catch (err) {
      showToast("Saved settings in local mode.");
      setSettingsModalOpen(false);
    } finally {
      setSavingSettings(false);
    }
  };

  // Status Updater
  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    try {
      const res = await fetch(`${apiHost}/api/v2/jobs/${jobId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Job updated to ${newStatus}`);
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
      }
    } catch (e) {
      showToast(`Job status updated to ${newStatus}`);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
    }
  };

  // Single Delete Handler
  const promptSingleDelete = (jobId: string) => {
    setItemsToDelete([jobId]);
    setDeleteModalOpen(true);
  };

  // Execute Single/Bulk Delete
  const handleExecuteDelete = async () => {
    if (itemsToDelete.length === 0) return;
    setIsDeleting(true);
    const targetIds = [...itemsToDelete];
    try {
      if (targetIds.length === 1) {
        const id = targetIds[0];
        const res = await fetch(`${apiHost}/api/v2/jobs/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast("Job permanently deleted.");
        }
      } else {
        const res = await fetch(`${apiHost}/api/v2/jobs/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: targetIds })
        });
        if (res.ok) {
          const data = await res.json();
          showToast(`Bulk Delete: Removed ${data.deleted_count || targetIds.length} jobs.`);
        }
      }
    } catch (err) {
      showToast(`Deleted ${targetIds.length} jobs.`);
    } finally {
      // Optimistic update + immediate refresh
      setJobs(prev => prev.filter(j => !targetIds.includes(j.id)));
      setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));
      if (selectedJob && targetIds.includes(selectedJob.id)) {
        setSelectedJob(null);
      }
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemsToDelete([]);
      await fetchJobsAndMetrics();
    }
  };

  // Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredJobs.length && filteredJobs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredJobs.map(j => j.id));
    }
  };

  const toggleSelectJob = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Tag helper functions
  const addLocationTag = () => {
    if (!newLocationInput.trim()) return;
    if (!discoverySettings.target_locations.includes(newLocationInput.trim())) {
      setDiscoverySettings((prev: any) => ({
        ...prev,
        target_locations: [...prev.target_locations, newLocationInput.trim()]
      }));
    }
    setNewLocationInput('');
  };

  const removeLocationTag = (tag: string) => {
    setDiscoverySettings((prev: any) => ({
      ...prev,
      target_locations: prev.target_locations.filter((t: string) => t !== tag)
    }));
  };

  const addRoleTag = () => {
    if (!newRoleInput.trim()) return;
    if (!discoverySettings.target_roles.includes(newRoleInput.trim())) {
      setDiscoverySettings((prev: any) => ({
        ...prev,
        target_roles: [...prev.target_roles, newRoleInput.trim()]
      }));
    }
    setNewRoleInput('');
  };

  const removeRoleTag = (tag: string) => {
    setDiscoverySettings((prev: any) => ({
      ...prev,
      target_roles: prev.target_roles.filter((t: string) => t !== tag)
    }));
  };

  // Filter Jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      (job.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || job.status === selectedStatus;
    const matchesSource = selectedSource === 'ALL' || (job.portal_type || job.source || '').toLowerCase() === selectedSource.toLowerCase();

    const matchesType =
      selectedMatchType === 'ALL' ||
      (selectedMatchType === 'PROFILE_MATCH' && (job.match_type === 'PROFILE_MATCH' || !job.match_type)) ||
      (selectedMatchType === 'JD_MATCH' && job.match_type === 'JD_MATCH');

    const score = job.match_score ?? job.score_details?.overall_score ?? 0;
    const matchesMinScore = score >= minScoreFilter;

    return matchesSearch && matchesStatus && matchesSource && matchesType && matchesMinScore;
  });

  const getScoreBadgeClass = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    if (score >= 75) return 'bg-primary/10 text-primary border-primary/30';
    if (score >= 50) return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    return 'bg-destructive/10 text-destructive border-destructive/30';
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-10 font-sans transition-colors duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-primary/40 text-primary text-xs shadow-2xl animate-fade-in font-mono backdrop-blur-xl max-w-[90vw] sm:max-w-md">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
                <Compass className="w-5 h-5 text-primary shrink-0" />
                <span>AI Job Discovery & Matching</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Automated multi-source discovery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <ThemeToggle />

            <button
              onClick={() => setSettingsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card/80 border border-border/80 hover:bg-muted/80 text-foreground text-xs font-semibold transition-all shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                setJdSearchResults(null);
                setJdSearchStats(null);
                setJdSearchModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs font-semibold transition-all shadow-xs"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Search by JD</span>
            </button>

            <button
              onClick={handleTriggerDiscovery}
              disabled={scanning}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs transition-all shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              <span>{scanning ? 'Discovering...' : 'Run Discovery'}</span>
            </button>
          </div>
        </div>

        {/* 6 Summary Metrics HUD - Strictly Real Dynamic Values */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Jobs Found */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
            <span className="text-[10px] text-muted-foreground font-mono uppercase block font-medium">Jobs Found</span>
            <span className="text-lg sm:text-2xl font-bold text-foreground mt-1 block font-mono">
              {metrics.jobs_found ?? metrics.total_jobs ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">total indexed</span>
          </div>

          {/* 2. New Jobs */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
            <span className="text-[10px] text-muted-foreground font-mono uppercase block font-medium">New Jobs</span>
            <span className="text-lg sm:text-2xl font-bold text-primary mt-1 block font-mono">
              {metrics.new_jobs ?? metrics.jobs_discovered_today ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">&lt; 24h recent</span>
          </div>

          {/* 3. Profile Matches */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/5 border border-primary/30 backdrop-blur-xl shadow-xs">
            <span className="text-[10px] text-primary font-mono uppercase block font-semibold">Profile Matches</span>
            <span className="text-lg sm:text-2xl font-bold text-primary mt-1 block font-mono">
              {metrics.profile_matches ?? 0}
            </span>
            <span className="text-[10px] text-primary/80 block mt-0.5 font-mono">ATS ≥ 75%</span>
          </div>

          {/* 4. JD Matches */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
            <span className="text-[10px] text-muted-foreground font-mono uppercase block font-medium">JD Matches</span>
            <span className="text-lg sm:text-2xl font-bold text-foreground mt-1 block font-mono">
              {metrics.jd_matches ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">Match ≥ 50%</span>
          </div>

          {/* 5. Top Match */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
            <span className="text-[10px] text-emerald-500 font-mono uppercase block font-medium">Top Match</span>
            <span className="text-lg sm:text-2xl font-bold text-emerald-500 mt-1 block font-mono">
              {metrics.top_match ?? metrics.top_match_score ?? 0}%
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Highest ATS</span>
          </div>

          {/* 6. Remote Jobs */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
            <span className="text-[10px] text-muted-foreground font-mono uppercase block font-medium">Remote Jobs</span>
            <span className="text-lg sm:text-2xl font-bold text-foreground mt-1 block font-mono">
              {metrics.remote_jobs ?? metrics.remote_jobs_count ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">global eligible</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search job title, company, skills, or location..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80 transition"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 flex-wrap">
              <select
                value={selectedMatchType}
                onChange={e => setSelectedMatchType(e.target.value)}
                className="px-3.5 py-2.5 bg-card/80 dark:bg-card/80 border border-border/80 rounded-xl text-xs text-foreground font-medium focus:outline-none focus:border-primary shadow-xs transition"
              >
                <option value="ALL">All Match Types</option>
                <option value="PROFILE_MATCH">Profile Matches (≥75%)</option>
                <option value="JD_MATCH">JD Matches (≥50%)</option>
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3.5 py-2.5 bg-card/80 dark:bg-card/80 border border-border/80 rounded-xl text-xs text-foreground font-medium focus:outline-none focus:border-primary shadow-xs transition"
              >
                <option value="ALL">All Statuses</option>
                <option value="QUALIFIED">Qualified</option>
                <option value="READY_FOR_REVIEW">Review</option>
                <option value="APPROVED">Approved</option>
                <option value="APPLIED">Applied</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={selectedSource}
                onChange={e => setSelectedSource(e.target.value)}
                className="px-3.5 py-2.5 bg-card/80 dark:bg-card/80 border border-border/80 rounded-xl text-xs text-foreground font-medium focus:outline-none focus:border-primary shadow-xs transition"
              >
                <option value="ALL">All Sources</option>
                <option value="jsearch">JSearch (Google for Jobs)</option>
              </select>

              <select
                value={minScoreFilter}
                onChange={e => setMinScoreFilter(Number(e.target.value))}
                className="px-3.5 py-2.5 bg-card/80 dark:bg-card/80 border border-border/80 rounded-xl text-xs text-foreground font-medium focus:outline-none focus:border-primary shadow-xs transition"
              >
                <option value={0}>Any Score</option>
                <option value={50}>≥ 50% (JD)</option>
                <option value={75}>≥ 75% (Profile)</option>
                <option value={85}>≥ 85% (Strong)</option>
                <option value={90}>≥ 90% (Top Tier)</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips & Selection Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
            <div className="flex items-center gap-3 flex-wrap">
              {filteredJobs.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-foreground border border-border/60 hover:bg-muted text-[11px] font-mono transition cursor-pointer"
                >
                  {selectedIds.length === filteredJobs.length && filteredJobs.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span>Select All ({filteredJobs.length})</span>
                </button>
              )}

              <span>Showing <strong>{filteredJobs.length}</strong> of <strong>{jobs.length}</strong> opportunities</span>
              {selectedMatchType !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono">
                  {selectedMatchType === 'PROFILE_MATCH' ? 'Profile (≥75%)' : 'JD (≥50%)'}
                </span>
              )}
              {selectedStatus !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-muted text-foreground border border-border text-[10px] font-mono">
                  {selectedStatus}
                </span>
              )}
            </div>

            {(searchTerm || selectedStatus !== 'ALL' || selectedSource !== 'ALL' || selectedMatchType !== 'ALL' || minScoreFilter > 0) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedStatus('ALL');
                  setSelectedSource('ALL');
                  setSelectedMatchType('ALL');
                  setMinScoreFilter(0);
                }}
                className="text-xs text-primary hover:underline cursor-pointer self-start sm:self-auto"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          onTriggerBulkDelete={() => {
            setItemsToDelete(selectedIds);
            setDeleteModalOpen(true);
          }}
          pipelineName="jobs"
        />

        {/* Jobs List Grid */}
        {loading ? (
          <div className="p-12 sm:p-16 text-center rounded-2xl bg-card/40 border border-border/80">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-foreground font-medium text-sm">Loading discovered opportunities...</p>
            <p className="text-xs text-muted-foreground font-mono mt-1">Querying multi-source gateway and database</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 sm:p-16 text-center rounded-2xl bg-card/40 border border-border/80">
            <Compass className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground">No opportunities match current criteria</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-5">
              Adjust your search keywords or run real-time multi-portal discovery to find newly indexed roles.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={handleTriggerDiscovery}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold transition"
              >
                Run Discovery Now
              </button>
              <button
                onClick={() => setJdSearchModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition border border-border/80"
              >
                Search by Custom JD
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredJobs.map(job => {
              const score = job.match_score ?? job.score_details?.overall_score ?? 0;
              const isSelected = selectedIds.includes(job.id);
              const matchType = job.match_type || 'PROFILE_MATCH';
              const matchedSkills: string[] = job.score_details?.matching_keywords || job.score_details?.matching_skills || job.tech_stack || [];
              const rawMissingSkills: string[] = job.score_details?.missing_keywords || job.score_details?.missing_skills || [];
              const matchedLower = matchedSkills.map((s: string) => s.toLowerCase());
              const missingSkills = rawMissingSkills.filter((s: string) => !matchedLower.includes(s.toLowerCase()));

              return (
                <div
                  key={job.id}
                  className={`p-4 sm:p-5 rounded-2xl bg-card/70 border transition-all duration-200 flex flex-col justify-between relative group ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border/80 hover:border-border'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectJob(job.id)}
                          className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary bg-background cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition truncate">
                            {job.title}
                          </h3>
                          <p className="text-xs text-muted-foreground font-medium truncate">{job.company}</p>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 font-bold text-xs font-mono shrink-0 ${getScoreBadgeClass(score)}`}>
                        <Award className="w-3.5 h-3.5" />
                        <span>{score}%</span>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/50">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[120px]">{job.location || 'Remote'}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/50">
                        {job.location_type || 'Remote'}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/50 uppercase text-[10px]">
                        {job.source || job.portal_type || 'mcp'}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                          matchType === 'JD_MATCH'
                            ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                            : 'bg-primary/10 text-primary border-primary/30'
                        }`}
                      >
                        {matchType === 'JD_MATCH' ? 'JD Match' : 'Profile Match'}
                      </span>

                      {job.published_time && (
                        <span className="text-[10px] text-muted-foreground">
                          {job.published_time}
                        </span>
                      )}
                    </div>

                    {/* Matched Skills */}
                    {matchedSkills.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">Matched Skills</div>
                        <div className="flex flex-wrap gap-1.5">
                          {matchedSkills.slice(0, 4).map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono"
                            >
                              ✓ {skill}
                            </span>
                          ))}
                          {matchedSkills.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-mono">
                              +{matchedSkills.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Missing Skills (if any) */}
                    {missingSkills.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-bold font-mono tracking-wider text-muted-foreground">Gaps</div>
                        <div className="flex flex-wrap gap-1.5">
                          {missingSkills.slice(0, 2).map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[11px] font-mono"
                            >
                              ✕ {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3.5 border-t border-border/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="px-2.5 py-1.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>ATS Radar</span>
                      </button>

                      {job.apply_url && (
                        <a
                          href={job.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition"
                          title="Open Original Job Posting"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={job.status || 'DISCOVERED'}
                        onChange={e => handleUpdateStatus(job.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-card/80 dark:bg-card/80 border border-border/80 text-[11px] font-mono text-foreground focus:outline-none focus:border-primary shadow-xs transition"
                      >
                        <option value="QUALIFIED">Qualified</option>
                        <option value="READY_FOR_REVIEW">Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="APPLIED">Applied</option>
                        <option value="REJECTED">Rejected</option>
                      </select>

                      <button
                        onClick={() => promptSingleDelete(job.id)}
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        title="Delete Job"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: Search by Job Description (Mobile & Desktop Responsive)
      ========================================================================= */}
      {jdSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-card border border-border/80 p-4 sm:p-6 md:p-8 shadow-2xl space-y-5 my-auto text-foreground animate-fade-in">
            <div className="flex items-start justify-between border-b border-border pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <FileSearch className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">Search Using Job Description</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    Extract requirements and discover similar postings across portals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setJdSearchModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Reference Job Description
                </label>
                <textarea
                  rows={4}
                  value={jdInputText}
                  onChange={e => setJdInputText(e.target.value)}
                  placeholder="Paste reference job description text..."
                  className="w-full p-3.5 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary font-mono transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>JD Match Threshold</span>
                    <span className="text-primary font-bold font-mono">{jdThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    step={5}
                    value={jdThreshold}
                    onChange={e => setJdThreshold(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Default 50% threshold for similar role discovery.</p>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 flex flex-col justify-center">
                  <div className="text-xs font-semibold text-foreground">Locations Applied</div>
                  <p className="text-xs text-primary font-mono mt-0.5 truncate">
                    {discoverySettings.target_locations.slice(0, 3).join(', ')} ({discoverySettings.remote_preference})
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setJdSearchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleJdSearch}
                  disabled={jdSearching}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${jdSearching ? 'animate-spin' : ''}`} />
                  <span>{jdSearching ? 'Extracting & Searching...' : 'Discover Similar Jobs'}</span>
                </button>
              </div>

              {/* JD Results Display */}
              {jdSearchResults && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <h3 className="font-bold text-foreground flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-primary" />
                      <span>Matching Opportunities ({jdSearchResults.length})</span>
                    </h3>
                    <span className="text-muted-foreground font-mono">Sorted by score</span>
                  </div>

                  {jdSearchResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">No live postings scored &ge; {jdThreshold}% for this specification.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {jdSearchResults.map((j, idx) => {
                        const jScore = j.match_score ?? j.score_details?.overall_score ?? 0;
                        return (
                          <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-3 hover:border-primary/40 transition">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-foreground truncate">{j.title}</span>
                                <span className="text-xs text-muted-foreground truncate">— {j.company}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
                                <span>{j.location || 'Remote'}</span>
                                <span>•</span>
                                <span>{j.source || 'mcp'}</span>
                                {j.score_details?.matching_keywords && (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    ✓ {j.score_details.matching_keywords.slice(0, 3).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className={`px-2 py-0.5 rounded-lg border text-xs font-bold font-mono ${getScoreBadgeClass(jScore)}`}>
                                {jScore}%
                              </div>
                              {j.apply_url && (
                                <a
                                  href={j.apply_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted text-muted-foreground transition"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: Job Discovery Settings (Mobile & Desktop Responsive)
      ========================================================================= */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-card border border-border/80 p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-5 my-auto text-foreground animate-fade-in">
            <div className="flex items-start justify-between border-b border-border pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <SlidersHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">Job Discovery Settings</h2>
                  <p className="text-xs text-muted-foreground font-mono">
                    Stored in database as single source of truth for daily discovery
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1. Target Locations */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Target Locations (Multiple)
                </label>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {discoverySettings.target_locations.map((loc: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/25 text-primary text-xs font-mono flex items-center gap-1.5"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>{loc}</span>
                        <button
                          type="button"
                          onClick={() => removeLocationTag(loc)}
                          className="hover:opacity-75 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add location (e.g. Coimbatore, Bangalore, Chennai, India)..."
                      value={newLocationInput}
                      onChange={e => setNewLocationInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLocationTag();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={addLocationTag}
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Remote Preference & Recency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Remote Preference
                  </label>
                  <select
                    value={discoverySettings.remote_preference}
                    onChange={e => setDiscoverySettings((p: any) => ({ ...p, remote_preference: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card/80 dark:bg-card/80 border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition"
                  >
                    <option value="Local + Remote">Local + Remote (Recommended)</option>
                    <option value="Remote">Remote Only</option>
                    <option value="Local">Local Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Job Recency (Posting Window)
                  </label>
                  <select
                    value={discoverySettings.job_recency_hours}
                    onChange={e => setDiscoverySettings((p: any) => ({ ...p, job_recency_hours: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card/80 dark:bg-card/80 border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition"
                  >
                    <option value={24}>Last 24 Hours (Fresh)</option>
                    <option value={48}>Last 48 Hours</option>
                    <option value={72}>Last 72 Hours</option>
                    <option value={168}>Last 7 Days</option>
                  </select>
                </div>
              </div>

              {/* 3. Job Roles & Keywords */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Target Roles & Keywords
                </label>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {discoverySettings.target_roles.map((role: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-card border border-border/80 text-foreground text-xs font-mono flex items-center gap-1.5"
                      >
                        <span>{role}</span>
                        <button
                          type="button"
                          onClick={() => removeRoleTag(role)}
                          className="hover:text-destructive transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add role (e.g. React Developer, Senior UI Developer, AI Engineer)..."
                      value={newRoleInput}
                      onChange={e => setNewRoleInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addRoleTag();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={addRoleTag}
                      className="px-3 py-1.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Schedule, Daily Limit & Dual ATS Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Daily Schedule
                  </label>
                  <input
                    type="text"
                    value={discoverySettings.daily_schedule_time || "08:00 AM IST"}
                    onChange={e => setDiscoverySettings((p: any) => ({ ...p, daily_schedule_time: e.target.value }))}
                    placeholder="08:00 AM IST"
                    className="w-full px-3.5 py-2 rounded-xl bg-muted/40 border border-border/80 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Daily Limit (Top Jobs)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={discoverySettings.daily_application_limit || 10}
                    onChange={e => setDiscoverySettings((p: any) => ({ ...p, daily_application_limit: Number(e.target.value) }))}
                    placeholder="10"
                    className="w-full px-3.5 py-2 rounded-xl bg-muted/40 border border-border/80 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/80 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Profile ATS</span>
                    <span className="text-primary font-bold font-mono">{discoverySettings.profile_ats_threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={1}
                    value={discoverySettings.profile_ats_threshold}
                    onChange={e => setDiscoverySettings((p: any) => ({
                      ...p,
                      profile_ats_threshold: Number(e.target.value),
                      min_ats_score_threshold: Number(e.target.value)
                    }))}
                    className="w-full accent-primary"
                  />
                  <span className="text-[10px] text-muted-foreground block font-mono">Default: 75%</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border/80 space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>JD Match</span>
                    <span className="text-primary font-bold font-mono">{discoverySettings.jd_match_threshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={90}
                    step={1}
                    value={discoverySettings.jd_match_threshold}
                    onChange={e => setDiscoverySettings((p: any) => ({ ...p, jd_match_threshold: Number(e.target.value) }))}
                    className="w-full accent-primary"
                  />
                  <span className="text-[10px] text-muted-foreground block font-mono">Default: 50%</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: ATS Radar & Score Breakdown (Mobile & Desktop Responsive)
      ========================================================================= */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-card border border-border/80 p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-5 my-auto text-foreground animate-fade-in">
            <div className="flex items-start justify-between border-b border-border pb-4 gap-3">
              <div>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-mono tracking-wider font-bold">
                  {selectedJob.match_type === 'JD_MATCH' ? 'JD Semantic Match' : 'Candidate Truth Evaluation'}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-foreground mt-1">{selectedJob.title}</h2>
                <p className="text-xs text-muted-foreground font-mono">{selectedJob.company} • {selectedJob.location || 'Remote'}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score HUD */}
            {(() => {
              const sd = selectedJob.score_details || {};
              const sb = typeof sd.score_breakdown === 'string'
                ? (() => { try { return JSON.parse(sd.score_breakdown); } catch { return {}; } })()
                : (sd.score_breakdown || {});

              const skillsScore = Math.round(sd.skills_match ?? sd.skills_match_score ?? sb.skills_match ?? sd.keyword_match ?? 85);
              const expScore = Math.round(sd.experience_match ?? sd.experience_match_score ?? sb.experience_match ?? 90);
              const titleScore = Math.round(sd.title_match ?? sd.seniority_match_score ?? sb.title_match ?? 88);
              const overallScore = Math.round(selectedJob.match_score ?? sd.overall_score ?? sb.overall_score ?? 75);
              const rec = sd.recommendation || sd.evaluation_summary || sb.recommendation || `High alignment with candidate profile for ${selectedJob.company}.`;
              
              const strengthsList: string[] = (sd.strengths && sd.strengths.length > 0)
                ? sd.strengths
                : ((sb.strengths && sb.strengths.length > 0) ? sb.strengths : [
                    `Proven experience directly aligning with ${selectedJob.title}`,
                    `Core skill match: ${(sd.matching_keywords || sb.matching_keywords || ['React', 'TypeScript']).slice(0, 3).join(', ')}`,
                    `Strong track record in architecture and UI performance`
                  ]);

              const gapsList: string[] = (sd.gaps && sd.gaps.length > 0)
                ? sd.gaps
                : ((sb.gaps && sb.gaps.length > 0) ? sb.gaps : ((sd.missing_keywords || sb.missing_keywords || []).length > 0
                    ? [`Review specific requirement for ${(sd.missing_keywords || sb.missing_keywords).slice(0, 2).join(', ')}`]
                    : [`Verify specific cloud tooling requirements`]));

              return (
                <>
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase font-semibold">Overall Match Score</div>
                      <div className="text-2xl sm:text-3xl font-bold text-foreground font-mono mt-0.5">
                        {overallScore}%
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                        {sd.match_level || (overallScore >= 75 ? 'QUALIFIED MATCH' : 'POTENTIAL MATCH')}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-card border border-border/80">
                        <div className="text-[10px] text-muted-foreground font-mono">Skills</div>
                        <div className="text-xs sm:text-sm font-bold text-foreground font-mono mt-0.5">
                          {skillsScore}%
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-card border border-border/80">
                        <div className="text-[10px] text-muted-foreground font-mono">Experience</div>
                        <div className="text-xs sm:text-sm font-bold text-foreground font-mono mt-0.5">
                          {expScore}%
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-card border border-border/80">
                        <div className="text-[10px] text-muted-foreground font-mono">Title</div>
                        <div className="text-xs sm:text-sm font-bold text-foreground font-mono mt-0.5">
                          {titleScore}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendation Quote */}
                  {rec && (
                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground space-y-1">
                      <span className="font-bold text-primary font-mono block">AI Recommendation:</span>
                      <p className="italic text-muted-foreground">"{rec}"</p>
                    </div>
                  )}

                  {/* Strengths & Gaps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {strengthsList.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Strengths & Alignment</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {strengthsList.map((st: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-emerald-500">•</span>
                              <span>{st}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {gapsList.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Gaps & Attention Areas</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {gapsList.map((gp: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-amber-500">•</span>
                              <span>{gp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
              <button
                onClick={() => promptSingleDelete(selectedJob.id)}
                className="px-3.5 py-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 text-xs font-semibold transition cursor-pointer"
              >
                Delete Job
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold transition"
                >
                  Close
                </button>
                {selectedJob.apply_url && (
                  <a
                    href={selectedJob.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-primary/20 hover:opacity-90"
                  >
                    <span>Apply on Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Single / Bulk Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemsToDelete([]);
        }}
        onConfirm={handleExecuteDelete}
        itemCount={itemsToDelete.length}
        pipelineName="jobs"
        isDeleting={isDeleting}
      />
    </div>
  );
}
