// HR Manpower Deployment & Project Assignment Types

export type ProjectAssignmentStatus = 'active' | 'on_leave' | 'shifted' | 'removed' | 'completed';

export type ProjectAssignmentEventType =
  | 'assigned'
  | 'resumed'
  | 'shifted'
  | 'removed'
  | 'completed'
  | 'put_on_leave';

export interface ProjectAssignmentEmployeeSummary {
  id: string | number;
  employeeId: string;
  empCode?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  designation?: string | null;
  joiningDate?: string | null;
}

export interface ProjectAssignment {
  id: string;
  employeeId: string;
  projectId: number | string;
  projectName: string;
  roleOnProject: string;
  status: ProjectAssignmentStatus;
  assignedDate: string;
  endDate: string | null;
  linkedAssignmentId: string | null;
  reason: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: ProjectAssignmentEmployeeSummary | null;
  tenant?: { id: string; name: string } | null;
}

export interface ProjectAssignmentEvent {
  id: string;
  assignmentId: string;
  employeeId: string;
  eventType: ProjectAssignmentEventType;
  fromProjectId: number | string | null;
  toProjectId: number | string | null;
  fromProjectName: string | null;
  toProjectName: string | null;
  notes: string | null;
  performedBy: string | null;
  timestamp: string;
}

export interface AssignToProjectPayload {
  employeeId: string;
  projectId: number | string;
  projectName: string;
  roleOnProject: string;
  assignedDate?: string;
  notes?: string;
  approvedBy?: string;
}

export interface ShiftProjectPayload {
  targetProjectId: number | string;
  targetProjectName: string;
  newRoleOnProject?: string;
  effectiveDate?: string;
  reason?: string;
  approvedBy?: string;
}

export interface RemoveFromProjectPayload {
  effectiveDate?: string;
  reason: string;
  approvedBy?: string;
}

export interface ProjectLeavePayload {
  effectiveDate?: string;
  reason: string;
  approvedBy?: string;
}

export interface ResumeProjectPayload {
  effectiveDate?: string;
  notes?: string;
  approvedBy?: string;
}

export interface ProjectAssignmentFilters {
  projectId?: number | string | 'all';
  employeeId?: string;
  status?: ProjectAssignmentStatus | 'all';
  search?: string;
  departmentName?: string;
}
