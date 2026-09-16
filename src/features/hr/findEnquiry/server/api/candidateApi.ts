import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { uploadFileViaPresignedUrl } from '@/lib/api/storage.api';
import { api } from '@/lib/axios';
import type { Candidate, DocEntry } from '../../types/types';

export interface SubmitCandidatePayload {
  indentId?: number | string;
  candidateName: string;
  dob: string; // ISO
  phoneNo: string;
  email?: string;
  previousCompany: string;
  experience: string;
  previousPosition: string;
  maritalStatus: string;
  aadharNo: string;
  lastSalary: string;
  reasonForLeaving: string;
  currentAddress: string;
  status?: string;
}

const uploadCandidateFiles = async (
  files: { photo?: File; resume?: File } | undefined,
  actAsTenantId?: string
): Promise<{ photo?: string; resume?: string }> => {
  const [photo, resume] = await Promise.all([
    files?.photo
      ? uploadFileViaPresignedUrl(files.photo, 'hr', 'candidates/photos', actAsTenantId)
      : undefined,
    files?.resume
      ? uploadFileViaPresignedUrl(files.resume, 'hr', 'candidates/resumes', actAsTenantId)
      : undefined,
  ]);
  return { photo, resume };
};

// NOTE: backend uses POST /history (not GET) to fetch candidate history.
export const fetchCandidateHistory = async (): Promise<Candidate[]> => {
  const response = await api.post('/hrfms/candidate/history', {});
  return response.data.data;
};

export const fetchCandidateById = async (id: string | number): Promise<Candidate | null> => {
  const response = await api.get(`/hrfms/candidate/${id}`);
  return response.data.data;
};

export const submitCandidate = async (
  data: SubmitCandidatePayload,
  files?: { photo?: File; resume?: File }
): Promise<Candidate> => {
  const { photo, resume } = await uploadCandidateFiles(files);
  const response = await api.post('/hrfms/candidate/submit', { ...data, photo, resume });
  return response.data.data;
};

export const updateCandidate = async (
  id: string | number,
  data: Partial<SubmitCandidatePayload>,
  files?: { photo?: File; resume?: File },
  actAsTenantId?: string
): Promise<Candidate> => {
  const { photo, resume } = await uploadCandidateFiles(files, actAsTenantId);
  const response = await api.patch(
    `/hrfms/candidate/${id}`,
    { ...data, photo, resume },
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const deleteCandidate = async (
  id: string | number,
  actAsTenantId?: string
): Promise<void> => {
  await api.delete(`/hrfms/candidate/${id}`, actAsTenantHeaders(actAsTenantId));
};

export const fetchCandidatesByIndent = async (indentId: string | number): Promise<Candidate[]> => {
  const response = await api.get(`/hrfms/candidate/by-indent/${indentId}`);
  return response.data.data;
};

export const logCandidateCall = async (
  id: string | number,
  payload: { status: string; notes?: string },
  actAsTenantId?: string
): Promise<Candidate> => {
  const response = await api.post(
    `/hrfms/candidate/${id}/log-call`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export interface InitializeJoiningPayload {
  joiningDate: string;
  employmentType: string;
  offeredCTC: string;
  monthlySalary?: number;
  probationMonths?: number;
  reportingManager?: string;
  workLocation?: string;
  bankAccount?: string;
  ifscCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  // new fields
  fatherName?: string;
  highestQualification?: string;
  currentAddress?: string;
  aadharAddress?: string;
  aadharNo?: string;
  designationOffered?: string;
  companyName?: string;
  joiningPlace?: string;
  attendanceMode?: string;
  bankBranchName?: string;
  paymentMode?: string;
  emergencyContactRelation?: string;
  emailToBeIssued?: boolean;
  mobileToBeIssued?: boolean;
  laptopToBeIssued?: boolean;
  pfEligible?: boolean;
  esicEligible?: boolean;
  pastPfNo?: string;
  esicNo?: string;
}

export interface DocVerificationPayload {
  documents: Record<string, DocEntry>;
  notes?: string;
  complete?: boolean;
}

export const initializeJoining = async (
  id: string | number,
  payload: InitializeJoiningPayload,
  actAsTenantId?: string
): Promise<Candidate> => {
  const response = await api.post(
    `/hrfms/candidate/${id}/initialize-joining`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const markCandidateJoined = async (
  id: string | number,
  joiningDate?: string,
  actAsTenantId?: string
): Promise<Candidate> => {
  const response = await api.post(
    `/hrfms/candidate/${id}/mark-joined`,
    { joiningDate },
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export interface SaveFollowUpPayload {
  nextCallDate: string; // ISO date string
  followUpNotes?: string;
}

export const saveFollowUp = async (
  id: string | number,
  payload: SaveFollowUpPayload,
  actAsTenantId?: string
): Promise<Candidate> => {
  const response = await api.patch(
    `/hrfms/candidate/${id}`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};

export const verifyDocuments = async (
  id: string | number,
  payload: DocVerificationPayload,
  actAsTenantId?: string
): Promise<Candidate> => {
  const response = await api.patch(
    `/hrfms/candidate/${id}/doc-verification`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return response.data.data;
};
