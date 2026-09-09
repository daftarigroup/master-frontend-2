// HR Candidate (Find Enquiry) Types

export type DocStatus = 'submitted' | 'pending' | 'not_required';

export interface DocEntry {
  status: DocStatus;
  url?: string;
  mediaId?: string;
  fileName?: string;
}

export interface Candidate {
  id: number;
  tenantId: string;
  indentId: number;
  candidateEnquiryNo: string;
  candidateName: string;
  dob: string;
  phoneNo: string;
  email?: string | null;
  previousCompany: string;
  experience: string;
  previousPosition: string;
  maritalStatus: string;
  aadharNo: string;
  lastSalary: string;
  reasonForLeaving: string;
  currentAddress: string;
  photo?: string | null;
  resume?: string | null;
  status: string;
  notes?: string | null;
  nextCallDate?: string | null;
  followUpNotes?: string | null;
  tatPlannedAt?: string | null;
  tatDelayMinutes?: number | null;
  processedAt?: string | null;
  processedById?: string | null;
  processedBy?: { id: string; name: string | null } | null;
  yourProjectedPlannedAt?: string | null;
  indent?: {
    id: number;
    title: string;
    recordId?: string | null;
  } | null;
  hrEmployee?: {
    id: number;
    employeeId: string;
    designation?: string | null;
    status: string;
    userId?: string | null;
  } | null;
  joining?: {
    id: number;
    status: string;
    joiningDate: string;
    documents?: Record<string, DocEntry | string> | null;
    monthlySalary?: number | null;
    offeredCTC?: string | null;
    employmentType?: string | null;
    workLocation?: string | null;
    reportingManager?: string | null;
    bankAccount?: string | null;
    ifscCode?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}
