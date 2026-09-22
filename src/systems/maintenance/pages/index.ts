import React from 'react';

export const MaintenanceDashboardPage = React.lazy(
  () => import('@/features/maintenancepro/dashboard/components/main_maintenancepro_dashboard')
);

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

export const MaintenancePlansPage = React.lazy(
  () => import('@/features/maintenancepro/plans/components/main_maintenancepro_plans')
);

export const MaintenanceTasksPage = React.lazy(
  () => import('@/features/maintenancepro/unique_task/components/main_maintenancepro_unique_task')
);

export const AssignTaskPage = React.lazy(
  () => import('@/features/maintenancepro/assign_task/components/main_maintenancepro_assign_task')
);

export const BreakdownLogPage = React.lazy(
  () => import('@/features/maintenancepro/breakdown_log/components/main_maintenancepro_breakdown_log')
);

export const DailyMachineLogPage = React.lazy(
  () => import('@/features/maintenancepro/daily_machine_log/components/main_maintenancepro_daily_machine_log')
);

export const DailyReportPage = React.lazy(
  () => import('@/features/maintenancepro/daily_report/components/main_maintenancepro_daily_report')
);

export const MaintenanceCalendarPage = React.lazy(
  () => import('@/features/maintenancepro/calendar_view/components/main_maintenancepro_calendar')
);

export const PendingApprovalPage = React.lazy(
  () => import('@/features/maintenancepro/pending_approval/components/main_maintenancepro_pending_approval')
);

export const MaintenanceReportsPage = React.lazy(
  () => import('@/features/maintenancepro/reports/components/main_maintenancepro_reports')
);
