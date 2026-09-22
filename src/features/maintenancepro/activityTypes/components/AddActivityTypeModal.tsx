'use client';

import { X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useCreateActivityType } from '../server/tanstackQuery/useActivityTypeQueries';

const T = {
  card: 'var(--card)',
  fg: 'var(--foreground)',
  mutedFg: 'var(--muted-foreground)',
  bgDeep: 'var(--muted)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryFg: 'var(--primary-foreground, #fff)',
  danger: 'var(--danger)',
  font: "'DM Sans', system-ui, sans-serif" as React.CSSProperties['fontFamily'],
};

interface AddActivityTypeModalProps {
  onClose: () => void;
  onSuccess: (newId: string) => void;
  actAsTenantId?: string;
}

export default function AddActivityTypeModal({
  onClose,
  onSuccess,
  actAsTenantId,
}: AddActivityTypeModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createActivityType = useCreateActivityType();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Task type name is required');
      return;
    }
    try {
      const created = await createActivityType.mutateAsync({ name: name.trim(), actAsTenantId });
      onSuccess(created.id);
      onClose();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to create task type'
      );
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9700,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 14,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 16px 56px rgba(0,0,0,0.3)',
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: T.fg }}>Add Task Type</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: T.bgDeep,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: T.mutedFg,
            }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <label
            htmlFor="new-activity-type-name"
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: T.fg,
              marginBottom: 7,
            }}
          >
            Task Type Name <span style={{ color: T.danger }}>*</span>
          </label>
          <input
            id="new-activity-type-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="e.g. Vibration Analysis"
            style={{
              width: '100%',
              background: T.bgDeep,
              border: `1px solid ${error ? T.danger : T.border}`,
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 13,
              color: T.fg,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && <div style={{ fontSize: 12, color: T.danger, marginTop: 6 }}>{error}</div>}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={createActivityType.isPending}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: 'transparent',
                color: T.fg,
                fontSize: 13,
                fontWeight: 600,
                cursor: createActivityType.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createActivityType.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 16px',
                borderRadius: 10,
                border: 'none',
                background: T.primary,
                color: T.primaryFg,
                fontSize: 13,
                fontWeight: 600,
                cursor: createActivityType.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {createActivityType.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
