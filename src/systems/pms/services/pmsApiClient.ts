// @ts-nocheck
import { apiClient } from '@/lib/apiClient';
import type {
  PMSProject,
  PMSProjectMinor,
  PMSProjectDesign,
  PMSProjectExecution,
  PMSProjectActual,
  PMSStageEntry,
  PMSSchedule,
  PMSRMBill,
  PMSDocument,
  PMSEmailLog,
} from '../types/pms.types';

export interface Project {
  id: string | number;
  serialNo: string;
  serial_no?: string;
  projectName: string;
  project_name?: string;
  projectType: string;
  project_type?: string;
  agreementNumber?: string;
  agreement_number?: string;
  department?: string;
  division?: string;
  subDivision?: string;
  sub_division?: string;
  irrigationCapacity?: string;
  irrigation_capacity?: string;
  projectLocation?: string;
  project_location?: string;
  village?: string;
  district?: string;
  state?: string;
  contractorName: string;
  contractor_name?: string;
  contractorPhone: string;
  contractor_phone?: string;
  contractorEmail: string;
  contractor_email?: string;
  contractorAddress: string;
  contractor_address?: string;
  subContractors?: any[];
  sub_contractors?: any[];
  startDate: string;
  start_date?: string;
  plannedEndDate: string;
  planned_end_date?: string;
  workPeriod?: string;
  work_period?: string;
  workOrder?: string;
  work_order?: string;
  workOrderDate?: string;
  work_order_date?: string;
  workOrderDocument?: string;
  work_order_document?: string;
  workOrderDocumentName?: string;
  work_order_doc_name?: string;
  tenderId?: string;
  tender_id?: string;
  tenderAmount?: number | string;
  tender_amount?: number | string;
  tenderAmountWords?: string;
  percentage?: number | string;
  quotedAmount?: number | string;
  quotedAmountWords?: string;
  maintenancePeriod?: string;
  maintenance_period?: string;
  projectDescription?: string;
  project_description?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  minors?: any[];
  [key: string]: any;
}

export type CreateProjectDto = Partial<Project> | Record<string, any>;
export type UpdateProjectDto = Partial<Project> | Record<string, any>;

export function normalizeProject(raw: any): Project {
  if (!raw) return raw;
  const p = { ...raw };
  const sNo = p.serialNo || p.serial_no || '';
  const tenderAmt = p.tenderAmount !== undefined && p.tenderAmount !== null ? p.tenderAmount : (p.tender_amount !== undefined && p.tender_amount !== null ? p.tender_amount : '');
  const pct = p.percentage !== undefined && p.percentage !== null ? p.percentage : '';
  const sDate = p.startDate ? String(p.startDate).split('T')[0] : (p.start_date ? String(p.start_date).split('T')[0] : '');
  const pEndDate = p.plannedEndDate ? String(p.plannedEndDate).split('T')[0] : (p.planned_end_date ? String(p.planned_end_date).split('T')[0] : '');
  const woDate = p.workOrderDate ? String(p.workOrderDate).split('T')[0] : (p.work_order_date ? String(p.work_order_date).split('T')[0] : '');

  return {
    ...p,
    id: p.id !== undefined ? (typeof p.id === 'bigint' ? p.id.toString() : p.id) : p.id,
    serialNo: sNo,
    serial_no: sNo,
    projectName: p.projectName || p.project_name || '',
    project_name: p.project_name || p.projectName || '',
    projectType: p.projectType || p.project_type || 'General Civil Works',
    project_type: p.project_type || p.projectType || 'General Civil Works',
    agreementNumber: p.agreementNumber || p.agreement_number || '',
    agreement_number: p.agreement_number || p.agreementNumber || '',
    department: p.department || '',
    division: p.division || '',
    subDivision: p.subDivision || p.sub_division || '',
    sub_division: p.sub_division || p.subDivision || '',
    irrigationCapacity: p.irrigationCapacity || p.irrigation_capacity || '',
    irrigation_capacity: p.irrigation_capacity || p.irrigationCapacity || '',
    projectLocation: p.projectLocation || p.project_location || '',
    project_location: p.project_location || p.projectLocation || '',
    village: p.village || '',
    district: p.district || '',
    state: p.state || '',
    contractorName: p.contractorName || p.contractor_name || '',
    contractor_name: p.contractor_name || p.contractorName || '',
    contractorPhone: p.contractorPhone || p.contractor_phone || '',
    contractor_phone: p.contractor_phone || p.contractorPhone || '',
    contractorEmail: p.contractorEmail || p.contractor_email || '',
    contractor_email: p.contractor_email || p.contractorEmail || '',
    contractorAddress: p.contractorAddress || p.contractor_address || '',
    contractor_address: p.contractor_address || p.contractorAddress || '',
    subContractors: p.subContractors || p.sub_contractors || [],
    sub_contractors: p.sub_contractors || p.subContractors || [],
    startDate: sDate,
    start_date: sDate,
    plannedEndDate: pEndDate,
    planned_end_date: pEndDate,
    workPeriod: p.workPeriod || p.work_period || '',
    work_period: p.work_period || p.workPeriod || '',
    workOrder: p.workOrder || p.work_order || '',
    work_order: p.work_order || p.workOrder || '',
    workOrderDate: woDate,
    work_order_date: woDate,
    workOrderDocument: p.workOrderDocument || p.work_order_document || '',
    work_order_document: p.work_order_document || p.workOrderDocument || '',
    workOrderDocumentName: p.workOrderDocumentName || p.work_order_doc_name || '',
    work_order_doc_name: p.work_order_doc_name || p.workOrderDocumentName || '',
    tenderId: p.tenderId || p.tender_id || '',
    tender_id: p.tender_id || p.tenderId || '',
    tenderAmount: tenderAmt,
    tender_amount: tenderAmt,
    percentage: pct,
    maintenancePeriod: p.maintenancePeriod || p.maintenance_period || '',
    maintenance_period: p.maintenance_period || p.maintenancePeriod || '',
    projectDescription: p.projectDescription || p.project_description || '',
    project_description: p.project_description || p.projectDescription || '',
    status: p.status || 'Active',
  };
}

export async function fetchProjects(params?: { search?: string; status?: string }): Promise<Project[]> {
  const res: any = await apiClient.get('/pms/projects', { params });
  const rawList = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
  return rawList.map(normalizeProject);
}

export async function createProject(data: CreateProjectDto): Promise<Project> {
  const res: any = await apiClient.post('/pms/projects', data);
  const raw = res?.data ?? res;
  return normalizeProject(raw);
}

export async function updateProject(id: number | string, data: UpdateProjectDto): Promise<Project> {
  const res: any = await apiClient.patch(`/pms/projects/${id}`, data);
  const raw = res?.data ?? res;
  return normalizeProject(raw);
}

export async function deleteProject(id: number | string): Promise<void> {
  await apiClient.delete(`/pms/projects/${id}`);
}

export const pmsApi = {
  // Projects
  listProjects: (params?: { search?: string; status?: string }) =>
    apiClient.get<{ success: boolean; data: PMSProject[] }>('/pms/projects', { params }),

  getProject: (idOrSerial: string) =>
    apiClient.get<{ success: boolean; data: PMSProject }>(`/pms/projects/${idOrSerial}`),

  createProject: (data: Partial<PMSProject> | Record<string, any>) =>
    apiClient.post<{ success: boolean; data: PMSProject; message: string }>('/pms/projects', data),

  updateProject: (idOrSerial: string, data: Partial<PMSProject> | Record<string, any>) =>
    apiClient.patch<{ success: boolean; data: PMSProject; message: string }>(`/pms/projects/${idOrSerial}`, data),

  deleteProject: (idOrSerial: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/pms/projects/${idOrSerial}`),

  // Minors
  listMinors: (projectId: string) =>
    apiClient.get<{ success: boolean; data: PMSProjectMinor[] }>(`/pms/projects/${projectId}/minors`),

  createMinor: (projectId: string, data: any) =>
    apiClient.post<{ success: boolean; data: PMSProjectMinor; message: string }>(`/pms/projects/${projectId}/minors`, data),

  updateMinor: (minorId: string, data: any) =>
    apiClient.patch<{ success: boolean; data: PMSProjectMinor; message: string }>(`/pms/minors/${minorId}`, data),

  deleteMinor: (minorId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/pms/minors/${minorId}`),

  getSchedule: (minorId: string) =>
    apiClient.get<{ success: boolean; data: PMSSchedule | null }>(`/pms/minors/${minorId}/schedule`),

  upsertSchedule: (minorId: string, data: any) =>
    apiClient.put<{ success: boolean; data: PMSSchedule; message: string }>(`/pms/minors/${minorId}/schedule`, data),

  // Design
  getDesign: (projectId: string) =>
    apiClient.get<{ success: boolean; data: any[] }>(`/pms/projects/${projectId}/design`),

  upsertDesign: (projectId: string, rows: any[]) =>
    apiClient.put<{ success: boolean; data: any; message: string }>(`/pms/projects/${projectId}/design`, rows),

  // Execution DPR & Actuals
  listExecutions: (projectId: string, stageNumber?: number) =>
    apiClient.get<{ success: boolean; data: PMSProjectExecution[] }>(`/pms/projects/${projectId}/executions`, {
      params: stageNumber !== undefined ? { stage_number: stageNumber } : undefined,
    }),

  createExecution: (projectId: string, data: any) =>
    apiClient.post<{ success: boolean; data: PMSProjectExecution; message: string }>(`/pms/projects/${projectId}/executions`, data),

  updateExecution: (entryId: string, data: any) =>
    apiClient.patch<{ success: boolean; data: PMSProjectExecution; message: string }>(`/pms/executions/${entryId}`, data),

  deleteExecution: (entryId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/pms/executions/${entryId}`),

  listActuals: (projectId: string, stageNumber?: number) =>
    apiClient.get<{ success: boolean; data: PMSProjectActual[] }>(`/pms/projects/${projectId}/actuals`, {
      params: stageNumber !== undefined ? { stage_number: stageNumber } : undefined,
    }),

  createActual: (projectId: string, data: any) =>
    apiClient.post<{ success: boolean; data: PMSProjectActual; message: string }>(`/pms/projects/${projectId}/actuals`, data),

  updateActual: (entryId: string, data: any) =>
    apiClient.patch<{ success: boolean; data: PMSProjectActual; message: string }>(`/pms/actuals/${entryId}`, data),

  deleteActual: (entryId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/pms/actuals/${entryId}`),

  // Stage Checklist Entries
  listStageEntries: (projectId: string, stageNumber?: number) =>
    apiClient.get<{ success: boolean; data: PMSStageEntry[] }>(`/pms/projects/${projectId}/stage-entries`, {
      params: stageNumber !== undefined ? { stage_number: stageNumber } : undefined,
    }),

  upsertStageEntry: (stageEntryId: string, data: any) =>
    apiClient.put<{ success: boolean; data: PMSStageEntry; message: string }>(`/pms/stage-entries/${stageEntryId}`, data),

  // Contractor Stages
  getFinalizeConsultant: (projectId: string) =>
    apiClient.get<{ success: boolean; data: any }>(`/pms/projects/${projectId}/finalize-consultant`),

  upsertFinalizeConsultant: (projectId: string, data: any) =>
    apiClient.put<{ success: boolean; data: any; message: string }>(`/pms/projects/${projectId}/finalize-consultant`, data),

  // Drawings & Approvals
  getDrawingUpload: (projectId: string) =>
    apiClient.get<{ success: boolean; data: any }>(`/pms/projects/${projectId}/drawing-upload`),

  upsertDrawingUpload: (projectId: string, data: any) =>
    apiClient.put<{ success: boolean; data: any; message: string }>(`/pms/projects/${projectId}/drawing-upload`, data),

  getFinalApproval: (projectId: string) =>
    apiClient.get<{ success: boolean; data: any }>(`/pms/projects/${projectId}/final-approval`),

  upsertFinalApproval: (projectId: string, data: any) =>
    apiClient.put<{ success: boolean; data: any; message: string }>(`/pms/projects/${projectId}/final-approval`, data),

  getDrawings: (projectId: string) =>
    apiClient.get<{ success: boolean; data: any[] }>(`/pms/projects/${projectId}/drawings`),

  upsertDrawings: (projectId: string, data: any) =>
    apiClient.put<{ success: boolean; data: any; message: string }>(`/pms/projects/${projectId}/drawings`, data),

  // Material Requirements
  listMaterialRequirements: (projectId: string) =>
    apiClient.get<{ success: boolean; data: any[] }>(`/pms/projects/${projectId}/material-requirements`),

  createMaterialRequirement: (projectId: string, data: any) =>
    apiClient.post<{ success: boolean; data: any; message: string }>(`/pms/projects/${projectId}/material-requirements`, data),

  deleteMaterialRequirement: (reqId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/pms/material-requirements/${reqId}`),

  // RM Bills
  listRMBills: (projectId: string, billType?: string) =>
    apiClient.get<{ success: boolean; data: PMSRMBill[] }>(`/pms/projects/${projectId}/rm-bills`, {
      params: billType ? { bill_type: billType } : undefined,
    }),

  createRMBill: (projectId: string, data: any) =>
    apiClient.post<{ success: boolean; data: PMSRMBill; message: string }>(`/pms/projects/${projectId}/rm-bills`, data),

  getRMBill: (billId: string) =>
    apiClient.get<{ success: boolean; data: PMSRMBill }>(`/pms/rm-bills/${billId}`),

  updateRMBill: (billId: string, data: any) =>
    apiClient.patch<{ success: boolean; data: PMSRMBill; message: string }>(`/pms/rm-bills/${billId}`, data),

  deleteRMBill: (billId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/pms/rm-bills/${billId}`),

  // Calculation State (Engines: Abstract, RA Planning, Final Comparative)
  getCalcState: (projectId: string, stateType: 'ABSTRACT' | 'RA_PLANNING' | 'FINAL_COMPARATIVE' | string) =>
    apiClient.get<{ success: boolean; data: any }>(`/pms/projects/${projectId}/calc-state/${stateType}`),

  upsertCalcState: (projectId: string, stateType: string, stateData: any) =>
    apiClient.put<{ success: boolean; data: any; message: string }>(`/pms/projects/${projectId}/calc-state/${stateType}`, stateData),

  // Product IMF
  getProductIMF: (poNumber: string) =>
    apiClient.get<{ success: boolean; data: any[] }>(`/pms/product-imf/${poNumber}`),

  upsertProductIMF: (poNumber: string, items: any) =>
    apiClient.put<{ success: boolean; data: any; message: string }>(`/pms/product-imf/${poNumber}`, items),

  // Documents & Email Logs
  listDocuments: (projectNo?: string) =>
    apiClient.get<{ success: boolean; data: PMSDocument[] }>('/pms/documents', {
      params: projectNo ? { project_no: projectNo } : undefined,
    }),

  createDocument: (data: any) =>
    apiClient.post<{ success: boolean; data: PMSDocument; message: string }>('/pms/documents', data),

  deleteDocument: (docId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/pms/documents/${docId}`),

  listEmailLogs: (projectNo?: string) =>
    apiClient.get<{ success: boolean; data: PMSEmailLog[] }>('/pms/email-logs', {
      params: projectNo ? { project_no: projectNo } : undefined,
    }),

  createEmailLog: (data: any) =>
    apiClient.post<{ success: boolean; data: PMSEmailLog; message: string }>('/pms/email-logs', data),
};
