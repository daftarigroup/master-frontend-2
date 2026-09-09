'use client';

import { IconLoader2, IconUserPlus, IconX } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import UserCredentialsDialog, {
  type CreatedUserCredentials,
} from '@/features/profile/createUser/components/UserCredentialsDialog';
import { fetchDepartmentsApi } from '@/features/profile/createUser/server/api/departmentApi';
import { useCreateUserMutation } from '@/features/profile/createUser/server/tanstackQuery/useCreateUserQueries';
import { generateTempPassword } from '@/features/profile/createUser/utils/generateTempPassword';
import { useCompanyShiftQueries } from '@/features/settings/server/tanstackQuery/useSettingQueries';
import { ModalPortal } from '../../_shared/components';
import type { Candidate } from '../types/types';

const T = {
  bg: 'var(--background)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  card2: 'color-mix(in oklch, var(--card) 90%, var(--foreground))',
  muted: 'var(--muted)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryBg: 'color-mix(in oklch, var(--primary) 12%, transparent)',
  primaryFg: 'var(--primary-foreground, #fff)',
  success: 'var(--success)',
  successBg: 'color-mix(in oklch, var(--success) 14%, transparent)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 14%, transparent)',
  font: "'DM Sans', system-ui, sans-serif" as React.CSSProperties['fontFamily'],
};

interface Props {
  candidate: Candidate;
  onClose: () => void;
}

export default function CreateUserFromCandidateModal({ candidate, onClose }: Props) {
  // Identity fields are locked to the candidate's own record — this is an
  // HRFMS-linked account, so the login must always match the real employee
  // data, not whatever an admin might type into a free-text field.
  const fullName = candidate.candidateName;
  const email = candidate.email ?? '';
  const phone = candidate.phoneNo;
  const [departmentId, setDepartmentId] = useState('');
  const [companyShiftId, setCompanyShiftId] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  // Set once the account exists; the temporary password lives nowhere else.
  const [credentials, setCredentials] = useState<CreatedUserCredentials | null>(null);

  const queryClient = useQueryClient();
  const createUser = useCreateUserMutation();
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartmentsApi,
    staleTime: 5 * 60 * 1000,
  });
  const shiftQ = useCompanyShiftQueries();
  const { data: shifts = [] } = shiftQ.useGetShifts();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    if (!phone.trim()) {
      toast.error('Phone is required');
      return;
    }
    // Generated at submit time, never rendered before the account exists.
    const tempPassword = generateTempPassword();

    createUser.mutate(
      {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        departmentId: departmentId || undefined,
        companyShiftId: companyShiftId || undefined,
        password: tempPassword,
        role,
        hrEmployeeId: candidate.hrEmployee?.id,
        candidateId: candidate.id,
      },
      {
        onSuccess: (response) => {
          queryClient.invalidateQueries({ queryKey: ['hr', 'candidates'] });
          const created = response?.data ?? response ?? {};
          // Server values win: for a candidate-linked account both the
          // employee ID and the contact details come off the HRFMS record.
          setCredentials({
            loginId: created.phone ?? phone.trim(),
            password: tempPassword,
            fullName: created.fullName ?? fullName.trim(),
            employeeId: created.employeeId ?? undefined,
            email: created.email ?? email.trim() ?? undefined,
          });
        },
      }
    );
  };

  const handleCredentialsClose = () => {
    setCredentials(null);
    toast.success('User created successfully', {
      description: 'The user must set a new password on first login.',
    });
    onClose();
  };

  // Once the account exists the form is done: swap it for the one-time
  // credentials handover rather than stacking dialogs on top of each other.
  if (credentials) {
    return <UserCredentialsDialog credentials={credentials} onClose={handleCredentialsClose} />;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 38,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    background: T.muted,
    color: T.fg,
    fontSize: 13,
    fontFamily: T.font,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: T.mutedFg,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 5,
  };

  return (
    <ModalPortal>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          fontFamily: T.font,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: T.primaryBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.primary,
              }}
            >
              <IconUserPlus size={17} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: T.fg, margin: 0 }}>
                Create User Account
              </p>
              <p style={{ fontSize: 11, color: T.mutedFg, margin: 0 }}>{candidate.candidateName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: T.mutedFg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px 16px',
            }}
          >
            {/* Full Name — locked to the candidate's own record */}
            <div>
              <label htmlFor="cu-fullname" style={labelStyle}>
                Full Name
              </label>
              <input
                id="cu-fullname"
                type="text"
                value={fullName}
                readOnly
                disabled
                style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            {/* Email — locked to the candidate's own record */}
            <div>
              <label htmlFor="cu-email" style={labelStyle}>
                Email
              </label>
              <input
                id="cu-email"
                type="email"
                value={email}
                readOnly
                disabled
                style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            {/* Phone — locked to the candidate's own record */}
            <div>
              <label htmlFor="cu-phone" style={labelStyle}>
                Phone
              </label>
              <input
                id="cu-phone"
                type="tel"
                value={phone}
                readOnly
                disabled
                style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            {/* Employee ID — derived server-side from the linked HrEmployee record,
                never typed manually (that's what let it collide with someone else's ID) */}
            <div>
              <label htmlFor="cu-empid" style={labelStyle}>
                Employee ID
              </label>
              <input
                id="cu-empid"
                type="text"
                value={candidate.hrEmployee?.employeeId ?? 'Auto-generated on creation'}
                readOnly
                disabled
                style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            {/* Department */}
            <div>
              <label htmlFor="cu-dept" style={labelStyle}>
                Department
              </label>
              <select
                id="cu-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                disabled={createUser.isPending}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift */}
            <div>
              <label htmlFor="cu-shift" style={labelStyle}>
                Company Shift
              </label>
              <select
                id="cu-shift"
                value={companyShiftId}
                onChange={(e) => setCompanyShiftId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                disabled={createUser.isPending}
              >
                <option value="">Select shift</option>
                {shifts.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Password: generated on submit and revealed once, after the
              account exists, so it is never on screen beforehand. */}
          <div
            style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px dashed ${T.border}`,
              background: T.muted,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: T.fg, margin: 0 }}>Login Password</p>
            <p style={{ fontSize: 11, color: T.mutedFg, margin: '4px 0 0' }}>
              A strong temporary password is generated automatically. It is shown once, right after
              the account is created, so you can copy and share it securely.
            </p>
          </div>

          {/* Role */}
          <div style={{ marginTop: 16 }}>
            <p style={labelStyle}>Role *</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['USER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  disabled={createUser.isPending}
                  style={{
                    padding: '7px 18px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    border: role === r ? `2px solid ${T.primary}` : `2px solid ${T.border}`,
                    background: role === r ? T.primaryBg : T.muted,
                    color: role === r ? T.primary : T.mutedFg,
                    fontFamily: T.font,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: T.mutedFg, marginTop: 5 }}>
              {role === 'ADMIN'
                ? 'Admins can manage users, permissions and system settings.'
                : 'Standard access to platform features. Permissions can be configured from the profile page.'}
            </p>
          </div>

          {/* Footer */}
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
              disabled={createUser.isPending}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: `1px solid ${T.border}`,
                background: T.muted,
                color: T.fg,
                cursor: 'pointer',
                fontFamily: T.font,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUser.isPending}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                background: T.primary,
                color: T.primaryFg,
                cursor: createUser.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                opacity: createUser.isPending ? 0.7 : 1,
                fontFamily: T.font,
              }}
            >
              {createUser.isPending && (
                <IconLoader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              )}
              {createUser.isPending ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
);
}
