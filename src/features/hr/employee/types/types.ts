// HR Employee Types

export interface Employee {
  id: string;
  employeeId: string;
  // Human-readable "EMP001"-style ID, scoped per tenant — shown in the UI
  // instead of the internal `employeeId`. Nullable for employees created
  // before this field existed and not yet backfilled on this environment.
  empCode?: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  designation: string | null;
  joiningDate: string;
  status: 'active' | 'on_notice' | 'exit_interview' | 'left' | 'completed';
  bloodGroup?: string | null;
  managerName?: string | null;
  workLocation?: string | null;
  lastWorkingDay?: string | null;
  terminationDate?: string | null;
  separationType?: string | null;
  leavingReason?: string | null;
  offerLetterIssued?: boolean;
  offerLetterIssuedAt?: string | null;
  idCardIssued?: boolean;
  inductionDone?: boolean;
  // Direct Employee Joining links here; candidate-pipeline joins link via candidate.joining.
  // aadharNo is only present on the single-employee response (GET /hrfms/employee/:id) —
  // the list response omits it so the raw number never rides along in bulk list payloads.
  joining?: {
    probationMonths?: number | null;
    aadharNo?: string | null;
  } | null;
  candidate?: {
    joining?: {
      probationMonths?: number | null;
    } | null;
  } | null;
  // Present only under "All Companies" (merged) view — see
  // EmployeeRepository.findAllByTenant's conditional tenant include.
  tenant?: { id: string; name: string } | null;
}

export interface OnboardingJoining {
  emailToBeIssued: boolean | null;
  mobileToBeIssued: boolean | null;
  laptopToBeIssued: boolean | null;
  pfEligible: boolean | null;
  esicEligible: boolean | null;
}

export interface CustomChecklistItem {
  key: string;
  label: string;
}

export interface OnboardingEmployee {
  id: number;
  employeeId: string;
  empCode?: string | null;
  name: string;
  designation: string | null;
  joiningDate: string;
  offerLetterIssued: boolean;
  offerLetterIssuedAt: string | null;
  idCardIssued: boolean;
  inductionDone: boolean;
  onboardingChecklist: Record<string, boolean> | null;
  customChecklistItems: CustomChecklistItem[] | null;
  department: { id: string; name: string } | null;
  // Direct Employee Joining links here; candidate-pipeline joins link via candidate.joining
  joining: OnboardingJoining | null;
  candidate: { joining: OnboardingJoining | null } | null;
  tatPlannedAt?: string | null;
  tatDelayMinutes?: number | null;
  processedAt?: string | null;
  processedById?: string | null;
  processedBy?: { id: string; name: string | null } | null;
  yourProjectedPlannedAt?: string | null;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface EmployeeFilters {
  search: string;
  department: string;
  status: string;
}

export interface EmployeeStats {
  total: number;
  active: number;
  onNotice: number;
  left: number;
}
