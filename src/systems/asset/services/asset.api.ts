// Backed by an in-memory/localStorage mock store for this frontend-only pass
// (master-backend has no /asset routes yet). Every export here mirrors the
// shape a real axios-based service would have — swapping the bodies below
// for `assetApiClient` calls later is a self-contained change; nothing that
// imports from this file needs to change.
import {
  mockAddProduct,
  mockAddRepair,
  mockDeleteProduct,
  mockGetAssetUsers,
  mockGetMachinePartsList,
  mockGetProductById,
  mockGetProducts,
  mockUpdateProduct,
  resetAssetMockData,
} from '@/lib/mockAssetStore';
import type { AssetProduct, AssetRepair, AssetUser, MachinePart, NewAssetProduct } from '../types';

export const assetApi = {
  getProducts: (): Promise<AssetProduct[]> => mockGetProducts(),
  getProductById: (id: number | string): Promise<AssetProduct | undefined> => mockGetProductById(id),
  addProduct: (product: NewAssetProduct): Promise<AssetProduct> => mockAddProduct(product),
  updateProduct: (id: number | string, patch: Partial<AssetProduct>): Promise<AssetProduct> =>
    mockUpdateProduct(id, patch),
  deleteProduct: (id: number | string): Promise<{ id: number | string }> => mockDeleteProduct(id),
  addRepair: (productId: number | string, repair: AssetRepair): Promise<AssetProduct> =>
    mockAddRepair(productId, repair),
  getAssetUsers: (): Promise<AssetUser[]> => mockGetAssetUsers(),
  getMachinePartsList: (): Promise<MachinePart[]> => mockGetMachinePartsList(),
  /** Reseeds the mock dataset — wired to the "Reload Data" button in the asset list. */
  resetMockData: (): void => resetAssetMockData(),
};
