// HR Indent Types

export interface Indent {
  id: string;
  recordId?: string | null;
  title: string;
  gender: 'MALE' | 'FEMALE' | 'ANY';
  departmentId: string;
  department?: { id: string; name: string } | null;
  prefer: 'FRESHER' | 'EXPERIENCE' | 'ANY';
  experienceYears?: string;
  noOfPost: number;
  completionDate: string;
  socialsite: string[];
  jobType?: string[];
  budget?: number | null;
  priority?: string | null;
  status: string;
  createdAt: string;
  candidates?: { id: number }[];
  _count?: { candidates: number };
  tenant?: { id: string; name: string } | null;
}

export interface IndentFilters {
  search: string;
  department: string;
  status: string;
  urgency: string;
}
