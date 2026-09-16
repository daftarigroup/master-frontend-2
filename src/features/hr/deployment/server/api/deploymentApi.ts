import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { hrApiClient } from '@/lib/hrApiClient';
import type {
  AssignToProjectPayload,
  ProjectAssignment,
  ProjectAssignmentEvent,
  ProjectAssignmentFilters,
  ProjectLeavePayload,
  RemoveFromProjectPayload,
  ResumeProjectPayload,
  ShiftProjectPayload,
} from '../../types/types';

const unwrap = <T>(res: any): T => {
  if (res && res.data !== undefined) {
    if (res.data && res.data.data !== undefined) {
      return res.data.data;
    }
    return res.data;
  }
  return res;
};

export const fetchProjectAssignments = async (
  filters?: ProjectAssignmentFilters,
  actAsTenantId?: string
): Promise<ProjectAssignment[]> => {
  const params: Record<string, any> = {};
  if (filters?.projectId && filters.projectId !== 'all') params.projectId = filters.projectId;
  if (filters?.employeeId) params.employeeId = filters.employeeId;
  if (filters?.status && filters.status !== 'all') params.status = filters.status;
  if (filters?.search) params.search = filters.search;
  if (filters?.departmentName) params.department = filters.departmentName;

  const response = await hrApiClient.get('/assignments', {
    params,
    ...actAsTenantHeaders(actAsTenantId),
  });
  return unwrap<ProjectAssignment[]>(response) || [];
};

export const fetchEmployeeActiveAssignment = async (
  employeeId: string,
  actAsTenantId?: string
): Promise<ProjectAssignment | null> => {
  if (!employeeId) return null;
  const response = await hrApiClient.get(
    `/assignments/active?employeeId=${encodeURIComponent(employeeId)}`,
    actAsTenantHeaders(actAsTenantId)
  );
  return unwrap<ProjectAssignment | null>(response) || null;
};

export const fetchAssignmentEvents = async (
  filters?: { employeeId?: string; assignmentId?: string },
  actAsTenantId?: string
): Promise<ProjectAssignmentEvent[]> => {
  const params: Record<string, any> = {};
  if (filters?.employeeId) params.employeeId = filters.employeeId;
  if (filters?.assignmentId) params.assignmentId = filters.assignmentId;

  const response = await hrApiClient.get('/assignments/events', {
    params,
    ...actAsTenantHeaders(actAsTenantId),
  });
  return unwrap<ProjectAssignmentEvent[]>(response) || [];
};

export const assignToProject = async (
  payload: AssignToProjectPayload,
  actAsTenantId?: string
): Promise<ProjectAssignment> => {
  const response = await hrApiClient.post(
    '/assignments',
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return unwrap<ProjectAssignment>(response);
};

export const shiftProjectAssignment = async (
  assignmentId: string,
  payload: ShiftProjectPayload,
  actAsTenantId?: string
): Promise<ProjectAssignment> => {
  const response = await hrApiClient.post(
    `/assignments/${assignmentId}/shift`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return unwrap<ProjectAssignment>(response);
};

export const removeFromProject = async (
  assignmentId: string,
  payload: RemoveFromProjectPayload,
  actAsTenantId?: string
): Promise<ProjectAssignment> => {
  const response = await hrApiClient.post(
    `/assignments/${assignmentId}/remove`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return unwrap<ProjectAssignment>(response);
};

export const putOnProjectLeave = async (
  assignmentId: string,
  payload: ProjectLeavePayload,
  actAsTenantId?: string
): Promise<ProjectAssignment> => {
  const response = await hrApiClient.post(
    `/assignments/${assignmentId}/leave`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return unwrap<ProjectAssignment>(response);
};

export const resumeProjectAssignment = async (
  assignmentId: string,
  payload: ResumeProjectPayload,
  actAsTenantId?: string
): Promise<ProjectAssignment> => {
  const response = await hrApiClient.post(
    `/assignments/${assignmentId}/resume`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return unwrap<ProjectAssignment>(response);
};
