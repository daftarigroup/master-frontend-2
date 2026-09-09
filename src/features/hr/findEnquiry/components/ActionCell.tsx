'use client';

import { IconEye } from '@tabler/icons-react';
import type React from 'react';
import { memo } from 'react';
import type { Candidate } from '../types/types';

export const ActionCell: React.FC<{
  candidate: Candidate;
  onView: () => void;
  onUpdate: () => void;
}> = memo(function ActionCell({ candidate, onView, onUpdate }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onView}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted-foreground/10"
      >
        <IconEye className="h-3.5 w-3.5" />
        View
      </button>

      <button
        type="button"
        onClick={onUpdate}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-primary/30 bg-primary/8 px-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
      >
        {candidate.status === 'joined' ? 'Actions' : 'Update'}
      </button>
    </div>
  );
});
