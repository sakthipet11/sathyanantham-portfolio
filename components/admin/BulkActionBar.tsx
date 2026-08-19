'use client';

import React from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  pipelineName: string;
  onClearSelection: () => void;
  onTriggerBulkDelete: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  pipelineName,
  onClearSelection,
  onTriggerBulkDelete
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-3.5 rounded-2xl bg-card border border-primary/50 shadow-2xl backdrop-blur-2xl animate-fade-in font-mono text-xs text-foreground">
      <div className="flex items-center gap-2 font-bold text-primary">
        <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
        <span>
          {selectedCount} {pipelineName} item{selectedCount > 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="h-4 w-px bg-border/80" />

      <div className="flex items-center gap-2">
        <button
          onClick={onTriggerBulkDelete}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 transition-all cursor-pointer shadow-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Selected ({selectedCount})
        </button>

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
