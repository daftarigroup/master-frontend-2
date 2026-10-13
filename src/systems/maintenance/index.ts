import type { SystemManifest } from '@/shared/types/systemManifest';

export const MaintenanceSystemManifest: SystemManifest = {
  id: 'maintenance',
  name: 'Maintenance & Repair System',
  description: 'Machines, work orders (scheduled, breakdown, repair, outsourced), approvals and breakdowns',
  version: '1.0.0',
  iconName: 'Wrench',
  themeColor: 'amber',
  basePath: '/maintenance',
  defaultRoute: '/maintenance/dashboard',
  gateKey: 'administrate',
  navGroups: [
    {
      id: 'maint_ops',
      title: 'Maintenance Operations',
      items: [
        { id: 'dash', name: 'Maintenance Overview', path: '/maintenance/dashboard' },
        { id: 'machines', name: 'Machine Registry', path: '/maintenance/machines' },
        { id: 'work_orders', name: 'Work Orders', path: '/maintenance/work-orders' },
      ],
    },
  ],
};
