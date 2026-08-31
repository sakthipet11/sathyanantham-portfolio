'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  UserCheck,
  Building,
  Mail,
  Linkedin,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface Connection {
  id: string;
  first_name: string;
  last_name?: string;
  full_name: string;
  company: string;
  position?: string;
  location?: string;
  email?: string;
  linkedin_url?: string;
  connection_degree: string;
  connected_on?: string;
  source: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface Metrics {
  total_connections: number;
  first_degree_count: number;
  recruiters_count: number;
  unique_companies_count: number;
  with_email_count: number;
  last_ingested_at?: string;
}

export default function AdminConnectionsPage() {
  const apiHost = getApiHost();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDegree, setSelectedDegree] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState('');

  const [metrics, setMetrics] = useState<Metrics>({
    total_connections: 0,
    first_degree_count: 0,
    recruiters_count: 0,
    unique_companies_count: 0,
    with_email_count: 0
  });

  const [connections, setConnections] = useState<Connection[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 50;

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<Connection | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company: '',
    position: '',
    location: '',
    email: '',
    linkedin_url: '',
    connection_degree: '1st',
    source: 'MANUAL_ENTRY'
  });
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Selection & Delete Modal State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useLockBodyScroll(modalOpen || deleteModalOpen);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('q', searchTerm);
      if (companyFilter) params.append('company', companyFilter);
      if (selectedDegree !== 'ALL') params.append('degree', selectedDegree);
      if (selectedSource !== 'ALL') params.append('source', selectedSource);
      params.append('limit', limit.toString());
      params.append('offset', (page * limit).toString());

      const [connsResResult, metricsResResult] = await Promise.allSettled([
        fetchWithTimeout(`${apiHost}/api/v2/connections?${params.toString()}`, {}, 12000),
        fetchWithTimeout(`${apiHost}/api/v2/connections/metrics`, {}, 12000)
      ]);

      if (connsResResult.status === 'fulfilled' && connsResResult.value.ok) {
        const data = await connsResResult.value.json();
        setConnections(data.connections || []);
        setTotalCount(data.total || data.count || 0);
      }

      if (metricsResResult.status === 'fulfilled' && metricsResResult.value.ok) {
        const mData = await metricsResResult.value.json();
        if (mData.metrics) setMetrics(mData.metrics);
      }
    } catch (err) {
      console.warn('Error fetching connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [apiHost, searchTerm, selectedDegree, selectedSource, companyFilter, page]);

  const handleSyncDefaultCSV = async () => {
    try {
      setSyncing(true);
      const res = await fetch(`${apiHost}/api/v2/connections/sync-default-csv`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Successfully synced ${data.ingested_count || 0} connections from Connections.csv!`);
        fetchConnections();
      } else {
        showToast('Sync failed. Please check server logs.');
      }
    } catch (e) {
      showToast('Error syncing CSV.');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingConn(null);
    setFormData({
      first_name: '',
      last_name: '',
      company: '',
      position: '',
      location: '',
      email: '',
      linkedin_url: '',
      connection_degree: '1st',
      source: 'MANUAL_ENTRY'
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (conn: Connection) => {
    setEditingConn(conn);
    setFormData({
      first_name: conn.first_name || '',
      last_name: conn.last_name || '',
      company: conn.company || '',
      position: conn.position || '',
      location: conn.location || '',
      email: conn.email || '',
      linkedin_url: conn.linkedin_url || '',
      connection_degree: conn.connection_degree || '1st',
      source: conn.source || 'MANUAL_ENTRY'
    });
    setModalOpen(true);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.company) {
      showToast('First Name and Company are required.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingConn) {
        // Update
        const res = await fetch(`${apiHost}/api/v2/connections/${editingConn.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          showToast('Connection updated successfully!');
          setModalOpen(false);
          fetchConnections();
        }
      } else {
        // Create
        const res = await fetch(`${apiHost}/api/v2/connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          showToast('Connection created successfully!');
          setModalOpen(false);
          fetchConnections();
        }
      }
    } catch (err) {
      showToast('Failed to save connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`${apiHost}/api/v2/connections/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        showToast(`Deleted ${selectedIds.length} connections.`);
        setSelectedIds([]);
        setDeleteModalOpen(false);
        fetchConnections();
      }
    } catch (err) {
      showToast('Error deleting connections.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === connections.length && connections.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(connections.map((c) => c.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 text-xs font-mono animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="border-b border-border/80 bg-card/40 backdrop-blur-md px-6 py-5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                PROD DATABASE
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Authoritative Candidate Network
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
              <UserCheck className="w-5 h-5 text-primary" />
              Connections & Recruiter Directory
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncDefaultCSV}
              disabled={syncing}
              className="px-3.5 py-2 bg-secondary/80 hover:bg-secondary text-foreground text-xs font-mono font-medium rounded-lg border border-border flex items-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-primary' : ''}`} />
              {syncing ? 'Syncing CSV...' : 'Sync Connections.csv'}
            </button>

            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-mono font-medium rounded-lg hover:opacity-90 flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Connection
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 space-y-6">
        {/* HUD Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">TOTAL CONNECTIONS</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {metrics.total_connections}
              </span>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">1ST-DEGREE NETWORK</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {metrics.first_degree_count}
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">RECRUITERS / HR</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold font-mono text-cyan-400">
                {metrics.recruiters_count}
              </span>
              <Building className="w-4 h-4 text-cyan-400" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between">
            <span className="text-[11px] font-mono text-muted-foreground">UNIQUE COMPANIES</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold font-mono text-purple-400">
                {metrics.unique_companies_count}
              </span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between col-span-2 md:col-span-1">
            <span className="text-[11px] font-mono text-muted-foreground">WITH VERIFIED EMAIL</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold font-mono text-amber-400">
                {metrics.with_email_count}
              </span>
              <Mail className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-xl bg-card border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex-1 flex items-center gap-2 bg-background border border-border px-3 py-2 rounded-lg">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search by name, company, position, or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              className="bg-transparent border-none outline-none w-full text-foreground placeholder:text-muted-foreground/60 text-xs"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Degree Filter */}
            <select
              value={selectedDegree}
              onChange={(e) => {
                setSelectedDegree(e.target.value);
                setPage(0);
              }}
              className="bg-background border border-border px-3 py-2 rounded-lg text-xs font-mono text-foreground outline-none cursor-pointer"
            >
              <option value="ALL">All Degrees</option>
              <option value="1st">1st-Degree Network</option>
              <option value="Recruiter">Recruiters & HR</option>
              <option value="2nd">2nd-Degree</option>
            </select>

            {/* Source Filter */}
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setPage(0);
              }}
              className="bg-background border border-border px-3 py-2 rounded-lg text-xs font-mono text-foreground outline-none cursor-pointer"
            >
              <option value="ALL">All Sources</option>
              <option value="LINKEDIN_CSV">LinkedIn CSV</option>
              <option value="APIFY_RECRUITER">Apify Recruiter</option>
              <option value="APIFY_GEO_FALLBACK">Apify Geo Fallback</option>
              <option value="MANUAL_ENTRY">Manual Entry</option>
            </select>
          </div>
        </div>

        {/* Connections Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-mono text-muted-foreground">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === connections.length && connections.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5 font-medium">NAME & POSITION</th>
                  <th className="p-3.5 font-medium">COMPANY</th>
                  <th className="p-3.5 font-medium">EMAIL & PROFILE</th>
                  <th className="p-3.5 font-medium">DEGREE / SOURCE</th>
                  <th className="p-3.5 font-medium">CONNECTED ON</th>
                  <th className="p-3.5 text-right font-medium">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground font-mono text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading verified connections...
                    </td>
                  </tr>
                ) : connections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground font-mono text-xs">
                      No connections found. Click &quot;Sync Connections.csv&quot; to import verified contacts.
                    </td>
                  </tr>
                ) : (
                  connections.map((conn) => {
                    const isSelected = selectedIds.includes(conn.id);
                    return (
                      <tr
                        key={conn.id}
                        className={`hover:bg-muted/20 transition-colors ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(conn.id)}
                            className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-foreground text-xs">{conn.full_name}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {conn.position || 'Professional Contact'}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-foreground font-mono text-[11px] border border-border/80">
                            <Building className="w-3 h-3 text-muted-foreground" />
                            {conn.company}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1">
                            {conn.email ? (
                              <a
                                href={`mailto:${conn.email}`}
                                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-mono"
                              >
                                <Mail className="w-3 h-3" />
                                {conn.email}
                              </a>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60 italic font-mono">No direct email</span>
                            )}
                            {conn.linkedin_url && (
                              <a
                                href={conn.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono"
                              >
                                <Linkedin className="w-3 h-3 text-[#0a66c2]" />
                                Profile Link
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border w-fit ${
                                conn.connection_degree === '1st'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : conn.connection_degree === 'Recruiter'
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                  : 'bg-muted/40 text-muted-foreground border-border'
                              }`}
                            >
                              {conn.connection_degree === '1st' ? '1st Degree' : conn.connection_degree}
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground/70">
                              {conn.source}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                          {conn.connected_on || '—'}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(conn)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Edit Connection"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedIds([conn.id]);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Connection"
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

          {/* Pagination Footer */}
          <div className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between font-mono text-xs text-muted-foreground">
            <div>
              Showing {connections.length} of {totalCount} connections
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-2.5 py-1 bg-background border border-border rounded hover:bg-muted disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="px-2 font-medium text-foreground">Page {page + 1}</span>
              <button
                disabled={(page + 1) * limit >= totalCount}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 bg-background border border-border rounded hover:bg-muted disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={() => setDeleteModalOpen(true)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        isDeleting={isDeleting}
        itemCount={selectedIds.length}
        entityName="Connection"
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleExecuteDelete}
      />

      {/* Add / Edit Connection Modal */}
      {modalOpen && (
        <div data-lenis-prevent className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain">
          <div data-lenis-prevent className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 overscroll-contain">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                {editingConn ? 'Edit Connection' : 'Add New Connection'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConnection} className="p-6 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Company *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Position / Role</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={formData.linkedin_url}
                    onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Degree</label>
                  <select
                    value={formData.connection_degree}
                    onChange={(e) => setFormData({ ...formData, connection_degree: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-foreground outline-none focus:border-primary"
                  >
                    <option value="1st">1st Degree</option>
                    <option value="Recruiter">Recruiter / HR</option>
                    <option value="2nd">2nd Degree</option>
                  </select>
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2 rounded-lg text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : editingConn ? 'Update Contact' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
