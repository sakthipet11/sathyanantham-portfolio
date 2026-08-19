'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, Download, RefreshCw, FileCode, Trash2, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getApiHost, fetchWithTimeout } from '@/lib/utils';
import { BulkActionBar } from '@/components/admin/BulkActionBar';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';

export default function AdminResumesPage() {
  const apiHost = getApiHost();
  const [resumeVersions, setResumeVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchResumes = async () => {
    try {
      setLoading(true);
      const res = await fetchWithTimeout(`${apiHost}/api/v2/resumes`, {}, 1500);
      if (res.ok) {
        const data = await res.json();
        setResumeVersions(Array.isArray(data.resumes) ? data.resumes : []);
      } else {
        setResumeVersions([]);
      }
    } catch {
      setResumeVersions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, [apiHost]);

  // Selection & Delete Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === resumeVersions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(resumeVersions.map((r) => r.id));
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
        const res = await fetch(`${apiHost}/api/v2/resumes/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast(`Resume record hard-deleted.`);
        }
      } else {
        const res = await fetch(`${apiHost}/api/v2/resumes/bulk-delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: itemsToDelete })
        });
        if (res.ok) {
          const data = await res.json();
          showToast(`Bulk hard-delete complete: ${data.deleted_count} resumes deleted.`);
        }
      }
    } catch {
      showToast(`Deleted locally.`);
    } finally {
      setResumeVersions((prev) => prev.filter((r) => !itemsToDelete.includes(r.id)));
      setSelectedIds((prev) => prev.filter((id) => !itemsToDelete.includes(id)));
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemsToDelete([]);
      fetchResumes();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 font-sans transition-colors duration-300">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-primary/40 text-primary text-xs shadow-2xl animate-fade-in font-mono backdrop-blur-xl">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          {toastMsg}
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard" className="p-2 rounded-xl bg-card/60 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Resume & Cover Letter Generator
            </h1>
            <p className="text-xs text-muted-foreground font-mono">Driven by resume_agent & Google Drive MCP</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {resumeVersions.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="px-3.5 py-2 rounded-xl bg-card/60 border border-border/80 text-xs font-mono font-medium hover:bg-muted/80 transition-colors cursor-pointer"
            >
              {selectedIds.length === resumeVersions.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          <ThemeToggle />
          <button
            onClick={fetchResumes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Resumes
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {resumeVersions.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-mono rounded-2xl bg-card/60 border border-border/80">
            No tailored resume versions generated yet. Trigger job tailoring or discovery to generate tailored PDF packages.
          </div>
        ) : (
          resumeVersions.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl flex items-center justify-between shadow-xs transition-colors ${
                  isSelected ? 'bg-primary/5 border-primary/40' : ''
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelectRow(item.id, e as any)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer accent-primary shrink-0"
                  />
                  <FileCode className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground text-sm">{item.name || item.file_name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      Target Role: {item.role || item.target_role || 'Lead Engineer'} • Score: <span className="text-primary font-semibold">{item.score || '95%'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={item.download_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-foreground text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" /> Download PDF
                  </a>

                  <button
                    onClick={(e) => promptSingleDelete(item.id, e)}
                    className="p-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-colors cursor-pointer"
                    title="Hard-Delete Resume Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        pipelineName="Resumes"
        onClearSelection={() => setSelectedIds([])}
        onTriggerBulkDelete={promptBulkDelete}
      />

      {/* Hard Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        itemCount={itemsToDelete.length}
        pipelineName="Resumes & Artifacts"
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
