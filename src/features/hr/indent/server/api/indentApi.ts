import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type { Indent } from '../../types/types';

export interface CreateIndentPayload {
  title: string;
  gender: 'MALE' | 'FEMALE' | 'ANY';
  // backend accepts either `departmentId` or `department` and falls back to one
  departmentId?: string;
  department?: string;
  prefer: 'FRESHER' | 'EXPERIENCE' | 'ANY';
  experienceYears?: string;
  noOfPost: number;
  completionDate: string; // ISO string
  socialsite: string[];
  jobType: string[];
  budget?: number | null;
  priority?: string;
  status?: string;
}

export const fetchIndents = async (): Promise<Indent[]> => {
  const response = await api.get('/hrfms/indent');
  return response.data.data;
};

export const fetchPendingIndents = async (): Promise<Indent[]> => {
  const response = await api.get('/hrfms/indent/get-pending');
  return response.data.data;
};

export const fetchIndentById = async (id: string): Promise<Indent | null> => {
  const response = await api.get(`/hrfms/indent/${id}`);
  return response.data.data;
};

export const createIndent = async (data: CreateIndentPayload): Promise<Indent> => {
  const response = await api.post('/hrfms/indent', data);
  return response.data.data;
};

export const updateIndent = async (
  id: string,
  data: Partial<CreateIndentPayload>,
  actAsTenantId?: string
): Promise<Indent> => {
  const response = await api.patch(`/hrfms/indent/${id}`, data, actAsTenantHeaders(actAsTenantId));
  return response.data.data;
};

export const deleteIndent = async (id: string): Promise<void> => {
  await api.delete(`/hrfms/indent/${id}`);
};

export const getDepartments = (): string[] => {
  return ['Engineering', 'Production', 'Quality', 'Sales', 'Marketing', 'HR', 'Finance', 'Admin'];
};
