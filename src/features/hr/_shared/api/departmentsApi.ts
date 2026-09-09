import { api } from '@/lib/axios';

export interface DepartmentOption {
  id: string;
  name: string;
  code?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}

// Authoritative source for HR departments — Department.id is a cuid required by
// HrIndent.departmentId / HrEmployee.departmentId / HrLeave.departmentId FKs.
export const fetchDepartments = async (): Promise<DepartmentOption[]> => {
  const response = await api.get('/maintenance/departments', {
    params: { limit: 200, status: 'ACTIVE' },
  });
  // DepartmentController returns { status, data, pagination } (NOT BaseController shape)
  const payload = response.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};
