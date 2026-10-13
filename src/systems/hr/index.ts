import type { SystemManifest } from '@/shared/types/systemManifest';

export const HrSystemManifest: SystemManifest = {
  id: 'hr',
  name: 'HR & Facilities System',
  description: 'Employee directory, recruitment pipeline, attendance, leave approvals, salary structure, and gate passes',
  version: '1.0.0',
  iconName: 'Users',
  themeColor: 'teal',
  basePath: '/hr',
  defaultRoute: '/hr/dashboard',
  navGroups: [
    {
      id: 'hr_overview',
      title: 'Overview',
      items: [
        { id: 'hr-dash', name: 'HR Dashboard', path: '/hr/dashboard' },
      ],
    },
    {
      id: 'hr_recruitment',
      title: 'Recruitment & Hiring',
      items: [
        { id: 'hr-indent', name: 'Job Requisition (Indent)', path: '/hr/indent' },
        { id: 'hr-enquiry', name: 'Candidate Pipeline', path: '/hr/find-enquiry' },
        { id: 'hr-social', name: 'Social Site Postings', path: '/hr/social-site' },
      ],
    },
    {
      id: 'hr_employees',
      title: 'Employee Directory & Ops',
      items: [
        { id: 'hr-employee', name: 'Employee Directory', path: '/hr/employee' },
        { id: 'hr-deployment', name: 'Manpower Deployment', path: '/hr/deployment' },
        { id: 'hr-after-joining', name: 'After Joining Work', path: '/hr/after-joining' },
        { id: 'hr-after-leaving', name: 'After Leaving Work', path: '/hr/after-leaving' },
        { id: 'hr-gatepass', name: 'Gate Pass', path: '/hr/gate-pass' },
      ],
    },
    {
      id: 'hr_time_attendance',
      title: 'Attendance & Leaves',
      items: [
        { id: 'hr-mark-attendance', name: 'Mark Attendance', path: '/hr/mark-attendance' },
        { id: 'hr-attendance', name: 'Attendance Management', path: '/hr/attendance' },
        { id: 'hr-leave', name: 'Leave Management', path: '/hr/leave' },
        { id: 'hr-calendar', name: 'Company Calendar', path: '/hr/calendar' },
      ],
    },
    {
      id: 'hr_payroll_finance',
      title: 'Payroll & Advances',
      items: [
        { id: 'hr-salary', name: 'Salary Management', path: '/hr/salary-management' },
        { id: 'hr-advance', name: 'Advance & Loan Approval', path: '/hr/advance' },
        // { id: 'hr-reports', name: 'HR MIS Reports', path: '/hr/reports' },
      ],
    },
    {
      id: 'hr_letters',
      title: 'Documentation',
      items: [
        { id: 'hr-letter-formatter', name: 'Letter Formatter', path: '/hr/letter-formatter' },
      ],
    },
  ],
};

export default HrSystemManifest;
