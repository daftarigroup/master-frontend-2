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
  const vendorName =
    parts.map((p: any) => p.vendorName).filter(Boolean).join(', ') ||
    rp?.vendorName ||
    (wo as any).vendorName ||
    '—';
  const remarks = rp?.remarks || wo.completionNote;
  const typeOfWork = rp?.typeOfWork || ((wo as any).repairLog?.sendMachine ? ((wo as any).repairLog.sendMachine === 'inhouse' ? 'In House' : 'Out House') : null);
  const hasRepairProcess = Boolean(
    rp || maintenanceCost != null || photoUrl || billUrl || parts.length > 0 || remarks
  );

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
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
      <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>{value || '—'}</div>
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
          maxWidth: 680,
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: T.font,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {(() => {
          const sm = repairStatusColor(wo.status);
          const machinePart = wo.machinePart ?? wo.plan?.machinePart ?? null;
          return (
            <>
              {/* Accent bar */}
              <div style={{ height: 5, width: '100%', background: sm.color, flexShrink: 0 }} />

              <div style={{ padding: isMobile ? '18px 16px' : '24px 32px', overflowY: 'auto' }}>
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
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', minWidth: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
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
                      <p
                        style={{
                          fontSize: 11,
                          color: T.mutedFg,
                          margin: '0 0 4px',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '.06em',
                          fontWeight: 700,
                        }}
                      >
                        Repair Task Details
                      </p>
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
                        {wo.plan?.title ?? `Work Order #${wo.id.slice(-6)}`}
                      </h2>
                    </div>
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
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Status row */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
                  <StatusBadge status={wo.status} />
                </div>

                {/* Grid details */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                    gap: 10,
                    marginBottom: 18,
                  }}
                >
                  {[
                    {
                      label: 'Occurrence ID',
                      value: wo.workOrderCode || wo.id,
                    },
                    {
                      label: 'Task / Plan ID',
                      value: wo.plan?.planCode || wo.plan?.id || '—',
                    },
                    {
                      label: 'Machine',
                      value: wo.machine
                        ? `${wo.machine.name}${wo.machine.assetCode ? ` (${wo.machine.assetCode})` : ''}`
                        : '—',
                    },
                    {
                      label: 'Project (Firm)',
                      value: wo.machine?.firm?.name || wo.machine?.firmName || '—',
                    },
                    { label: 'Machine Part', value: machinePart?.name ?? '—' },
                    { label: 'Activity Type', value: wo.plan?.activityType?.name ?? '—' },
                    { label: 'Requested By', value: wo.plan?.createdBy?.name ?? '—' },
                    { label: 'Assigned To', value: wo.currentAssignee?.name ?? 'Unassigned' },
                    { label: 'Due Date', value: fmtDate(wo.actualDueDate) },
                    { label: 'Sent to Repair', value: fmtDate(repairLog?.createdAt) },
                    {
                      label: 'Send Type',
                      value: repairLog?.sendMachine
                        ? repairLog.sendMachine === 'inhouse'
                          ? 'In House'
                          : 'Out House'
                        : '—',
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{ background: T.muted, borderRadius: 10, padding: '9px 12px' }}
                    >
                      <div
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: '.06em',
                          color: T.mutedFg,
                          textTransform: 'uppercase' as const,
                          marginBottom: 3,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: T.fg,
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={value}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                {wo.plan?.description && (
                  <div style={{ marginBottom: 14 }}>
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
                        fontSize: 13,
                        color: T.fg,
                        lineHeight: 1.6,
                        background: T.muted,
                        borderRadius: 8,
                        padding: '10px 14px',
                      }}
                    >
                      {wo.plan.description}
                    </div>
                  </div>
                )}

                {wo.completionNote && (
                  <div style={{ marginBottom: 14 }}>
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
                        fontSize: 13,
                        color: T.fg,
                        lineHeight: 1.6,
                        background: T.muted,
                        borderRadius: 8,
                        padding: '10px 14px',
                      }}
                    >
                      {wo.completionNote}
                    </div>
                  </div>
                )}

                {wo.plan?.documentUrl && (
                  <div style={{ marginBottom: 14 }}>
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
                        background: T.muted,
                        border: `1px solid ${T.border}`,
                        borderRadius: 10,
                        padding: '10px 14px',
                        textDecoration: 'none',
                      }}
                    >
                      <span
                        style={{
                          color: T.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: T.card,
                          flexShrink: 0,
                        }}
                      >
                        📄
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: T.fg,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        View attached document
                      </span>
                      <span style={{ color: T.mutedFg, display: 'flex', flexShrink: 0 }}>⬇</span>
                    </a>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        <div
          style={{
            padding: isMobile ? '0 16px 14px' : '0 32px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Rejection Notice */}
          {wo.approvalRequest?.status === 'REJECTED' && (
            <section>
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
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: T.danger,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '.06em',
                            marginBottom: 2,
                          }}
                        >
                          Rejected By
                        </div>
                        <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>
                          {wo.approvalRequest.reviewedBy?.name ?? wo.approvalRequest.reviewer?.name}
                        </div>
                      </div>
                    )}
                    {wo.approvalRequest.reviewedAt && (
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: T.danger,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '.06em',
                            marginBottom: 2,
                          }}
                        >
                          Rejected On
                        </div>
                        <div style={{ fontSize: 13, color: T.fg, fontWeight: 500 }}>
                          {fmtDate(wo.approvalRequest.reviewedAt)}
                        </div>
                      </div>
                    )}
                    {wo.approvalRequest.reviewNote && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: T.danger,
                            textTransform: 'uppercase' as const,
                            letterSpacing: '.06em',
                            marginBottom: 2,
                          }}
                        >
                          Reason
                        </div>
                        <div
                          style={{ fontSize: 13, color: T.fg, fontWeight: 500, lineHeight: 1.5 }}
                        >
                          {wo.approvalRequest.reviewNote}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Repair Process Details */}
          {hasRepairProcess ? (
            <section>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.primary,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '.08em',
                  marginBottom: 12,
                }}
              >
                Repair Process
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '12px 24px',
                  background: T.muted,
                  borderRadius: 10,
                  padding: '14px 16px',
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
                <Field
                  label="Bill Amount"
                  value={maintenanceCost != null ? `₹${maintenanceCost}` : '—'}
                />
                {parts && parts.length > 0 && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: T.mutedFg,
                        fontWeight: 700,
                        textTransform: 'uppercase' as const,
                      }}
                    >
                      Parts Replaced
                    </div>
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
                          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                          gap: '6px 16px',
                        }}
                      >
                        <Field label="Part" value={part.partName} />
                        <Field label="Qty" value={String(part.quantity)} />
                        {part.vendorName && <Field label="Vendor" value={part.vendorName} />}
                        {(part.warrantyFromDate || part.warrantyToDate) && (
                          <>
                            <Field label="Warranty From" value={fmtDate(part.warrantyFromDate)} />
                            <Field label="Warranty To" value={fmtDate(part.warrantyToDate)} />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {remarks && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Remarks" value={remarks} />
                  </div>
                )}
                {(photoUrl || billUrl) && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      gap: 12,
                      flexWrap: 'wrap' as const,
                    }}
                  >
                    {photoUrl && (
                      <a
                        href={getPublicFileUrl(photoUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
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
                          padding: '7px 14px',
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
              </div>
            </section>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '20px 0',
                color: T.mutedFg,
                fontSize: 13,
                background: T.muted,
                borderRadius: 10,
              }}
            >
              No repair process recorded yet.
            </div>
          )}

          {/* Process History */}
          {repairHistory.length > 1 && (
            <section style={{ marginTop: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.mutedFg,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '.08em',
                  marginBottom: 12,
                }}
              >
                Process History ({repairHistory.length} entries)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                {[...repairHistory].reverse().map((entry, i) => (
                  <div
                    key={entry.processedAt ?? i}
                    style={{
                      background: T.muted,
                      borderRadius: 10,
                      padding: '12px 16px',
                      borderLeft: `3px solid ${i === 0 ? T.primary : T.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        marginBottom: 8,
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: i === 0 ? T.primary : T.mutedFg,
                        }}
                      >
                        {i === 0 ? 'Latest' : `Entry ${repairHistory.length - i}`}
                        {entry.savedStatus && (
                          <span
                            style={{
                              marginLeft: 8,
                              padding: '1px 7px',
                              borderRadius: 6,
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
                              fontSize: 10,
                              textTransform: 'uppercase' as const,
                            }}
                          >
                            {entry.savedStatus.replace(/_/g, ' ')}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 11, color: T.mutedFg }}>
                        {entry.processedAt
                          ? new Date(entry.processedAt).toLocaleString('en-IN')
                          : '—'}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                        gap: '6px 20px',
                        fontSize: 12,
                        color: T.fg,
                      }}
                    >
                      {entry.typeOfWork && (
                        <div>
                          <span style={{ color: T.mutedFg }}>Type: </span>
                          {entry.typeOfWork.replace(/_/g, ' ')}
                        </div>
                      )}
                      {entry.workDoneBy && (
                        <div>
                          <span style={{ color: T.mutedFg }}>Done by: </span>
                          {entry.workDoneBy}
                        </div>
                      )}
                      {entry.parts && entry.parts.length > 0 && (
                        <div>
                          <span style={{ color: T.mutedFg }}>Parts: </span>
                          {entry.parts.map((p) => p.partName).join(', ')}
                        </div>
                      )}
                      {entry.maintenanceCost != null && (
                        <div>
                          <span style={{ color: T.mutedFg }}>Bill: </span>₹{entry.maintenanceCost}
                        </div>
                      )}
                      {entry.remarks && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ color: T.mutedFg }}>Remarks: </span>
                          {entry.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: isMobile ? '12px 16px' : '14px 24px',
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 22px',
              background: T.muted,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
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
