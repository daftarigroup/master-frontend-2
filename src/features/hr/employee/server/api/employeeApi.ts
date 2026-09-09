// HR Employee API - real backend
import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { uploadFileViaPresignedUrl } from '@/lib/api/storage.api';
import { api } from '@/lib/axios';
import type { Employee, EmployeeStats, OnboardingEmployee } from '../../types/types';

export interface EmployeePayload {
  name: string;
  // Optional human-readable "EMP001"-style ID; leave blank to let the
  // backend auto-generate the next one for this tenant.
  empCode?: string;
  phone?: string;
  email?: string;
  designation?: string;
  // backend accepts `departmentId` or `department`
  departmentId?: string;
  department?: string;
  joiningDate?: string;
  status?: string;
  lastWorkingDay?: string;
  terminationDate?: string;
  separationType?: string;
  leavingReason?: string;
  managerName?: string;
  bloodGroup?: string;
  workLocation?: string;
  applyingFor?: string;
  indentNo?: string;
  candidateEnquiryNo?: string;
  bankAccount?: string;
  ifscCode?: string;
  // Joining details (persisted on a linked HrJoining row, not HrEmployee directly)
  fatherName?: string;
  highestQualification?: string;
  currentAddress?: string;
  aadharAddress?: string;
  aadharNo?: string;
  employmentType?: string;
  companyName?: string;
  joiningPlace?: string;
  attendanceMode?: string;
  offeredCTC?: string;
  monthlySalary?: number;
  probationMonths?: number;
  bankBranchName?: string;
  paymentMode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  emailToBeIssued?: boolean;
  mobileToBeIssued?: boolean;
  laptopToBeIssued?: boolean;
  pfEligible?: boolean;
  esicEligible?: boolean;
  pastPfNo?: string;
  esicNo?: string;
  // Set only on a resubmit after the admin reviewed and approved overwriting
  // a pre-existing, unlinked account's mismatched data (see
  // AccountLinkFieldDiff / ACCOUNT_DATA_MISMATCH below).
  confirmAccountLinkOverwrite?: boolean;
  // file fields are sent via FormData on multipart calls
}

/** One field that differs between an existing account and the employee data
 * about to be linked to it — see ACCOUNT_DATA_MISMATCH below. */
export interface AccountLinkFieldDiff {
  field: 'name' | 'email' | 'departmentId';
  label: string;
  /** Value currently stored on the existing account. */
  current: string | null;
  /** Value that will be written onto it if the link/overwrite proceeds. */
  incoming: string | null;
}

export interface AccountLinkMismatchInfo {
  conflict: 'ACCOUNT_DATA_MISMATCH';
  user: { id: string; name: string | null; email: string | null };
  diffs: AccountLinkFieldDiff[];
}

export interface SeparationPayload {
  lastWorkingDay: string;
  leavingReason?: string;
  status?: string;
}

// Only `photo` is a real employee field — the backend never accepted a
// `resume` for employees (that's a candidate-only artifact), so it's not
// uploaded here either.
const uploadEmployeePhoto = (
  files: { photo?: File; resume?: File } | undefined,
  actAsTenantId?: string
): Promise<string | undefined> =>
  files?.photo
    ? uploadFileViaPresignedUrl(files.photo, 'uploads', 'employees/photos', actAsTenantId)
    : Promise.resolve(undefined);

export const fetchEmployees = async (): Promise<Employee[]> => {
  const response = await api.get('/hrfms/employee');
  return response.data.data;
};

export const fetchLeavingEmployees = async (): Promise<Employee[]> => {
  const response = await api.get('/hrfms/employee/leaving');
  return response.data.data;
};

export const fetchEmployeeStats = async (): Promise<EmployeeStats> => {
  const response = await api.get('/hrfms/employee/stats');
  return response.data.data;
};

export const fetchEmployeeById = async (
  id: string,
  actAsTenantId?: string
): Promise<Employee | null> => {
  const response = await api.get(`/hrfms/employee/${id}`, actAsTenantHeaders(actAsTenantId));
  return response.data.data;
};

export const createEmployee = async (
  data: EmployeePayload,
  files?: { photo?: File; resume?: File },
  actAsTenantId?: string
): Promise<Employee> => {
  const photo = await uploadEmployeePhoto(files, actAsTenantId);
  const response = await api.post(
    '/hrfms/employee',
    { ...data, photo },
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const updateEmployee = async (
  id: string,
  data: Partial<EmployeePayload>,
  files?: { photo?: File; resume?: File },
  actAsTenantId?: string
): Promise<Employee> => {
  const photo = await uploadEmployeePhoto(files, actAsTenantId);
  const response = await api.patch(
    `/hrfms/employee/${id}`,
    { ...data, photo },
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const recordSeparation = async (
  id: string,
  data: SeparationPayload,
  actAsTenantId?: string
): Promise<Employee> => {
  const response = await api.patch(
    `/hrfms/employee/${id}/leaving`,
    data,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const deleteEmployee = async (id: string, actAsTenantId?: string): Promise<void> => {
  await api.delete(`/hrfms/employee/${id}`, actAsTenantHeaders(actAsTenantId));
};

export interface BulkImportRow {
  row: number;
  name: string;
  phone: string;
  email?: string;
  // Optional human-readable "EMP001"-style ID; leave blank to let the
  // backend auto-generate the next one for this tenant.
  empCode?: string;
  designation?: string;
  department?: string;
  joiningDate?: string;
  workLocation?: string;
  managerName?: string;
  bloodGroup?: string;
  bankAccount?: string;
  ifscCode?: string;
  monthlySalary?: number;
  // Set only on a resubmit of a row previously reported in
  // pendingLinkConfirmations, after the admin reviewed and approved the diff.
  confirmAccountLinkOverwrite?: boolean;
}

export interface BulkImportResult {
  created: { row: number; employeeId: string; empCode: string | null; name: string }[];
  errors: { row: number; error: string }[];
  pendingLinkConfirmations: {
    row: number;
    name: string;
    phone: string;
    user: { id: string; name: string | null; email: string | null };
    diffs: AccountLinkFieldDiff[];
  }[];
}

export const bulkImportEmployees = async (rows: BulkImportRow[]): Promise<BulkImportResult> => {
  const response = await api.post('/hrfms/employee/bulk-import', { rows });
  return response.data.data;
};

export const getDepartments = (): string[] => {
  return ['Engineering', 'Production', 'Quality', 'Sales', 'Marketing', 'HR', 'Finance', 'Admin'];
};

export interface JoinedWithoutAccountEmployee {
  id: number;
  employeeId: string;
  empCode?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
}

export const fetchJoinedWithoutAccount = async (): Promise<JoinedWithoutAccountEmployee[]> => {
  try {
    const response = await api.get('/hrfms/employee/joined-without-account');
    const data = response?.data?.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

export const fetchOnboardingList = async (): Promise<OnboardingEmployee[]> => {
  try {
    const response = await api.get('/hrfms/employee/onboarding');
    const data = response?.data?.data;
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

export interface OnboardingPayload {
  offerLetterIssued?: boolean;
  idCardIssued?: boolean;
  inductionDone?: boolean;
  onboardingChecklist?: Record<string, boolean>;
  customChecklistItems?: { key: string; label: string }[];
}

export const updateEmployeeOnboarding = async (
  id: string,
  data: OnboardingPayload,
  actAsTenantId?: string
): Promise<OnboardingEmployee> => {
  const response = await api.patch(
    `/hrfms/employee/${id}/onboarding`,
    data,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export interface ChecklistConfig {
  disabledStandardKeys: string[];
  globalCustomItems: { key: string; label: string }[];
}

export const fetchChecklistConfig = async (): Promise<ChecklistConfig> => {
  try {
    const response = await api.get('/hrfms/employee/checklist-config');
    const resData = response?.data?.data;
    if (resData && typeof resData === 'object' && !Array.isArray(resData)) {
      return {
        disabledStandardKeys: Array.isArray(resData.disabledStandardKeys)
          ? resData.disabledStandardKeys
          : [],
        globalCustomItems: Array.isArray(resData.globalCustomItems) ? resData.globalCustomItems : [],
      };
    }
  } catch {}
  return {
    disabledStandardKeys: [],
    globalCustomItems: [],
  };
};

export const saveChecklistConfig = async (data: ChecklistConfig): Promise<ChecklistConfig> => {
  const response = await api.patch('/hrfms/employee/checklist-config', data);
  return response.data?.data ?? data;
};
