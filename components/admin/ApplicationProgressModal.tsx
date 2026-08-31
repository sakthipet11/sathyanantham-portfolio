/**
 * Application Progress Modal
 *
 * Real-time progress tracking for bulk job applications.
 * Shows per-job status, screenshots, and allows retry/cancel.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, Eye, ExternalLink } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface Application {
  job_id: string;
  job_title: string;
  company: string;
  status: 'QUEUED' | 'PROCESSING' | 'SUBMITTED' | 'FAILED' | 'NEEDS_REVIEW' | 'MANUAL_REQUIRED' | 'SKIPPED';
  progress_message: string;
  submitted_at?: string;
  error_message?: string;
  screenshot_url?: string;
}

interface BatchStatus {
  batch_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  total_count: number;
  completed_count: number;
  success_count: number;
  failed_count: number;
  needs_review_count: number;
  started_at?: string;
  completed_at?: string;
  applications: Application[];
}

interface ApplicationProgressModalProps {
  isOpen: boolean;
  batchId: string;
  apiHost: string;
  onClose: () => void;
  onComplete?: (results: BatchStatus) => void;
}

export function ApplicationProgressModal({
  isOpen,
  batchId,
  apiHost,
  onClose,
  onComplete
}: ApplicationProgressModalProps) {
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const hasNotifiedCompleteRef = useRef(false);

  useLockBodyScroll(isOpen || !!selectedScreenshot);

  // Reset completion flag and state when batchId changes
  useEffect(() => {
    hasNotifiedCompleteRef.current = false;
    setBatchStatus(null);
    setLoading(true);
    setCancelling(false);
    setError(null);
  }, [batchId]);

  // Sequential Polling: Fetch once, wait for response, then schedule next poll only if still active
  useEffect(() => {
    if (!isOpen || !batchId) return;

    let isMounted = true;
    let timerId: NodeJS.Timeout | null = null;

    const poll = async () => {
      try {
        const res = await fetch(`${apiHost}/api/v2/applications/batch/${batchId}/status`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch status: ${res.statusText}`);
        }

        const data: BatchStatus = await res.json();
        if (!isMounted) return;

        setBatchStatus(data);
        setLoading(false);

        const isTerminal = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(data.status);
        if (isTerminal) {
          if (!hasNotifiedCompleteRef.current) {
            hasNotifiedCompleteRef.current = true;
            onCompleteRef.current?.(data);
          }
          // Stop polling once finished
          return;
        }

        // Schedule next poll in 3 seconds only if batch is still running
        if (isMounted) {
          timerId = setTimeout(poll, 3000);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('[PROGRESS_MODAL] Error fetching status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
        setLoading(false);
        // Retry polling with backoff on error
        timerId = setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isOpen, batchId, apiHost]);

  const handleManualRefresh = async () => {
    if (!batchId) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiHost}/api/v2/applications/batch/${batchId}/status`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setBatchStatus(data);
      }
    } catch (err) {
      console.error('[PROGRESS_MODAL] Error manually refreshing:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!batchId || cancelling) return;

    try {
      setCancelling(true);
      const res = await fetch(`${apiHost}/api/v2/applications/batch/${batchId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setBatchStatus(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
        await handleManualRefresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Failed to cancel batch');
      }
    } catch (err) {
      console.error('[PROGRESS_MODAL] Error cancelling batch:', err);
      setError('Failed to cancel batch');
    } finally {
      setCancelling(false);
    }
  };

  const handleRetry = async (applicationId: string) => {
    try {
      const res = await fetch(`${apiHost}/api/v2/applications/${applicationId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_manual_mode: false })
      });

      if (res.ok) {
        handleManualRefresh();
      }
    } catch (err) {
      console.error('[PROGRESS_MODAL] Error retrying application:', err);
    }
  };

  const getStatusIcon = (status: Application['status']) => {
    switch (status) {
      case 'SUBMITTED':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'NEEDS_REVIEW':
      case 'MANUAL_REQUIRED':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'PROCESSING':
        return <RefreshCw className="w-5 h-5 text-primary animate-spin" />;
      case 'QUEUED':
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'SUBMITTED':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      case 'FAILED':
        return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'NEEDS_REVIEW':
      case 'MANUAL_REQUIRED':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'PROCESSING':
        return 'text-primary bg-primary/10 border-primary/30';
      default:
        return 'text-muted-foreground bg-muted/30 border-border';
    }
  };

  const getStatusLabel = (status: Application['status']) => {
    switch (status) {
      case 'SUBMITTED': return 'Submitted';
      case 'FAILED': return 'Failed';
      case 'NEEDS_REVIEW': return 'Needs Review';
      case 'MANUAL_REQUIRED': return 'Manual Required';
      case 'PROCESSING': return 'Processing';
      case 'QUEUED': return 'Queued';
      case 'SKIPPED': return 'Skipped';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div data-lenis-prevent className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-md overscroll-contain">
      <div data-lenis-prevent className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-card border border-border/80 shadow-2xl flex flex-col overscroll-contain">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/80 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 ${batchStatus?.status === 'PROCESSING' ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
              Application Progress
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Batch ID: {batchId.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={batchStatus?.status === 'PROCESSING'}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Summary */}
        {batchStatus && (
          <div className="p-4 sm:p-6 border-b border-border/80 bg-muted/20 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground font-mono">{batchStatus.total_count}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary font-mono">{batchStatus.completed_count}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500 font-mono">{batchStatus.success_count}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive font-mono">{batchStatus.failed_count}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500 font-mono">{batchStatus.needs_review_count}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Review</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{
                    width: `${(batchStatus.completed_count / batchStatus.total_count) * 100}%`
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-muted-foreground font-mono">
                  {Math.round((batchStatus.completed_count / batchStatus.total_count) * 100)}% complete
                </span>
                <span className={`text-xs font-semibold ${getStatusColor(batchStatus.status as any).split(' ')[0]}`}>
                  {batchStatus.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Applications List */}
        <div data-lenis-prevent className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
          {loading && !batchStatus && (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Loading batch status...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          {batchStatus && (
            <div className="space-y-3">
              {batchStatus.applications.map((app, index) => (
                <div
                  key={app.job_id}
                  className="p-4 rounded-xl bg-card/60 border border-border/80 hover:border-border transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {getStatusIcon(app.status)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm text-foreground truncate">{app.job_title}</h4>
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono ${getStatusColor(app.status)}`}>
                            {getStatusLabel(app.status)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{app.company}</p>
                        <p className="text-xs text-muted-foreground/80 mt-1 italic">{app.progress_message}</p>

                        {app.error_message && (
                          <p className="text-xs text-destructive mt-2 font-mono">
                            Error: {app.error_message}
                          </p>
                        )}

                        {app.submitted_at && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            ✓ Submitted at {new Date(app.submitted_at).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {app.screenshot_url && (
                        <button
                          onClick={() => setSelectedScreenshot(app.screenshot_url!)}
                          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition"
                          title="View screenshot"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {app.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(app.job_id)}
                          className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition"
                          title="Retry application"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-border/80 shrink-0">
          <div className="text-xs text-muted-foreground">
            {batchStatus?.status === 'PROCESSING' && 'Applications are being submitted...'}
            {batchStatus?.status === 'COMPLETED' && `✓ Batch completed with ${batchStatus.success_count} successful submissions`}
            {batchStatus?.status === 'CANCELLED' && 'Batch was cancelled'}
          </div>

          <div className="flex items-center gap-2">
            {batchStatus?.status === 'PROCESSING' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Batch'}
              </button>
            )}

            <button
              onClick={onClose}
              disabled={batchStatus?.status === 'PROCESSING' && !cancelling}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {batchStatus?.status === 'PROCESSING' ? (cancelling ? 'Cancelled' : 'Processing...') : 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div
          data-lenis-prevent
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-background/95 backdrop-blur-lg overscroll-contain"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div data-lenis-prevent className="relative max-w-6xl max-h-[90vh] overflow-auto rounded-2xl bg-card border border-border shadow-2xl overscroll-contain">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-background/80 hover:bg-background text-foreground shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedScreenshot}
              alt="Application screenshot"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
