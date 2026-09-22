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
