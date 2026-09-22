import React from 'react';

export const RepairTasksPage = React.lazy(
  () => import('@/features/maintenancepro/repair_tasks/components/main_maintenancepro_repair_tasks')
);

export const PartAndVendorPage = React.lazy(
  () => import('@/features/maintenancepro/part_and_vendor/components/MainPartAndVendor')
);

export const RepairStoreinPage = React.lazy(
  () => import('@/features/maintenancepro/repair/storein/components/main_repairbotivate_storein')
);

export const RepairSentmachinePage = React.lazy(
  () => import('@/features/maintenancepro/repair/sentmachine/components/main_repairbotivate_sentmachine')
);

export const RepairPaymentPage = React.lazy(
  () => import('@/features/maintenancepro/repair/payment/components/main_repairbotivate_payment')
);

export const AMCPage = React.lazy(
  () => import('@/features/maintenancepro/repair/amc/components/main_repairbotivate_amc')
);

export const RepairCalendarPage = React.lazy(
  () => import('@/features/maintenancepro/repair/calendar/components/main_repairbotivate_calendar')
);

export const RepairDailyReportPage = React.lazy(
  () => import('@/features/maintenancepro/repair/dailyreport/components/main_repairbotivate_dailyreport')
);
