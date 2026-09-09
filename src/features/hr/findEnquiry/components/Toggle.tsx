'use client';

import type React from 'react';
import { memo } from 'react';

export const Toggle: React.FC<{ on: boolean; onChange: () => void; disabled?: boolean }> = memo(
  function Toggle({ on, onChange, disabled }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={disabled ? undefined : onChange}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${disabled ? 'cursor-not-allowed opacity-35' : 'cursor-pointer'} ${on && !disabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </button>
    );
  }
);
