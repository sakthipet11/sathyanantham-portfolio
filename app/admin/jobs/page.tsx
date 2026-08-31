'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CustomSelect } from '@/components/ui/custom-select';
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
  Square,
  Bot
} from 'lucide-react';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { ApplicationProgressModal } from '@/components/admin/ApplicationProgressModal';
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

  // Auto-Apply State
  const [autoApplyModalOpen, setAutoApplyModalOpen] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [applyingJobs, setApplyingJobs] = useState(false);
  const [isStaging, setIsStaging] = useState(false);

  useLockBodyScroll(!!selectedJob || jdSearchModalOpen || settingsModalOpen || deleteModalOpen || autoApplyModalOpen);

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
    target_locations: ['Bangalore', 'Coimbatore', 'Chennai', 'India'],
    remote_preference: 'Local + Remote',
    target_roles: ['Lead Software Engineer', 'Senior UI Developer', 'React Developer', 'AI Engineer'],
    experience_levels: ['Senior', 'Lead'],
    employment_types: ['Full-time'],
    country: 'in',
    language: 'en',
    date_posted: 'week',
    work_from_home: false,
    job_requirements: ['more_than_3_years_experience'],
    exclude_job_publishers: [],
    num_pages: 1,
    job_recency_hours: 168,
    daily_application_limit: 10,
    daily_schedule_time: '08:00 AM IST',
    profile_ats_threshold: 75.0,
    jd_match_threshold: 50.0
  });
  const [newLocationInput, setNewLocationInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [newPublisherInput, setNewPublisherInput] = useState('');

  const addPublisherTag = () => {
    if (!newPublisherInput.trim()) return;
    const clean = newPublisherInput.trim();
    if (!discoverySettings.exclude_job_publishers?.includes(clean)) {
      setDiscoverySettings((p: any) => ({
        ...p,
        exclude_job_publishers: [...(p.exclude_job_publishers || []), clean]
      }));
    }
    setNewPublisherInput('');
  };

  const removePublisherTag = (pub: string) => {
    setDiscoverySettings((p: any) => ({
      ...p,
      exclude_job_publishers: (p.exclude_job_publishers || []).filter((x: string) => x !== pub)
    }));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const [sources, setSources] = useState<any[]>([]);
  const [stagedJobIds, setStagedJobIds] = useState<Set<string>>(new Set());

  const fetchJobsAndMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const timestamp = Date.now();
      const [jobsRes, metricsRes, sourcesRes, appsRes] = await Promise.all([
        fetchWithTimeout(`${apiHost}/api/v2/jobs?limit=100&_t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }, 10000),
        fetchWithTimeout(`${apiHost}/api/v2/jobs/metrics?_t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }, 10000),
        fetchWithTimeout(`${apiHost}/api/v2/jobs/sources?_t=${timestamp}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }, 10000).catch(() => null),
        fetchWithTimeout(`${apiHost}/api/v2/applications`, {}, 10000).catch(() => null)
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

      if (sourcesRes && sourcesRes.ok) {
        const sData = await sourcesRes.json();
        if (Array.isArray(sData.sources)) setSources(sData.sources);
      }

      if (appsRes && appsRes.ok) {
        const aData = await appsRes.json();
        const appList = aData.applications || [];
        const staged = new Set<string>(appList.map((a: any) => a.job_id).filter(Boolean));
        setStagedJobIds(staged);
      }
    } catch (err) {
      console.warn("API failed for jobs:", err);
      setJobs([]);
      setMetrics(ZERO_METRICS);
    } finally {
      setLoading(false);
    }
  }, [apiHost]);

  // Open selected jobs directly in new browser tabs
  const handleOpenSelectedInTabs = () => {
    const selectedJobs = jobs.filter((j: any) => selectedIds.includes(j.id) && j.apply_url);
    if (selectedJobs.length === 0) {
      showToast("No valid apply URLs found for selected jobs.");
      return;
    }
    selectedJobs.forEach((job: any) => {
      window.open(job.apply_url, '_blank', 'noopener,noreferrer');
    });
    showToast(`Opened ${selectedJobs.length} job portal${selectedJobs.length > 1 ? 's' : ''} in new tabs`);
  };

  // Handle bulk auto-apply
  const handleBulkAutoApply = async () => {
    if (selectedIds.length === 0) {
      showToast("Please select jobs to apply to");
      return;
    }

    setApplyingJobs(true);

    try {
      // Step 1: Create batch
      const prepareRes = await fetch(`${apiHost}/api/v2/applications/bulk-prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_ids: selectedIds,
          user_profile_id: '00000000-0000-0000-0000-000000000001',
          auto_submit: false // Require human review for first-time portals
        })
      });

      if (!prepareRes.ok) {
        const errorData = await prepareRes.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to prepare batch');
      }

      const prepareData = await prepareRes.json();
      const batchId = prepareData.data.batch_id;

      // Step 2: Start auto-apply (with visible automated browser window)
      const applyRes = await fetch(`${apiHost}/api/v2/applications/auto-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: batchId,
          user_profile_id: '00000000-0000-0000-0000-000000000001',
          rate_limit_seconds: 30,
          headless: false
        })
      });

      if (!applyRes.ok) {
        const errorData = await applyRes.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to start auto-apply');
      }

      // Step 3: Open progress modal
      setCurrentBatchId(batchId);
      setAutoApplyModalOpen(true);
      showToast(`Started bulk application for ${selectedIds.length} jobs`);

    } catch (err: any) {
      console.error('[AUTO_APPLY] Error:', err);
      showToast(err.message || 'Failed to start auto-apply. Please try again.');
    } finally {
      setApplyingJobs(false);
    }
  };

  // Handle single job auto-apply (Direct Chromium CLI with auto-submit & DB update)
  const handleSingleAutoApply = async (jobId: string) => {
    setApplyingJobs(true);
    try {
      showToast('🚀 Launching Chromium Auto-Apply in visible window...');

      const res = await fetch(`${apiHost}/api/v2/applications/apply-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          auto_submit: true,
          headless: false
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to trigger Chromium auto-apply');
      }

      const result = await res.json();
      showToast(`✨ Auto-Apply running in Chromium. Status will update to 'Applied' in DB.`);

      // Poll/refresh jobs list after a short delay so the user sees the updated status
      setTimeout(() => {
        fetchJobsAndMetrics();
      }, 5000);
      setTimeout(() => {
        fetchJobsAndMetrics();
      }, 15000);

    } catch (err: any) {
      console.error('[AUTO_APPLY] Error:', err);
      showToast(err.message || 'Failed to start auto-apply. Please try again.');
    } finally {
      setApplyingJobs(false);
    }
  };

  const handleAutoApplyComplete = useCallback((results: any) => {
    showToast(
      `Batch complete: ${results.success_count} submitted, ${results.failed_count} failed, ${results.needs_review_count} need review`
    );
    // Refresh jobs list
    fetchJobsAndMetrics();
    // Clear selection
    setSelectedIds([]);
  }, [fetchJobsAndMetrics]);

  // 1-Click Atomic Application Staging (Resume + Cover Letter + 1st-Degree Referrals)
  const handleStageApplicationPackage = async (jobIds: string[]) => {
    if (jobIds.length === 0) {
      showToast("Please select at least one job to stage");
      return;
    }
    setIsStaging(true);
    try {
      showToast(`⚡ Staging application package for ${jobIds.length} job${jobIds.length > 1 ? 's' : ''}...`);
      const res = await fetch(`${apiHost}/api/v2/applications/stage-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_ids: jobIds,
          user_profile_id: '00000000-0000-0000-0000-000000000001',
          generate_cover_letter: true,
          link_referrals: true
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to stage application package');
      }
      const data = await res.json();
      showToast(`✅ ${data.message}`);
      setStagedJobIds(prev => {
        const next = new Set(prev);
        jobIds.forEach(id => next.add(id));
        return next;
      });
      fetchJobsAndMetrics();
      setSelectedIds([]);
    } catch (err: any) {
      showToast(err.message || 'Error staging application package');
    } finally {
      setIsStaging(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch(`${apiHost}/api/v2/jobs/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setDiscoverySettings({
            target_locations: data.settings.target_locations || ['Bangalore', 'Coimbatore', 'Chennai', 'India'],
            remote_preference: data.settings.remote_preference || 'Local + Remote',
            target_roles: data.settings.target_roles || data.settings.target_titles || ['Lead Software Engineer', 'Senior UI Developer'],
            experience_levels: data.settings.experience_levels || ['Senior', 'Lead'],
            employment_types: data.settings.employment_types || ['Full-time'],
            country: data.settings.country || 'in',
            language: data.settings.language || 'en',
            date_posted: data.settings.date_posted || 'week',
            work_from_home: Boolean(data.settings.work_from_home),
            job_requirements: data.settings.job_requirements || ['more_than_3_years_experience'],
            exclude_job_publishers: data.settings.exclude_job_publishers || [],
            num_pages: Number(data.settings.num_pages ?? 1),
            job_recency_hours: Number(data.settings.job_recency_hours ?? 168),
            daily_application_limit: Number(data.settings.daily_application_limit ?? 10),
            daily_schedule_time: data.settings.daily_schedule_time || '08:00 AM IST',
            profile_ats_threshold: Number(data.settings.profile_ats_threshold ?? data.settings.min_ats_score_threshold ?? 75.0),
            jd_match_threshold: Number(data.settings.jd_match_threshold ?? 50.0)
          });
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
      setSelectedIds(filteredJobs.map((j: any) => j.id));
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

  // Dynamically compute available sources and counts from loaded jobs & API sources
  const availableSources = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(j => {
      const src = (j.portal_type || j.source || 'other').toLowerCase();
      counts[src] = (counts[src] || 0) + 1;
    });
    // Merge any from sources API
    sources.forEach((s: any) => {
      const name = (s.name || '').toLowerCase();
      if (name && !(name in counts)) {
        counts[name] = s.job_count ?? 0;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      label: name.toUpperCase(),
      count
    })).sort((a, b) => b.count - a.count);
  }, [jobs, sources]);

  // Comprehensive Multi-Facet Filter for Jobs
  const filteredJobs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return jobs.filter(job => {
      // 1. Search Query Match
      const matchesSearch = !term ||
        (job.title || '').toLowerCase().includes(term) ||
        (job.company || '').toLowerCase().includes(term) ||
        (job.location || '').toLowerCase().includes(term) ||
        (job.location_type || '').toLowerCase().includes(term) ||
        (job.portal_type || job.source || '').toLowerCase().includes(term) ||
        (job.description_raw || '').toLowerCase().includes(term) ||
        (job.requirements_clean || '').toLowerCase().includes(term) ||
        (Array.isArray(job.tech_stack) && job.tech_stack.some((t: any) => String(t).toLowerCase().includes(term))) ||
        (Array.isArray(job.skills) && job.skills.some((s: any) => String(s).toLowerCase().includes(term)));

      // 2. Status Match
      const jobStatusUpper = (job.status || 'DISCOVERED').toUpperCase();
      const score = Number(job.match_score ?? job.score_details?.overall_score ?? 0);

      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'DISCOVERED' && jobStatusUpper === 'DISCOVERED') ||
        (selectedStatus === 'QUALIFIED' && (jobStatusUpper === 'QUALIFIED' || score >= 75)) ||
        (selectedStatus === 'READY_FOR_REVIEW' && (jobStatusUpper === 'READY_FOR_REVIEW' || stagedJobIds.has(job.id))) ||
        (selectedStatus === 'APPROVED' && jobStatusUpper === 'APPROVED') ||
        (selectedStatus === 'APPLIED' && (jobStatusUpper === 'APPLIED' || jobStatusUpper === 'SUBMITTED')) ||
        (selectedStatus === 'REJECTED' && jobStatusUpper === 'REJECTED') ||
        jobStatusUpper === selectedStatus.toUpperCase();

      // 3. Source Match
      const jobSource = (job.portal_type || job.source || '').toLowerCase();
      const matchesSource = selectedSource === 'ALL' || jobSource === selectedSource.toLowerCase();

      // 4. Match Type
      const jobMatchType = (job.match_type || 'PROFILE_MATCH').toUpperCase();
      const matchesType =
        selectedMatchType === 'ALL' ||
        (selectedMatchType === 'PROFILE_MATCH' && (jobMatchType === 'PROFILE_MATCH' || !job.match_type)) ||
        (selectedMatchType === 'JD_MATCH' && jobMatchType === 'JD_MATCH');

      // 5. Minimum Score
      const matchesMinScore = score >= minScoreFilter;

      return matchesSearch && matchesStatus && matchesSource && matchesType && matchesMinScore;
    });
  }, [jobs, searchTerm, selectedStatus, selectedSource, selectedMatchType, minScoreFilter, stagedJobIds]);

  // Dropdown Select Options with Real Live Counts
  const matchTypeOptions = useMemo(() => [
    { value: 'ALL', label: 'All Match Types', count: jobs.length },
    {
      value: 'PROFILE_MATCH',
      label: 'Profile Matches (≥75%)',
      count: jobs.filter(j => (j.match_type || 'PROFILE_MATCH').toUpperCase() === 'PROFILE_MATCH').length
    },
    {
      value: 'JD_MATCH',
      label: 'JD Matches (≥50%)',
      count: jobs.filter(j => (j.match_type || '').toUpperCase() === 'JD_MATCH').length
    }
  ], [jobs]);

  const statusOptions = useMemo(() => [
    { value: 'ALL', label: 'All Statuses', count: jobs.length },
    {
      value: 'DISCOVERED',
      label: 'Discovered',
      count: jobs.filter(j => (j.status || 'DISCOVERED').toUpperCase() === 'DISCOVERED').length
    },
    {
      value: 'QUALIFIED',
      label: 'Qualified (≥75% ATS)',
      count: jobs.filter(j => (j.status || '').toUpperCase() === 'QUALIFIED' || Number(j.match_score ?? j.score_details?.overall_score ?? 0) >= 75).length
    },
    {
      value: 'READY_FOR_REVIEW',
      label: 'Ready for Review',
      count: jobs.filter(j => (j.status || '').toUpperCase() === 'READY_FOR_REVIEW' || stagedJobIds.has(j.id)).length
    },
    {
      value: 'APPROVED',
      label: 'Approved',
      count: jobs.filter(j => (j.status || '').toUpperCase() === 'APPROVED').length
    },
    {
      value: 'APPLIED',
      label: 'Applied',
      count: jobs.filter(j => (j.status || '').toUpperCase() === 'APPLIED' || (j.status || '').toUpperCase() === 'SUBMITTED').length
    },
    {
      value: 'REJECTED',
      label: 'Rejected',
      count: jobs.filter(j => (j.status || '').toUpperCase() === 'REJECTED').length
    }
  ], [jobs, stagedJobIds]);

  const sourceOptions = useMemo(() => [
    { value: 'ALL', label: 'All Portals', count: jobs.length },
    ...availableSources.map((s: any) => ({
      value: s.name,
      label: s.label,
      count: s.count
    }))
  ], [jobs, availableSources]);

  const scoreOptions = useMemo(() => [
    { value: 0, label: 'Any Score', count: jobs.length },
    {
      value: 50,
      label: '≥ 50% (JD)',
      count: jobs.filter(j => Number(j.match_score ?? j.score_details?.overall_score ?? 0) >= 50).length
    },
    {
      value: 75,
      label: '≥ 75% (Profile)',
      count: jobs.filter(j => Number(j.match_score ?? j.score_details?.overall_score ?? 0) >= 75).length
    },
    {
      value: 85,
      label: '≥ 85% (Strong)',
      count: jobs.filter(j => Number(j.match_score ?? j.score_details?.overall_score ?? 0) >= 85).length
    },
    {
      value: 90,
      label: '≥ 90% (Top Tier)',
      count: jobs.filter(j => Number(j.match_score ?? j.score_details?.overall_score ?? 0) >= 90).length
    }
  ], [jobs]);

  const cardStatusOptions = useMemo(() => [
    { value: 'DISCOVERED', label: 'Discovered' },
    { value: 'QUALIFIED', label: 'Qualified' },
    { value: 'READY_FOR_REVIEW', label: 'Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'APPLIED', label: 'Applied' },
    { value: 'REJECTED', label: 'Rejected' }
  ], []);

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
              {/* Match Type Filter */}
              <CustomSelect
                value={selectedMatchType}
                onChange={(val) => setSelectedMatchType(String(val))}
                options={matchTypeOptions}
                title="Filter by match type"
              />

              {/* Status Filter */}
              <CustomSelect
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(String(val))}
                options={statusOptions}
                title="Filter by job status"
              />

              {/* Source Filter */}
              <CustomSelect
                value={selectedSource}
                onChange={(val) => setSelectedSource(String(val))}
                options={sourceOptions}
                title="Filter by job discovery portal"
              />

              {/* Min ATS Score Filter */}
              <CustomSelect
                value={minScoreFilter}
                onChange={(val) => setMinScoreFilter(Number(val))}
                options={scoreOptions}
                title="Filter by minimum match score"
              />
            </div>
          </div>

          {/* Active Filter Chips & Selection Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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
              {selectedSource !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-lg bg-muted text-foreground border border-border text-[10px] font-mono uppercase">
                  {selectedSource}
                </span>
              )}
              {minScoreFilter > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono">
                  Score ≥ {minScoreFilter}%
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
          onTriggerBulkStage={() => handleStageApplicationPackage(selectedIds)}
          isStaging={isStaging}
          onTriggerBulkApply={handleBulkAutoApply}
          applyingJobs={applyingJobs}
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
            {filteredJobs.map((job: any) => {
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
                  className={`p-4 sm:p-5 rounded-2xl bg-card/70 border transition-all duration-200 flex flex-col justify-between relative group ${isSelected ? 'border-primary bg-primary/5' : 'border-border/80 hover:border-border'
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
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${matchType === 'JD_MATCH'
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="px-2.5 py-1.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>Radar</span>
                      </button>

                      {stagedJobIds.has(job.id) ? (
                        <button
                          disabled
                          className="px-2.5 py-1.5 rounded-xl bg-muted/70 border border-border/80 text-muted-foreground text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-80"
                          title="Application package already staged in Applications"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Staged</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStageApplicationPackage([job.id])}
                          disabled={isStaging}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="1-Click Stage: Pair tailored resume, draft cover letter & link 1st-degree referrals"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Stage</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleSingleAutoApply(job.id)}
                        disabled={applyingJobs}
                        className="px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/25 hover:bg-primary hover:text-primary-foreground text-primary text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Auto-Apply with Chromium Automation"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply</span>
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
                      <CustomSelect
                        value={job.status || 'DISCOVERED'}
                        onChange={(val) => handleUpdateStatus(job.id, String(val))}
                        options={cardStatusOptions}
                        size="sm"
                        triggerClassName="w-28 py-1 text-[11px] font-mono"
                        title="Update job status"
                      />

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
        <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md overflow-y-auto overscroll-contain">
          <div data-lenis-prevent className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-card border border-border/80 p-4 sm:p-6 md:p-8 shadow-2xl space-y-5 my-auto text-foreground animate-fade-in overscroll-contain">
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
        <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md overflow-y-auto overscroll-contain">
          <div data-lenis-prevent className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-card border border-border/80 p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-5 my-auto text-foreground animate-fade-in overscroll-contain">
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
              {/* 1. Target Locations & Geographic Scope */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-foreground">
                  Target Locations & Geographic Country Scope
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
                      className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Country Code & Language */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      API Country Code (country param)
                    </label>
                    <select
                      value={discoverySettings.country || 'in'}
                      onChange={e => setDiscoverySettings((p: any) => ({ ...p, country: e.target.value }))}
                      className="theme-select w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="india" className="bg-card text-foreground">🇮🇳 India (in)</option>
                      <option value="us" className="bg-card text-foreground">🇺🇸 United States (us)</option>
                      <option value="gb" className="bg-card text-foreground">🇬🇧 United Kingdom (gb)</option>
                      <option value="de" className="bg-card text-foreground">🇩🇪 Germany (de)</option>
                      <option value="ca" className="bg-card text-foreground">🇨🇦 Canada (ca)</option>
                      <option value="au" className="bg-card text-foreground">🇦🇺 Australia (au)</option>
                      <option value="sg" className="bg-card text-foreground">🇸🇬 Singapore (sg)</option>
                      <option value="ae" className="bg-card text-foreground">🇦🇪 UAE (ae)</option>
                      <option value="fr" className="bg-card text-foreground">🇫🇷 France (fr)</option>
                      <option value="nl" className="bg-card text-foreground">🇳🇱 Netherlands (nl)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Language (language param)
                    </label>
                    <select
                      value={discoverySettings.language || 'en'}
                      onChange={e => setDiscoverySettings((p: any) => ({ ...p, language: e.target.value }))}
                      className="theme-select w-full px-3 py-2 rounded-xl bg-card border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="en" className="bg-card text-foreground">English (en)</option>
                      <option value="de" className="bg-card text-foreground">German (de)</option>
                      <option value="fr" className="bg-card text-foreground">French (fr)</option>
                      <option value="es" className="bg-card text-foreground">Spanish (es)</option>
                      <option value="ja" className="bg-card text-foreground">Japanese (ja)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Remote / Work From Home & Recency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Remote Preference
                  </label>
                  <select
                    value={discoverySettings.remote_preference}
                    onChange={e => setDiscoverySettings((p: any) => ({ ...p, remote_preference: e.target.value }))}
                    className="theme-select w-full px-3.5 py-2.5 rounded-xl bg-card border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition cursor-pointer"
                  >
                    <option value="Local + Remote" className="bg-card text-foreground">Local + Remote</option>
                    <option value="Remote" className="bg-card text-foreground">Remote Only</option>
                    <option value="Local" className="bg-card text-foreground">Local Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Date Posted (date_posted)
                  </label>
                  <select
                    value={discoverySettings.date_posted || 'week'}
                    onChange={e => {
                      const val = e.target.value;
                      const hrsMap: Record<string, number> = { today: 24, '3days': 72, week: 168, month: 720, all: 2160 };
                      setDiscoverySettings((p: any) => ({
                        ...p,
                        date_posted: val,
                        job_recency_hours: hrsMap[val] || 168
                      }));
                    }}
                    className="theme-select w-full px-3.5 py-2.5 rounded-xl bg-card border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition cursor-pointer"
                  >
                    <option value="today" className="bg-card text-foreground">Past 24 Hours</option>
                    <option value="3days" className="bg-card text-foreground">Past 3 Days</option>
                    <option value="week" className="bg-card text-foreground">Past Week</option>
                    <option value="month" className="bg-card text-foreground">Past Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Work From Home Only
                  </label>
                  <button
                    type="button"
                    onClick={() => setDiscoverySettings((p: any) => ({ ...p, work_from_home: !p.work_from_home }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 ${discoverySettings.work_from_home
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40 font-semibold'
                        : 'bg-muted/30 border-border/80 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <span>{discoverySettings.work_from_home ? '✓ WFH Only Enabled' : '○ WFH Only Disabled'}</span>
                  </button>
                </div>
              </div>

              {/* 3. Job Roles & Keywords */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Target Roles & Keywords (query param)
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
                      className="px-3 py-1.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Employment Types (employment_types param) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Employment Types (employment_types param)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Full-time (FULLTIME)', val: 'Full-time' },
                    { label: 'Contractor (CONTRACTOR)', val: 'Contract' },
                    { label: 'Part-time (PARTTIME)', val: 'Part-time' },
                    { label: 'Internship (INTERN)', val: 'Internship' }
                  ].map(item => {
                    const active = (discoverySettings.employment_types || []).includes(item.val);
                    return (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          setDiscoverySettings((p: any) => {
                            const cur = p.employment_types || [];
                            const next = cur.includes(item.val)
                              ? cur.filter((t: string) => t !== item.val)
                              : [...cur, item.val];
                            return { ...p, employment_types: next };
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${active
                            ? 'bg-primary/15 text-primary border-primary/40 font-semibold'
                            : 'bg-muted/30 border-border/80 text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        {active ? '✓ ' : '+ '}{item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Job Requirements / Experience (job_requirements param) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Experience & Qualifications (job_requirements param)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '3+ Years Exp (more_than_3_years_experience)', val: 'more_than_3_years_experience' },
                    { label: '< 3 Years Exp (under_3_years_experience)', val: 'under_3_years_experience' },
                    { label: 'No Experience / Entry (no_experience)', val: 'no_experience' },
                    { label: 'No Degree Required (no_degree)', val: 'no_degree' }
                  ].map(req => {
                    const active = (discoverySettings.job_requirements || []).includes(req.val);
                    return (
                      <button
                        key={req.val}
                        type="button"
                        onClick={() => {
                          setDiscoverySettings((p: any) => {
                            const cur = p.job_requirements || [];
                            const next = cur.includes(req.val)
                              ? cur.filter((r: string) => r !== req.val)
                              : [...cur, req.val];
                            return { ...p, job_requirements: next };
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${active
                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/40 font-semibold'
                            : 'bg-muted/30 border-border/80 text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        {active ? '✓ ' : '+ '}{req.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. Pages to Fetch */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Pages to Fetch (num_pages param: 1-5, 10 jobs/page)
                </label>
                <select
                  value={discoverySettings.num_pages || 1}
                  onChange={e => setDiscoverySettings((p: any) => ({ ...p, num_pages: Number(e.target.value) }))}
                  className="theme-select w-full px-3.5 py-2.5 rounded-xl bg-card border border-border/80 text-xs font-mono text-foreground focus:outline-none focus:border-primary shadow-xs transition cursor-pointer"
                >
                  <option value={1} className="bg-card text-foreground">1 Page (Up to 10 jobs)</option>
                  <option value={2} className="bg-card text-foreground">2 Pages (Up to 20 jobs)</option>
                  <option value={3} className="bg-card text-foreground">3 Pages (Up to 30 jobs)</option>
                  <option value={5} className="bg-card text-foreground">5 Pages (Up to 50 jobs)</option>
                </select>
              </div>

              {/* 7. Exclude Job Publishers (exclude_job_publishers param) */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Exclude Job Publishers (exclude_job_publishers param)
                </label>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(discoverySettings.exclude_job_publishers || []).map((pub: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-mono flex items-center gap-1.5"
                      >
                        <span>{pub}</span>
                        <button
                          type="button"
                          onClick={() => removePublisherTag(pub)}
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
                      placeholder="Add publisher to exclude (e.g. Revature, CyberCoders)..."
                      value={newPublisherInput}
                      onChange={e => setNewPublisherInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPublisherTag();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-background border border-border/80 text-xs text-foreground focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={addPublisherTag}
                      className="px-3 py-1.5 rounded-xl bg-muted border border-border/80 hover:bg-card text-foreground text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Exclude</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 8. Schedule, Daily Limit & Dual ATS Thresholds */}
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
        <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md overflow-y-auto overscroll-contain">
          <div data-lenis-prevent className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-card border border-border/80 p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-5 my-auto text-foreground animate-fade-in overscroll-contain">
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
                {stagedJobIds.has(selectedJob.id) ? (
                  <button
                    disabled
                    className="px-3.5 py-2 rounded-xl bg-muted/70 border border-border/80 text-muted-foreground text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed opacity-80"
                    title="Application package already staged"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Staged</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStageApplicationPackage([selectedJob.id])}
                    disabled={isStaging}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Stage Application Package"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Stage</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const jobId = selectedJob.id;
                    setSelectedJob(null);
                    handleSingleAutoApply(jobId);
                  }}
                  disabled={applyingJobs}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-primary/20 hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Apply (Playwright)</span>
                </button>
                {selectedJob.apply_url && (
                  <a
                    href={selectedJob.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-muted border border-border/80 text-foreground text-xs font-semibold transition flex items-center gap-1.5 hover:bg-muted/80"
                    title="Open Original Job Link"
                  >
                    <span>Link</span>
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

      {/* Application Progress Modal */}
      {autoApplyModalOpen && currentBatchId && (
        <ApplicationProgressModal
          isOpen={autoApplyModalOpen}
          batchId={currentBatchId}
          apiHost={apiHost}
          onClose={() => setAutoApplyModalOpen(false)}
          onComplete={handleAutoApplyComplete}
        />
      )}
    </div>
  );
}
