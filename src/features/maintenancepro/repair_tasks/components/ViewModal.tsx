import React from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { getPublicFileUrl } from '@/lib/utils';
import type { RepairProcessData, WorkOrder } from '../../unique_task/server/api/workordersApi';
import StatusBadge from './StatusBadge';

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  info: 'oklch(0.488 0.243 264.376)',
  infoBg: 'oklch(0.488 0.243 264.376 / 0.14)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

const RIco = {
  wrench: (s = 14) => (
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
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getRepairProcess(wo: WorkOrder) {
  return (
    (wo.checklistResponses as { repairProcess?: RepairProcessData } | null)?.repairProcess ?? null
  );
}

function repairStatusColor(status: string | null): { color: string; bg: string } {
  const s = (status ?? '').toUpperCase();
  if (s === 'IN_PROGRESS') return { color: T.info, bg: T.infoBg };
  if (s === 'COMPLETED' || s === 'COMPLETED_LATE') return { color: T.success, bg: T.successBg };
  if (s === 'CANCELLED' || s === 'COMPLETION_REJECTED') return { color: T.danger, bg: T.dangerBg };
  return { color: T.warning, bg: T.warningBg };
}

function ViewModal({ wo, onClose }: { wo: WorkOrder; onClose: () => void }) {
  const rp = getRepairProcess(wo);
  const repairLog = wo.repairLog;
  const repairHistory = wo.checklistResponses?.repairProcessHistory ?? [];
  const isMobile = useIsMobile();

  const photoUrl = rp?.photoUrl || wo.photoUrl;
  const billUrl = rp?.billUrl || wo.billUrl;
  const maintenanceCost = rp?.maintenanceCost ?? rp?.billAmount ?? wo.cost;
  const parts = (rp?.parts && rp.parts.length > 0) ? rp.parts : ((wo as any).repairParts ?? []);

  const rawVendors = [
    ...parts.map((p: any) => p.vendorName),
    rp?.vendorName,
    (wo as any).vendorName,
  ].filter((v): v is string => Boolean(v && typeof v === 'string' && v.trim()));
  const uniqueVendors = Array.from(new Set(rawVendors.map((v) => v.trim())));
  const vendorName = uniqueVendors.length > 0 ? uniqueVendors.join(', ') : '—';

  const remarks = rp?.remarks || wo.completionNote;
  const typeOfWork = rp?.typeOfWork || ((wo as any).repairLog?.sendMachine ? ((wo as any).repairLog.sendMachine === 'inhouse' ? 'In House' : 'Out House') : null);
  const hasRepairProcess = Boolean(
    rp ||
    maintenanceCost != null ||
    photoUrl ||
    billUrl ||
    parts.length > 0 ||
    remarks ||
    (wo as any).parts?.total > 0 ||
    (wo as any).parts?.lines?.length > 0
  );

  const sm = repairStatusColor(wo.status);
  const machinePart = wo.machinePart ?? wo.plan?.machinePart ?? null;

  const Field = ({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) => (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.mutedFg,
          textTransform: 'uppercase' as const,
          letterSpacing: '.06em',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: highlight ? T.primary : T.fg,
          fontWeight: highlight ? 700 : 500,
          wordBreak: 'break-word',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: T.card,
          borderRadius: 16,
          width: '100%',
          maxWidth: 1060,
          maxHeight: '92vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: T.font,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Accent bar */}
        <div style={{ height: 5, width: '100%', background: sm.color, flexShrink: 0 }} />

        {/* Header */}
        <div
          style={{
            padding: isMobile ? '16px 16px 14px' : '20px 28px 16px',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', minWidth: 0 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: sm.bg,
                color: sm.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {RIco.wrench(20)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 4,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    color: T.mutedFg,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '.06em',
                    fontWeight: 700,
                  }}
                >
                  Repair Task Details
                </span>
                <StatusBadge status={wo.status} />
              </div>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: T.fg,
                  margin: 0,
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}
              >
                {wo.title ?? wo.plan?.title ?? (wo.workOrderCode || (wo.id ? `WO-${wo.id.slice(-6).toUpperCase()}` : 'Repair Task'))}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div
          style={{
            padding: isMobile ? '16px' : '22px 28px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Rejection Notice (if any) */}
          {wo.approvalRequest?.status === 'REJECTED' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                background: T.dangerBg,
                border: `1px solid ${T.danger}`,
                borderRadius: 10,
                padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>⛔</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.danger, marginBottom: 6 }}>
                  Completion Rejected
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: '8px 20px',
                  }}
                >
                  {(wo.approvalRequest.reviewedBy?.name ?? wo.approvalRequest.reviewer?.name) && (
                    <Field
                      label="Rejected By"
                      value={wo.approvalRequest.reviewedBy?.name ?? wo.approvalRequest.reviewer?.name}
                    />
                  )}
                  {wo.approvalRequest.reviewedAt && (
                    <Field label="Rejected On" value={fmtDate(wo.approvalRequest.reviewedAt)} />
                  )}
                  {wo.approvalRequest.reviewNote && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Field label="Reason" value={wo.approvalRequest.reviewNote} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2-Column Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.05fr) minmax(0, 1.15fr)',
              gap: isMobile ? 18 : 24,
              alignItems: 'start',
            }}
          >
            {/* ── Left Column: Machine & Work Order Details ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.mutedFg,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '.08em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🚜</span>
                <span>Machine Details</span>
              </div>

              <div
                style={{
                  background: T.muted,
                  borderRadius: 12,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {/* Machine Header Card */}
                <div
                  style={{
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: T.mutedFg,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '.06em',
                        marginBottom: 2,
                      }}
                    >
                      Machine
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: T.fg,
                        wordBreak: 'break-word',
                      }}
                    >
                      {wo.machine?.name || '—'}
                    </div>
                  </div>
                  {wo.machine?.assetCode && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.primary,
                        background: T.primaryBg,
                        padding: '3px 8px',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      {wo.machine.assetCode}
                    </span>
                  )}
                </div>

                {/* Machine & Task Fields Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: '12px 14px',
                  }}
                >
                  <Field
                    label="Work Order ID"
                    value={wo.workOrderCode || (wo.id ? `WO-${wo.id.slice(-6).toUpperCase()}` : '—')}
                  />
                  <Field
                    label="Task / Plan ID"
                    value={wo.plan?.planCode || (wo.plan?.id ? String(wo.plan.id) : 'Direct Task')}
                  />
                  <Field
                    label="Project (Firm)"
                    value={wo.machine?.firm?.name || wo.machine?.firmName || '—'}
                  />
                  <Field label="Machine Part" value={machinePart?.name ?? '—'} />
                  <Field label="Activity Type" value={wo.plan?.activityType?.name ?? '—'} />
                  <Field label="Due Date" value={fmtDate(wo.actualDueDate)} />
                  <Field label="Requested By" value={wo.plan?.createdBy?.name ?? '—'} />
                  <Field label="Assigned To" value={wo.currentAssignee?.name ?? 'Unassigned'} />
                  <Field label="Sent to Repair" value={fmtDate(repairLog?.createdAt)} />
                  <Field
                    label="Send Type"
                    value={
                      repairLog?.sendMachine
                        ? repairLog.sendMachine === 'inhouse'
                          ? 'In House'
                          : 'Out House'
                        : '—'
                    }
                  />
                </div>

                {/* Description */}
                {wo.plan?.description && (
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.06em',
                        color: T.mutedFg,
                        textTransform: 'uppercase' as const,
                        marginBottom: 4,
                      }}
                    >
                      Description
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: T.fg,
                        lineHeight: 1.5,
                        background: T.card,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}
                    >
                      {wo.plan.description}
                    </div>
                  </div>
                )}

                {/* Notes (on send) */}
                {wo.completionNote && (
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.06em',
                        color: T.mutedFg,
                        textTransform: 'uppercase' as const,
                        marginBottom: 4,
                      }}
                    >
                      Notes (on send)
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: T.fg,
                        lineHeight: 1.5,
                        background: T.card,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}
                    >
                      {wo.completionNote}
                    </div>
                  </div>
                )}

                {/* Attached Document */}
                {wo.plan?.documentUrl && (
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.06em',
                        color: T.mutedFg,
                        textTransform: 'uppercase' as const,
                        marginBottom: 6,
                      }}
                    >
                      Attached Document
                    </div>
                    <a
                      href={wo.plan.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: T.card,
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                        textDecoration: 'none',
                      }}
                    >
                      <span style={{ fontSize: 16 }}>📄</span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 12.5,
                          color: T.fg,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View attached document
                      </span>
                      <span style={{ color: T.mutedFg, fontSize: 12 }}>⬇</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Column: Repair Process ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.primary,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '.08em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🔧</span>
                <span>Repair Process</span>
              </div>

              {hasRepairProcess ? (
                <div
                  style={{
                    background: T.muted,
                    borderRadius: 12,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  {/* Summary card */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: '12px 14px',
                      background: T.card,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <Field
                      label="Type of Work"
                      value={
                        typeOfWork
                          ? typeOfWork === 'in_house' || typeOfWork === 'inhouse'
                            ? 'In House'
                            : typeOfWork === 'out_source' || typeOfWork === 'outhouse'
                              ? 'Out House'
                              : typeOfWork.replace(/_/g, ' ')
                          : '—'
                      }
                    />
                    <Field label="Vendor Name" value={vendorName} />
                    <div style={{ gridColumn: '1 / -1' }}>
                      <Field
                        label="Bill Amount"
                        value={maintenanceCost != null ? `₹${Number(maintenanceCost).toLocaleString('en-IN')}` : '—'}
                        highlight={maintenanceCost != null}
                      />
                    </div>
                  </div>

                  {/* Parts from the Store */}
                  {(wo as any).parts?.lines?.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: T.mutedFg,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '.06em',
                          marginBottom: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Parts from the Store</span>
                        <span style={{ color: T.primary, fontWeight: 600 }}>
                          {(wo as any).parts.complete} of {(wo as any).parts.total} issued
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(wo as any).parts.lines.map((l: any) => (
                          <div
                            key={l.id}
                            style={{
                              background: T.card,
                              border: `1px solid ${T.border}`,
                              borderRadius: 8,
                              padding: '10px 12px',
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1.2fr 1fr',
                              gap: '6px 12px',
                              alignItems: 'center',
                            }}
                          >
                            <Field label="Part" value={`${l.itemName}${l.groupHead ? ` (${l.groupHead})` : ''}`} />
                            <Field
                              label="Issued / Needed"
                              value={`${l.issued} / ${l.quantity}${l.uom ? ` ${l.uom}` : ''}`}
                            />
                            <Field label="Indent" value={l.indentNumber ?? '—'} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Parts Replaced */}
                  {parts && parts.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: T.mutedFg,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '.06em',
                          marginBottom: 8,
                        }}
                      >
                        Parts Replaced ({parts.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {parts.map((part: any, i: number) => (
                          <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: read-only saved list
                            key={i}
                            style={{
                              background: T.card,
                              border: `1px solid ${T.border}`,
                              borderRadius: 8,
                              padding: '10px 12px',
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : '1.5fr 0.7fr',
                              gap: '6px 12px',
                            }}
                          >
                            <Field label="Part" value={part.partName} />
                            <Field label="Qty" value={String(part.quantity ?? 1)} />
                            {part.vendorName && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <Field label="Vendor" value={part.vendorName} />
                              </div>
                            )}
                            {(part.warrantyFromDate || part.warrantyToDate) && (
                              <div
                                style={{
                                  gridColumn: '1 / -1',
                                  display: 'flex',
                                  gap: 12,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <Field label="Warranty From" value={fmtDate(part.warrantyFromDate)} />
                                <Field label="Warranty To" value={fmtDate(part.warrantyToDate)} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  {remarks && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: T.mutedFg,
                          fontWeight: 700,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '.06em',
                          marginBottom: 4,
                        }}
                      >
                        Remarks
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: T.fg,
                          lineHeight: 1.5,
                          background: T.card,
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          padding: '10px 12px',
                        }}
                      >
                        {remarks}
                      </div>
                    </div>
                  )}

                  {/* Photos & Bills */}
                  {(photoUrl || billUrl) && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 2 }}>
                      {photoUrl && (
                        <a
                          href={getPublicFileUrl(photoUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            color: T.primary,
                            textDecoration: 'none',
                          }}
                        >
                          📷 View Photo
                        </a>
                      )}
                      {billUrl && (
                        <a
                          href={getPublicFileUrl(billUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            background: T.card,
                            border: `1px solid ${T.border}`,
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            color: T.primary,
                            textDecoration: 'none',
                          }}
                        >
                          📄 View Bill
                        </a>
                      )}
                    </div>
                  )}

                  {/* Process History (if > 1) */}
                  {repairHistory.length > 1 && (
                    <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: T.mutedFg,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '.06em',
                          marginBottom: 10,
                        }}
                      >
                        Process History ({repairHistory.length} entries)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[...repairHistory].reverse().map((entry, i) => (
                          <div
                            key={entry.processedAt ?? i}
                            style={{
                              background: T.card,
                              border: `1px solid ${T.border}`,
                              borderLeft: `3px solid ${i === 0 ? T.primary : T.border}`,
                              borderRadius: 8,
                              padding: '10px 12px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 6,
                              }}
                            >
                              <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? T.primary : T.mutedFg }}>
                                {i === 0 ? 'Latest' : `Entry ${repairHistory.length - i}`}
                                {entry.savedStatus && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      background:
                                        entry.savedStatus === 'completed'
                                          ? T.successBg
                                          : entry.savedStatus === 'cancelled'
                                            ? T.dangerBg
                                            : T.infoBg,
                                      color:
                                        entry.savedStatus === 'completed'
                                          ? T.success
                                          : entry.savedStatus === 'cancelled'
                                            ? T.danger
                                            : T.info,
                                      fontWeight: 600,
                                      fontSize: 9.5,
                                      textTransform: 'uppercase' as const,
                                    }}
                                  >
                                    {entry.savedStatus.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </span>
                              <span style={{ fontSize: 10, color: T.mutedFg }}>
                                {entry.processedAt ? new Date(entry.processedAt).toLocaleString('en-IN') : '—'}
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: T.fg, display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {entry.typeOfWork && (
                                <div><span style={{ color: T.mutedFg }}>Type:</span> {entry.typeOfWork.replace(/_/g, ' ')}</div>
                              )}
                              {entry.workDoneBy && (
                                <div><span style={{ color: T.mutedFg }}>Done by:</span> {entry.workDoneBy}</div>
                              )}
                              {entry.parts && entry.parts.length > 0 && (
                                <div><span style={{ color: T.mutedFg }}>Parts:</span> {entry.parts.map((p) => p.partName).join(', ')}</div>
                              )}
                              {entry.maintenanceCost != null && (
                                <div><span style={{ color: T.mutedFg }}>Bill:</span> ₹{entry.maintenanceCost}</div>
                              )}
                              {entry.remarks && (
                                <div><span style={{ color: T.mutedFg }}>Remarks:</span> {entry.remarks}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: T.muted,
                    borderRadius: 12,
                    padding: '36px 16px',
                    textAlign: 'center',
                    color: T.mutedFg,
                    fontSize: 13,
                    border: `1px dashed ${T.border}`,
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                  No repair process recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: isMobile ? '12px 16px' : '14px 28px',
            borderTop: `1px solid ${T.border}`,
            background: T.card,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 24px',
              background: T.muted,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: T.fg,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ViewModal);
