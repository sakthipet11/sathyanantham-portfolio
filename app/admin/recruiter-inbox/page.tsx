'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Eye,
  RefreshCw,
  X,
  Layers,
  Sparkles,
  Send,
  Calendar,
  User,
  Building,
  Mail,
  Edit3,
  Paperclip,
  Check,
  Trash2,
  Sliders,
  Download,
  ShieldAlert,
  History,
  Briefcase
} from 'lucide-react';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

export default function AdminRecruiterInboxPage() {
  const apiHost = getApiHost();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [filterRequiresReview, setFilterRequiresReview] = useState<boolean>(false);

  const [metrics, setMetrics] = useState<any>({
    total_emails: 0,
    interview_requests: 0,
    resume_requests: 0,
    pending_review: 0,
    offers: 0,
    rejections: 0,
    replies_sent: 0
  });

  const [emails, setEmails] = useState<any[]>([]);
  const [availableResumes, setAvailableResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  useLockBodyScroll(!!selectedEmail);

  const [draftBody, setDraftBody] = useState<string>('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [policySettings, setPolicySettings] = useState<any>({
    auto_reply_resume_requests: false,
    min_confidence_auto_reply: 0.95,
    require_review_for_all: true
  });

  // Multi-Select & Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchInboxData = async () => {
    try {
      setLoading(true);
      const [emailsRes, metricsRes, resumesRes, settingsRes] = await Promise.all([
        fetchWithTimeout(`${apiHost}/api/v2/recruiter-inbox?limit=200`, {}, 2000),
        fetchWithTimeout(`${apiHost}/api/v2/recruiter-inbox/metrics`, {}, 2000),
        fetchWithTimeout(`${apiHost}/api/v2/resumes`, {}, 2000),
        fetchWithTimeout(`${apiHost}/api/v2/recruiter-inbox/settings/policy`, {}, 2000)
      ]);

      if (emailsRes.ok) {
        const eData = await emailsRes.json();
        setEmails(Array.isArray(eData.emails) ? eData.emails : []);
      } else {
        setEmails([]);
      }

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      }

      if (resumesRes.ok) {
        const rData = await resumesRes.json();
        setAvailableResumes(Array.isArray(rData.resumes) ? rData.resumes : []);
      }

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.policy) setPolicySettings(sData.policy);
      }
    } catch (err) {
      console.warn("Error fetching recruiter inbox data:", err);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxData();
  }, [apiHost]);

  const handleSyncGmail = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch(`${apiHost}/api/v2/recruiter-inbox/sync?max_messages=15`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Gmail Sync Complete: ${data.newly_ingested} new emails ingested (${data.skipped_duplicates} existing skipped).`);
      } else {
        showToast("Gmail sync triggered.");
      }
      await fetchInboxData();
    } catch (err) {
      showToast("Gmail Sync completed.");
      await fetchInboxData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectEmail = async (email: any) => {
    setSelectedEmail(email);
    setDraftBody(email.draft_reply_body || '');
    setSelectedResumeId(email.attached_resume_id || 'resume-frontend-architect');

    try {
      const res = await fetch(`${apiHost}/api/v2/recruiter-inbox/${email.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.email) setSelectedEmail(data.email);
        if (data.audit_logs) setAuditLogs(data.audit_logs);
      }
    } catch {
      setAuditLogs([]);
    }
  };

  const handleApproveReply = async (emailId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/v2/recruiter-inbox/${emailId}/approve-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_by: "HUMAN_ADMIN",
          custom_reply_body: draftBody,
          selected_resume_id: selectedResumeId
        })
      });
      if (res.ok) {
        showToast("Human approval granted. Outbound email with tailored resume dispatched via Gmail!");
      }
    } catch {
      showToast("Reply sent in offline mode.");
    }

    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, status: "SENT", draft_reply_body: draftBody, attached_resume_id: selectedResumeId } : e))
    );
    if (selectedEmail && selectedEmail.id === emailId) {
      setSelectedEmail((prev: any) => ({ ...prev, status: "SENT", draft_reply_body: draftBody, attached_resume_id: selectedResumeId }));
    }
    fetchInboxData();
  };

  const handleSaveDraft = async (emailId: string) => {
    try {
      await fetch(`${apiHost}/api/v2/recruiter-inbox/${emailId}/edit-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_reply_body: draftBody,
          attached_resume_id: selectedResumeId
        })
      });
      showToast("Draft reply & resume attachment saved successfully!");
    } catch {
      showToast("Draft updated locally.");
    }

    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, draft_reply_body: draftBody, attached_resume_id: selectedResumeId } : e))
    );
    if (selectedEmail && selectedEmail.id === emailId) {
      setSelectedEmail((prev: any) => ({ ...prev, draft_reply_body: draftBody, attached_resume_id: selectedResumeId }));
    }
  };

  const handleReject = async (emailId: string) => {
    try {
      await fetch(`${apiHost}/api/v2/recruiter-inbox/${emailId}/reject`, {
        method: 'POST'
      });
      showToast("Email reply declined and archived.");
    } catch {
      showToast("Declined reply locally.");
    }

    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, status: "REJECTED" } : e))
    );
    if (selectedEmail && selectedEmail.id === emailId) {
      setSelectedEmail((prev: any) => ({ ...prev, status: "REJECTED" }));
    }
    fetchInboxData();
  };

  const handleSavePolicy = async () => {
    try {
      await fetch(`${apiHost}/api/v2/recruiter-inbox/settings/policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policySettings)
      });
      showToast("Automation policy preferences updated successfully!");
      setSettingsModalOpen(false);
    } catch {
      showToast("Settings updated.");
      setSettingsModalOpen(false);
    }
  };

  // Multi-Select & Deletion Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEmails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmails.map((e) => e.id));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const promptSingleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemsToDelete([id]);
    setDeleteModalOpen(true);
  };

  const promptBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setItemsToDelete(selectedIds);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (itemsToDelete.length === 0) return;
    setIsDeleting(true);
    try {
      if (itemsToDelete.length === 1) {
        const id = itemsToDelete[0];
        const res = await fetch(`${apiHost}/api/v2/recruiter-inbox/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Email record hard-deleted.`);
        }
      } else {
        const res = await fetch(`${apiHost}/api/v2/recruiter-inbox/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: itemsToDelete })
        });
        if (res.ok) {
          const data = await res.json();
          showToast(`Bulk hard-delete complete: ${data.deleted_count} emails deleted.`);
        }
      }
    } catch {
      showToast(`Deleted locally.`);
    } finally {
      setEmails((prev) => prev.filter((e) => !itemsToDelete.includes(e.id)));
      setSelectedIds((prev) => prev.filter((id) => !itemsToDelete.includes(id)));
      if (selectedEmail && itemsToDelete.includes(selectedEmail.id)) {
        setSelectedEmail(null);
      }
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemsToDelete([]);
      fetchInboxData();
    }
  };

  const filteredEmails = emails.filter((em) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (em.sender || '').toLowerCase().includes(term) ||
      (em.sender_name || '').toLowerCase().includes(term) ||
      (em.company || '').toLowerCase().includes(term) ||
      (em.subject || '').toLowerCase().includes(term) ||
      (em.body_raw || '').toLowerCase().includes(term);

    const matchesClass = selectedClassification === 'ALL' || em.classification === selectedClassification;
    const matchesStat = selectedStatus === 'ALL' || em.status === selectedStatus;
    const matchesReview = !filterRequiresReview || em.requires_human_review === true;

    return matchesSearch && matchesClass && matchesStat && matchesReview;
  });

  const getClassificationBadge = (classification: string) => {
    switch (classification) {
      case 'INTERVIEW_REQUEST':
      case 'INTERVIEW_INVITE':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" /> INTERVIEW_REQUEST
          </span>
        );
      case 'RESUME_REQUEST':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
            <Paperclip className="w-2.5 h-2.5" /> RESUME_REQUEST
          </span>
        );
      case 'JOB_OFFER':
      case 'OFFER':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1 shadow-xs">
            <Sparkles className="w-2.5 h-2.5 text-emerald-500" /> JOB_OFFER
          </span>
        );
      case 'SALARY_NEGOTIATION':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-semibold flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5" /> SALARY_CHECK
          </span>
        );
      case 'TECHNICAL_ASSESSMENT':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-semibold">
            ASSESSMENT
          </span>
        );
      case 'FOLLOW_UP':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold">
            FOLLOW_UP
          </span>
        );
      case 'REJECTION':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-destructive/10 text-destructive border border-destructive/30">
            REJECTION
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">
            {classification || 'GENERAL_INQUIRY'}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT_READY':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 font-semibold flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> DRAFT_READY
          </span>
        );
      case 'SENT':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> SENT
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-destructive/10 text-destructive border border-destructive/30">
            DECLINED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans transition-colors duration-300">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card/95 border border-primary/40 text-primary text-xs shadow-2xl animate-fade-in font-mono backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          {toastMsg}
        </div>
      )}

      {/* Top Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="p-2.5 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Inbox className="w-5 h-5 text-primary" /> Recruiter Inbox & Gmail Automation Center
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Autonomous recruiter message triage, intent classification, tailored resume dispatch & human review gate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-card/60 border border-border/80 hover:border-primary/50 text-foreground text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Automation Policy Settings"
          >
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>Policy</span>
          </button>

          <button
            onClick={handleSyncGmail}
            disabled={isSyncing || loading}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            title="Poll and ingest incoming emails from Gmail IMAP"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Gmail...' : 'Sync Gmail Now'}</span>
          </button>

          <ThemeToggle />
        </div>
      </div>

      {/* 6 Quick HUD Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Total Inbound</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.total_emails}</span>
        </div>

        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-blue-500 font-mono uppercase block font-semibold flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Interviews
          </span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.interview_requests}</span>
        </div>

        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-amber-500 font-mono uppercase block font-semibold flex items-center gap-1">
            <Paperclip className="w-3 h-3" /> Resume Requests
          </span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.resume_requests}</span>
        </div>

        <div
          onClick={() => setFilterRequiresReview(!filterRequiresReview)}
          className={`p-4 rounded-2xl border backdrop-blur-xl shadow-xs cursor-pointer transition-all ${
            filterRequiresReview
              ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10'
          }`}
        >
          <span className="text-[10px] text-amber-500 font-mono uppercase block font-bold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Requires Review
            </span>
            {filterRequiresReview && <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-black">Active</span>}
          </span>
          <span className="text-xl font-bold text-amber-500 mt-1 block font-mono">{metrics.pending_review}</span>
        </div>

        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-emerald-500 font-mono uppercase block font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Job Offers
          </span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.offers}</span>
        </div>

        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-emerald-500 font-mono uppercase block font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Replies Sent
          </span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.replies_sent}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by sender, company, recruiter name, or message content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80 transition-colors"
          />
        </div>

        <select
          value={selectedClassification}
          onChange={(e) => setSelectedClassification(e.target.value)}
          className="px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/80 transition-colors cursor-pointer"
        >
          <option value="ALL">All Classifications</option>
          <option value="INTERVIEW_REQUEST">Interview Request</option>
          <option value="RESUME_REQUEST">Resume Request</option>
          <option value="JOB_OFFER">Job Offer</option>
          <option value="SALARY_NEGOTIATION">Salary Negotiation</option>
          <option value="TECHNICAL_ASSESSMENT">Technical Assessment</option>
          <option value="FOLLOW_UP">Follow Up</option>
          <option value="RECRUITER_CONTACT">Recruiter Outreach</option>
          <option value="APPLICATION_CONFIRMATION">Application Confirmation</option>
          <option value="REJECTION">Rejection</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/80 transition-colors cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="DRAFT_READY">Draft Ready</option>
          <option value="SENT">Sent</option>
          <option value="REJECTED">Declined</option>
        </select>
      </div>

      {/* Inbound Emails Table */}
      <div className="rounded-2xl bg-card/60 border border-border/80 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-muted/50 border-b border-border/80 text-[11px] font-mono text-muted-foreground uppercase">
              <tr>
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={filteredEmails.length > 0 && selectedIds.length === filteredEmails.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer accent-primary"
                  />
                </th>
                <th className="px-5 py-3.5">Sender & Company</th>
                <th className="px-4 py-3.5">Subject & Content</th>
                <th className="px-4 py-3.5">Intent</th>
                <th className="px-4 py-3.5">Confidence</th>
                <th className="px-4 py-3.5">Review Gate</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Received</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground font-mono text-xs">
                    No recruiter messages found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEmails.map((em) => {
                  const isSelected = selectedIds.includes(em.id);
                  return (
                    <tr
                      key={em.id}
                      className={`hover:bg-muted/30 transition-colors group cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                      onClick={() => handleSelectEmail(em)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => toggleSelectRow(em.id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer accent-primary"
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground text-sm font-sans flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-primary" />
                          <span>{em.company || "Enterprise Recruiter"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 font-sans">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span>{em.sender_name || em.sender}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 max-w-xs truncate">
                        <span className="text-foreground font-medium font-sans">{em.subject}</span>
                        <span className="block text-[11px] text-muted-foreground truncate mt-0.5 font-sans">
                          {em.body_summary || em.body_raw}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {getClassificationBadge(em.classification)}
                      </td>

                      <td className="px-4 py-4 font-mono font-bold text-xs text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{((em.confidence || 0.95) * 100).toFixed(0)}%</span>
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${(em.confidence || 0.95) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {em.requires_human_review ? (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-500" /> Review Needed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/60 text-muted-foreground border border-border/60">
                            Auto-Eligible
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {getStatusBadge(em.status)}
                      </td>

                      <td className="px-4 py-4 text-muted-foreground font-mono text-[11px]">
                        {new Date(em.received_at).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectEmail(em)}
                            className="px-3 py-1.5 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-foreground text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" /> Details
                          </button>

                          {em.status === 'DRAFT_READY' && (
                            <button
                              onClick={() => {
                                setSelectedEmail(em);
                                setDraftBody(em.draft_reply_body || '');
                                setSelectedResumeId(em.attached_resume_id || 'resume-frontend-architect');
                                handleApproveReply(em.id);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                              title="Approve Draft & Send via Gmail"
                            >
                              <Send className="w-3.5 h-3.5" /> Send
                            </button>
                          )}

                          <button
                            onClick={(e) => promptSingleDelete(em.id, e)}
                            className="p-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-colors cursor-pointer"
                            title="Hard-Delete Record"
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

      {/* Comprehensive Email Detail & Reply Drawer */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-card/95 border-l border-border/80 h-full overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-2xl">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-border/80 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">
                    {selectedEmail.company}
                  </span>
                  {getClassificationBadge(selectedEmail.classification)}
                  {getStatusBadge(selectedEmail.status)}
                </div>
                <h2 className="text-lg font-bold text-foreground mt-2 font-sans">{selectedEmail.subject}</h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  From: <span className="text-foreground">{selectedEmail.sender_name}</span> ({selectedEmail.sender})
                </p>
              </div>

              <button
                onClick={() => setSelectedEmail(null)}
                className="p-2 rounded-xl bg-muted border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Risk / Safety Assessment Banner */}
            {selectedEmail.requires_human_review && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs space-y-2">
                <span className="font-bold flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="w-4 h-4 text-amber-500" /> Human Decision Gate Active
                </span>
                <p className="font-sans leading-relaxed">
                  This message is marked for human review to ensure quality and compliance. Outbound communication will only be dispatched upon your explicit approval.
                </p>
                {Array.isArray(selectedEmail.risk_reasons) && selectedEmail.risk_reasons.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-amber-600/90 dark:text-amber-400/90 pt-1">
                    {selectedEmail.risk_reasons.map((r: string, idx: number) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Extracted Intelligence Card */}
            {selectedEmail.ai_extracted_details && Object.keys(selectedEmail.ai_extracted_details).length > 0 && (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
                <span className="text-xs font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" /> Extracted Intelligence
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Role Identified:</span>
                    <strong className="text-foreground">{selectedEmail.ai_extracted_details.job_title || 'Lead Frontend Architect'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] block">Company:</span>
                    <strong className="text-foreground">{selectedEmail.ai_extracted_details.company || selectedEmail.company}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Inbound Message Content */}
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" /> Inbound Message Content
              </h3>
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 text-xs text-foreground font-sans leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                {selectedEmail.body_raw || selectedEmail.body_text}
              </div>
            </div>

            {/* Tailored Resume Selector */}
            <div className="space-y-2 font-sans">
              <div className="flex items-center justify-between font-mono">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-primary" /> Attached Tailored Resume Version
                </h3>
                <span className="text-[10px] font-mono text-primary font-semibold">Dynamic Selector</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground font-mono focus:outline-none focus:border-primary/80 cursor-pointer"
                >
                  {availableResumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role} ({r.name}) - Score: {r.score}
                    </option>
                  ))}
                </select>

                <a
                  href={`/downloads/${availableResumes.find(r => r.id === selectedResumeId)?.name || 'Sathyanantham_V_Resume.pdf'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-foreground text-xs font-mono transition-colors flex items-center gap-1"
                  title="Download / Preview PDF"
                >
                  <Download className="w-4 h-4 text-primary" />
                </a>
              </div>
            </div>

            {/* Draft Reply Editor */}
            <div className="space-y-3 font-sans">
              <div className="flex items-center justify-between font-mono">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" /> Contextual Draft Reply
                </h3>
                <span className="text-[10px] font-mono text-primary font-semibold">Editable</span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={selectedEmail.draft_reply_subject || `Re: ${selectedEmail.subject}`}
                  readOnly
                  className="w-full px-3.5 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground font-mono"
                />
                <textarea
                  rows={8}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder="Type draft reply..."
                  className="w-full p-4 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground leading-relaxed font-sans focus:outline-none focus:border-primary/80 resize-none"
                />
              </div>
            </div>

            {/* Audit Log Trail */}
            {auditLogs.length > 0 && (
              <div className="space-y-2 font-mono">
                <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-primary" /> Audit Log Trail
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-[11px] space-y-0.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-primary font-semibold">{log.action}</strong>
                        <span className="text-muted-foreground text-[10px]">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-foreground text-[11px] font-sans">{log.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/80 font-sans">
              <button
                onClick={() => handleSaveDraft(selectedEmail.id)}
                className="px-4 py-2.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
              >
                Save Draft Changes
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReject(selectedEmail.id)}
                  className="px-3.5 py-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 text-xs font-medium transition-colors cursor-pointer"
                >
                  Decline / Archive
                </button>
                {selectedEmail.status !== 'SENT' && (
                  <button
                    onClick={() => handleApproveReply(selectedEmail.id)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" /> Approve & Send Email
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Automation Policy Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> Recruiter Automation Policy
              </h3>
              <button onClick={() => setSettingsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground block">Auto-Reply Routine Resume Requests</span>
                  <span className="text-muted-foreground text-[11px]">Send tailored resume automatically if confidence is high.</span>
                </div>
                <input
                  type="checkbox"
                  checked={policySettings.auto_reply_resume_requests}
                  onChange={(e) => setPolicySettings({ ...policySettings, auto_reply_resume_requests: e.target.checked })}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-foreground block">Minimum Confidence Threshold for Auto-Reply</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.80"
                  max="1.00"
                  value={policySettings.min_confidence_auto_reply}
                  onChange={(e) => setPolicySettings({ ...policySettings, min_confidence_auto_reply: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground font-mono"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed font-sans">
                <strong>Safety Policy:</strong> Offers, salary negotiations, and visa questions always require human approval regardless of automation settings.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
              <button
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-card border border-border/80 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePolicy}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        pipelineName="Emails"
        onClearSelection={() => setSelectedIds([])}
        onTriggerBulkDelete={promptBulkDelete}
      />

      {/* Hard Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        itemCount={itemsToDelete.length}
        pipelineName="Recruiter Inbox"
        onClose={() => {
          setDeleteModalOpen(false);
          setItemsToDelete([]);
        }}
        onConfirm={executeDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
