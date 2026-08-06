import type { SystemManifest } from '@/shared/types/systemManifest';

export const ChecklistSystemManifest: SystemManifest = {
  id: 'checklist',
  name: 'Checklist & Delegation',
  description: 'Recurring checklist tasks, one-time delegation tasks, doer submissions, and admin approval workflows',
  version: '1.0.0',
  iconName: 'CheckSquare',
  themeColor: 'purple',
  basePath: '/checklist',
  defaultRoute: '/checklist/dashboard',
  navGroups: [
    {
      id: 'checklist_ops',
      title: 'Task Operations',
      items: [
        { id: 'dash', name: 'Dashboard', path: '/checklist/dashboard' },
        { id: 'quick-task', name: 'Quick Task', path: '/checklist/quick-task' },
        { id: 'assign', name: 'Assign Task', path: '/checklist/assign' },
        { id: 'submit-checklist', name: 'Checklist Submission', path: '/checklist/submit/checklist' },
        { id: 'submit-delegation', name: 'Delegation Submission', path: '/checklist/submit/delegation' },
        { id: 'approval', name: 'Admin Approval', path: '/checklist/approval' },
      ],
    },
  ],
};

export default ChecklistSystemManifest;
