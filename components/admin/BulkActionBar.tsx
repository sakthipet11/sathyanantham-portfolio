'use client';

import React from 'react';
import { Trash2, X, AlertTriangle, Send, Bot } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  pipelineName?: string;
  itemLabel?: string;
  onClearSelection: () => void;
  onTriggerBulkDelete?: () => void;
  onDeleteSelected?: () => void;
  onTriggerBulkApply?: () => void;
  applyingJobs?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  pipelineName,
  itemLabel,
  onClearSelection,
  onTriggerBulkDelete,
  onDeleteSelected,
  onTriggerBulkApply,
  applyingJobs = false
}) => {
  const label = itemLabel || pipelineName || 'item';
  const handleDelete = onTriggerBulkDelete || onDeleteSelected || (() => {});
  if (selectedCount <= 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-card border border-primary/40 shadow-2xl backdrop-blur-2xl animate-fade-in font-mono text-xs text-foreground flex-wrap justify-center">
      <div className="flex items-center gap-2 font-bold text-primary shrink-0">
        <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
        <span>
          {selectedCount} {label} item{selectedCount > 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="h-4 w-px bg-border/80 hidden sm:block" />

      <div className="flex items-center gap-2 flex-wrap">
        {/* Automated Auto-Apply via Playwright */}
        {onTriggerBulkApply && (
          <button
            onClick={onTriggerBulkApply}
            disabled={applyingJobs}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            title="Launch Playwright browser automation to fill and submit applications"
          >
            <Bot className={`w-3.5 h-3.5 ${applyingJobs ? 'animate-spin' : ''}`} />
            <span>{applyingJobs ? 'Auto-Applying...' : `Auto-Apply (${selectedCount})`}</span>
          </button>
        )}

        {/* 3. Delete */}
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/25 hover:bg-destructive hover:text-destructive-foreground font-semibold transition-all cursor-pointer shadow-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete ({selectedCount})</span>
        </button>

        {/* 4. Clear */}
        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Clear Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
