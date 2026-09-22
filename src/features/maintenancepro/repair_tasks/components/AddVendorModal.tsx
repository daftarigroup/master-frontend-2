import React, { useState } from 'react';
import { useRequireCompanySelected } from '@/features/organization/hooks/useRequireCompanySelected';
import { useIsMobile } from '@/hooks/useIsMobile';
import { repairSystemApi } from '../../repair/server/api/repairSystemApi';

export interface VendorPayload {
  type: string;
  name: string;
  nob?: string;
  email?: string;
  mobileNumber?: string;
  contactName?: string;
  gstNumber?: string;
  tds?: string;
  address?: string;
  state?: string;
}

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

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'West Bengal',
];

function AddVendorModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (name: string) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const mutation = {
    isPending: isSaving,
    mutateAsync: async (payload: VendorPayload) => {
      setIsSaving(true);
      try {
        await repairSystemApi.createVendor({
          name: payload.name,
          type: payload.type,
          email: payload.email,
          mobileNumber: payload.mobileNumber,
          contactName: payload.contactName,
          gstNumber: payload.gstNumber,
          address: payload.address,
        });
      } finally {
        setIsSaving(false);
      }
    },
  };
  const requireCompanySelected = useRequireCompanySelected();
  const isMobile = useIsMobile();

  const [form, setForm] = useState<Partial<VendorPayload>>({
    type: 'SERVICE',
    name: '',
    nob: '',
    email: '',
    mobileNumber: '',
    contactName: '',
    gstNumber: '',
    tds: 'NO',
    address: '',
    state: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof VendorPayload, string>>>({});

  const set = (field: keyof VendorPayload, value: string) =>
    setForm((p: Partial<VendorPayload>) => ({ ...p, [field]: value }));

  const validate = () => {
    const e: Partial<Record<keyof VendorPayload, string>> = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Name is required (min 2 chars)';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Valid email required';
    if (!form.mobileNumber || !/^\d{10,15}$/.test(form.mobileNumber))
      e.mobileNumber = '10–15 digit mobile required';
    if (!form.contactName || form.contactName.trim().length < 2)
      e.contactName = 'Contact name required';
    if (!form.address || form.address.trim().length < 2) e.address = 'Address required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!requireCompanySelected()) return;
    try {
      await mutation.mutateAsync(form as VendorPayload);
      onSuccess(form.name ?? '');
      onClose();
    } catch (_e) {}
  };

  const inputStyle = (hasErr?: boolean): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box',
    background: T.muted,
    border: `1px solid ${hasErr ? T.danger : T.border}`,
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    color: T.fg,
    fontFamily: T.font,
    outline: 'none',
  });

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    color: T.mutedFg,
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    marginBottom: 4,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9600,
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
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 16px 56px rgba(0,0,0,0.3)',
          fontFamily: T.font,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '14px 16px' : '16px 22px',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.fg }}>Add Service Vendor</div>
            <div style={{ fontSize: 11, color: T.mutedFg, marginTop: 2 }}>
              Type is pre-set to SERVICE
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: T.muted,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              width: 30,
              height: 30,
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

        <div
          style={{
            padding: isMobile ? '14px 16px' : '18px 22px',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 14,
          }}
        >
          {/* Name */}
          <div>
            <label htmlFor="av-name" style={labelStyle}>
              Vendor Name *
            </label>
            <input
              id="av-name"
              style={inputStyle(!!errors.name)}
              value={form.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Acme Services"
            />
            {errors.name && (
              <div style={{ fontSize: 11, color: T.danger, marginTop: 3 }}>{errors.name}</div>
            )}
          </div>
          {/* Nature of Business */}
          <div>
            <label htmlFor="av-nob" style={labelStyle}>
              Nature of Business
            </label>
            <input
              id="av-nob"
              style={inputStyle()}
              value={form.nob ?? ''}
              onChange={(e) => set('nob', e.target.value)}
              placeholder="e.g. IT Services"
            />
          </div>
          {/* Email */}
          <div>
            <label htmlFor="av-email" style={labelStyle}>
              Email *
            </label>
            <input
              id="av-email"
              type="email"
              style={inputStyle(!!errors.email)}
              value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
              placeholder="vendor@company.com"
            />
            {errors.email && (
              <div style={{ fontSize: 11, color: T.danger, marginTop: 3 }}>{errors.email}</div>
            )}
          </div>
          {/* Mobile */}
          <div>
            <label htmlFor="av-mobile" style={labelStyle}>
              Mobile Number *
            </label>
            <input
              id="av-mobile"
              style={inputStyle(!!errors.mobileNumber)}
              value={form.mobileNumber ?? ''}
              onChange={(e) => set('mobileNumber', e.target.value)}
              placeholder="1234567890"
            />
            {errors.mobileNumber && (
              <div style={{ fontSize: 11, color: T.danger, marginTop: 3 }}>
                {errors.mobileNumber}
              </div>
            )}
          </div>
          {/* Contact Name */}
          <div>
            <label htmlFor="av-contact" style={labelStyle}>
              Contact Person *
            </label>
            <input
              id="av-contact"
              style={inputStyle(!!errors.contactName)}
              value={form.contactName ?? ''}
              onChange={(e) => set('contactName', e.target.value)}
              placeholder="John Doe"
            />
            {errors.contactName && (
              <div style={{ fontSize: 11, color: T.danger, marginTop: 3 }}>
                {errors.contactName}
              </div>
            )}
          </div>
          {/* GST */}
          <div>
            <label htmlFor="av-gst" style={labelStyle}>
              GST Number
            </label>
            <input
              id="av-gst"
              style={inputStyle()}
              value={form.gstNumber ?? ''}
              onChange={(e) => set('gstNumber', e.target.value)}
              placeholder="22AAAAA0000A1Z5"
            />
          </div>
          {/* TDS */}
          <div>
            <label htmlFor="av-tds" style={labelStyle}>
              TDS Applied
            </label>
            <select
              id="av-tds"
              value={form.tds ?? 'NO'}
              onChange={(e) => set('tds', e.target.value)}
              style={inputStyle()}
            >
              <option value="NO">NO</option>
              <option value="YES">YES</option>
            </select>
          </div>
          {/* State */}
          <div>
            <label htmlFor="av-state" style={labelStyle}>
              State
            </label>
            <select
              id="av-state"
              value={form.state ?? ''}
              onChange={(e) => set('state', e.target.value)}
              style={inputStyle()}
            >
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {/* Address — full width */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="av-addr" style={labelStyle}>
              Address *
            </label>
            <input
              id="av-addr"
              style={inputStyle(!!errors.address)}
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              placeholder="123 Vendor Street"
            />
            {errors.address && (
              <div style={{ fontSize: 11, color: T.danger, marginTop: 3 }}>{errors.address}</div>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: isMobile ? '12px 16px' : '14px 22px',
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
              fontFamily: T.font,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            style={{
              padding: '9px 22px',
              background: mutation.isPending ? T.muted : T.primary,
              color: mutation.isPending ? T.mutedFg : T.primaryFg,
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: T.font,
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {mutation.isPending ? 'Saving…' : '+ Save Vendor'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AddVendorModal);
