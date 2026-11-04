// @ts-nocheck
import { pmsApi } from '../services/pmsApiClient';

const MIGRATION_FLAG = 'pms_migrated_v1';

export async function migrateLocalStorageToPMS(): Promise<{ migratedCount: number; skipped: boolean }> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { migratedCount: 0, skipped: true };
    }

    if (localStorage.getItem(MIGRATION_FLAG)) {
      return { migratedCount: 0, skipped: true };
    }

    const raw = localStorage.getItem('pcb_projects_v1');
    if (!raw) {
      localStorage.setItem(MIGRATION_FLAG, '1');
      return { migratedCount: 0, skipped: true };
    }

    let projects: any[] = [];
    try {
      projects = JSON.parse(raw);
    } catch {
      localStorage.setItem(MIGRATION_FLAG, '1');
      return { migratedCount: 0, skipped: true };
    }

    if (!Array.isArray(projects) || projects.length === 0) {
      localStorage.setItem(MIGRATION_FLAG, '1');
      return { migratedCount: 0, skipped: true };
    }

    let migrated = 0;
    for (const p of projects) {
      try {
        await pmsApi.createProject({
          serial_no: p.serialNo || p.serial_no,
          project_name: p.projectName || p.project_name || 'Migrated Project',
          project_type: p.projectType || p.project_type || 'Irrigation Projects',
          agreement_number: p.agreementNumber || p.agreement_number,
          department: p.department,
          division: p.division,
          sub_division: p.subDivision || p.sub_division,
          irrigation_capacity: p.irrigationCapacity || p.irrigation_capacity,
          project_location: p.projectLocation || p.project_location,
          village: p.village,
          district: p.district,
          state: p.state,
          contractor_name: p.contractorName || p.contractor_name || 'Pooja Construction',
          contractor_phone: p.contractorPhone || p.contractor_phone,
          contractor_email: p.contractorEmail || p.contractor_email,
          contractor_address: p.contractorAddress || p.contractor_address,
          start_date: p.startDate || p.start_date,
          planned_end_date: p.plannedEndDate || p.planned_end_date,
          work_period: p.workPeriod || p.work_period,
          work_order: p.workOrder || p.work_order,
          work_order_date: p.workOrderDate || p.work_order_date,
          work_order_document: p.workOrderDocument || p.work_order_document,
          work_order_doc_name: p.workOrderDocumentName || p.work_order_doc_name,
          tender_id: p.tenderId || p.tender_id,
          tender_amount: p.tenderAmount || p.tender_amount,
          percentage: p.percentage,
          maintenance_period: p.maintenancePeriod || p.maintenance_period,
          project_description: p.projectDescription || p.project_description,
          status: p.status || 'Active',
        });
        migrated++;
      } catch (err) {
        console.warn('Failed to migrate individual project:', p.serialNo, err);
      }
    }

    localStorage.setItem(MIGRATION_FLAG, '1');
    return { migratedCount: migrated, skipped: false };
  } catch (err) {
    console.error('PMS localStorage migration failed:', err);
    return { migratedCount: 0, skipped: false };
  }
}
