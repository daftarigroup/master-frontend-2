export type LetterType = 'OFFER' | 'EXPERIENCE' | 'JOINING';
export type FieldScope = 'global' | 'employee';
export type FieldType = 'text' | 'date' | 'number' | 'multiline';

export interface TemplateFieldDef {
  key: string;
  label: string;
  type: FieldType;
  scope: FieldScope;
  autoMap?: string;
}

export interface HrLetterTemplate {
  id: number;
  tenantId: string;
  name: string;
  letterType: LetterType;
  content: string;
  isDefault: boolean;
  isActive: boolean;
  fields: TemplateFieldDef[];
  createdAt: string;
  updatedAt: string;
  fieldValues?: HrLetterFieldValue[];
  // Present only under "All Companies" (merged) view.
  tenant?: { id: string; name: string } | null;
}

export interface HrLetterFieldValue {
  id: number;
  tenantId: string;
  templateId: number;
  fieldKey: string;
  value: string;
  employeeId: string; // "" = global
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  letterType: LetterType;
  content: string;
  isDefault?: boolean;
  fields?: TemplateFieldDef[];
}

export interface UpdateTemplatePayload {
  name?: string;
  letterType?: LetterType;
  content?: string;
  isDefault?: boolean;
  isActive?: boolean;
  fields?: TemplateFieldDef[];
}

export interface FieldValueEntry {
  fieldKey: string;
  value: string;
  employeeId?: string; // omit for global
}

export interface SaveFieldValuesPayload {
  entries: FieldValueEntry[];
}

export interface RenderedLetter {
  html: string;
  employeeName: string;
}

export const LETTER_TYPE_LABELS: Record<LetterType, string> = {
  OFFER: 'Offer Letter',
  EXPERIENCE: 'Experience Letter',
  JOINING: 'Joining Letter',
};

export const AUTO_MAP_OPTIONS = [
  { value: 'name', label: 'Employee Name' },
  { value: 'designation', label: 'Designation' },
  { value: 'employeeId', label: 'Employee ID' },
  { value: 'joiningDate', label: 'Joining Date' },
  { value: 'department', label: 'Department' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'offeredCTC', label: 'Offered CTC' },
  { value: 'companyName', label: 'Company Name (Joining)' },
  { value: 'joiningPlace', label: 'Joining Place' },
  { value: 'reportingManager', label: 'Reporting Manager' },
  { value: 'probationMonths', label: 'Probation Months' },
  { value: 'employmentType', label: 'Employment Type' },
  { value: 'designationOffered', label: 'Designation Offered' },
  { value: 'monthlySalary', label: 'Monthly Salary' },
];
