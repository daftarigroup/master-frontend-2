'use client';

import React, { useState } from 'react';
import {
  IconArrowRight,
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconClock,
  IconLoader2,
  IconUser,
  IconUserMinus,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProjectAssignment } from '../types/types';

export const FALLBACK_PROJECTS: { id: number | string; name: string }[] = [];

interface AssignModalProps {
  employee: {
    id: string | number;
    employeeId: string;
    name: string;
    designation?: string | null;
    department?: string | { id?: string | number; name?: string } | null;
  };
  projects?: { id: number | string; name: string }[];
  onClose: () => void;
  onConfirm: (payload: {
    employeeId: string;
    projectId: number | string;
    projectName: string;
    roleOnProject: string;
    assignedDate: string;
    notes?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export const AssignToProjectModal: React.FC<AssignModalProps> = ({
  employee,
  projects = [],
  onClose,
  onConfirm,
  loading = false,
}) => {
  const activeProjectList = projects;
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    String(activeProjectList[0]?.id || '')
  );
  const [role, setRole] = useState(employee.designation || 'Site Supervisor');
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = activeProjectList.find((p) => String(p.id) === String(selectedProjectId)) || activeProjectList[0];
    await onConfirm({
      employeeId: employee.employeeId,
      projectId: proj.id,
      projectName: proj.name,
      roleOnProject: role.trim() || employee.designation || 'Staff',
      assignedDate,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <IconUserPlus className="h-4.5 w-4.5" />
            </span>
            Deploy to Project
          </DialogTitle>
          <DialogDescription>
            Assign <span className="font-semibold text-foreground">{employee.name}</span> from bench to a site project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="assign-project">Target Project</Label>
            <select
              id="assign-project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-9.5 w-full cursor-pointer rounded-lg border border-border bg-muted px-3 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary"
            >
              {activeProjectList.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-role">Role on Project / Site Designation</Label>
            <Input
              id="assign-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Lead Project Engineer, QC Inspector…"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-date">Deployment Date</Label>
            <Input
              id="assign-date"
              type="date"
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-notes">Deployment Notes (Optional)</Label>
            <Textarea
              id="assign-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Site instructions, reporting specifics…"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedProjectId || !role.trim()}>
              {loading && <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Confirm Deployment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface ShiftModalProps {
  assignment: ProjectAssignment;
  projects?: { id: number | string; name: string }[];
  onClose: () => void;
  onConfirm: (payload: {
    targetProjectId: number | string;
    targetProjectName: string;
    newRoleOnProject?: string;
    effectiveDate?: string;
    reason?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export const ShiftProjectModal: React.FC<ShiftModalProps> = ({
  assignment,
  projects = [],
  onClose,
  onConfirm,
  loading = false,
}) => {
  const activeProjectList = projects.filter(
    (p) => String(p.id) !== String(assignment.projectId) && p.name !== assignment.projectName
  );

  const [targetProjectId, setTargetProjectId] = useState<string>(
    String(activeProjectList[0]?.id || '')
  );
  const [newRole, setNewRole] = useState(assignment.roleOnProject);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const proj = activeProjectList.find((p) => String(p.id) === String(targetProjectId)) || activeProjectList[0];
    if (!proj) return;
    await onConfirm({
      targetProjectId: proj.id,
      targetProjectName: proj.name,
      newRoleOnProject: newRole.trim() || assignment.roleOnProject,
      effectiveDate,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <IconArrowRight className="h-4.5 w-4.5" />
            </span>
            Shift Project Assignment
          </DialogTitle>
          <DialogDescription>
            Transfer <span className="font-semibold text-foreground">{assignment.employee?.name || assignment.employee?.empCode || 'Employee'}</span> from <span className="font-semibold text-primary">{assignment.projectName}</span> to another project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="shift-target">New Target Project</Label>
            <select
              id="shift-target"
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="h-9.5 w-full cursor-pointer rounded-lg border border-border bg-muted px-3 text-[13px] font-medium text-foreground outline-none transition-colors focus:border-primary"
              required
            >
              {activeProjectList.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shift-role">Role on New Project</Label>
            <Input
              id="shift-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shift-date">Effective Transfer Date</Label>
            <Input
              id="shift-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shift-reason">Reason for Transfer</Label>
            <Textarea
              id="shift-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Phase completion at current site, urgent manpower needed at target…"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !targetProjectId || !reason.trim()}>
              {loading && <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Execute Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface RemoveModalProps {
  assignment: ProjectAssignment;
  onClose: () => void;
  onConfirm: (payload: { effectiveDate?: string; reason: string }) => Promise<void>;
  loading?: boolean;
}

export const RemoveFromProjectModal: React.FC<RemoveModalProps> = ({
  assignment,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      effectiveDate,
      reason: reason.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <IconUserMinus className="h-4.5 w-4.5" />
            </span>
            Remove to Bench
          </DialogTitle>
          <DialogDescription>
            End deployment of <span className="font-semibold text-foreground">{assignment.employee?.name || assignment.employee?.empCode || 'Employee'}</span> from <span className="font-semibold text-foreground">{assignment.projectName}</span>. They will return to the department bench pool.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="remove-date">Release Date</Label>
            <Input
              id="remove-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="remove-reason">Reason for Removal</Label>
            <Textarea
              id="remove-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scope of work finished, site demobilization, performance…"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading || !reason.trim()}>
              {loading && <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Return to Bench
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface LeaveModalProps {
  assignment: ProjectAssignment;
  onClose: () => void;
  onConfirm: (payload: { effectiveDate?: string; reason: string }) => Promise<void>;
  loading?: boolean;
}

export const ProjectLeaveModal: React.FC<LeaveModalProps> = ({
  assignment,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({
      effectiveDate,
      reason: reason.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <IconClock className="h-4.5 w-4.5" />
            </span>
            Place on Project Leave
          </DialogTitle>
          <DialogDescription>
            Temporarily exclude <span className="font-semibold text-foreground">{assignment.employee?.name || assignment.employee?.empCode || 'Employee'}</span> from <span className="font-semibold text-foreground">{assignment.projectName}</span>'s active headcount without releasing their project link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="leave-date">Effective Date</Label>
            <Input
              id="leave-date"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leave-reason">Leave Reason / Notes</Label>
            <Textarea
              id="leave-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Medical recovery, exams, site standby…"
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={loading || !reason.trim()}>
              {loading && <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Confirm Project Leave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
