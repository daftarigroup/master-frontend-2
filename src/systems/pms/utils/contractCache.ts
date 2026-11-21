// In-memory cache of contracts loaded from the database (/pms/contract-vendors). Nothing is written to localStorage.
export interface CachedContract {
  poNumber: string; name: string;
  items: Array<{ product: string; rate: number; unit: string; internalCode: string }>;
}
let contracts: CachedContract[] = [];

export const setContractCache = (rows: any[]) => {
  contracts = (rows || []).map((r) => ({
    poNumber: `CON-${r.id}`,
    name: r.vendor_name,
    items: (Array.isArray(r.items) ? r.items : []).map((it: any, i: number) => ({
      product: it.product_name, rate: Number(it.rate) || 0, unit: it.uom || 'Nos', internalCode: `CON-${i + 1}`,
    })),
  }));
};
export const getCachedContracts = () => contracts;
