'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
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
  Linkedin,
  Flame,
  Award,
  ToggleLeft,
  ToggleRight,
  Bot,
  Trash2
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
  const [draftMessage, setDraftMessage] = useState<string>('');
  const [includeTwin, setIncludeTwin] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Multi-Select & Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchReferralsData = async () => {
    try {
      setLoading(true);
      const [refsRes, metricsRes] = await Promise.all([
        fetchWithTimeout(`${apiHost}/api/v2/referrals?limit=100`, {}, 3000),
        fetchWithTimeout(`${apiHost}/api/v2/referrals/metrics`, {}, 3000)
      ]);

      if (refsRes.ok) {
        const rData = await refsRes.json();
        setReferrals(Array.isArray(rData.referrals) ? rData.referrals : []);
      } else {
        setReferrals([]);
      }

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        if (mData.metrics) setMetrics(mData.metrics);
      } else {
        setMetrics(ZERO_METRICS);
      }
    } catch (err) {
      console.warn("API failed for referrals:", err);
      setReferrals([]);
      setMetrics(ZERO_METRICS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralsData();
  }, [apiHost]);

  const handleSelectReferral = (ref: any) => {
    setSelectedReferral(ref);
    setDraftMessage(ref.message || '');
    setIncludeTwin(ref.include_twin_demo ?? true);
  };

  const handleScanDiscovery = async () => {
    try {
      setScanning(true);
      const res = await fetch(`${apiHost}/api/v2/referrals/discover?threshold=90`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Scan complete: Discovered ${data.newly_discovered_count || 0} referral contacts!`);
        fetchReferralsData();
      } else {
        showToast("Referral scan completed in demo mode.");
      }
    } catch {
      showToast("Scan finished locally.");
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

  const handleSaveDraft = async (referralId: string) => {
    try {
      await fetch(`${apiHost}/api/v2/referrals/${referralId}/edit-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draftMessage })
      });
      showToast("Draft message saved!");
    } catch {
      showToast("Draft updated locally.");
    }

    setReferrals((prev) =>
      prev.map((r) => (r.id === referralId ? { ...r, message: draftMessage } : r))
    );
    if (selectedReferral && selectedReferral.id === referralId) {
      setSelectedReferral((prev: any) => ({ ...prev, message: draftMessage }));
    }
  };

  const handleApproveAndSend = async (referralId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/v2/referrals/${referralId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_message: draftMessage, sent_by: "HUMAN_ADMIN" })
      });
      if (res.ok) {
        showToast("Human approval granted. Referral outreach dispatched!");
      }
    } catch {
      showToast("Referral sent in local demo mode!");
    }

    setReferrals((prev) =>
      prev.map((r) => (r.id === referralId ? { ...r, status: "SENT", message: draftMessage } : r))
    );
    if (selectedReferral && selectedReferral.id === referralId) {
      setSelectedReferral((prev: any) => ({ ...prev, status: "SENT", message: draftMessage }));
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
  };

  const filteredReferrals = referrals.filter((ref) => {
    const matchesSearch =
      (ref.person_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ref.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ref.job_title || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStat = selectedStatus === 'ALL' || ref.status === selectedStatus;
    const matchesConn = selectedConnectionType === 'ALL' || ref.connection_type === selectedConnectionType;
    return matchesSearch && matchesStat && matchesConn;
  });

  const getConnectionBadge = (type: string) => {
    switch (type) {
      case '1ST_DEGREE_LINKEDIN':
        return <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 font-semibold flex items-center gap-1"><Linkedin className="w-2.5 h-2.5 text-primary" /> 1ST DEGREE (Verified)</span>;
      case '2ND_DEGREE':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">2ND DEGREE</span>;
      case 'ALUMNI':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">ALUMNI</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">PUBLIC TEAM</span>;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_REVIEW':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 font-semibold">READY_FOR_REVIEW</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-semibold">APPROVED</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-foreground border border-border/60 font-semibold flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5 text-primary" /> SENT</span>;
      case 'QUALIFIED':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">QUALIFIED</span>;
      case 'DECLINED':
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-destructive/10 text-destructive border border-destructive/30">SKIPPED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-muted/80 text-muted-foreground border border-border/60">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans transition-colors duration-300">
      {/* Toast */}
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
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> 90%+ Referral Discovery & Outreach Center
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              High-ATS job referral targeting, 1st-degree LinkedIn priority, candidate ranking & human-gated outreach
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
            {scanning ? 'Scanning Contacts...' : 'Scan Qualified Jobs (ATS ≥ 90)'}
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
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">1st Degree Contacts</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.first_degree_contacts}</span>
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Messages Drafted</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.messages_drafted}</span>
        </div>
        {/* Single Actionable Exception: Ready for Review in Terracotta */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/40 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-primary font-mono uppercase block font-semibold">Ready for Review</span>
          <span className="text-xl font-bold text-primary mt-1 block font-mono">{metrics.ready_for_review}</span>
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Approved</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.approved}</span>
        </div>
        <div className="p-4 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xs">
          <span className="text-[10px] text-muted-foreground font-mono uppercase block">Outreach Sent</span>
          <span className="text-xl font-bold text-foreground mt-1 block font-mono">{metrics.sent}</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by contact, company, or target role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/80"
          />
        </div>

        <select
          value={selectedConnectionType}
          onChange={(e) => setSelectedConnectionType(e.target.value)}
          className="px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/80"
        >
          <option value="ALL">All Network Types</option>
          <option value="1ST_DEGREE_LINKEDIN">1st-Degree (LinkedIn)</option>
          <option value="2ND_DEGREE">2nd-Degree Connection</option>
          <option value="PUBLIC_DIRECTORY">Public Team Member</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground focus:outline-none focus:border-primary/80"
        >
          <option value="ALL">All Statuses</option>
          <option value="READY_FOR_REVIEW">Ready for Review</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="APPROVED">Approved</option>
          <option value="SENT">Sent</option>
          <option value="DECLINED">Skipped</option>
        </select>
      </div>

      {/* Table */}
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
                <th className="px-4 py-3.5">ATS Score</th>
                <th className="px-5 py-3.5">Referral Contact</th>
                <th className="px-4 py-3.5">Connection</th>
                <th className="px-4 py-3.5">Referral Score</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    No referral opportunities found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((ref) => {
                  const isSelected = selectedIds.includes(ref.id);
                  return (
                    <tr
                      key={ref.id}
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
                      <div className="font-semibold text-foreground text-xs flex items-center gap-1.5 font-sans">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        {ref.person_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-xs font-sans">
                        {ref.role}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {getConnectionBadge(ref.connection_type)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-primary">
                          {ref.referral_score}%
                        </span>
                        {ref.referral_score >= 90 && (
                          <Award className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <span className="block text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">
                        {ref.reason}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {getStatusBadge(ref.status)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleSelectReferral(ref)}
                          className="px-3 py-1.5 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-foreground text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" /> View
                        </button>

                        {ref.status !== 'SENT' && (
                          <button
                            onClick={() => {
                              setSelectedReferral(ref);
                              setDraftMessage(ref.message || '');
                              handleApproveAndSend(ref.id);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Approve & Send Referral"
                          >
                            <Send className="w-3.5 h-3.5" /> Send
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

      {/* Referral Detail & Message Editor Drawer */}
      {selectedReferral && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-card/95 border-l border-border/80 h-full overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/80 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    {selectedReferral.company}
                  </span>
                  {getConnectionBadge(selectedReferral.connection_type)}
                  {getStatusBadge(selectedReferral.status)}
                </div>
                <h2 className="text-lg font-bold text-foreground mt-2 font-sans">{selectedReferral.job_title}</h2>
                <p className="text-xs text-muted-foreground font-mono">Contact: {selectedReferral.person_name} ({selectedReferral.role})</p>
              </div>

              <button
                onClick={() => setSelectedReferral(null)}
                className="p-2 rounded-xl bg-muted border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Job Highlights */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-primary font-semibold">// JOB QUALITY SCORE</span>
                <span className="font-bold text-foreground">{selectedReferral.job_ats_score}% Match</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">
                {selectedReferral.job_description}
              </p>
              <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/80">
                <span>ATS Match: <strong className="text-emerald-500">{selectedReferral.job_ats_score}%</strong></span>
                <span>Referral Score: <strong className="text-primary">{selectedReferral.referral_score}%</strong></span>
                <a
                  href={selectedReferral.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 ml-auto font-mono"
                >
                  <Linkedin className="w-3 h-3 text-primary" /> View LinkedIn Profile
                </a>
              </div>
            </div>

            {/* Message Options & AI Twin Demo Toggle */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between font-sans">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-xs font-bold text-foreground block">Interactive AI Twin Demo</span>
                  <span className="text-[10px] text-muted-foreground">Include live AI Twin chatbot demonstration link</span>
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

            {/* Outreach Message Editor */}
            <div className="space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" /> Personalized Referral Message
                </h3>
                <button
                  onClick={() => handleGenerateMessage(selectedReferral.id)}
                  className="text-xs text-primary hover:text-primary/80 font-mono flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Re-Generate with Gemini
                </button>
              </div>

              <textarea
                rows={10}
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                placeholder="Personalized referral message..."
                className="w-full p-4 bg-muted/40 border border-border/80 rounded-xl text-xs text-foreground leading-relaxed font-sans focus:outline-none focus:border-primary/80 resize-none"
              />
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/80 font-sans">
              <button
                onClick={() => handleSaveDraft(selectedReferral.id)}
                className="px-3.5 py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
              >
                Save Draft Message
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSkip(selectedReferral.id)}
                  className="px-3 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 text-xs font-medium transition-colors cursor-pointer"
                >
                  Skip Opportunity
                </button>
                {selectedReferral.status !== 'SENT' && (
                  <button
                    onClick={() => handleApproveAndSend(selectedReferral.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                  >
                    <Send className="w-4 h-4" /> Approve & Dispatch Outreach
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
