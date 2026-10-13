import React from 'react';

export const AssetDashboardPage = React.lazy(
  () => import('@/features/asset/asset/components/AssetDashboard')
);

export const AssetListPage = React.lazy(
  () => import('@/features/asset/asset/components/AssetList')
);

export const AssetDetailPage = React.lazy(
  () => import('@/features/asset/asset/components/AssetDetail')
);

export const ProductScanResolverPage = React.lazy(
  () => import('@/features/asset/asset/components/ProductScanResolver')
);

export const PublicAssetDetailPage = React.lazy(
  () => import('@/features/asset/asset/components/PublicAssetDetail')
);

export const EquipmentMasterPage = React.lazy(() => import('@/features/asset/equipment/components/EquipmentMaster'));

export const CostTrackingPage = React.lazy(() => import('@/features/asset/cost/components/CostTracking'));

export const FleetCostsPage = React.lazy(() => import('@/features/asset/cost/components/FleetCosts'));

export const WorkLogsPage = React.lazy(() => import('@/features/asset/worklogs/components/WorkLogs'));

export const DailyEntryPage = React.lazy(() => import('@/features/asset/fleet/components/DailyEntry'));

export const DieselLedgerPage = React.lazy(() => import('@/features/asset/fleet/components/DieselLedger'));

export const MachineLogbookPage = React.lazy(() => import('@/features/asset/fleet/components/MachineLogbook'));
