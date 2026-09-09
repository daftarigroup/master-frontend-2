import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type {
  GeneratePayslipDto,
  Payslip,
  SalaryStructure,
  UpsertStructureDto,
} from '../../types/types';

export const fetchStructure = async (): Promise<SalaryStructure | null> => {
  const res = await api.get('/hrfms/salary/structure');
  return res.data.data;
};

export const upsertStructure = async (data: UpsertStructureDto): Promise<SalaryStructure> => {
  const res = await api.post('/hrfms/salary/structure', data);
  return res.data.data;
};

export const fetchMyPayslips = async (): Promise<Payslip[]> => {
  const res = await api.get('/hrfms/salary/payslips/me');
  return res.data.data;
};

export const fetchPayslips = async (
  employeeId: string,
  actAsTenantId?: string
): Promise<Payslip[]> => {
  const res = await api.get(
    `/hrfms/salary/payslips/${employeeId}`,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const generatePayslip = async (
  data: GeneratePayslipDto,
  actAsTenantId?: string
): Promise<Payslip> => {
  const res = await api.post(
    '/hrfms/salary/payslips/generate',
    data,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const markPayslipPaid = async (id: number, actAsTenantId?: string): Promise<Payslip> => {
  const res = await api.patch(
    `/hrfms/salary/payslip/${id}/mark-paid`,
    undefined,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const deletePayslip = async (id: number, actAsTenantId?: string): Promise<void> => {
  await api.delete(`/hrfms/salary/payslip/${id}`, actAsTenantHeaders(actAsTenantId));
};

export const fetchAttendanceSummary = async (
  month: number,
  year: number
): Promise<{ workingDays: number; daysPresent: number }> => {
  const res = await api.get('/hrfms/salary/attendance-summary', { params: { month, year } });
  return res.data.data;
};
