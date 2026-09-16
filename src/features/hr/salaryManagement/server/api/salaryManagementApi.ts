import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type {
  AllTransactionsResponse,
  AttendanceDayRecord,
  EmployeeLoan,
  EmployeeSalaryStructure,
  PayrollDeductionItem,
  PayrollOverview,
  SalaryEmployeeListItem,
  UpsertStructureDto,
} from '../../types/types';

export interface StructurePreview {
  basic: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  grossEarnings: number;
  deductionBreakdown: PayrollDeductionItem[];
  totalDeductions: number;
  netPay: number;
}

export const previewStructure = async (
  data: UpsertStructureDto,
  signal?: AbortSignal
): Promise<StructurePreview> => {
  const res = await api.post('/hrfms/salary/structure/preview', data, { signal });
  return res.data.data;
};

export const fetchPayrollOverview = async (
  month: number,
  year: number
): Promise<PayrollOverview> => {
  const res = await api.get('/hrfms/salary/payroll', { params: { month, year } });
  return res.data.data;
};

export const holdSalaryApi = async (
  employeeId: string,
  hold: boolean,
  reason?: string,
  actAsTenantId?: string
): Promise<void> => {
  await api.patch(
    `/hrfms/salary/hold/${employeeId}`,
    { hold, reason },
    actAsTenantHeaders(actAsTenantId)
  );
};

export const generatePayslipApi = async (
  payload: {
    employeeId: string;
    month: number;
    year: number;
  },
  actAsTenantId?: string
): Promise<void> => {
  await api.post('/hrfms/salary/payslips/generate', payload, actAsTenantHeaders(actAsTenantId));
};

export const markPayslipPaidApi = async (
  payslipId: number,
  actAsTenantId?: string
): Promise<void> => {
  await api.patch(
    `/hrfms/salary/payslip/${payslipId}/mark-paid`,
    undefined,
    actAsTenantHeaders(actAsTenantId)
  );
};

export interface AllTransactionsFilters {
  search?: string;
  month?: number;
  year?: number;
  status?: string;
  empStatus?: string;
  page?: number;
  limit?: number;
}

export const fetchSalaryEmployeeList = async (filters: {
  search?: string;
  dept?: string;
}): Promise<SalaryEmployeeListItem[]> => {
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.dept) params.dept = filters.dept;
  const res = await api.get('/hrfms/salary/employees', { params });
  return res.data.data;
};

export const fetchEmployeeMonthlyAttendance = async (
  employeeId: string,
  month: number,
  year: number,
  actAsTenantId?: string
): Promise<AttendanceDayRecord[]> => {
  const res = await api.get('/hrfms/attendance/monthly', {
    params: { employeeId, month, year },
    ...actAsTenantHeaders(actAsTenantId),
  });
  return res.data.data;
};

export const fetchEmployeeLoans = async (
  employeeId: string,
  actAsTenantId?: string
): Promise<EmployeeLoan[]> => {
  const res = await api.get(
    `/hrfms/salary/employee-loans/${employeeId}`,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const fetchEmployeeStructureApi = async (
  employeeId: string,
  actAsTenantId?: string
): Promise<EmployeeSalaryStructure | null> => {
  const res = await api.get(
    `/hrfms/salary/structure/employee/${employeeId}`,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const upsertEmployeeStructureApi = async (
  employeeId: string,
  data: UpsertStructureDto,
  actAsTenantId?: string
): Promise<EmployeeSalaryStructure> => {
  const res = await api.post(
    `/hrfms/salary/structure/employee/${employeeId}`,
    data,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const fetchAllTransactions = async (
  filters: AllTransactionsFilters
): Promise<AllTransactionsResponse> => {
  const params: Record<string, string | number> = {};
  if (filters.search) params.search = filters.search;
  if (filters.month) params.month = filters.month;
  if (filters.year) params.year = filters.year;
  if (filters.status) params.status = filters.status;
  if (filters.empStatus) params.empStatus = filters.empStatus;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;
  const res = await api.get('/hrfms/salary/all-transactions', { params });
  return res.data.data;
};
