// HR Joining Types

export interface Joining {
  id: number;
  tenantId: string;
  candidateId: number;
  joiningDate: string;
  status: string;
  documents?: Record<string, unknown> | null;
  candidate?: {
    id: number;
    candidateName: string;
    candidateEnquiryNo: string;
    phoneNo: string;
    email?: string | null;
    indent?: {
      id: number;
      title: string;
    } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}
