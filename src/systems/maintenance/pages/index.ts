import React from 'react';

// Maintenance & Repair (merged). Retired pages (plans, assign task, calendars, daily reports, repair stages,
// AMC, parts & vendors) are gone; their URLs redirect from main.tsx.

export const MaintenanceDashboardPage = React.lazy(
  () => import('@/features/maintenancepro/dashboard/components/main_maintenancepro_dashboard')
);

export const MaintenanceRecordsPage = React.lazy(() => import('@/features/maintenancepro/records/components/RecordsList'));

export const MachineRecordPage = React.lazy(() => import('@/features/maintenancepro/records/components/MachineRecord'));

export const AssignmentStatusPage = React.lazy(() => import('@/features/maintenancepro/assignments/components/AssignmentStatus'));

export const MachinesListPage = React.lazy(
  () => import('@/features/maintenancepro/machines/components/main_maintenancepro_machines')
);

export const MachineDetailsPage = React.lazy(
  () => import('@/features/maintenancepro/machines/components/MachineDetails')
);

export const AddMachinePage = React.lazy(
  () => import('@/features/maintenancepro/machines/components/add_machine_form')
);

export const MachinePartsPage = React.lazy(
  () => import('@/features/maintenancepro/machines/components/MachinePartsList')
);

export const WorkOrdersPage = React.lazy(() => import('@/features/maintenancepro/work_orders/components/WorkOrders'));

export const BreakdownLogPage = React.lazy(
  () => import('@/features/maintenancepro/breakdown_log/components/main_maintenancepro_breakdown_log')
);

export const PendingApprovalPage = React.lazy(
  () => import('@/features/maintenancepro/pending_approval/components/main_maintenancepro_pending_approval')
);

export const MaintenanceReportsPage = React.lazy(
  () => import('@/features/maintenancepro/reports/components/main_maintenancepro_reports')
);
