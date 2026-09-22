import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/fetchers';
import { getPublicFileUrl } from '@/lib/utils';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useRepairSystem } from '../../repair/server/tanstackQuery/useRepairSystem';
import type { RepairProcessData, WorkOrder } from '../../unique_task/server/api/workordersApi';
import {
  useMachineParts,
  useProcessRepairWorkOrder,
} from '../../unique_task/server/tanstackQuery/useWorkOrdersQueries';
import AddVendorModal from './AddVendorModal';

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

interface PartRow {
  partId: string;
  partName: string;
  quantity: string;
  hasWarranty: boolean;
  warrantyFromDate: string;
  warrantyToDate: string;
}

function emptyPartRow(): PartRow {
  return {
    partId: '',
    partName: '',
    quantity: '1',
    hasWarranty: false,
    warrantyFromDate: '',
    warrantyToDate: '',
  };
}

function ProcessModal({
  wo,
  onClose,
  onSuccess,
}: {
  wo: WorkOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const requireCompanySelected = useRequireCompanySelected();
  const existing = getRepairProcess(wo);
  const isMobile = useIsMobile();

  const initialVendor =
    existing?.parts?.[0]?.vendorName ??
    existing?.vendorName ??
    (wo as any).repairParts?.[0]?.vendorName ??
    '';
  const initialBillAmount =
    (existing?.maintenanceCost ?? existing?.billAmount ?? (wo as any).cost) != null
      ? String(existing?.maintenanceCost ?? existing?.billAmount ?? (wo as any).cost)
      : '';

  const [form, setForm] = useState<{
    status: 'in_progress' | 'completed' | 'cancelled';
    workDone: string;
    vendorName: string;
    billAmount: string;
    remarks: string;
    workDoneBy: string;
    typeOfWork: string;
  }>({
    status: (wo.status === 'COMPLETED' || wo.status === 'COMPLETED_LATE') ? 'completed' : 'in_progress',
    workDone: existing?.workDone ?? wo.completionNote ?? '',
    vendorName: initialVendor,
    billAmount: initialBillAmount,
    remarks: existing?.remarks ?? '',
    workDoneBy: existing?.workDoneBy ?? '',
    typeOfWork: existing?.typeOfWork ?? (wo as any).typeOfWork ?? '',
  });
  const [parts, setParts] = useState<PartRow[]>(() => {
    const partsList = (existing?.parts && existing.parts.length > 0) ? existing.parts : (wo as any).repairParts;
    if (partsList && partsList.length > 0) {
      return partsList.map((p: any) => ({
        partId: p.partId ?? '',
        partName: p.partName ?? '',
        quantity: String(p.quantity ?? 1),
        hasWarranty: !!(p.warrantyFromDate || p.warrantyToDate),
        warrantyFromDate: p.warrantyFromDate ?? '',
        warrantyToDate: p.warrantyToDate ?? '',
      }));
    }
    return [emptyPartRow()];
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(existing?.photoUrl ?? (wo as any).photoUrl ?? null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const queryClient = useQueryClient();
  const mutation = useProcessRepairWorkOrder();
  const { data: machineParts = [] } = useMachineParts(wo.machineId);
  const { useVendors } = useRepairSystem();
  const { data: allVendors = [] } = useVendors();
  const serviceVendors = allVendors.length > 0
    ? (allVendors.filter((v: any) => !v.type || v.type.toLowerCase().includes('service') || v.type.toLowerCase().includes('repair')).length > 0
        ? allVendors.filter((v: any) => !v.type || v.type.toLowerCase().includes('service') || v.type.toLowerCase().includes('repair'))
        : allVendors)
    : [];
  const [showAddVendor, setShowAddVendor] = useState(false);

  const isOuthouse = form.typeOfWork === 'out_source';

  const updatePartRow = (index: number, patch: Partial<PartRow>) => {
    setParts((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addPartRow = () => setParts((prev) => [...prev, emptyPartRow()]);

  const removePartRow = (index: number) =>
    setParts((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!requireCompanySelected()) return;
    setIsUploadingFiles(true);
    try {
      const submittedParts = parts
        .filter((row) => row.partName.trim().length > 0)
        .map((row) => ({
          partId: row.partId || undefined,
          partName: row.partName,
          quantity: Number.parseFloat(row.quantity) || 1,
          vendorName: form.vendorName.trim() || undefined,
          warrantyFromDate:
            row.hasWarranty && row.warrantyFromDate ? row.warrantyFromDate : undefined,
          warrantyToDate: row.hasWarranty && row.warrantyToDate ? row.warrantyToDate : undefined,
        }));

      if (submittedParts.length === 0 && (form.vendorName.trim() || form.billAmount.trim())) {
        submittedParts.push({
          partId: undefined,
          partName: (wo.machinePart ?? wo.plan?.machinePart)?.name || 'General Repair',
          quantity: 1,
          vendorName: form.vendorName.trim() || undefined,
          warrantyFromDate: undefined,
          warrantyToDate: undefined,
        });
      }

      let photoUrl = existing?.photoUrl || (wo as any).photoUrl;
      let billUrl = existing?.billUrl || (wo as any).billUrl;

      if (photoFile) {
        try {
          photoUrl = await uploadFile({
            file: photoFile,
            folderId: 'repair-tasks',
            subFolder: 'photos',
          });
        } catch (uploadErr) {
          toast.error('Failed to upload photo to S3');
          setIsUploadingFiles(false);
          return;
        }
      }

      if (billFile) {
        try {
          billUrl = await uploadFile({
            file: billFile,
            folderId: 'repair-tasks',
            subFolder: 'bills',
          });
        } catch (uploadErr) {
          toast.error('Failed to upload bill copy to S3');
          setIsUploadingFiles(false);
          return;
        }
      }

      await mutation.mutateAsync({
        id: wo.id,
        data: {
          status: form.status,
          parts: submittedParts,
          billAmount: form.billAmount ? Number.parseFloat(form.billAmount) : undefined,
          workDone: form.workDone || undefined,
          remarks: form.remarks || undefined,
          workDoneBy: form.workDoneBy || undefined,
          typeOfWork: form.typeOfWork || undefined,
          vendorName: form.vendorName.trim() || undefined,
          photoFile: photoFile ?? undefined,
          billFile: billFile ?? undefined,
          photoUrl,
          billUrl,
        },
      });
      queryClient.invalidateQueries({ queryKey: ['repair-system'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      onSuccess();
      onClose();
    } catch (_e) {
      // error handled by mutation state
    } finally {
      setIsUploadingFiles(false);
    }
  };

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
    >
      <div
        style={{
          background: T.card,
          borderRadius: 14,
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          fontFamily: T.font,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '14px 16px' : '18px 24px',
            borderBottom: `1px solid ${T.border}`,
            gap: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.fg }}>
            Process Repair {wo.id.slice(-6)}
          </h2>
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
              fontSize: 18,
              fontWeight: 300,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            padding: isMobile ? '14px 16px' : '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Read-only summary */}
          <div
            style={{
              background: T.muted,
              borderRadius: 10,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 13, color: T.fg }}>
              <span style={{ color: T.mutedFg, fontSize: 12 }}>Machine: </span>
              <strong>
                {wo.machine?.name ?? '—'}
                {wo.machine?.assetCode ? ` (${wo.machine.assetCode})` : ''}
              </strong>
            </div>
            <div style={{ fontSize: 13, color: T.fg }}>
              <span style={{ color: T.mutedFg, fontSize: 12 }}>Project (Firm): </span>
              <strong>{wo.machine?.firm?.name || wo.machine?.firmName || '—'}</strong>
            </div>
            <div style={{ fontSize: 13, color: T.fg }}>
              <span style={{ color: T.mutedFg, fontSize: 12 }}>Task: </span>
              <strong>{wo.plan?.title ?? '—'}</strong>
            </div>
            <div style={{ fontSize: 13, color: T.fg }}>
              <span style={{ color: T.mutedFg, fontSize: 12 }}>Assigned to: </span>
              <strong>{wo.currentAssignee?.name ?? 'Unassigned'}</strong>
            </div>
            <div
              style={{
                paddingTop: 8,
                borderTop: `1px solid ${T.border}`,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: T.mutedFg,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '.04em',
                  marginBottom: 2,
                }}
              >
                Due Date
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.fg }}>
                {fmtDate(wo.actualDueDate)}
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="proc-status"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: T.fg,
                marginBottom: 6,
              }}
            >
              Status
            </label>
            <select
              id="proc-status"
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value as typeof form.status }))
              }
              style={{
                width: '100%',
                background: T.muted,
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: T.fg,
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancel</option>
            </select>
          </div>

          {/* In Progress: only Remarks */}
          {form.status === 'in_progress' && (
            <div>
              <label
                htmlFor="proc-remarks-ip"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: T.fg,
                  marginBottom: 6,
                }}
              >
                Remarks
              </label>
              <textarea
                id="proc-remarks-ip"
                value={form.remarks}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                rows={3}
                placeholder="Additional notes..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box' as const,
                  background: T.muted,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: T.fg,
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'none' as const,
                }}
              />
            </div>
          )}

          {/* Completed: all fields */}
          {form.status === 'completed' && (
            <>
              {/* Type of Work */}
              <div>
                <label
                  htmlFor="proc-tow"
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.fg,
                    marginBottom: 6,
                  }}
                >
                  Type of Work
                </label>
                <select
                  id="proc-tow"
                  value={form.typeOfWork}
                  onChange={(e) => setForm((p) => ({ ...p, typeOfWork: e.target.value }))}
                  style={{
                    width: '100%',
                    background: T.muted,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: T.fg,
                    fontFamily: 'inherit',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select Type</option>
                  <option value="in_house">In House</option>
                  <option value="out_source">Out Source</option>
                </select>
                {isOuthouse && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: 'color-mix(in oklch, var(--primary) 12%, transparent)',
                      border: `1px solid color-mix(in oklch, var(--primary) 30%, transparent)`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: T.primary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>🚚</span>
                    <span>
                      <strong>Outsource Selected:</strong> This machine will automatically queue into <strong>Sent Machines</strong> for dispatch tracking and Store-In verification.
                    </span>
                  </div>
                )}
              </div>

              {/* Parts Replaced (multiple, each with qty/rate/vendor/warranty) */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.fg }}>Parts Replaced</span>
                  <button
                    type="button"
                    onClick={addPartRow}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 10px',
                      background: T.primaryBg,
                      color: T.primary,
                      border: `1px solid ${T.primary}`,
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Part
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {parts.map((row, index) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: rows have no stable id until saved
                      key={index}
                      style={{
                        border: `1px solid ${T.border}`,
                        borderRadius: 10,
                        padding: 12,
                        background: T.muted,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          gap: 10,
                          alignItems: isMobile ? 'stretch' : 'flex-end',
                        }}
                      >
                        <div style={{ flex: 2 }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: T.mutedFg,
                              fontWeight: 700,
                              textTransform: 'uppercase' as const,
                              marginBottom: 3,
                            }}
                          >
                            Part
                          </div>
                          <select
                            aria-label="Part"
                            value={row.partId}
                            onChange={(e) => {
                              const selected = machineParts.find((p) => p.id === e.target.value);
                              updatePartRow(index, {
                                partId: e.target.value,
                                partName: selected?.name ?? '',
                              });
                            }}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box' as const,
                              background: T.card,
                              border: `1px solid ${T.border}`,
                              borderRadius: 8,
                              padding: '8px 10px',
                              fontSize: 12,
                              color: T.fg,
                              fontFamily: 'inherit',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">Select part...</option>
                            {machineParts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                                {p.partNumber ? ` (${p.partNumber})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: T.mutedFg,
                              fontWeight: 700,
                              textTransform: 'uppercase' as const,
                              marginBottom: 3,
                            }}
                          >
                            Qty
                          </div>
                          <input
                            type="number"
                            min={1}
                            aria-label="Quantity"
                            value={row.quantity}
                            onChange={(e) => updatePartRow(index, { quantity: e.target.value })}
                            style={{
                              width: '100%',
                              boxSizing: 'border-box' as const,
                              background: T.card,
                              border: `1px solid ${T.border}`,
                              borderRadius: 8,
                              padding: '8px 10px',
                              fontSize: 12,
                              color: T.fg,
                              fontFamily: 'inherit',
                              outline: 'none',
                            }}
                          />
                        </div>
                        {parts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePartRow(index)}
                            title="Remove part"
                            style={{
                              background: T.dangerBg,
                              color: T.danger,
                              border: `1px solid ${T.danger}`,
                              borderRadius: 8,
                              width: isMobile ? '100%' : 32,
                              height: 32,
                              cursor: 'pointer',
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Warranty — shown only once a part is selected for this row */}
                      {row.partName && (
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 6,
                            }}
                          >
                            <input
                              type="checkbox"
                              id={`proc-warranty-${index}`}
                              checked={row.hasWarranty}
                              onChange={(e) => {
                                updatePartRow(index, {
                                  hasWarranty: e.target.checked,
                                  ...(!e.target.checked && {
                                    warrantyFromDate: '',
                                    warrantyToDate: '',
                                  }),
                                });
                              }}
                              style={{ width: 14, height: 14, cursor: 'pointer' }}
                            />
                            <label
                              htmlFor={`proc-warranty-${index}`}
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: T.fg,
                                cursor: 'pointer',
                              }}
                            >
                              Warranty &amp; Guarantee
                            </label>
                          </div>
                          {row.hasWarranty && (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                gap: 8,
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: T.mutedFg,
                                    fontWeight: 700,
                                    textTransform: 'uppercase' as const,
                                    marginBottom: 3,
                                  }}
                                >
                                  From
                                </div>
                                <input
                                  type="date"
                                  value={row.warrantyFromDate}
                                  onChange={(e) =>
                                    updatePartRow(index, { warrantyFromDate: e.target.value })
                                  }
                                  title="Warranty from date"
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box' as const,
                                    background: T.card,
                                    border: `1px solid ${T.border}`,
                                    borderRadius: 8,
                                    padding: '8px 10px',
                                    fontSize: 12,
                                    color: T.fg,
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                  }}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: T.mutedFg,
                                    fontWeight: 700,
                                    textTransform: 'uppercase' as const,
                                    marginBottom: 3,
                                  }}
                                >
                                  To
                                </div>
                                <input
                                  type="date"
                                  value={row.warrantyToDate}
                                  onChange={(e) =>
                                    updatePartRow(index, { warrantyToDate: e.target.value })
                                  }
                                  title="Warranty to date"
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box' as const,
                                    background: T.card,
                                    border: `1px solid ${T.border}`,
                                    borderRadius: 8,
                                    padding: '8px 10px',
                                    fontSize: 12,
                                    color: T.fg,
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vendor Name */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <label
                    htmlFor="proc-vendor"
                    style={{ fontSize: 12, fontWeight: 600, color: T.fg }}
                  >
                    Vendor Name {isOuthouse ? '' : <span style={{ color: T.mutedFg, fontWeight: 400 }}>(Optional)</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddVendor(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 10px',
                      background: T.primaryBg,
                      color: T.primary,
                      border: `1px solid ${T.primary}`,
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Vendor
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    list="proc-vendor-options"
                    id="proc-vendor"
                    placeholder="Select or type vendor name..."
                    value={form.vendorName}
                    onChange={(e) => setForm((p) => ({ ...p, vendorName: e.target.value }))}
                    style={{
                      width: '100%',
                      background: T.muted,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 13,
                      color: T.fg,
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                  <datalist id="proc-vendor-options">
                    {serviceVendors.map((v: any) => (
                      <option key={v.id} value={v.name} />
                    ))}
                  </datalist>
                </div>
                {showAddVendor && (
                  <AddVendorModal
                    onClose={() => setShowAddVendor(false)}
                    onSuccess={(name) => {
                      setForm((p) => ({ ...p, vendorName: name }));
                      setShowAddVendor(false);
                    }}
                  />
                )}
              </div>

              {/* Bill Amount */}
              <div>
                <label
                  htmlFor="proc-bill"
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.fg,
                    marginBottom: 6,
                  }}
                >
                  Bill Amount (₹)
                </label>
                <input
                  id="proc-bill"
                  type="number"
                  value={form.billAmount}
                  onChange={(e) => setForm((p) => ({ ...p, billAmount: e.target.value }))}
                  placeholder="0"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box' as const,
                    background: T.muted,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: T.fg,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Work Photo */}
              <div>
                <div
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.fg,
                    marginBottom: 6,
                  }}
                >
                  Work Photo
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      background: T.muted,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: T.fg,
                    }}
                  >
                    ↑ Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {photoPreview && (
                    <div
                      style={{
                        position: 'relative',
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      <img
                        src={getPublicFileUrl(photoPreview)}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bill Copy */}
              <div>
                <div
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.fg,
                    marginBottom: 6,
                  }}
                >
                  Bill Copy
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 14px',
                      background: T.muted,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: T.fg,
                    }}
                  >
                    ↑ {billFile ? billFile.name : 'Upload Bill'}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setBillFile(f);
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {(existing?.billUrl || (wo as any).billUrl) && !billFile && (
                    <a
                      href={getPublicFileUrl(existing?.billUrl || (wo as any).billUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: T.primary,
                        fontWeight: 600,
                        textDecoration: 'underline',
                      }}
                    >
                      View Current Bill
                    </a>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label
                  htmlFor="proc-remarks"
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: T.fg,
                    marginBottom: 6,
                  }}
                >
                  Remarks
                </label>
                <textarea
                  id="proc-remarks"
                  value={form.remarks}
                  onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                  rows={2}
                  placeholder="Additional notes..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box' as const,
                    background: T.muted,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: T.fg,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none' as const,
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: isMobile ? '12px 16px' : '14px 24px',
            borderTop: `1px solid ${T.border}`,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending || isUploadingFiles}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 22px',
              background: mutation.isPending || isUploadingFiles ? T.muted : T.success,
              color: mutation.isPending || isUploadingFiles ? T.mutedFg : '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: mutation.isPending || isUploadingFiles ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploadingFiles ? 'Uploading to S3…' : mutation.isPending ? 'Saving…' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ProcessModal);
