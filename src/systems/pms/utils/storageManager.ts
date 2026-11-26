// @ts-nocheck
// Storage Manager for PMS - Synchronous localStorage cache with asynchronous PostgreSQL API sync
import { toast } from 'sonner';
import { pmsApi } from '../services/pmsApiClient';
import { saveFileToIndexedDB, getFileFromIndexedDB } from './fileStorage';
import { formatDateForInput } from './pmsHelpers';

export const toInputDateFormat = (d: any): string => {
  if (!d) return '';
  try {
    return formatDateForInput(d);
  } catch {
    return String(d).slice(0, 10);
  }
};

export const STORAGE_KEYS = {
  USERS: 'pcb_users',
  PROJECTS: 'pcb_projects_v1',
  DESIGNS: 'pcb_designs_v1',
  MATERIAL_REQUIREMENTS: 'pcb_material_requirements_v1',
  EXECUTIONS: 'pcb_executions_v1',
  ACTUALS: 'pcb_actuals_v1',
  STAGE_ENTRIES: 'pcb_stage_entries_v1',
  FINALIZE_CONSULTANT: 'pcb_finalize_consultant_v1',
  DRAWING_UPLOAD: 'pcb_drawing_upload_v1',
  FINAL_APPROVAL: 'pcb_final_approval_v1',
  DRAWINGS: 'pcb_drawings_v1',
  MINORS: 'pcb_minors_v1',
  SCHEDULES: 'pcb_schedules_v1',
  RM_BILLS: 'pcb_rm_bills_v1',
  EXTERNAL_POS: 'pcb_external_pos_v1',
  PRODUCT_IMF: 'pcb_product_imf_v1',
  DOCUMENTATION: 'pcb_documentation_v1',
  EMAIL_LOGS: 'pcb_email_logs_v1'
};

export const getFromStorage = (key: string): any => {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return null;
  }
};

export const saveToStorage = (key: string, data: any): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
};

// Initialize default sample data or sync from API
export const initializeStorage = async (): Promise<void> => {
  try {
    const res: any = await pmsApi.listProjects();
    const projects = res?.data || res || [];
    if (Array.isArray(projects) && projects.length > 0) {
      // Normalizing to prototype project shape
      const normalized = projects.map((p: any) => ({
        id: String(p.id),
        serialNo: p.serial_no || `PRJ-${p.id}`,
        projectName: p.project_name || '',
        agreementNo: p.agreement_no || '',
        division: p.division || '',
        subDivision: p.sub_division || '',
        location: p.location || '',
        contractorName: p.contractor_name || '',
        status: p.status || 'Active',
        estimatedCost: p.estimated_cost ? String(p.estimated_cost) : '0',
        workOrderDate: p.work_order_date ? toInputDateFormat(p.work_order_date) : '',
        completionPeriodMonths: p.completion_period_months ? String(p.completion_period_months) : '12',
        stipulatedDateOfCompletion: p.stipulated_date_of_completion ? toInputDateFormat(p.stipulated_date_of_completion) : '',
        firmId: p.firm_id ? String(p.firm_id) : undefined,
        createdAt: p.created_at || new Date().toISOString(),
      }));
      saveProjects(normalized);
    }
  } catch (e) {
    console.warn('PMS Storage: Could not sync initial projects from API, using local cache', e);
  }
};

// --- Project Operations ---
export const getProjects = (): any[] => {
  return getFromStorage(STORAGE_KEYS.PROJECTS) || [];
};

// Sub-contractors are captured on the project itself (New Project form)
export const getSubContractorsForProject = (projectNo: string): any[] => {
  const proj = getProjects().find(p => p.serialNo === projectNo || p.id === projectNo);
  const list = proj?.subContractors || proj?.sub_contractors || [];
  return Array.isArray(list) ? list.filter(c => c?.name?.trim()) : [];
};

// Projects live in the backend; refresh the local cache so lookups like getProjectOrMinor can resolve them
export const syncProjectsCache = async (): Promise<any[]> => {
  const { fetchProjects } = await import('../services/pmsApiClient');
  const remote = await fetchProjects();
  const local = getProjects().filter(l => !remote.some(r => r.serialNo === l.serialNo));
  const merged = [...remote, ...local];
  saveToStorage(STORAGE_KEYS.PROJECTS, merged);
  return merged;
};

export const saveProjects = (projects: any[]): void => saveToStorage(STORAGE_KEYS.PROJECTS, projects);

export const saveProject = (project: any): any => {
  const projects = getProjects();
  const existingIdx = projects.findIndex(p => p.id === project.id || p.serialNo === project.serialNo);
  if (existingIdx >= 0) {
    projects[existingIdx] = project;
  } else {
    projects.push(project);
  }
  saveProjects(projects);

  // Sync to backend
  pmsApi.createProject(project).catch(err => {
    console.warn('PMS API: Failed to sync project creation to backend', err);
  });

  return project;
};

export const updateProject = (updated: any): void => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === updated.id || p.serialNo === updated.serialNo);
  if (index !== -1) {
    projects[index] = { ...projects[index], ...updated };
    saveProjects(projects);
  }

  // Sync to backend
  const idOrSerial = updated.serialNo || updated.id;
  pmsApi.updateProject(idOrSerial, updated).catch(err => {
    console.warn('PMS API: Failed to sync project update to backend', err);
  });
};

export const deleteProject = (id: string): void => {
  const projects = getProjects();
  const target = projects.find(p => p.id === id || p.serialNo === id);
  const projectNo = target ? target.serialNo : id;

  saveProjects(projects.filter(p => p.id !== id && p.serialNo !== id));
  saveFinalizeConsultants(getFinalizeConsultants().filter(r => r.projectNo !== projectNo));
  saveDrawingUploads(getDrawingUploads().filter(r => r.projectNo !== projectNo));
  saveFinalApprovals(getFinalApprovals().filter(r => r.projectNo !== projectNo));
  saveDrawings(getDrawings().filter(r => r.projectNo !== projectNo));
  saveReqMaterials(getReqMaterials().filter(r => r.projectNo !== projectNo));
  saveDesigns(getDesigns().filter(r => r.projectNo !== projectNo));
  saveExecutions(getExecutions().filter(r => r.projectNo !== projectNo));
  saveActuals(getAllActuals().filter(r => r.projectNo !== projectNo));
  saveStageEntries(getStageEntries().filter(r => r.projectNo !== projectNo));
  saveDocumentations(getDocumentations().filter(d => d.projectNo !== projectNo));

  getMinors().filter(m => m.projectNo === projectNo).forEach(m => deleteMinor(m.id));

  // Sync to backend
  pmsApi.deleteProject(projectNo).catch(err => {
    console.warn('PMS API: Failed to delete project on backend', err);
  });
};

// --- Project Design Operations ---
export const getDesigns = (): any[] => {
  return getFromStorage(STORAGE_KEYS.DESIGNS) || [];
};

export const saveDesigns = (designs: any[]): void => saveToStorage(STORAGE_KEYS.DESIGNS, designs);

export const getDesignByProject = (projectNo: string): any[] => {
  const designs = getDesigns();
  const found = designs.find(d => d.projectNo === projectNo);
  return found ? found.rows : [];
};

export const saveDesignForProject = (projectNo: string, rows: any[]): any => {
  const designs = getDesigns();
  const idx = designs.findIndex(d => d.projectNo === projectNo);
  const record = { projectNo, rows, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    designs[idx] = record;
  } else {
    designs.push(record);
  }
  saveDesigns(designs);

  // Sync to backend
  pmsApi.upsertDesign(projectNo, rows).catch(err => {
    console.warn('PMS API: Failed to sync design to backend', err);
  });

  return record;
};

export const isUploadDesignComplete = (projectNo: string): boolean => {
  if (getDesignByProject(projectNo).length > 0) return true;
  const pMinors = (getMinors() || []).filter(m => m.projectNo === projectNo);
  return pMinors.length > 0;
};

// --- Finalize Consultant Operations ---
export const getFinalizeConsultants = (): any[] => {
  return getFromStorage(STORAGE_KEYS.FINALIZE_CONSULTANT) || [];
};

export const saveFinalizeConsultants = (data: any[]): void => saveToStorage(STORAGE_KEYS.FINALIZE_CONSULTANT, data);

export const getFinalizeConsultantForProject = (projectNo: string): any => {
  return getFinalizeConsultants().find(f => f.projectNo === projectNo) || null;
};

export const isFinalizeConsultantComplete = (record: any): boolean =>
  !!(record && Array.isArray(record.consultants) && record.consultants.length > 0);

export const upsertFinalizeConsultant = (record: any): any => {
  const data = getFinalizeConsultants();
  const idx = data.findIndex(f => f.projectNo === record.projectNo);
  const saved = { ...record, id: record.projectNo, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    data[idx] = saved;
  } else {
    data.push(saved);
  }
  saveFinalizeConsultants(data);

  // Sync to backend
  pmsApi.upsertFinalizeConsultant(record.projectNo, record).catch(err => {
    console.warn('PMS API: Failed to sync finalize consultant to backend', err);
  });

  return saved;
};

// --- Drawing Upload Operations ---
export const getDrawingUploads = (): any[] => {
  return getFromStorage(STORAGE_KEYS.DRAWING_UPLOAD) || [];
};

export const saveDrawingUploads = (data: any[]): void => saveToStorage(STORAGE_KEYS.DRAWING_UPLOAD, data);

export const getDrawingUploadForProject = (projectNo: string): any => {
  return getDrawingUploads().find(d => d.projectNo === projectNo) || null;
};

export const isDrawingUploadComplete = (record: any): boolean =>
  !!(record && (record.drawingDate || record.drawingFile || record.updatedAt || record.id));

export const upsertDrawingUpload = (record: any): any => {
  const data = getDrawingUploads();
  const idx = data.findIndex(d => d.projectNo === record.projectNo);
  const saved = { ...record, id: record.projectNo, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    data[idx] = saved;
  } else {
    data.push(saved);
  }
  saveDrawingUploads(data);

  // Sync to backend
  pmsApi.upsertDrawingUpload(record.projectNo, record).catch(err => {
    console.warn('PMS API: Failed to sync drawing upload to backend', err);
  });

  return saved;
};

// --- Final Approval Operations ---
export const getFinalApprovals = (): any[] => {
  return getFromStorage(STORAGE_KEYS.FINAL_APPROVAL) || [];
};

export const saveFinalApprovals = (data: any[]): void => saveToStorage(STORAGE_KEYS.FINAL_APPROVAL, data);

export const getFinalApprovalForProject = (projectNo: string): any => {
  return getFinalApprovals().find(f => f.projectNo === projectNo) || null;
};

// Reads saved sign-offs from the backend (source of truth), in the shape the views use
export const fetchFinalApprovals = async (projects: any[]): Promise<any[]> => {
  const rows = await Promise.all(
    projects.map(async (p) => {
      try {
        const res: any = await pmsApi.getFinalApproval(p.serialNo);
        const r = res?.data?.data ?? res?.data ?? null;
        if (!r) return null;
        return {
          projectNo: p.serialNo,
          subDivision: !!r.sub_division,
          division: !!r.division,
          circleOffice: !!r.circle_office,
          ceoOffice: !!r.ceo_office,
          remarks: r.remarks || '',
        };
      } catch {
        return null;
      }
    })
  );
  return rows.filter(Boolean);
};

export const isFinalApprovalComplete = (record: any): boolean =>
  !!(record && (record.subDivision || record.division || record.circleOffice || record.ceoOffice));

export const upsertFinalApproval = (record: any): any => {
  const data = getFinalApprovals();
  const idx = data.findIndex(f => f.projectNo === record.projectNo);
  const saved = { ...record, id: record.projectNo, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    data[idx] = saved;
  } else {
    data.push(saved);
  }
  saveFinalApprovals(data);

  // Sync to backend
  pmsApi.upsertFinalApproval(record.projectNo, record).catch(err => {
    console.warn('PMS API: Failed to sync final approval to backend', err);
  });

  return saved;
};

// --- Upload Drawing Operations (Minors drawings) ---
export const getDrawings = (): any[] => {
  return getFromStorage(STORAGE_KEYS.DRAWINGS) || [];
};

export const saveDrawings = (data: any[]): void => saveToStorage(STORAGE_KEYS.DRAWINGS, data);

export const getDrawingsForProject = (projectNo: string): any[] => {
  const rec = getDrawings().find(d => d.projectNo === projectNo);
  return rec ? rec.minors : [];
};

export const addDrawingMinors = (projectNo: string, newMinors: any[]): any => {
  const data = getDrawings();
  const idx = data.findIndex(d => d.projectNo === projectNo);
  const updatedAt = new Date().toISOString();
  if (idx >= 0) {
    data[idx] = { ...data[idx], minors: [...data[idx].minors, ...newMinors], updatedAt };
  } else {
    data.push({ id: projectNo, projectNo, minors: newMinors, updatedAt });
  }
  saveDrawings(data);

  // Sync to backend
  pmsApi.upsertDrawings(projectNo, data.find(d => d.projectNo === projectNo)).catch(err => {
    console.warn('PMS API: Failed to sync drawings to backend', err);
  });

  return data.find(d => d.projectNo === projectNo);
};

export const deleteDrawingMinor = (projectNo: string, minorId: string): void => {
  const data = getDrawings();
  const idx = data.findIndex(d => d.projectNo === projectNo);
  if (idx < 0) return;
  data[idx] = { ...data[idx], minors: data[idx].minors.filter((m: any) => m.id !== minorId), updatedAt: new Date().toISOString() };
  saveDrawings(data);

  pmsApi.upsertDrawings(projectNo, data[idx]).catch(err => {
    console.warn('PMS API: Failed to sync drawings deletion to backend', err);
  });
};

// --- Material Requirement Operations ---
export const getReqMaterials = (): any[] => {
  return getFromStorage(STORAGE_KEYS.MATERIAL_REQUIREMENTS) || [];
};

export const saveReqMaterials = (data: any[]): void => saveToStorage(STORAGE_KEYS.MATERIAL_REQUIREMENTS, data);

export const saveReqMaterial = (indent: any): any => {
  const data = getReqMaterials();
  data.push(indent);
  saveReqMaterials(data);

  if (indent.projectNo) {
    pmsApi.createMaterialRequirement(indent.projectNo, indent).catch(err => {
      console.warn('PMS API: Failed to sync req material to backend', err);
    });
  }

  return indent;
};

// --- Execution DPR Operations ---
export const getExecutions = (): any[] => {
  return getFromStorage(STORAGE_KEYS.EXECUTIONS) || [];
};

export const saveExecutions = (data: any[]): void => saveToStorage(STORAGE_KEYS.EXECUTIONS, data);

export const saveExecution = (entry: any): any => {
  const data = getExecutions();
  const now = new Date();
  const timestamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const completeEntry = {
    ...entry,
    timestamp: entry.timestamp || timestamp,
    submissionDateTime: entry.submissionDateTime || entry.timestamp || timestamp,
    createdAt: entry.createdAt || now.toISOString()
  };
  data.push(completeEntry);
  saveExecutions(data);

  if (entry.projectNo) {
    pmsApi.createExecution(entry.projectNo, completeEntry).catch(err => {
      console.warn('PMS API: Failed to sync execution to backend', err);
    });
  }

  return completeEntry;
};

export const updateExecution = (id: string, updates: any): any => {
  const data = getExecutions();
  const idx = data.findIndex(e => e.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...updates };
  saveExecutions(data);

  pmsApi.updateExecution(id, updates).catch(err => {
    console.warn('PMS API: Failed to sync execution update to backend', err);
  });

  return data[idx];
};

// --- Actual Measurement Operations ---
// Actual measurements are saved stage by stage; an entry is complete once all three stages are saved.
// Entries saved before stage-wise saving have no `staged` flag and count as complete.
const isActualComplete = (a: any): boolean => !a.staged || Boolean(a.excavation && a.pipeLaying && a.backFilling);

export const getAllActuals = (): any[] => {
  return getFromStorage(STORAGE_KEYS.ACTUALS) || [];
};

// Only completed entries: what reports and billing use
export const getActuals = (): any[] => getAllActuals().filter(isActualComplete);

export const saveActuals = (data: any[]): void => saveToStorage(STORAGE_KEYS.ACTUALS, data);

export const saveActual = (entry: any): any => {
  const data = getAllActuals();
  const now = new Date();
  const timestamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const completeEntry = {
    ...entry,
    timestamp: entry.timestamp || timestamp,
    submissionDateTime: entry.submissionDateTime || entry.timestamp || timestamp,
    createdAt: entry.createdAt || now.toISOString()
  };
  data.push(completeEntry);
  saveActuals(data);

  if (entry.projectNo) {
    pmsApi.createActual(entry.projectNo, completeEntry).catch(err => {
      console.warn('PMS API: Failed to sync actual to backend', err);
    });
  }

  return completeEntry;
};

export const updateActual = (id: string, updates: any): any => {
  const data = getAllActuals();
  const idx = data.findIndex(a => a.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...updates };
  saveActuals(data);

  pmsApi.updateActual(id, { data: data[idx] }).catch(err => {
    console.warn('PMS API: Failed to sync actual update to backend', err);
  });

  return data[idx];
};

// --- RM Bills Operations ---
export const getRMBills = (): any[] => {
  const data = getFromStorage(STORAGE_KEYS.RM_BILLS) || [];
  let modified = false;
  const migrated = data.map((b: any) => {
    if (b.rmNo && /^RM-/i.test(b.rmNo)) {
      modified = true;
      return { ...b, rmNo: b.rmNo.replace(/^RM-/i, 'RA-') };
    }
    return b;
  });
  if (modified) {
    saveToStorage(STORAGE_KEYS.RM_BILLS, migrated);
  }
  return migrated;
};

export const saveRMBills = (data: any[]): void => saveToStorage(STORAGE_KEYS.RM_BILLS, data);

export const addRMBill = (bill: any): any => {
  const data = getRMBills();
  data.push(bill);
  saveRMBills(data);

  if (bill.projectNo) {
    pmsApi.createRMBill(bill.projectNo, bill).catch(err => {
      console.warn('PMS API: Failed to sync RM bill to backend', err);
    });
  }

  return bill;
};

export const updateRMBill = (id: string, updates: any): any => {
  const data = getRMBills();
  const idx = data.findIndex(b => b.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...updates };
  saveRMBills(data);

  pmsApi.updateRMBill(id, updates).catch(err => {
    console.warn('PMS API: Failed to sync RM bill update to backend', err);
  });

  return data[idx];
};

export const isDepartmentBillingComplete = (projectNo: string): boolean => {
  const bills = getRMBills();
  return bills.some(b => b.projectNo === projectNo && b.billType === 'Execution' && b.status === 'billed');
};

export const isSubContractorBillingComplete = (projectNo: string): boolean => {
  const bills = getRMBills();
  return bills.some(b => b.projectNo === projectNo && b.billType === 'Actual' && b.status === 'billed');
};

// --- Process Flow Stage-Step Tracking Operations ---
export const getStageEntries = (): any[] => {
  return getFromStorage(STORAGE_KEYS.STAGE_ENTRIES) || [];
};

export const saveStageEntries = (data: any[]): void => saveToStorage(STORAGE_KEYS.STAGE_ENTRIES, data);

export const stageEntryId = (projectNo: string, stageNumber: number | string, stepIndex: number | string): string =>
  `${projectNo}__stage${stageNumber}__step${stepIndex}`;

export const getStageEntriesForStage = (projectNo: string, stageNumber: number | string): any[] => {
  return getStageEntries().filter(e => e.projectNo === projectNo && String(e.stageNumber) === String(stageNumber));
};

export const upsertStageEntry = (entry: any): any => {
  const data = getStageEntries();
  const idx = data.findIndex(e => e.id === entry.id);
  const record = { ...entry, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    data[idx] = record;
  } else {
    data.push(record);
  }
  saveStageEntries(data);

  pmsApi.upsertStageEntry(entry.id, record).catch(err => {
    console.warn('PMS API: Failed to sync stage entry to backend', err);
  });

  return record;
};

// --- Minors Operations ---
export const getMinors = (): any[] => {
  return getFromStorage(STORAGE_KEYS.MINORS) || [];
};

export const saveMinors = (minors: any[]): void => {
  saveToStorage(STORAGE_KEYS.MINORS, minors);
};

export const saveMinor = (minor: any): void => {
  const data = getMinors();
  const index = data.findIndex(m => m.id === minor.id);
  if (index >= 0) {
    data[index] = minor;
  } else {
    data.push(minor);
  }
  saveMinors(data);

  if (minor.projectNo) {
    pmsApi.createMinor(minor.projectNo, minor).catch(err => {
      console.warn('PMS API: Failed to sync minor to backend', err);
    });
  }
};

export const deleteMinor = (minorId: string): void => {
  saveMinors(getMinors().filter(m => m.id !== minorId));
  saveDesigns(getDesigns().filter(d => d.projectNo !== minorId));
  saveExecutions(getExecutions().filter(e => e.projectNo !== minorId));
  saveActuals(getAllActuals().filter(a => a.projectNo !== minorId));
  saveStageEntries(getStageEntries().filter(s => s.projectNo !== minorId));
  saveSchedules(getSchedules().filter(s => s.minorId !== minorId));

  pmsApi.deleteMinor(minorId).catch(err => {
    console.warn('PMS API: Failed to delete minor on backend', err);
  });
};

// --- Schedule Operations for Minors ---
export const getSchedules = (): any[] => {
  return getFromStorage(STORAGE_KEYS.SCHEDULES) || [];
};

export const saveSchedules = (schedules: any[]): void => {
  saveToStorage(STORAGE_KEYS.SCHEDULES, schedules);
};

export const saveScheduleForMinor = (minorId: string, scheduleData: any): any => {
  const all = getSchedules();
  const existingIdx = all.findIndex(s => s.minorId === minorId);
  const fileId = scheduleData?.fileId || `sched_${minorId}`;

  if (scheduleData?.fileUrl && (scheduleData.fileUrl.startsWith('data:') || scheduleData.fileUrl.startsWith('blob:'))) {
    saveFileToIndexedDB(fileId, scheduleData.fileUrl);
  }

  const record = {
    minorId,
    ...scheduleData,
    fileId,
    fileUrl: scheduleData?.fileUrl && scheduleData.fileUrl.length > 10000 ? `idb:${fileId}` : (scheduleData?.fileUrl || ''),
    updatedAt: new Date().toISOString()
  };
  if (existingIdx >= 0) {
    all[existingIdx] = record;
  } else {
    all.push(record);
  }
  saveSchedules(all);

  pmsApi.upsertSchedule(minorId, record).catch(err => {
    console.warn('PMS API: Failed to sync schedule to backend', err);
  });

  return record;
};

export const getScheduleForMinor = (minorId: string): any => {
  const all = getSchedules();
  const found = all.find(s => s.minorId === minorId);
  if (found) return found;
  const minors = getMinors();
  const minor = minors.find(m => m.id === minorId);
  if (minor?.scheduleRows || minor?.scheduleFile || minor?.scheduleFileId) {
    return {
      minorId,
      fileName: minor.scheduleFileName || '',
      fileUrl: minor.scheduleFile || '',
      fileId: minor.scheduleFileId || `sched_${minor.id}`,
      rows: minor.scheduleRows || [],
      headers: minor.scheduleHeaders || []
    };
  }
  return null;
};

export const getProjectOrMinor = (id: string): any => {
  const projects = getProjects();
  let found = projects.find(p => p.serialNo === id || p.id === id);
  if (found) return { ...found, isMinor: false };

  const minors = getMinors();
  const minor = minors.find(m => m.id === id);
  if (minor) {
    const parent = projects.find(p => p.serialNo === minor.projectNo || p.id === minor.projectNo);
    if (parent) {
      return {
        ...parent,
        serialNo: minor.id,
        projectName: `${parent.projectName} (${minor.minorName})`,
        originalProjectName: parent.projectName,
        minorName: minor.minorName,
        contractorName: minor.contractorName || parent.contractorName,
        isMinor: true,
        parentProjectNo: parent.serialNo,
        poNumber: minor.poNumber || parent.poNumber || '',
        scheduleFile: minor.scheduleFile || '',
        scheduleFileId: minor.scheduleFileId || '',
        scheduleFileName: minor.scheduleFileName || '',
        rows: minor.scheduleRows || [],
        headers: minor.scheduleHeaders || []
      };
    }
  }
  return null;
};

// --- External PO Master ---
const DEFAULT_SAMPLE_PDF = 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxOCAwMDAwMCBuIAowMDAwMDAwMDY5IDAwMDAwIG4gCjAwMDAwMDAxMjUgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA0Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoxOTkKJSVFT0YK';

export const normalizePoMasterRecord = (r: any): any => {
  const poNum = (r.po_number || r.poNumber || '').trim();
  if (!poNum) return null;
  const rawDate = r.po_created_date || r.poDate || r.timestamp || '';
  const dateVal = toInputDateFormat(rawDate) || toInputDateFormat(new Date());
  const rawAmt = Number(r.total_po_amount || r.totalPoAmount || r.amount || r.total_amount || 0);

  const subContractorName = r.subContractorName || r.sub_contractor_name || '';
  const subContractorPhone = r.subContractorPhone || r.sub_contractor_phone || '';
  const subContractorEmail = r.subContractorEmail || r.sub_contractor_email || '';
  const contractorName = r.contractorName || r.contractor_name || '';
  const contractorPhone = r.contractorPhone || r.contractor_phone || '';
  const contractorEmail = r.contractorEmail || r.contractor_email || '';

  const rawPhone = (subContractorPhone || contractorPhone || r.site_engineer_phoneNo || r.siteEngineerPhoneNo || r.supplierPhone || r.whatsapp_number || r.number || '').toString().replace(/\D/g, '').slice(0, 10);
  const rawName = subContractorName || contractorName || r.name || r.party_name || r.partyName || r.vendor_name || r.supplierName || 'Sub Contractor';
  const rawUnit = r.unit || r.workingUnit || r.items?.[0]?.uom || 'Hectares';
  const rawRemarks = r.description || r.product || r.remarks || (r.items?.[0]?.product_name ? `${r.items[0].product_name} execution & supply` : 'Loaded from PO Management System');

  return {
    poNumber: poNum,
    name: rawName,
    number: rawPhone || '9876543210',
    workingUnit: rawUnit,
    poAmount: String(rawAmt || '0'),
    poDate: dateVal,
    poDocument: r.pdf || DEFAULT_SAMPLE_PDF,
    poDocumentName: `${poNum}_Approved.pdf`,
    remarks: rawRemarks,
    contractorName,
    contractorPhone,
    contractorEmail,
    subContractorName,
    subContractorPhone,
    subContractorEmail,
    partyName: r.party_name || r.partyName || r.vendor_name || r.supplierName || '',
  };
};

export const isDummyExternalPo = (r: any): boolean => {
  if (!r) return true;
  const num = (r.poNumber || r.po_number || '').trim();
  if (/^PO-2026-00[1-9]$|^PO-2026-010$/.test(num)) return true;
  return false;
};

export const getExternalPurchaseOrders = (): any[] => {
  let existing = getFromStorage(STORAGE_KEYS.EXTERNAL_POS);
  if (!Array.isArray(existing)) {
    existing = [];
  }
  return existing.filter((p: any) => !isDummyExternalPo(p));
};

export const saveExternalPurchaseOrders = (orders: any[]): void => {
  saveToStorage(STORAGE_KEYS.EXTERNAL_POS, orders);
};

export const upsertExternalPurchaseOrder = (order: any): any => {
  const normalized = normalizePoMasterRecord(order) || order;
  if (!normalized?.poNumber) return;
  const current = getExternalPurchaseOrders();
  const index = current.findIndex((p: any) => p.poNumber === normalized.poNumber);
  let updated: any[];
  if (index >= 0) {
    updated = [...current];
    const prev = updated[index] || {};
    updated[index] = { ...prev, ...normalized };
  } else {
    updated = [normalized, ...current];
  }
  saveExternalPurchaseOrders(updated);
  return updated;
};

export const syncExternalPurchaseOrdersFromMaster = (masterRecords: any[]) => {
  if (!Array.isArray(masterRecords) || masterRecords.length === 0) return getExternalPurchaseOrders();
  const current = getExternalPurchaseOrders();
  const poMap = new Map<string, any>();
  current.forEach((p: any) => {
    if (p?.poNumber) poMap.set(p.poNumber, p);
  });

  // Group by PO number
  const groups: Record<string, any[]> = {};
  masterRecords.forEach((r: any) => {
    const num = (r.po_number || r.poNumber || '').trim();
    if (num) {
      if (!groups[num]) groups[num] = [];
      groups[num].push(r);
    }
  });

  Object.keys(groups).forEach((poNum) => {
    const rows = groups[poNum];
    const first = rows[0];
    const totalAmt = rows.reduce((acc, cur) => acc + (Number(cur.amount) || Number(cur.total_amount) || Number(cur.total_po_amount) || Number(cur.totalPoAmount) || 0), 0);
    const normalized = normalizePoMasterRecord({
      ...first,
      total_po_amount: totalAmt > 0 ? totalAmt : first.total_po_amount || first.totalPoAmount,
    });
    if (normalized) {
      const prev = poMap.get(normalized.poNumber) || {};
      poMap.set(normalized.poNumber, {
        ...normalized,
        ...prev,
        contractorName: prev.contractorName || normalized.contractorName || '',
        contractorPhone: prev.contractorPhone || normalized.contractorPhone || '',
        contractorEmail: prev.contractorEmail || normalized.contractorEmail || '',
        subContractorName: prev.subContractorName || normalized.subContractorName || '',
        subContractorPhone: prev.subContractorPhone || normalized.subContractorPhone || '',
        subContractorEmail: prev.subContractorEmail || normalized.subContractorEmail || '',
        name: (prev.subContractorName || prev.contractorName) ? (prev.subContractorName || prev.contractorName) : (normalized.subContractorName || normalized.contractorName || prev.name || normalized.name || ''),
        number: (prev.subContractorPhone || prev.contractorPhone) ? (prev.subContractorPhone || prev.contractorPhone) : (normalized.subContractorPhone || normalized.contractorPhone || prev.number || normalized.number || ''),
      });
    }
  });

  const merged = Array.from(poMap.values());
  saveExternalPurchaseOrders(merged);
  return merged;
};

// --- Product IMF Operations ---
export const calculateProductAmount = (qty: any, rate: any, gst: any, discount: any): number => {
  const q = Number(qty) || 0;
  const r = Number(rate) || 0;
  const g = Number(gst) || 0;
  const d = Number(discount) || 0;
  const base = q * r;
  const afterDiscount = base - (base * (d / 100));
  const total = afterDiscount + (afterDiscount * (g / 100));
  return Number(total.toFixed(2));
};

export const getProductIMFData = (): Record<string, any[]> => {
  const existing = getFromStorage(STORAGE_KEYS.PRODUCT_IMF);
  if (existing && typeof existing === 'object' && Object.keys(existing).length > 0) {
    return existing;
  }
  return {};
};

export const saveProductIMFData = (data: any): void => {
  saveToStorage(STORAGE_KEYS.PRODUCT_IMF, data);
};

export const getProductsByPONumber = (poNumber: string): any[] => {
  if (!poNumber) return [];
  const allData = getProductIMFData();
  const cleanPo = String(poNumber).trim();

  if (allData[cleanPo] && Array.isArray(allData[cleanPo])) {
    return allData[cleanPo].map((item, idx) => {
      const q = Number(item.qty) || 0;
      return {
        ...item,
        sn: item.sn ?? (idx + 1),
        issued: item.issued !== undefined ? Number(item.issued) : Math.max(0, Math.round(q * 0.9)),
        issueReturn: item.issueReturn !== undefined ? Number(item.issueReturn) : Math.max(0, Math.round(q * 0.02)),
        missing: item.missing !== undefined ? Number(item.missing) : Math.max(0, Math.round(q * 0.01)),
        damage: item.damage !== undefined ? Number(item.damage) : Math.max(0, Math.round(q * 0.005)),
        amount: calculateProductAmount(item.qty, item.rate, item.gst, item.discount)
      };
    });
  }

  return [];
};

export const saveProductsForPONumber = (poNumber: string, items: any[]): void => {
  if (!poNumber) return;
  const allData = { ...getProductIMFData() };
  allData[String(poNumber).trim()] = items;
  saveProductIMFData(allData);

  pmsApi.upsertProductIMF(poNumber, items).catch(err => {
    console.warn('PMS API: Failed to sync Product IMF to backend', err);
  });
};

// --- Documentation Operations ---
export const getDocumentationFiles = (): any[] => {
  const data = getFromStorage(STORAGE_KEYS.DOCUMENTATION);
  if (data && Array.isArray(data)) {
    return data.filter((d: any) => d.id && !d.id.startsWith('doc-00'));
  }
  return [];
};

export const saveDocumentationFiles = (docs: any[]): void => {
  saveToStorage(STORAGE_KEYS.DOCUMENTATION, docs);
};

export const addDocumentationFile = (doc: any): any => {
  const all = getDocumentationFiles();
  const newDoc = {
    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    fileName: doc.fileName || 'document.docx',
    title: doc.title || doc.fileName || 'Untitled Document',
    docType: doc.docType || 'General Document',
    projectName: doc.projectName || '',
    agreementNo: doc.agreementNo || '',
    recipient: doc.recipient || '',
    refNo: doc.refNo || '',
    date: doc.date || toInputDateFormat(new Date()),
    fileSize: doc.fileSize || 'Unknown',
    fileType: doc.fileType || (doc.fileName?.split('.').pop()?.toUpperCase() || 'FILE'),
    fileData: doc.fileData || '',
    fileUrl: doc.fileUrl || '',
    remarks: doc.remarks || '',
    uploadedBy: 'Admin User',
    uploadedAt: new Date().toISOString()
  };
  const updated = [newDoc, ...all];
  saveDocumentationFiles(updated);

  pmsApi.createDocument(newDoc).catch(err => {
    console.warn('PMS API: Failed to sync document to backend', err);
  });

  return newDoc;
};

export const updateDocumentationFile = (id: string, fields: any): any => {
  const all = getDocumentationFiles();
  const idx = all.findIndex(d => d.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...fields, updatedAt: new Date().toISOString() };
    saveDocumentationFiles(all);
    return all[idx];
  }
  return null;
};

export const deleteDocumentationFile = (id: string): any[] => {
  const all = getDocumentationFiles();
  const filtered = all.filter(d => d.id !== id);
  saveDocumentationFiles(filtered);

  pmsApi.deleteDocument(id).catch(err => {
    console.warn('PMS API: Failed to delete document on backend', err);
  });

  return filtered;
};

export const getDocumentations = (): any[] => {
  return getFromStorage(STORAGE_KEYS.DOCUMENTATION) || [];
};

export const saveDocumentations = (data: any[]): void => saveToStorage(STORAGE_KEYS.DOCUMENTATION, data);

export const getDocumentationForProject = (projectNo: string): any => {
  if (!projectNo) return null;
  return getDocumentations().find(d => d.projectNo === projectNo) || null;
};

export const updateProjectOrMinorDetails = (projectNo: string, updatedFields: any): any => {
  if (!projectNo || !updatedFields) return null;
  const projects = getProjects();
  const pIdx = projects.findIndex(p => p.serialNo === projectNo || p.id === projectNo);
  if (pIdx !== -1) {
    projects[pIdx] = { ...projects[pIdx], ...updatedFields };
    saveProjects(projects);
    return projects[pIdx];
  }
  const minors = getMinors();
  const mIdx = minors.findIndex(m => m.id === projectNo || m.serialNo === projectNo);
  if (mIdx !== -1) {
    minors[mIdx] = { ...minors[mIdx], ...updatedFields };
    saveMinors(minors);
    return minors[mIdx];
  }
  return null;
};

// --- Email Logs Operations ---
export const getEmailLogs = (): any[] => {
  return getFromStorage(STORAGE_KEYS.EMAIL_LOGS) || [];
};

export const saveEmailLogs = (logs: any[]): void => {
  saveToStorage(STORAGE_KEYS.EMAIL_LOGS, logs);
};

export const addEmailLog = (log: any): any => {
  const all = getEmailLogs();
  const now = new Date().toISOString();
  const newLog = {
    id: `elog_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    projectNo: log.projectNo || '',
    projectName: log.projectName || '',
    agreementNo: log.agreementNo || '',
    to: log.to || '',
    cc: log.cc || '',
    subject: log.subject || '',
    body: log.body || '',
    attachedDocs: Array.isArray(log.attachedDocs) ? log.attachedDocs : [],
    sentAt: log.sentAt || now,
    status: log.status || 'Sent (Simulated)',
    sender: log.sender || 'Pooja Construction Project Team'
  };
  const updated = [newLog, ...all];
  saveEmailLogs(updated);

  pmsApi.createEmailLog(newLog).catch(err => {
    console.warn('PMS API: Failed to sync email log to backend', err);
  });

  return newLog;
};

export const getEmailLogsForProject = (projectName: string, projectNo: string, agreementNo: string): any[] => {
  const pName = (projectName || '').toLowerCase().trim();
  const pNo = (projectNo || '').toLowerCase().trim();
  const agrNo = (agreementNo || '').toLowerCase().trim();

  return getEmailLogs().filter(l => {
    const lp = (l.projectName || '').toLowerCase().trim();
    const lno = (l.projectNo || '').toLowerCase().trim();
    const lagr = (l.agreementNo || '').toLowerCase().trim();

    if (pName && (lp === pName || lp.includes(pName) || pName.includes(lp))) return true;
    if (pNo && (lno === pNo || lp.includes(pNo))) return true;
    if (agrNo && lagr && lagr === agrNo) return true;
    return false;
  });
};

// Pulls POs raised in the Indent -> PO flow (backend) into the local PO master + product rates,
// so Sub-Contractor billing can pick them and take rates from them.
export const syncBackendPOsToLocal = async (): Promise<void> => {
  try {
    const res: any = await pmsApi.get('/pos');
    const pos: any[] = Array.isArray(res) ? res : res?.data || [];
    if (!pos.length) return;
    syncExternalPurchaseOrdersFromMaster(
      pos.map((po) => ({
        po_number: po.po_number,
        poNumber: po.po_number,
        name: po.vendor_name,
        partyName: po.vendor_name,
        date: po.po_date || po.created_at,
        total_po_amount: Number(po.grand_total) || 0,
      }))
    );
    const imf = { ...getProductIMFData() };
    let changed = false;
    pos.forEach((po) => {
      const key = String(po.po_number || '').trim();
      if (!key || imf[key]?.length) return;
      imf[key] = (po.line_items || po.items || []).map((it: any, i: number) => ({
        sn: i + 1,
        product: it.product_name,
        productName: it.product_name,
        description: it.description,
        uom: it.uom,
        qty: Number(it.quantity) || 0,
        rate: Number(it.rate) || 0,
        gst: Number(it.gst_percent) || 0,
        discount: Number(it.discount_percent) || 0,
      }));
      changed = true;
    });
    if (changed) saveProductIMFData(imf);
  } catch (e) {
    console.warn('PMS: could not sync backend POs for billing', e);
  }
};
