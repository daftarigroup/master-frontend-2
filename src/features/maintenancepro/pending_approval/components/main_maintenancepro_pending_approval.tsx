'use client';

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { WorkOrder } from '../../unique_task/server/api/workordersApi';
import {
  useApproveWorkOrder,
  useRejectWorkOrder,
  useWorkOrders,
} from '../../unique_task/server/tanstackQuery/useWorkOrdersQueries';
import { toFirmParam } from '../../shared/lib/common';
import { CheckCircle2, Eye } from 'lucide-react';

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  primaryFg: 'var(--primary-foreground, #fff)' as string,
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  warning: 'var(--warning)',
  warningBg: 'color-mix(in oklch, var(--warning) 14%, transparent)',
  danger: 'var(--danger, var(--destructive, #ef4444))',
  dangerBg: 'color-mix(in oklch, var(--danger, var(--destructive, #ef4444)) 14%, transparent)',
  info: 'oklch(0.488 0.243 264.376)',
  infoBg: 'oklch(0.488 0.243 264.376 / 0.14)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

// ── Icons ──────────────────────────────────────────────────────────────────────
const Ico = {
  check: (s = 16) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  x: (s = 16) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  eye: (s = 16) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  clock: (s = 16) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  refresh: (s = 16) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  history: (s = 16) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  review: (s = 16) => (
    <svg
      aria-hidden="true"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="12" y2="17" />
    </svg>
  ),
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtDateTime = (val: string | null | undefined): string => {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const fmtDate = (val: string | null | undefined): string => {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function Chip({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.4,
        color,
        background: bg,
      }}
    >
      {children}
    </span>
  );
}

function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'ghost' | 'outline';
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const map: Record<string, React.CSSProperties> = {
    primary: { background: T.primary, color: T.primaryFg, border: 'none' },
    success: { background: T.success, color: '#fff', border: 'none' },
    danger: { background: T.danger, color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: T.mutedFg, border: `1px solid ${T.border}` },
    outline: { background: 'transparent', color: T.fg, border: `1px solid ${T.border}` },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: T.font,
        transition: 'opacity .15s',
        ...map[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'warning' | 'error';
function Toast({
  message,
  type,
  onDone,
}: {
  message: string;
  type: ToastType;
  onDone: () => void;
}) {
  const colors: Record<ToastType, string> = {
    success: T.success,
    warning: T.warning,
    error: T.danger,
  };
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,.18)',
        fontFamily: T.font,
        fontSize: 13,
      }}
    >
      <div
        style={{ width: 6, height: 6, borderRadius: 3, background: colors[type], flexShrink: 0 }}
      />
      {message}
      <button
        type="button"
        onClick={onDone}
        style={{
          marginLeft: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: T.mutedFg,
          display: 'flex',
        }}
      >
        {Ico.x(12)}
      </button>
    </div>
  );
}

// ── Review modal (choose approve / reject with optional note) ──────────────────
function ReviewModal({
  order,
  onConfirm,
  onClose,
  isLoading,
}: {
  order: WorkOrder;
  onConfirm: (note: string, action: 'approve' | 'reject') => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [note, setNote] = useState('');
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.55)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 12 : 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 14,
          padding: isMobile ? '18px 16px' : '28px 32px',
          maxWidth: 480,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: T.font,
          boxShadow: '0 12px 48px rgba(0,0,0,.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
          }}
        >
          <h2 style={{ fontSize: 17, fontWeight: 700, color: T.fg, margin: 0 }}>
            Review Work Order
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: T.muted,
              border: `1px solid ${T.border}`,
              borderRadius: 7,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: T.mutedFg,
            }}
          >
            {Ico.x(13)}
          </button>
        </div>

        <div style={{ fontSize: 13, color: T.mutedFg, marginBottom: 16 }}>
          <strong style={{ color: T.fg }}>
            {order.plan?.title ?? `Work Order #${order.id.slice(-6)}`}
          </strong>
          {' · '}
          {order.machine?.name ?? '—'}
        </div>

        {/* Submitted by / completed at */}
        {order.approvalRequest && (
          <div
            style={{
              background: T.muted,
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 12,
              color: T.mutedFg,
            }}
          >
            <div>
              <span style={{ fontWeight: 600 }}>Submitted by:</span>{' '}
              {order.approvalRequest.submittedBy?.name ?? order.completedBy?.name ?? '—'}
            </div>
            <div>
              <span style={{ fontWeight: 600 }}>Completed at:</span>{' '}
              {fmtDateTime(order.completedAt ?? order.approvalRequest?.requestedAt)}
            </div>
            {order.approvalRequest.submissionNote && (
              <div style={{ marginTop: 6 }}>
                <span style={{ fontWeight: 600 }}>Technician note:</span>{' '}
                {order.approvalRequest.submissionNote}
              </div>
            )}
          </div>
        )}

        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: T.mutedFg,
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}
          htmlFor="review-note"
        >
          Admin note <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
        </label>
        <textarea
          id="review-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for the technician…"
          rows={3}
          style={{
            width: '100%',
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.bg,
            color: T.fg,
            padding: '10px 12px',
            fontSize: 13,
            fontFamily: T.font,
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 10,
            marginTop: 20,
            justifyContent: 'flex-end',
          }}
        >
          <Btn
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            style={isMobile ? { width: '100%', justifyContent: 'center' } : undefined}
          >
            Cancel
          </Btn>
          <Btn
            variant="danger"
            onClick={() => onConfirm(note, 'reject')}
            disabled={isLoading}
            style={isMobile ? { width: '100%', justifyContent: 'center' } : undefined}
          >
            {Ico.x(14)}
            {isLoading ? 'Rejecting…' : 'Reject'}
          </Btn>
          <Btn
            variant="success"
            onClick={() => onConfirm(note, 'approve')}
            disabled={isLoading}
            style={isMobile ? { width: '100%', justifyContent: 'center' } : undefined}
          >
            {Ico.check(14)}
            {isLoading ? 'Approving…' : 'Approve'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Detail modal ───────────────────────────────────────────────────────────────
function DetailModal({ order, onClose }: { order: WorkOrder; onClose: () => void }) {
  const ar = order.approvalRequest;
  const isApproved = ar?.status === 'APPROVED';
  const isRejected = ar?.status === 'REJECTED';
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.55)',
        zIndex: 9500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 12 : 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 14,
          padding: isMobile ? '18px 16px' : '28px 32px',
          maxWidth: 620,
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          fontFamily: T.font,
          boxShadow: '0 12px 48px rgba(0,0,0,.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                color: T.mutedFg,
                margin: '0 0 4px',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                fontWeight: 600,
              }}
            >
              Work Order Details
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: T.fg, margin: 0 }}>
              {order.plan?.title ?? `Work Order #${order.id.slice(-6)}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: T.muted,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: T.mutedFg,
            }}
          >
            {Ico.x(14)}
          </button>
        </div>

        {/* Status chip */}
        <div style={{ marginBottom: 20 }}>
          {ar?.status === 'PENDING' && (
            <Chip color={T.warning} bg={T.warningBg}>
              {Ico.clock(11)} Awaiting Approval
            </Chip>
          )}
          {isApproved && (
            <Chip color={T.success} bg={T.successBg}>
              {Ico.check(11)} Approved
            </Chip>
          )}
          {isRejected && (
            <Chip color={T.danger} bg={T.dangerBg}>
              {Ico.x(11)} Rejected
            </Chip>
          )}
        </div>

        {/* Task info grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '14px 24px',
            marginBottom: 18,
          }}
        >
          {[
            {
              label: 'Machine',
              value: order.machine
                ? `${order.machine.name}${order.machine.assetCode ? ` (${order.machine.assetCode})` : ''}`
                : '—',
            },
            { label: 'Assignee', value: order.currentAssignee?.name ?? 'Unassigned' },
            { label: 'Due Date', value: fmtDate(order.actualDueDate) },
            { label: 'Activity Type', value: order.plan?.activityType?.name ?? '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.06em',
                  color: T.mutedFg,
                  textTransform: 'uppercase',
                  marginBottom: 3,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Completion section ── */}
        <div
          style={{
            background: T.muted,
            borderRadius: 10,
            padding: isMobile ? '12px 14px' : '14px 16px',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '.06em',
              color: T.mutedFg,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Completion Details
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '10px 24px',
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600, marginBottom: 2 }}>
                Completed By
              </div>
              <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>
                {ar?.submittedBy?.name ?? order.completedBy?.name ?? '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600, marginBottom: 2 }}>
                Completed At
              </div>
              <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>
                {fmtDateTime(order.completedAt ?? order.approvalRequest?.requestedAt)}
              </div>
            </div>
          </div>
          {ar?.submissionNote && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600, marginBottom: 4 }}>
                Technician Note
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: T.fg,
                  lineHeight: 1.5,
                  background: T.card,
                  borderRadius: 6,
                  padding: '8px 12px',
                }}
              >
                {ar.submissionNote}
              </div>
            </div>
          )}
        </div>

        {/* ── Replacement Details ── */}
        {(() => {
          const replacements = order.checklistResponses?.replacements ?? [];
          if (replacements.length === 0) return null;
          const totalCost = replacements.reduce((sum, r) => sum + r.cost * r.quantity, 0);
          return (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.06em',
                  color: T.mutedFg,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Replacement Details
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div
                  style={{
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    overflow: 'hidden',
                    minWidth: isMobile ? 340 : undefined,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 80px 90px',
                      background: T.muted,
                      padding: '7px 14px',
                      gap: 8,
                    }}
                  >
                    {['Item Name', 'Qty', 'Cost (₹)'].map((h) => (
                      <div
                        key={h}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '.06em',
                          color: T.mutedFg,
                          textTransform: 'uppercase',
                        }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>
                  {replacements.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 80px 90px',
                        padding: '8px 14px',
                        gap: 8,
                        borderTop: `1px solid ${T.border}`,
                        background:
                          i % 2 === 0 ? T.card : `color-mix(in oklch, ${T.card} 90%, ${T.muted})`,
                      }}
                    >
                      <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>{r.name}</div>
                      <div style={{ fontSize: 13, color: T.fg }}>{r.quantity}</div>
                      <div style={{ fontSize: 13, color: T.fg }}>
                        ₹{r.cost.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 80px 90px',
                      padding: '8px 14px',
                      gap: 8,
                      borderTop: `1px solid ${T.border}`,
                      background: T.muted,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.fg }}>Total</div>
                    <div />
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.primary }}>
                      ₹{totalCost.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Admin review section ── */}
        {(isApproved || isRejected) && ar && (
          <div
            style={{
              background: isApproved ? T.successBg : T.dangerBg,
              borderRadius: 10,
              padding: isMobile ? '12px 14px' : '14px 16px',
              marginBottom: 16,
              border: `1px solid ${isApproved ? T.success : T.danger}`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '.06em',
                color: isApproved ? T.success : T.danger,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              {isApproved ? 'Approved by Admin' : 'Rejected by Admin'}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '10px 24px',
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600, marginBottom: 2 }}>
                  Reviewed By
                </div>
                <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>
                  {ar.reviewedBy?.name ?? ar.reviewer?.name ?? '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600, marginBottom: 2 }}>
                  {isApproved ? 'Approved At' : 'Rejected At'}
                </div>
                <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>
                  {fmtDateTime(ar.reviewedAt)}
                </div>
              </div>
            </div>
            {ar.reviewNote && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: T.mutedFg, fontWeight: 600, marginBottom: 4 }}>
                  Admin Note
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: T.fg,
                    lineHeight: 1.5,
                    background: 'rgba(255,255,255,0.5)',
                    borderRadius: 6,
                    padding: '8px 12px',
                  }}
                >
                  {ar.reviewNote}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variant="ghost" onClick={onClose}>
            Close
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Row component ──────────────────────────────────────────────────────────────
function PendingRow({
  wo,
  onReview,
  onView,
  isMobile,
}: {
  wo: WorkOrder;
  onReview: (wo: WorkOrder) => void;
  onView: (wo: WorkOrder) => void;
  isMobile: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '135px 2fr 1fr 1fr 1fr 1fr',
        gap: 0,
        minWidth: isMobile ? 760 : undefined,
        padding: isMobile ? '12px 16px' : '14px 20px',
        borderBottom: `1px solid ${T.border}`,
        background: T.card,
        alignItems: 'center',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `color-mix(in oklch, ${T.primary} 4%, ${T.card})`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.card;
      }}
    >
      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          title="View details"
          onClick={() => onView(wo)}
          style={{
            width: 30,
            height: 30,
            borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: T.muted,
            color: T.mutedFg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all .15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.primaryBg;
            e.currentTarget.style.color = T.primary;
            e.currentTarget.style.borderColor = T.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = T.muted;
            e.currentTarget.style.color = T.mutedFg;
            e.currentTarget.style.borderColor = T.border;
          }}
        >
          <Eye size={14} />
        </button>
        <button
          type="button"
          title="Review & Approve Work Order"
          onClick={() => onReview(wo)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            background: 'color-mix(in oklch, var(--success) 14%, transparent)',
            color: 'var(--success)',
            border: '1px solid color-mix(in oklch, var(--success) 45%, transparent)',
            cursor: 'pointer',
            fontFamily: T.font,
            transition: 'all .18s ease',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--success)';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = 'var(--success)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 3px 8px rgba(16, 185, 129, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'color-mix(in oklch, var(--success) 14%, transparent)';
            e.currentTarget.style.color = 'var(--success)';
            e.currentTarget.style.borderColor = 'color-mix(in oklch, var(--success) 45%, transparent)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
          }}
        >
          <CheckCircle2 size={14} />
          <span>Approve</span>
        </button>
      </div>

      {/* Task name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>
          {wo.plan?.title ?? `Work Order #${wo.id.slice(-6)}`}
        </div>
        {wo.plan?.activityType && (
          <div
            style={{
              fontSize: 10,
              color: T.mutedFg,
              textTransform: 'uppercase',
              letterSpacing: '.04em',
            }}
          >
            {wo.plan.activityType.name}
          </div>
        )}
      </div>

      {/* Machine */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.fg }}>{wo.machine?.name ?? '—'}</div>
        {wo.machine?.assetCode && (
          <div style={{ fontSize: 10, color: T.mutedFg, fontFamily: 'monospace' }}>
            {wo.machine.assetCode}
          </div>
        )}
      </div>

      {/* Submitted by */}
      <div style={{ fontSize: 13, color: T.fg }}>
        {wo.approvalRequest?.submittedBy?.name ?? wo.completedBy?.name ?? '—'}
      </div>

      {/* Completed at */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 12, color: T.fg }}>
          {fmtDate(wo.completedAt ?? wo.approvalRequest?.requestedAt)}
        </div>
        <div style={{ fontSize: 10, color: T.mutedFg }}>
          {(wo.completedAt ?? wo.approvalRequest?.requestedAt)
            ? new Date((wo.completedAt ?? wo.approvalRequest?.requestedAt)!).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : '—'}
        </div>
      </div>

      {/* Due date */}
      <div style={{ fontSize: 12, color: T.mutedFg }}>{fmtDate(wo.actualDueDate)}</div>
    </div>
  );
}

function HistoryRow({
  wo,
  onView,
  isMobile,
}: {
  wo: WorkOrder;
  onView: (wo: WorkOrder) => void;
  isMobile: boolean;
}) {
  const ar = wo.approvalRequest;
  const isApproved = ar?.status === 'APPROVED';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '50px 2fr 1fr 1fr 1fr 1fr 1fr',
        gap: 0,
        minWidth: isMobile ? 780 : undefined,
        padding: isMobile ? '12px 16px' : '14px 20px',
        borderBottom: `1px solid ${T.border}`,
        background: T.card,
        alignItems: 'center',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `color-mix(in oklch, ${T.primary} 4%, ${T.card})`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.card;
      }}
    >
      {/* Actions */}
      <div>
        <ActionBtn
          title="View details"
          color={T.primary}
          bg={T.primaryBg}
          onClick={() => onView(wo)}
        >
          {Ico.eye(13)}
        </ActionBtn>
      </div>

      {/* Task name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>
          {wo.plan?.title ?? `Work Order #${wo.id.slice(-6)}`}
        </div>
        {wo.machine?.name && (
          <div style={{ fontSize: 11, color: T.mutedFg }}>{wo.machine.name}</div>
        )}
      </div>

      {/* Submitted by */}
      <div style={{ fontSize: 12, color: T.fg }}>
        {ar?.submittedBy?.name ?? wo.completedBy?.name ?? '—'}
      </div>

      {/* Completed at */}
      <div style={{ fontSize: 12, color: T.fg }}>
        {fmtDateTime(wo.completedAt ?? wo.approvalRequest?.requestedAt)}
      </div>

      <div style={{ fontSize: 12, color: T.fg }}>
        {ar?.reviewedBy?.name ?? ar?.reviewer?.name ?? '—'}
      </div>

      {/* Reviewed at */}
      <div style={{ fontSize: 12, color: T.fg }}>{fmtDateTime(ar?.reviewedAt)}</div>

      {/* Status */}
      <div>
        {isApproved ? (
          <Chip color={T.success} bg={T.successBg}>
            {Ico.check(11)} Approved
          </Chip>
        ) : (
          <Chip color={T.danger} bg={T.dangerBg}>
            {Ico.x(11)} Rejected
          </Chip>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  title,
  color,
  bg,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: `1px solid ${T.border}`,
        background: T.muted,
        color: T.mutedFg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all .15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = bg;
        e.currentTarget.style.color = color;
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.muted;
        e.currentTarget.style.color = T.mutedFg;
        e.currentTarget.style.borderColor = T.border;
      }}
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function MainPendingApproval() {
  const { effectivePermittedFirms, selectedProject } = useProject();
  const queryFirmId = toFirmParam(selectedProject);

  const requireCompanySelected = useRequireCompanySelected();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [reviewModal, setReviewModal] = useState<WorkOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<WorkOrder | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warning' | 'error' } | null>(
    null
  );

  const showToast = useCallback(
    (msg: string, type: 'success' | 'warning' | 'error' = 'success') => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), 3500);
    },
    []
  );

  // Fetch pending approvals
  const {
    data: pendingData,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = useWorkOrders({
    status: 'PENDING_APPROVAL',
    // the server returns only what this user may approve: the ones they are responsible for (an admin sees all but their own work)
    pendingMyApproval: true,
    limit: 100,
    ...(queryFirmId ? { firmId: queryFirmId } : {}),
  });

  // Fetch history (approved/rejected — completed and completion_rejected)
  const {
    data: historyCompleted,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useWorkOrders({
    status: 'COMPLETED',
    limit: 100,
    ...(queryFirmId ? { firmId: queryFirmId } : {}),
  });
  const { data: historyLate } = useWorkOrders({
    status: 'COMPLETED_LATE',
    limit: 100,
    ...(queryFirmId ? { firmId: queryFirmId } : {}),
  });
  const { data: historyRejected } = useWorkOrders({
    status: 'COMPLETION_REJECTED',
    limit: 100,
    ...(queryFirmId ? { firmId: queryFirmId } : {}),
  });

  const pendingOrders: WorkOrder[] = useMemo(() => {
    return filterByFirmAccess(pendingData?.data ?? [], effectivePermittedFirms);
  }, [pendingData?.data, effectivePermittedFirms]);

  const historyOrders: WorkOrder[] = useMemo(() => {
    const all: WorkOrder[] = [
      ...(historyCompleted?.data ?? []),
      ...(historyLate?.data ?? []),
      ...(historyRejected?.data ?? []),
    ];
    // Only show those that went through approval
    return filterByFirmAccess(
      all.filter((wo) => wo.approvalRequest !== null),
      effectivePermittedFirms
    ).sort((a, b) => {
      const aTime = a.approvalRequest?.reviewedAt ?? a.completedAt ?? '';
      const bTime = b.approvalRequest?.reviewedAt ?? b.completedAt ?? '';
      return bTime.localeCompare(aTime);
    });
  }, [historyCompleted, historyLate, historyRejected, effectivePermittedFirms]);

  const approveMutation = useApproveWorkOrder();
  const rejectMutation = useRejectWorkOrder();

  const isActionLoading = approveMutation.isPending || rejectMutation.isPending;

  const handleConfirmReview = useCallback(
    async (note: string, action: 'approve' | 'reject') => {
      if (!reviewModal) return;
      if (!requireCompanySelected()) return;
      try {
        if (action === 'approve') {
          await approveMutation.mutateAsync({ id: reviewModal.id, reviewNote: note || undefined });
          showToast('Work order approved successfully', 'success');
        } else {
          await rejectMutation.mutateAsync({ id: reviewModal.id, reviewNote: note || undefined });
          showToast('Work order rejected', 'warning');
        }
        setReviewModal(null);
        refetchPending();
        refetchHistory();
      } catch (err) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Action failed';
        showToast(msg, 'error');
      }
    },
    [
      reviewModal,
      approveMutation,
      rejectMutation,
      showToast,
      refetchPending,
      refetchHistory,
      requireCompanySelected,
    ]
  );

  const approvedCount = historyOrders.filter(
    (w) => w.approvalRequest?.status === 'APPROVED'
  ).length;
  const rejectedCount = historyOrders.filter(
    (w) => w.approvalRequest?.status === 'REJECTED'
  ).length;

  const displayedHistory = useMemo(() => {
    if (historyFilter === 'approved')
      return historyOrders.filter((w) => w.approvalRequest?.status === 'APPROVED');
    if (historyFilter === 'rejected')
      return historyOrders.filter((w) => w.approvalRequest?.status === 'REJECTED');
    return historyOrders;
  }, [historyOrders, historyFilter]);

  const handleCardClick = (card: 'pending' | 'approved' | 'rejected') => {
    if (card === 'pending') {
      setTab('pending');
      setHistoryFilter('all');
    } else {
      setTab('history');
      setHistoryFilter(card);
    }
  };

  const isLoading = tab === 'pending' ? pendingLoading : historyLoading;

  return (
    <div
      style={{
        fontFamily: T.font,
        background: T.bg,
        color: T.fg,
        width: '100%',
        padding: isMobile ? '16px 12px' : '24px 32px',
        borderRadius: 16,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: T.mutedFg, marginBottom: 4 }}>Maintenance</p>
        <h1
          style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.03em', margin: 0, color: T.fg }}
        >
          Admin Approval
        </h1>
        <p style={{ fontSize: 13, color: T.mutedFg, marginTop: 4 }}>
          Admin review for work order completions
        </p>
      </div>

      {/* Summary cards — clickable filters */}
      {(() => {
        const cards: {
          key: 'pending' | 'approved' | 'rejected';
          label: string;
          value: number;
          color: string;
          bg: string;
        }[] = [
          {
            key: 'pending',
            label: 'Awaiting Approval',
            value: pendingOrders.length,
            color: T.warning,
            bg: T.warningBg,
          },
          {
            key: 'approved',
            label: 'Approved',
            value: approvedCount,
            color: T.success,
            bg: T.successBg,
          },
          {
            key: 'rejected',
            label: 'Rejected',
            value: rejectedCount,
            color: T.danger,
            bg: T.dangerBg,
          },
        ];
        const activeKey =
          tab === 'pending'
            ? 'pending'
            : historyFilter === 'approved'
              ? 'approved'
              : historyFilter === 'rejected'
                ? 'rejected'
                : null;
        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: 24,
            }}
          >
            {cards.map(({ key, label, value, color, bg }) => {
              const isActive = activeKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCardClick(key)}
                  style={{
                    background: T.card,
                    border: isActive ? `2px solid ${color}` : `1px solid ${T.border}`,
                    borderRadius: 12,
                    padding: isActive ? '13px 17px' : '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow: isActive ? `0 0 0 3px ${color}22` : 'var(--shadow-md)',
                    cursor: 'pointer',
                    fontFamily: T.font,
                    textAlign: 'left',
                    transition: 'all .18s',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color,
                      flexShrink: 0,
                      fontSize: 20,
                      fontWeight: 700,
                    }}
                  >
                    {value}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? color : T.fg }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 11, color: T.mutedFg, marginTop: 2 }}>
                      {key === 'pending'
                        ? 'Click to view pending'
                        : key === 'approved'
                          ? 'Click to view approved'
                          : 'Click to view rejected'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Section header */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 8 : 0,
          borderBottom: `1px solid ${T.border}`,
          marginBottom: 16,
          paddingBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: T.fg }}>
          {tab === 'pending'
            ? `Awaiting Approval (${pendingOrders.length})`
            : historyFilter === 'approved'
              ? `Approved (${approvedCount})`
              : historyFilter === 'rejected'
                ? `Rejected (${rejectedCount})`
                : `History (${historyOrders.length})`}
        </div>
        <button
          type="button"
          onClick={() => {
            refetchPending();
            refetchHistory();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isMobile ? 'flex-end' : 'flex-start',
            gap: 6,
            fontSize: 12,
            color: T.mutedFg,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: T.font,
            padding: isMobile ? '4px 0 8px' : 0,
          }}
        >
          {Ico.refresh(13)} Refresh
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: isMobile ? 'auto' : 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        {tab === 'pending' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '135px 2fr 1fr 1fr 1fr 1fr',
              gap: 0,
              minWidth: isMobile ? 760 : undefined,
              background: T.muted,
              borderBottom: `1px solid ${T.border}`,
              padding: isMobile ? '10px 16px' : '10px 20px',
            }}
          >
            {['Actions', 'Task / Plan', 'Machine', 'Submitted By', 'Completed At', 'Due Date'].map(
              (h) => (
                <div
                  key={h}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.07em',
                    color: T.mutedFg,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </div>
              )
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '50px 2fr 1fr 1fr 1fr 1fr 1fr',
              gap: 0,
              minWidth: isMobile ? 780 : undefined,
              background: T.muted,
              borderBottom: `1px solid ${T.border}`,
              padding: isMobile ? '10px 16px' : '10px 20px',
            }}
          >
            {[
              '',
              'Task / Plan',
              'Submitted By',
              'Completed At',
              'Reviewed By',
              'Reviewed At',
              'Decision',
            ].map((h) => (
              <div
                key={h}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.07em',
                  color: T.mutedFg,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div
            style={{ padding: '48px 20px', textAlign: 'center', color: T.mutedFg, fontSize: 14 }}
          >
            Loading…
          </div>
        )}

        {!isLoading && tab === 'pending' && pendingOrders.length === 0 && (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.fg, marginBottom: 6 }}>
              All clear!
            </div>
            <div style={{ fontSize: 13, color: T.mutedFg }}>
              No work orders are pending your approval.
            </div>
          </div>
        )}

        {!isLoading && tab === 'history' && displayedHistory.length === 0 && (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              {Ico.history(32)}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.fg, marginBottom: 6 }}>
              {historyFilter === 'approved'
                ? 'No approved orders yet'
                : historyFilter === 'rejected'
                  ? 'No rejected orders yet'
                  : 'No history yet'}
            </div>
            <div style={{ fontSize: 13, color: T.mutedFg }}>
              Approved and rejected work orders will appear here.
            </div>
          </div>
        )}

        {!isLoading &&
          tab === 'pending' &&
          pendingOrders.map((wo) => (
            <PendingRow
              key={wo.id}
              wo={wo}
              onReview={setReviewModal}
              onView={setDetailOrder}
              isMobile={isMobile}
            />
          ))}

        {!isLoading &&
          tab === 'history' &&
          displayedHistory.map((wo) => (
            <HistoryRow key={wo.id} wo={wo} onView={setDetailOrder} isMobile={isMobile} />
          ))}
      </div>

      {/* Review modal */}
      {reviewModal && (
        <ReviewModal
          order={reviewModal}
          onConfirm={handleConfirmReview}
          onClose={() => setReviewModal(null)}
          isLoading={isActionLoading}
        />
      )}

      {/* Detail modal */}
      {detailOrder && <DetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />}

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}

export default MainPendingApproval;
