import React from 'react';

export const HrDashboardPage = React.lazy(
  () => import('@/features/hr/dashboard/components/MainDashboard')
);

export const HrIndentPage = React.lazy(
  () => import('@/features/hr/indent/components/MainIndent')
);

export const HrFindEnquiryPage = React.lazy(
  () => import('@/features/hr/findEnquiry/components/MainFindEnquiry')
);

export const HrEmployeePage = React.lazy(
  () => import('@/features/hr/employee/components/MainEmployee')
);

export const HrDeploymentPage = React.lazy(
  () => import('@/features/hr/deployment/components/MainManpowerDeployment')
);

export const HrAttendancePage = React.lazy(
  () => import('@/features/hr/attendance/components/MainEmployeeAttendance')
);

export const HrLeavePage = React.lazy(
  () => import('@/features/hr/leaveManagement/components/MainLeaveManagement')
);

export const HrGatePassPage = React.lazy(
  () => import('@/features/hr/gatePass/components/MainGatePass')
);

export const HrAdvancePage = React.lazy(
  () => import('@/features/hr/advanceApproval/components/MainAdvanceApproval')
);

export const HrLoanTransactionPage = React.lazy(
  () => import('@/features/hr/advanceApproval/components/LoanTransactionPage')
);

export const HrSalaryManagementPage = React.lazy(
  () => import('@/features/hr/salaryManagement/components/MainSalaryManagement')
);

export const HrSalaryDetailPage = React.lazy(
  () => import('@/features/hr/salaryManagement/components/EmployeeSalaryDetail')
);

export const HrAfterJoiningPage = React.lazy(
  () => import('@/features/hr/afterJoiningWork/components/MainAfterJoiningWork')
);

export const HrAfterLeavingPage = React.lazy(
  () => import('@/features/hr/afterLeavingWork/components/MainAfterLeavingWork')
);

export const HrLetterFormatterPage = React.lazy(
  () => import('@/features/hr/letterFormatter/components/MainLetterFormatter')
);

export const HrCalendarPage = React.lazy(
  () => import('@/features/hr/companyCalendar/components/MainCompanyCalendar')
);

export const HrSocialSitePage = React.lazy(
  () => import('@/features/hr/socialSite/components/MainSocialSite')
);

export const HrReportsPage = React.lazy(
  () => import('@/features/hr/misReport/components/MainMisReport')
);
