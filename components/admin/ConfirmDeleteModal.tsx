'use client';

import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  itemCount: number;
  pipelineName?: string;
  itemLabel?: string;
  entityName?: string;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  itemCount,
  pipelineName,
  itemLabel,
  entityName,
  onClose,
  onCancel,
  onConfirm,
  isDeleting = false
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const label = itemLabel || entityName || pipelineName || 'item';
  const handleModalClose = onClose || onCancel || (() => {});
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  const isBulk = itemCount > 1;

  const handleConfirm = () => {
    if (isDeleting) return;
    onConfirm();
    setConfirmInput('');
  };

  const handleClose = () => {
    setConfirmInput('');
    handleModalClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="w-full max-w-md bg-card/95 border border-destructive/40 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl space-y-5">
        <div className="flex items-start justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
                {isBulk ? `Confirm Bulk Hard-Delete (${itemCount})` : `Confirm Single Hard-Delete`}
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Target: {label}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-xs space-y-2 font-mono">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>Destructive Action Warning</span>
          </div>
          <p className="font-sans text-muted-foreground">
            You are about to permanently remove <span className="font-bold text-foreground font-mono">{itemCount} {label}{itemCount > 1 ? 's' : ''}</span> from the database. This action cannot be undone.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer font-mono"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all shadow-xs cursor-pointer ${
              isDeleting
                ? 'bg-muted text-muted-foreground border border-border/60 cursor-not-allowed opacity-50'
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Deleting...' : `Confirm Hard-Delete (${itemCount})`}
          </button>
        </div>
      </div>
    </div>
  );
};
