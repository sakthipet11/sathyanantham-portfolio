'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Mail,
  Send,
  ExternalLink,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Copy,
  Check,
  Building2,
  MapPin,
  Users,
  ChevronRight,
  X,
  FileCheck,
  ShieldCheck,
  Layers,
  Edit3,
  Download,
  Info,
  SlidersHorizontal,
  Bot
} from 'lucide-react';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import Link from 'next/link';

interface ApplicationItem {
  id: string;
  job_id: string;
  role_title?: string;
  job_title?: string;
  title?: string;
  company: string;
  location?: string;
  apply_url?: string;
  status: string;
  match_score?: number;
  tech_stack?: string[];
  description_raw?: string;
  matched_resume_url?: string;
  matched_resume_role?: string;
  cover_letter?: string;
  referral_contact?: string;
  referral_email?: string;
  email_sent_to?: string;
  email_sent_at?: string;
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
  company_connections?: any[];
}

interface ApplicationMetrics {
  total_applications: number;
  ready_for_review_count: number;
  submitted_count: number;
  in_progress_count: number;
  failed_count: number;
  email_sent_count: number;
}

const AUTHORITATIVE_RESUMES = [
  {
    id: 'resume-frontend-architect',
    name: 'Sathyanantham_V_Frontend_Architect_2026.pdf',
    role: 'Lead Frontend Architect',
    url: '/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf'
  },
  {
    id: 'resume-ai-lead',
    name: 'Sathyanantham_V_AI_FullStack_Lead.pdf',
    role: 'AI-Assisted Lead Engineer',
    url: '/downloads/Sathyanantham_V_AI_FullStack_Lead.pdf'
  },
  {
    id: 'resume-mfe-specialist',
    name: 'Sathyanantham_V_MicroFrontend_Specialist.pdf',
    role: 'Micro Frontend Architect',
    url: '/downloads/Sathyanantham_V_MicroFrontend_Specialist.pdf'
  },
  {
    id: 'resume-general-architect',
    name: 'Sathyanantham_V_Resume.pdf',
    role: 'Principal Architect & FullStack Lead',
    url: '/downloads/Sathyanantham_V_Resume.pdf'
  }
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [metrics, setMetrics] = useState<ApplicationMetrics>({
    total_applications: 0,
    ready_for_review_count: 0,
    submitted_count: 0,
    in_progress_count: 0,
    failed_count: 0,
    email_sent_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals & Drawers
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [appEvents, setAppEvents] = useState<any[]>([]);
  const [emailModalApp, setEmailModalApp] = useState<ApplicationItem | null>(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailResumeFile, setEmailResumeFile] = useState('Sathyanantham_V_Frontend_Architect_2026.pdf');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSavingApp, setIsSavingApp] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);

  // Editable fields in drawer
  const [editCoverLetter, setEditCoverLetter] = useState('');
  const [editResumeRole, setEditResumeRole] = useState('');
  const [editResumeUrl, setEditResumeUrl] = useState('');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const apiHost = getApiHost();

  const fetchApplications = useCallback(async () => {
    try {
      setRefreshing(true);
      const timestamp = Date.now();
      const res = await fetchWithTimeout(`${apiHost}/api/v2/applications?_t=${timestamp}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      }, 10000);
      if (res.ok) {
        const data = await res.json();
        const appsList: ApplicationItem[] = data.applications || [];
        setApplications(appsList);
        if (data.metrics) {
          setMetrics(data.metrics);
        } else {
          setMetrics({
            total_applications: appsList.length,
            ready_for_review_count: appsList.filter(a => a.status === 'READY_FOR_REVIEW').length,
            submitted_count: appsList.filter(a => a.status === 'SUBMITTED' || a.status === 'EMAIL_SENT').length,
            in_progress_count: appsList.filter(a => a.status === 'QUEUED' || a.status === 'PROCESSING').length,
            failed_count: appsList.filter(a => a.status === 'FAILED').length,
            email_sent_count: appsList.filter(a => !!a.email_sent_to).length
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      showToast('Error fetching applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiHost]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Open Application Review Drawer
  const openAppDrawer = async (app: ApplicationItem) => {
    setSelectedApp(app);
    setEditCoverLetter(app.cover_letter || '');
    setEditResumeRole(app.matched_resume_role || 'Lead Frontend Architect');
    setEditResumeUrl(app.matched_resume_url || '/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf');
    setAppEvents([]);

    try {
      const res = await fetchWithTimeout(`${apiHost}/api/v2/applications/${app.id}`, {}, 5000);
      if (res.ok) {
        const data = await res.json();
        if (data.application) {
          setSelectedApp(data.application);
          setEditCoverLetter(data.application.cover_letter || '');
          setEditResumeRole(data.application.matched_resume_role || 'Lead Frontend Architect');
          setEditResumeUrl(data.application.matched_resume_url || '/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf');
        }
        if (data.events) {
          setAppEvents(data.events);
        }
      }
    } catch (e) {
      console.warn('Error fetching application events:', e);
    }
  };

  // Open Email Dispatch Modal
  const openEmailModal = (app: ApplicationItem) => {
    setEmailModalApp(app);
    const companyClean = (app.company || 'Enterprise').trim();
    const roleTitle = app.role_title || app.job_title || 'Lead Software Engineer';
    
    // Preset target email
    const suggestedEmail = app.referral_email || (app.referral_contact ? `recruiter@${companyClean.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : `careers@${companyClean.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);
    setEmailRecipient(suggestedEmail);
    setEmailSubject(`Application for ${roleTitle} - Sathyanantham V`);
    
    const resumeFileName = app.matched_resume_url ? app.matched_resume_url.split('/').pop() || 'Sathyanantham_V_Frontend_Architect_2026.pdf' : 'Sathyanantham_V_Frontend_Architect_2026.pdf';
    setEmailResumeFile(resumeFileName);

    const defaultCoverLetter = app.cover_letter || (
      `Dear Hiring Team at ${companyClean},\n\n` +
      `I am writing to express my enthusiastic interest in the ${roleTitle} role at ${companyClean}.\n\n` +
      `With over 13.5+ years of specialized experience architecting large-scale enterprise web applications, Micro Frontends (Module Federation), and AI-driven platforms, I am confident in delivering high-impact value to your engineering initiatives.\n\n` +
      `Please find my tailored resume attached (${resumeFileName}). I welcome the opportunity for a technical discussion.\n\n` +
      `Sincerely,\nSathyanantham V\nLead Frontend & AI Systems Architect\nhttps://sathyanantham.com`
    );
    setEmailBody(defaultCoverLetter);
  };

  // Dispatch Tailored Application Email
  const handleSendEmail = async () => {
    if (!emailModalApp) return;
    if (!emailRecipient.trim()) {
      showToast('Please provide a recipient email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await fetchWithTimeout(`${apiHost}/api/v2/applications/${emailModalApp.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: emailRecipient.trim(),
          subject: emailSubject.trim(),
          cover_letter: emailBody.trim(),
          resume_file_name: emailResumeFile
        })
      }, 15000);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to dispatch email');
      }

      const data = await res.json();
      showToast(`✉️ Application emailed successfully to ${emailRecipient}!`);
      setEmailModalApp(null);
      fetchApplications();
    } catch (err: any) {
      showToast(err.message || 'Error dispatching application email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Launch Browser Auto-Apply
  const handleLaunchBrowser = async (app: ApplicationItem) => {
    showToast(`🌐 Launching Chromium browser for ${app.company}...`);
    try {
      const res = await fetchWithTimeout(`${apiHost}/api/v2/applications/${app.id}/apply-browser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_submit: false, headless: false })
      }, 10000);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to launch browser');
      }
      showToast(`✅ Chromium Automation launched for ${app.company}`);
      fetchApplications();
    } catch (err: any) {
      showToast(err.message || 'Error launching browser');
    }
  };

  // Save Edits to Staged Application
  const handleSaveAppEdits = async () => {
    if (!selectedApp) return;
    setIsSavingApp(true);
    try {
      const res = await fetchWithTimeout(`${apiHost}/api/v2/applications/${selectedApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cover_letter: editCoverLetter,
          matched_resume_role: editResumeRole,
          matched_resume_url: editResumeUrl
        })
      }, 8000);

      if (res.ok) {
        showToast('✅ Staged application updated');
        fetchApplications();
      } else {
        throw new Error('Failed to update application');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating application');
    } finally {
      setIsSavingApp(false);
    }
  };

  // Copy Cover Letter to Clipboard
  const handleCopyCoverLetter = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCoverLetter(true);
    showToast('📋 Cover letter copied to clipboard');
    setTimeout(() => setCopiedCoverLetter(false), 2500);
  };

  // Delete Actions
  const promptDeleteSingle = (appId: string) => {
    setItemsToDelete([appId]);
    setDeleteModalOpen(true);
  };

  const promptBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setItemsToDelete(selectedIds);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    const toDelete = [...itemsToDelete];
    try {
      if (toDelete.length === 1) {
        await fetchWithTimeout(`${apiHost}/api/v2/applications/${toDelete[0]}`, { method: 'DELETE' }, 10000);
      } else {
        await fetchWithTimeout(`${apiHost}/api/v2/applications/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: toDelete, application_ids: toDelete })
        }, 10000);
      }

      // 1. Optimistically remove from state immediately
      setApplications(prev => prev.filter(app => !toDelete.includes(app.id)));

      // 2. If the deleted app was open in the side drawer, close it immediately
      if (selectedApp && toDelete.includes(selectedApp.id)) {
        setSelectedApp(null);
      }

      // 3. Clear selections and close modal
      setSelectedIds(prev => prev.filter(id => !toDelete.includes(id)));
      setDeleteModalOpen(false);
      setItemsToDelete([]);
      showToast(`🗑️ Deleted ${toDelete.length} application${toDelete.length > 1 ? 's' : ''}`);

      // 4. Fresh re-sync from backend
      await fetchApplications();
    } catch (err) {
      showToast('Error deleting application');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredApplications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApplications.map(a => a.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Filtering
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = (app.company || '').toLowerCase();
        const role = (app.role_title || app.job_title || app.title || '').toLowerCase();
        const loc = (app.location || '').toLowerCase();
        const resume = (app.matched_resume_role || '').toLowerCase();
        if (!comp.includes(q) && !role.includes(q) && !loc.includes(q) && !resume.includes(q)) {
          return false;
        }
      }

      // Status
      if (statusFilter === 'READY_FOR_REVIEW') return app.status === 'READY_FOR_REVIEW' || app.status === 'DRAFT';
      if (statusFilter === 'SUBMITTED') return app.status === 'SUBMITTED' || app.status === 'EMAIL_SENT';
      if (statusFilter === 'IN_PROGRESS') return app.status === 'QUEUED' || app.status === 'PROCESSING' || app.status === 'SUBMITTING';
      if (statusFilter === 'FAILED') return app.status === 'FAILED' || app.status === 'MANUAL_REQUIRED';

      return true;
    });
  }, [applications, searchQuery, statusFilter]);

  const getStatusBadge = (status: string, emailSentTo?: string) => {
    const s = (status || '').toUpperCase();
    if (emailSentTo || s === 'EMAIL_SENT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <Mail className="w-3.5 h-3.5" /> Emailed
        </span>
      );
    }
    if (s === 'SUBMITTED' || s === 'APPLIED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
        </span>
      );
    }
    if (s === 'READY_FOR_REVIEW' || s === 'DRAFT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Sparkles className="w-3.5 h-3.5" /> Ready for Review
        </span>
      );
    }
    if (s === 'QUEUED' || s === 'PROCESSING' || s === 'SUBMITTING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> In Progress
        </span>
      );
    }
    if (s === 'FAILED' || s === 'MANUAL_REQUIRED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3.5 h-3.5" /> Needs Attention
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-muted text-muted-foreground border border-border">
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 font-sans transition-colors duration-300 w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-card border border-primary/40 text-foreground text-sm font-medium shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 max-w-[90vw] sm:max-w-md">
          <Sparkles className="w-4 h-4 text-primary animate-pulse shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 truncate">
                  Application Packages & Automation
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                  Review staged candidate resumes, tailored cover letters, and dispatch applications.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <Link
              href="/admin/jobs"
              className="px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground border border-border/60 transition flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-primary" /> Discover Jobs
            </Link>
            <button
              onClick={fetchApplications}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-card hover:bg-muted text-xs font-semibold text-foreground border border-border/80 transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Metrics HUD Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
          <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-sm relative overflow-hidden group hover:border-primary/40 transition min-w-0">
            <div className="text-[10px] sm:text-[11px] font-mono text-muted-foreground uppercase tracking-wider font-semibold truncate">Total Staged</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 font-mono">{metrics.total_applications}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Managed Packages</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-amber-500/20 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition bg-amber-500/[0.02] min-w-0">
            <div className="text-[10px] sm:text-[11px] font-mono text-amber-400 uppercase tracking-wider font-semibold flex items-center gap-1 truncate">
              <Sparkles className="w-3 h-3 shrink-0" /> Ready for Review
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1 font-mono">{metrics.ready_for_review_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Awaiting Dispatch</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-emerald-500/20 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition bg-emerald-500/[0.02] min-w-0">
            <div className="text-[10px] sm:text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 shrink-0" /> Emailed
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1 font-mono">{metrics.email_sent_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Direct Outreach</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-emerald-500/20 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition bg-emerald-500/[0.02] min-w-0">
            <div className="text-[10px] sm:text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-1 truncate">
              <CheckCircle2 className="w-3 h-3 shrink-0" /> Submitted
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1 font-mono">{metrics.submitted_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Live Applications</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-cyan-500/20 shadow-sm relative overflow-hidden group hover:border-cyan-500/40 transition bg-cyan-500/[0.02] min-w-0">
            <div className="text-[10px] sm:text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold flex items-center gap-1 truncate">
              <RefreshCw className="w-3 h-3 shrink-0" /> In Progress
            </div>
            <div className="text-xl sm:text-2xl font-bold text-cyan-400 mt-1 font-mono">{metrics.in_progress_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Processing</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-rose-500/20 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition bg-rose-500/[0.02] min-w-0">
            <div className="text-[10px] sm:text-[11px] font-mono text-rose-400 uppercase tracking-wider font-semibold flex items-center gap-1 truncate">
              <AlertCircle className="w-3 h-3 shrink-0" /> Attention
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-400 mt-1 font-mono">{metrics.failed_count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">Needs Review</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3 rounded-2xl bg-card border border-border/60 shadow-sm w-full">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-wrap">
            {[
              { id: 'ALL', label: 'All Packages' },
              { id: 'READY_FOR_REVIEW', label: 'Ready for Review' },
              { id: 'SUBMITTED', label: 'Submitted & Emailed' },
              { id: 'IN_PROGRESS', label: 'In Progress' },
              { id: 'FAILED', label: 'Needs Attention' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px] md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search company, role, resume..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/40 border border-border/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/80 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Applications Table */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm w-full">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredApplications.length > 0 && selectedIds.length === filteredApplications.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Company & Target Role</th>
                <th className="py-3.5 px-4">Tailored Resume Matched</th>
                <th className="py-3.5 px-4">Cover Letter</th>
                <th className="py-3.5 px-4">Referral / Contact</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading applications...
                  </td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="font-semibold text-foreground text-sm">No applications found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Go to <Link href="/admin/jobs" className="text-primary underline">Job Discovery</Link> and select jobs to stage your tailored resumes and cover letters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredApplications.map(app => {
                  const isSelected = selectedIds.includes(app.id);
                  const roleName = app.role_title || app.job_title || app.title || 'Lead Software Engineer';
                  const resumeRole = app.matched_resume_role || 'Lead Frontend Architect';

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-muted/30 transition group ${isSelected ? 'bg-primary/[0.04]' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(app.id)}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Company & Role */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-xl bg-muted/60 border border-border/80 text-foreground font-mono font-bold text-xs mt-0.5">
                            {app.company.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground text-sm font-sans">{app.company}</span>
                              {app.match_score && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" /> {app.match_score}%
                                </span>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs font-medium mt-0.5 flex items-center gap-2">
                              <span>{roleName}</span>
                              {app.apply_url && (
                                <a
                                  href={app.apply_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tailored Resume Matched */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20 w-fit">
                            <FileCheck className="w-3.5 h-3.5" />
                            {resumeRole}
                          </span>
                          {app.matched_resume_url && (
                            <a
                              href={app.matched_resume_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono hover:underline"
                            >
                              <Download className="w-3 h-3 text-muted-foreground" /> Download PDF
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Cover Letter */}
                      <td className="py-4 px-4">
                        {app.cover_letter ? (
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px] font-semibold">
                              <Check className="w-3.5 h-3.5" /> Tailored Draft Ready
                            </span>
                            <p className="text-[11px] text-muted-foreground truncate line-clamp-1 font-sans">
                              {app.cover_letter.slice(0, 45)}...
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] font-mono">Standard Introduction</span>
                        )}
                      </td>

                      {/* Referral / Contact */}
                      <td className="py-4 px-4">
                        {app.referral_contact ? (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                            <div>
                              <div className="font-semibold text-foreground text-xs">{app.referral_contact}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">1st-Degree Connection</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] font-mono">Direct Application</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {getStatusBadge(app.status, app.email_sent_to)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send Email Action */}
                          <button
                            onClick={() => openEmailModal(app)}
                            title="Send Tailored Application Email"
                            className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Email</span>
                          </button>

                          {/* Launch Browser Auto-Apply */}
                          {app.apply_url && (
                            <button
                              onClick={() => handleLaunchBrowser(app)}
                              title="Launch Browser Auto-Apply"
                              className="p-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground border border-border/80 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            >
                              <Play className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="hidden xl:inline">Browser</span>
                            </button>
                          )}

                          {/* Open Review Drawer */}
                          <button
                            onClick={() => openAppDrawer(app)}
                            title="Review Staged Package"
                            className="p-2 rounded-xl bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => promptDeleteSingle(app.id)}
                            title="Delete Application"
                            className="p-2 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Edit Drawer / Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-card border-l border-border/80 h-full overflow-y-auto p-6 space-y-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                      {selectedApp.company}
                    </span>
                    {getStatusBadge(selectedApp.status, selectedApp.email_sent_to)}
                  </div>
                  <h2 className="text-lg font-bold text-foreground mt-2">
                    {selectedApp.role_title || selectedApp.job_title || 'Lead Software Engineer'}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Target Job Quick Info */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Location:
                  </span>
                  <span className="font-semibold text-foreground">{selectedApp.location || 'Remote / Hybrid'}</span>
                </div>
                {selectedApp.apply_url && (
                  <div className="flex justify-between items-center pt-2 border-t border-border/40">
                    <span className="text-muted-foreground">Apply URL:</span>
                    <a
                      href={selectedApp.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono inline-flex items-center gap-1"
                    >
                      Open Job Page <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Matched Tailored Resume Section */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" /> Matched Tailored Resume
                </label>
                <div className="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground text-sm">{editResumeRole}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {editResumeUrl.split('/').pop()}
                      </div>
                    </div>
                    <a
                      href={editResumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                  </div>

                  {/* Switch Resume Version */}
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground font-mono block mb-1.5">
                      Switch Tailored Resume Version:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AUTHORITATIVE_RESUMES.map(res => (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => {
                            setEditResumeRole(res.role);
                            setEditResumeUrl(res.url);
                          }}
                          className={`p-2 rounded-xl text-left text-xs transition border cursor-pointer ${
                            editResumeRole === res.role
                              ? 'bg-primary/10 border-primary text-primary font-semibold'
                              : 'bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                          }`}
                        >
                          <div className="truncate font-medium">{res.role}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tailored Cover Letter Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-primary" /> Tailored Cover Letter
                  </label>
                  <button
                    onClick={() => handleCopyCoverLetter(editCoverLetter)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCoverLetter ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCoverLetter ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={editCoverLetter}
                  onChange={e => setEditCoverLetter(e.target.value)}
                  placeholder="Tailored cover letter text..."
                  className="w-full p-4 rounded-2xl bg-muted/30 border border-border/80 text-xs text-foreground font-sans leading-relaxed focus:outline-none focus:border-primary transition resize-y"
                />
              </div>

              {/* 1st-Degree Referral / Connections */}
              {selectedApp.company_connections && selectedApp.company_connections.length > 0 && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> 1st-Degree Connections at {selectedApp.company}
                  </label>
                  <div className="space-y-2">
                    {selectedApp.company_connections.map((c: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-card border border-border/80 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-foreground">{c.full_name}</div>
                          <div className="text-[11px] text-muted-foreground">{c.position}</div>
                        </div>
                        {c.email && (
                          <span className="text-[11px] font-mono text-primary">{c.email}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Application Timeline Events */}
              {appEvents.length > 0 && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" /> Application History
                  </label>
                  <div className="space-y-2">
                    {appEvents.map((evt, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-primary text-[11px]">{evt.event_type}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(evt.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-foreground text-[11px] mt-0.5">{evt.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-border/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveAppEdits}
                  disabled={isSavingApp}
                  className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground border border-border/80 transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingApp ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => promptDeleteSingle(selectedApp.id)}
                  className="px-3.5 py-2.5 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 border border-transparent hover:border-rose-500/20 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                  title="Delete Application"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEmailModal(selectedApp)}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Mail className="w-4 h-4" /> Dispatch Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Application Dispatch Modal */}
      {emailModalApp && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border border-border/80 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border/60 pb-4">
              <div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  {emailModalApp.company}
                </span>
                <h2 className="text-lg font-bold text-foreground mt-2 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" /> Send Tailored Application Email
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sends your tailored cover letter and attaches {emailResumeFile} via SMTP.
                </p>
              </div>
              <button
                onClick={() => setEmailModalApp(null)}
                className="p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              {/* Recipient Email */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1.5 font-bold">
                  Recipient Email (Recruiter / Hiring Team / Referral):
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={e => setEmailRecipient(e.target.value)}
                  placeholder="e.g. recruiter@company.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/40 border border-border/80 text-foreground text-xs focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Email Subject */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1.5 font-bold">
                  Subject Line:
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Application for..."
                  className="w-full px-4 py-2.5 rounded-xl bg-muted/40 border border-border/80 text-foreground text-xs focus:outline-none focus:border-primary transition"
                />
              </div>

              {/* Tailored Resume PDF Attachment Badge */}
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-semibold text-foreground text-xs">Attached Resume PDF</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{emailResumeFile}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  AUTO-ATTACHED
                </span>
              </div>

              {/* Cover Letter Body */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-muted-foreground mb-1.5 font-bold">
                  Cover Letter Body:
                </label>
                <textarea
                  rows={8}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-muted/40 border border-border/80 text-xs text-foreground font-sans leading-relaxed focus:outline-none focus:border-primary transition resize-y"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-border/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEmailModalApp(null)}
                className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSendingEmail ? 'Dispatching Live Email...' : 'Send Application Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={promptBulkDelete}
        itemLabel="applications"
      />

        {/* Confirm Delete Modal */}
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          itemCount={itemsToDelete.length}
          itemLabel="application"
          isDeleting={isDeleting}
          onConfirm={executeDelete}
          onCancel={() => {
            setDeleteModalOpen(false);
            setItemsToDelete([]);
          }}
        />
      </div>
    </div>
  );
}
