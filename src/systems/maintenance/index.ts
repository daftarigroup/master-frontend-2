import type { SystemManifest } from '@/shared/types/systemManifest';

export const MaintenanceSystemManifest: SystemManifest = {
  id: 'maintenance',
  name: 'Maintenance & Machinery System',
  description: 'Preventive maintenance, machine breakdown logs, work orders, and spare parts management',
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
        { id: 'breakdowns', name: 'Breakdown Requests', path: '/maintenance/breakdowns' },
      ],
    },
  ],
};
