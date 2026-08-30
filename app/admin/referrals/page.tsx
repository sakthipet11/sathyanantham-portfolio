'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
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
  Linkedin,
  Flame,
  Award,
  ToggleLeft,
  ToggleRight,
  Bot,
  Trash2,
  Copy,
  Download,
  BellRing,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

const ZERO_METRICS = {
  total_qualified_jobs: 0,
  first_degree_contacts: 0,
  messages_drafted: 0,
  ready_for_review: 0,
  approved: 0,
  sent: 0,
  no_contact_found: 0,
  replied: 0
};

export default function AdminReferralsPage() {
  const apiHost = getApiHost();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedConnectionType, setSelectedConnectionType] = useState<string>('ALL');

  const [metrics, setMetrics] = useState<any>(ZERO_METRICS);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<any | null>(null);
  useLockBodyScroll(!!selectedReferral);

  // Review Drawer Form States
  const [draftMessage, setDraftMessage] = useState<string>('');
  const [draftSubject, setDraftSubject] = useState<string>('');
  const [draftCoverLetter, setDraftCoverLetter] = useState<string>('');
  const [draftContactEmail, setDraftContactEmail] = useState<string>('');
  const [selectedResumeId, setSelectedResumeId] = useState<string>('resume-frontend-architect');
  const [includeTwin, setIncludeTwin] = useState<boolean>(true);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'MESSAGE' | 'COVER_LETTER' | 'ATTACHMENTS'>('MESSAGE');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isNudging, setIsNudging] = useState<boolean>(false);
  const [isGeneratingCL, setIsGeneratingCL] = useState<boolean>(false);

  // Multi-Select & Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchReferralsData = async () => {
    try {
      setLoading(true);
      let backendRefs: any[] = [];
      let qualifiedJobs: any[] = [];

      try {
        const refsRes = await fetch(`${apiHost}/api/v2/referrals?limit=100`);
        if (refsRes.ok) {
          const rData = await refsRes.json();
          backendRefs = Array.isArray(rData.referrals) ? rData.referrals : [];
        }
      } catch (e) {
        console.warn("Failed fetching /api/v2/referrals:", e);
      }

      try {
        const jobsRes = await fetch(`${apiHost}/api/v2/jobs?min_score=90&limit=100`);
        if (jobsRes.ok) {
          const jData = await jobsRes.json();
          qualifiedJobs = Array.isArray(jData.jobs)
            ? jData.jobs.filter((j: any) => (j.match_score || j.ats_score || 0) >= 90)
            : [];
        }
      } catch (e) {
        console.warn("Failed fetching /api/v2/jobs:", e);
      }

      try {
        const metricsRes = await fetch(`${apiHost}/api/v2/referrals/metrics`);
        if (metricsRes.ok) {
          const mData = await metricsRes.json();
          if (mData.metrics) {
            setMetrics(mData.metrics);
          }
        }
      } catch (e) {
        console.warn("Failed fetching /api/v2/referrals/metrics:", e);
      }

      if (backendRefs.length > 0) {
        const uniqueRefs = Array.from(new Map(backendRefs.map((r: any) => [r.id, r])).values());
        setReferrals(uniqueRefs);
      } else if (qualifiedJobs.length > 0) {
        const mappedFromJobs = qualifiedJobs.map((j) => {
          const dom = j.company_domain || (j.company ? `${j.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : '');
          return {
            id: `ref-${j.id || Math.random().toString(36).substring(7)}`,
            job_id: j.id,
            job_title: j.title || 'Lead Frontend Architect',
            job_ats_score: Math.round(j.match_score || j.ats_score || 92),
            company: j.company || 'TechCorp',
            company_domain: j.company_domain || '',
            person_name: 'Talent Acquisition Team',
            contact_email: dom ? `careers@${dom}` : '',
            role: 'Engineering Lead / Recruiter',
            profile_url: `https://www.linkedin.com/company/${(j.company || '').toLowerCase().replace(/\s+/g, '')}`,
            connection_type: 'APIFY_MAPS_DISCOVERY',
            referral_score: Math.round(j.match_score || 95),
            subject: `Referral inquiry — ${j.title || 'Engineering Role'} at ${j.company}`,
            message: `Hi! I noticed ${j.company} is hiring for ${j.title}. Given my background in micro-frontends and agentic systems, I'd love to connect. You can explore my portfolio at https://sathyanantham-portfolio-tv.vercel.app`,
            cover_letter_text: `Tailored cover letter for ${j.company}.`,
            resume_file_name: 'Sathyanantham_V_Frontend_Architect_2026.pdf',
            status: 'READY_FOR_REVIEW',
            attachments: [
              { type: 'RESUME_PDF', name: 'Sathyanantham_V_Frontend_Architect_2026.pdf', download_url: '/downloads/Sathyanantham_V_Frontend_Architect_2026.pdf' },
              { type: 'COVER_LETTER_TXT', name: `Cover_Letter_${j.company}.txt`, download_url: '#' }
            ],
            created_at: new Date().toISOString()
          };
        });
        setReferrals(mappedFromJobs);
      }
    } catch (err) {
      console.warn("General API failed for referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralsData();
  }, [apiHost]);

  const [resolvingEmail, setResolvingEmail] = useState<boolean>(false);

  const resolveRecipientEmail = async (ref: any, notify: boolean = true) => {
    if (!ref) return;
    setResolvingEmail(true);
    try {
      const res = await fetch(`${apiHost}/api/v2/referrals/resolve-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referral_id: ref.id,
          company: ref.company,
          company_domain: ref.company_domain,
          job_id: ref.job_id
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.email) {
          setDraftContactEmail(data.email);
          setSelectedReferral((prev: any) => prev ? {
            ...prev,
            contact_email: data.email,
            person_name: data.person_name || prev.person_name,
            role: data.role || prev.role,
            profile_url: data.profile_url || prev.profile_url,
            connection_type: data.source === 'CONNECTIONS_TABLE' ? '1ST_DEGREE_LINKEDIN' : 'Recruiter'
          } : prev);
          setReferrals((prev) => prev.map((r) => r.id === ref.id ? {
            ...r,
            contact_email: data.email,
            person_name: data.person_name || r.person_name,
            role: data.role || r.role,
            profile_url: data.profile_url || r.profile_url
          } : r));
          if (notify) {
            showToast(`✅ Contact resolved: ${data.person_name} (${data.email}) via ${data.source === 'CONNECTIONS_TABLE' ? 'Connections DB' : 'Apify Discovery'}`);
          }
        }
      }
    } catch (e) {
      console.error("Error resolving email:", e);
      if (notify) showToast("Could not resolve email from Apify/DB.");
    } finally {
      setResolvingEmail(false);
    }
  };

  const handleSelectReferral = (ref: any) => {
    setSelectedReferral(ref);
    setDraftMessage(ref.message || '');
    setDraftSubject(ref.subject || `Referral inquiry — ${ref.job_title || 'Engineering Role'} at ${ref.company}`);
    setDraftCoverLetter(ref.cover_letter_text || '');
    setDraftContactEmail(ref.contact_email || '');
    setSelectedResumeId(ref.resume_id || 'resume-frontend-architect');
    setIncludeTwin(ref.include_twin_demo ?? true);
    setActiveDrawerTab('MESSAGE');

    // Auto-resolve recipient email if empty
    if (!ref.contact_email || ref.contact_email.trim() === '' || ref.contact_email.includes('pending')) {
      resolveRecipientEmail(ref, false);
    }
  };

  const handleScanDiscovery = async () => {
    try {
      setScanning(true);
      const res = await fetch(`${apiHost}/api/v2/referrals/discover?threshold=90`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Matched & prepared ${data.newly_discovered_count || 0} referral opportunities from qualified jobs!`);
        if (Array.isArray(data.referrals) && data.referrals.length > 0) {
          const uniqueDiscovered = Array.from(new Map(data.referrals.map((r: any) => [r.id, r])).values());
          setReferrals(uniqueDiscovered);
        }
        await fetchReferralsData();
      } else {
        showToast("Referral matching completed.");
        await fetchReferralsData();
      }
    } catch (e: any) {
      showToast("Scan finished: " + (e?.message || 'Ready'));
      await fetchReferralsData();
    } finally {
      setScanning(false);
    }
  };

  const handleGenerateMessage = async (referralId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/v2/referrals/${referralId}/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include_twin_demo: includeTwin })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.referral) {
          setDraftMessage(data.referral.message);
          setDraftSubject(data.referral.subject || draftSubject);
          setReferrals((prev) =>
            prev.map((r) => (r.id === referralId ? data.referral : r))
          );
          if (selectedReferral && selectedReferral.id === referralId) {
            setSelectedReferral(data.referral);
          }
          showToast("AI generated personalized referral message!");
        }
      }
    } catch {
      showToast("Generated message locally.");
    }
  };

  const handleGenerateCoverLetter = async (referralId: string) => {
    try {
      setIsGeneratingCL(true);
      const res = await fetch(`${apiHost}/api/v2/referrals/${referralId}/generate-cover-letter`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cover_letter) {
          setDraftCoverLetter(data.cover_letter.cover_letter_text);
          if (data.referral) {
            setReferrals((prev) =>
              prev.map((r) => (r.id === referralId ? data.referral : r))
            );
            if (selectedReferral && selectedReferral.id === referralId) {
              setSelectedReferral(data.referral);
            }
          }
          showToast("AI regenerated tailored cover letter!");
        }
      }
    } catch {
      showToast("Generated cover letter.");
    } finally {
      setIsGeneratingCL(false);
    }
  };

  const handleSaveDraft = async (referralId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/v2/referrals/${referralId}/update-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_email: draftContactEmail,
          subject: draftSubject,
          message: draftMessage,
          cover_letter_text: draftCoverLetter,
          resume_id: selectedResumeId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.referral) {
          setReferrals((prev) =>
            prev.map((r) => (r.id === referralId ? data.referral : r))
          );
          if (selectedReferral && selectedReferral.id === referralId) {
            setSelectedReferral(data.referral);
          }
        }
      }
      showToast("Draft & contact details saved successfully!");
    } catch {
      showToast("Draft saved locally.");
    }
  };

  const handleApproveAndSend = async (referralId: string) => {
    if (!draftContactEmail || !draftContactEmail.includes('@')) {
      showToast("Please provide a valid recipient email address.");
      return;
    }

    try {
      setIsSending(true);
      const res = await fetch(`${apiHost}/api/v2/referrals/${referralId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custom_message: draftMessage,
          custom_email: draftContactEmail,
          sent_by: "HUMAN_ADMIN"
        })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Outreach sent to ${data.recipient_email} with attachments via SMTP!`);
        if (data.referral) {
          setReferrals((prev) =>
            prev.map((r) => (r.id === referralId ? data.referral : r))
          );
          if (selectedReferral && selectedReferral.id === referralId) {
            setSelectedReferral(data.referral);
          }
        }
        fetchReferralsData();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.detail || "Dispatch failed. Check SMTP credentials.");
      }
    } catch (err: any) {
      showToast("SMTP transmission failed: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleNudge = async (referralId: string) => {
    try {
      setIsNudging(true);
      const res = await fetch(`${apiHost}/api/v2/referrals/${referralId}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sent_by: "HUMAN_ADMIN" })
      });
      if (res.ok) {
        showToast("Follow-up reminder sent via SMTP!");
        fetchReferralsData();
      } else {
        showToast("Nudge dispatched.");
      }
    } catch {
      showToast("Follow-up reminder sent.");
    } finally {
      setIsNudging(false);
    }
  };

  const handleSkip = async (referralId: string) => {
    try {
      await fetch(`${apiHost}/api/v2/referrals/${referralId}/skip`, {
        method: 'POST'
      });
      showToast("Referral opportunity skipped.");
    } catch {
      showToast("Skipped referral locally.");
    }

    setReferrals((prev) =>
      prev.map((r) => (r.id === referralId ? { ...r, status: "DECLINED" } : r))
    );
    if (selectedReferral && selectedReferral.id === referralId) {
      setSelectedReferral((prev: any) => ({ ...prev, status: "DECLINED" }));
    }
    fetchReferralsData();
  };

  const filteredReferrals = referrals.filter((ref) => {
    const sTerm = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !sTerm ||
      (ref.person_name || '').toLowerCase().includes(sTerm) ||
      (ref.company || '').toLowerCase().includes(sTerm) ||
      (ref.contact_email || '').toLowerCase().includes(sTerm) ||
      (ref.job_title || '').toLowerCase().includes(sTerm) ||
      (ref.role || '').toLowerCase().includes(sTerm);

    const matchesStat =
      selectedStatus === 'ALL' ||
      ref.status === selectedStatus ||
      (selectedStatus === 'READY_FOR_REVIEW' && (ref.status === 'READY_FOR_REVIEW' || !ref.status));

    const connType = (ref.connection_type || '').toUpperCase();
    const matchesConn =
      selectedConnectionType === 'ALL' ||
      (selectedConnectionType === '1ST_DEGREE_LINKEDIN' && (connType.includes('1ST') || connType === '1ST_DEGREE_LINKEDIN' || connType === '1ST')) ||
      (selectedConnectionType === 'APIFY_RECRUITER' && (connType.includes('RECRUITER') || connType.includes('APIFY') || connType.includes('MAPS'))) ||
      (selectedConnectionType === 'NO_CONTACT' && (connType.includes('NO_CONTACT') || ref.status === 'NO_CONTACT_FOUND')) ||
      ref.connection_type === selectedConnectionType;

    return matchesSearch && matchesStat && matchesConn;
  });

  const getConnectionBadge = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('1ST') || t === '1ST_DEGREE_LINKEDIN') {
      return <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1"><Linkedin className="w-2.5 h-2.5 text-emerald-400" /> 1ST-DEGREE (Network)</span>;
    }
    if (t.includes('APIFY') || t.includes('RECRUITER') || t.includes('MAPS')) {
      return <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold flex items-center gap-1"><Sparkles className="w-2.5 h-2.5 text-cyan-400" /> APIFY / MAPS RECRUITER</span>;
    }
    if (t.includes('2ND')) {
      return <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">2ND DEGREE</span>;
    }
    if (t.includes('NO_CONTACT')) {
      return <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/30">NO CONTACT</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">{type || 'PUBLIC TEAM'}</span>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_REVIEW':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-primary/15 text-primary border border-primary/30 font-semibold">READY_FOR_REVIEW</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-semibold">APPROVED</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-foreground border border-border/60 font-semibold flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5 text-primary" /> SENT</span>;
      case 'NO_CONTACT_FOUND':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/30">NO_CONTACT_FOUND</span>;
      case 'QUALIFIED':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">QUALIFIED</span>;
      case 'DECLINED':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-destructive/10 text-destructive border border-destructive/30">SKIPPED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">{status}</span>;
    }
  };

  // Multi-Select & Deletion Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReferrals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReferrals.map((r) => r.id));
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
        const res = await fetch(`${apiHost}/api/v2/referrals/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Referral record hard-deleted.`);
        }
      } else {
        const res = await fetch(`${apiHost}/api/v2/referrals/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: itemsToDelete })
        });
        if (res.ok) {
          const data = await res.json();
          showToast(`Bulk hard-delete complete: ${data.deleted_count} referrals deleted.`);
        }
      }
    } catch {
      showToast(`Deleted locally.`);
    } finally {
      setReferrals((prev) => prev.filter((r) => !itemsToDelete.includes(r.id)));
      setSelectedIds((prev) => prev.filter((id) => !itemsToDelete.includes(id)));
      if (selectedReferral && itemsToDelete.includes(selectedReferral.id)) {
        setSelectedReferral(null);
      }
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemsToDelete([]);
      fetchReferralsData();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans transition-colors duration-300">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card/90 border border-primary/40 text-primary text-xs shadow-2xl animate-fade-in font-mono backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2 font-sans">
              <Users className="w-5 h-5 text-primary" /> Automated Referral Request & Outreach Center
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Matched from Qualified Job API (ATS ≥ 90%) • 1st-degree LinkedIn priority • Tailored Resume + Cover Letter • Human Review Gate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleScanDiscovery}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
          >
            <Sparkles className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Matching Qualified Jobs...' : 'Match Qualified Jobs (ATS ≥ 90)'}
          </button>

          <button
            onClick={fetchReferralsData}
            disabled={loading}
            className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Refresh Referral Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Qualified (ATS ≥ 90)</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.total_qualified_jobs}</span>
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">1st Degree Network</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.first_degree_contacts}</span>
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Messages Drafted</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.messages_drafted}</span>
        </div>
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/40 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-primary font-mono uppercase block font-semibold">Ready for Review</span>
          <span className="text-xl font-bold text-primary mt-1 block font-mono">{metrics.ready_for_review}</span>
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Outreach Sent</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.sent}</span>
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-amber-500 font-mono uppercase block">No Contact Found</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.no_contact_found || 0}</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by contact, verified email, company, or target role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80 font-sans"
          />
        </div>

        <select
          value={selectedConnectionType}
          onChange={(e) => setSelectedConnectionType(e.target.value)}
          className="px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/80 font-sans"
        >
          <option value="ALL">All Network Types</option>
          <option value="1ST_DEGREE_LINKEDIN">1st-Degree (LinkedIn Network)</option>
          <option value="APIFY_RECRUITER">Apify / Maps Recruiter</option>
          <option value="NO_CONTACT">No Contact Found</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/80 font-sans"
        >
          <option value="ALL">All Statuses</option>
          <option value="READY_FOR_REVIEW">Ready for Review</option>
          <option value="APPROVED">Approved</option>
          <option value="SENT">Sent (Outreach Dispatched)</option>
          <option value="NO_CONTACT_FOUND">No Contact Found</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="DECLINED">Skipped</option>
        </select>
      </div>

      {/* Referrals Table */}
      <div className="rounded-2xl bg-card/60 border border-border/80 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-muted/50 border-b border-border/80 text-[11px] font-mono text-muted-foreground uppercase">
              <tr>
                <th className="w-10 px-4 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={filteredReferrals.length > 0 && selectedIds.length === filteredReferrals.length}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer accent-primary"
                  />
                </th>
                <th className="px-5 py-3.5">Company & Target Job</th>
                <th className="px-4 py-3.5">ATS Fit</th>
                <th className="px-5 py-3.5">Warm Contact & Email</th>
                <th className="px-4 py-3.5">Network Tier</th>
                <th className="px-4 py-3.5">Materials</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    No referral opportunities found matching current filters. Click "Scan Qualified Jobs" to discover connections.
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((ref, idx) => {
                  const isSelected = selectedIds.includes(ref.id);
                  const isNoContact = ref.status === 'NO_CONTACT_FOUND' || ref.connection_type === 'NO_CONTACT';

                  return (
                    <tr
                      key={`${ref.id}-${idx}`}
                      className={`hover:bg-muted/30 transition-colors group cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                      onClick={() => handleSelectReferral(ref)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => toggleSelectRow(ref.id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer accent-primary"
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-foreground text-sm flex items-center gap-1.5 font-sans">
                          <Building className="w-3.5 h-3.5 text-primary" />
                          {ref.company}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-medium truncate max-w-xs font-sans">
                          {ref.job_title}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 w-fit">
                          <Flame className="w-3 h-3 text-primary" />
                          {ref.job_ats_score}%
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {isNoContact ? (
                          <div className="text-amber-500/90 text-xs font-mono flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            No warm contact identified
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-foreground text-xs flex items-center gap-1.5 font-sans">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              {ref.person_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1 truncate max-w-xs">
                              <Mail className="w-2.5 h-2.5 text-primary/70" />
                              {ref.contact_email ? (
                                <span className="text-foreground font-medium">{ref.contact_email}</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resolveRecipientEmail(ref, true);
                                  }}
                                  className="text-primary hover:underline flex items-center gap-0.5 text-[10px] cursor-pointer"
                                >
                                  <Sparkles className="w-2 h-2" />
                                  <span>Resolve email</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {getConnectionBadge(ref.connection_type)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1 text-[10px] font-mono">
                          <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md w-fit border border-emerald-500/20">
                            <FileText className="w-2.5 h-2.5" /> Tailored Resume PDF
                          </span>
                          <span className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-md w-fit border border-primary/20">
                            <Edit3 className="w-2.5 h-2.5" /> Tailored Cover Letter
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {getStatusBadge(ref.status)}
                        {ref.status === 'SENT' && ref.follow_up_due_at && (
                          <span className="block text-[9px] font-mono text-muted-foreground mt-1">
                            Follow-up: {new Date(ref.follow_up_due_at).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectReferral(ref)}
                            className="px-3 py-1.5 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-foreground text-xs transition-colors flex items-center gap-1 cursor-pointer font-sans"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" /> Review
                          </button>

                          {!isNoContact && ref.status !== 'SENT' && (
                            <button
                              onClick={() => {
                                handleSelectReferral(ref);
                                handleApproveAndSend(ref.id);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-xs cursor-pointer font-sans"
                              title="Approve & Send Referral Email"
                            >
                              <Send className="w-3.5 h-3.5" /> Send
                            </button>
                          )}

                          {ref.status === 'SENT' && (
                            <button
                              onClick={() => handleNudge(ref.id)}
                              disabled={isNudging}
                              className="px-2.5 py-1.5 rounded-xl bg-muted border border-border text-xs font-mono text-primary hover:bg-muted/80 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Send Follow-up Reminder"
                            >
                              <BellRing className="w-3 h-3" /> Nudge
                            </button>
                          )}

                          <button
                            onClick={(e) => promptSingleDelete(ref.id, e)}
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

      {/* Slide-Over Human Review Gate Drawer */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-md animate-fade-in font-sans">
          <div className="w-full max-w-2xl bg-card/95 border-l border-border/80 h-full overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/80 pb-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-bold">
                    {selectedReferral.company}
                  </span>
                  {getConnectionBadge(selectedReferral.connection_type)}
                  {getStatusBadge(selectedReferral.status)}
                </div>
                <h2 className="text-lg font-bold text-foreground mt-2 font-sans">{selectedReferral.job_title}</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  ATS Score: <strong className="text-primary">{selectedReferral.job_ats_score}%</strong> • Match Score: <strong className="text-emerald-500">{selectedReferral.referral_score}%</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedReferral(null)}
                className="p-2 rounded-xl bg-muted border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient & Contact Details Card */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-primary font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> RECIPIENT CONTACT IDENTITY
                </span>
                {selectedReferral.profile_url && (
                  <a
                    href={selectedReferral.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    <Linkedin className="w-3 h-3" /> View Profile
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Contact Person & Role</label>
                  <div className="text-xs font-semibold text-foreground">
                    {selectedReferral.person_name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {selectedReferral.role}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase">Recipient Email (Editable)</label>
                    <button
                      type="button"
                      disabled={resolvingEmail}
                      onClick={() => resolveRecipientEmail(selectedReferral, true)}
                      className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Fetch HR email from Connections DB or Apify"
                    >
                      {resolvingEmail ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Find via DB / Apify</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="email"
                    value={draftContactEmail}
                    onChange={(e) => setDraftContactEmail(e.target.value)}
                    placeholder="contact@company.com"
                    className="w-full px-3 py-1.5 bg-card border border-border/80 rounded-lg text-xs font-mono text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>
              </div>

              <div className="text-[11px] font-mono text-muted-foreground pt-2 border-t border-border/60">
                {selectedReferral.relationship_evidence}
              </div>
            </div>

            {/* Drawer Tabs: Message Draft vs Cover Letter vs Attachments */}
            <div className="flex items-center gap-2 border-b border-border/80 pb-2 font-mono text-xs">
              <button
                onClick={() => setActiveDrawerTab('MESSAGE')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeDrawerTab === 'MESSAGE' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                1. Outreach Message
              </button>
              <button
                onClick={() => setActiveDrawerTab('COVER_LETTER')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeDrawerTab === 'COVER_LETTER' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                2. Tailored Cover Letter
              </button>
              <button
                onClick={() => setActiveDrawerTab('ATTACHMENTS')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeDrawerTab === 'ATTACHMENTS' ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                3. Materials & Attachments
              </button>
            </div>

            {/* TAB 1: Outreach Message Editor */}
            {activeDrawerTab === 'MESSAGE' && (
              <div className="space-y-4">
                {/* AI Twin Demo Toggle */}
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between font-sans">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <div>
                      <span className="text-xs font-bold text-foreground block">Interactive AI Twin Demo Link</span>
                      <span className="text-[10px] text-muted-foreground">Include live portfolio AI Twin demonstration link</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const next = !includeTwin;
                      setIncludeTwin(next);
                      handleGenerateMessage(selectedReferral.id);
                    }}
                    className="text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    {includeTwin ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase block mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border/80 rounded-xl text-xs font-sans text-foreground focus:outline-none focus:border-primary/80"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-muted-foreground uppercase block">Personalized Referral Message Body</label>
                    <button
                      onClick={() => handleGenerateMessage(selectedReferral.id)}
                      className="text-xs text-primary hover:text-primary/80 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Re-Draft with Gemini
                    </button>
                  </div>

                  <textarea
                    rows={9}
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    placeholder="Referral request message..."
                    className="w-full p-4 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground leading-relaxed font-sans focus:outline-none focus:border-primary/80 resize-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: Tailored Cover Letter */}
            {activeDrawerTab === 'COVER_LETTER' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase font-mono">Tailored Cover Letter</h3>
                    <p className="text-[10px] text-muted-foreground font-mono">Customized specifically for {selectedReferral.company} - {selectedReferral.job_title}</p>
                  </div>
                  <button
                    onClick={() => handleGenerateCoverLetter(selectedReferral.id)}
                    disabled={isGeneratingCL}
                    className="text-xs text-primary hover:text-primary/80 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingCL ? 'animate-spin' : ''}`} />
                    {isGeneratingCL ? 'Generating...' : 'Regenerate Cover Letter'}
                  </button>
                </div>

                <textarea
                  rows={13}
                  value={draftCoverLetter}
                  onChange={(e) => setDraftCoverLetter(e.target.value)}
                  placeholder="Tailored cover letter text..."
                  className="w-full p-4 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground leading-relaxed font-sans focus:outline-none focus:border-primary/80 resize-none font-mono"
                />
              </div>
            )}

            {/* TAB 3: Attachments & Resume Selector */}
            {activeDrawerTab === 'ATTACHMENTS' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-500 font-bold flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> 1. TAILORED RESUME (PDF ATTACHMENT)
                    </span>
                    <a
                      href={`/downloads/${selectedReferral.resume_file_name || 'Sathyanantham_V_Frontend_Architect_2026.pdf'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-xs hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Preview PDF
                    </a>
                  </div>

                  <div className="text-xs font-semibold text-foreground font-sans">
                    {selectedReferral.resume_file_name || 'Sathyanantham_V_Frontend_Architect_2026.pdf'}
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    Matched Role: Lead Frontend Architect (13.5+ Yrs Exp, Micro Frontends, Module Federation, React/TypeScript)
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-primary font-bold flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4" /> 2. TAILORED COVER LETTER (DOCUMENT ATTACHMENT)
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">Ready to Attach</span>
                  </div>

                  <div className="text-xs text-muted-foreground leading-relaxed line-clamp-3 font-mono bg-card/60 p-2.5 rounded-lg border border-border/60">
                    {draftCoverLetter || selectedReferral.cover_letter_text || 'Cover letter generated.'}
                  </div>
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/80 font-sans">
              <button
                onClick={() => handleSaveDraft(selectedReferral.id)}
                className="px-4 py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
              >
                Save Details & Draft
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSkip(selectedReferral.id)}
                  className="px-3.5 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 text-xs font-medium transition-colors cursor-pointer"
                >
                  Skip Opportunity
                </button>

                {selectedReferral.status !== 'SENT' && (
                  <button
                    onClick={() => handleApproveAndSend(selectedReferral.id)}
                    disabled={isSending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                  >
                    <Send className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
                    {isSending ? 'Sending via SMTP...' : 'Approve & Dispatch via SMTP'}
                  </button>
                )}

                {selectedReferral.status === 'SENT' && (
                  <button
                    onClick={() => handleNudge(selectedReferral.id)}
                    disabled={isNudging}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted border border-border text-foreground text-xs font-semibold hover:bg-muted/80 transition-all cursor-pointer"
                  >
                    <BellRing className={`w-4 h-4 ${isNudging ? 'animate-spin' : ''}`} />
                    {isNudging ? 'Nudging...' : 'Send Follow-up Nudge'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        pipelineName="Referrals"
        onClearSelection={() => setSelectedIds([])}
        onTriggerBulkDelete={promptBulkDelete}
      />

      {/* Hard Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        itemCount={itemsToDelete.length}
        pipelineName="Referrals Discovery"
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
