import { api } from '@/lib/axios';
import type { AMCData } from '../../types/types';

export const fetchAMCData = async (): Promise<AMCData> => {
  const res = await api.get('/repair-system/amc');
  const amcs: any[] = res.data?.data ?? [];

  const machineData = amcs.map((a, idx) => ({
    id: a.id ? String(a.id) : String(idx + 1),
    indentNumber: a.contractNumber || `AMC-${idx + 1}`,
    machineName: a.machineName || '—',
    machineSerialNo: a.serialNumber || '',
    taskStatus: a.status || 'Active',
    approvalStatus: null,
    cost: typeof a.annualCost === 'number' ? a.annualCost : Number(a.annualCost) || 0,
    createdAt: a.startDate || new Date().toISOString(),
    source: 'workorder' as const,
    vendorName: a.vendorName || '—',
    tenant: a.tenant ?? null,
  }));

  const vendorMap: Record<string, { vendorName: string; totalAmount: number; count: number; details: any[] }> = {};
  amcs.forEach((a) => {
    const vName = a.vendorName || 'Unknown Vendor';
    if (!vendorMap[vName]) {
      vendorMap[vName] = {
        vendorName: vName,
        totalAmount: 0,
        count: 0,
        details: [],
      };
    }
    const cost = typeof a.annualCost === 'number' ? a.annualCost : Number(a.annualCost) || 0;
    vendorMap[vName].totalAmount += cost;
    vendorMap[vName].count += 1;
    vendorMap[vName].details.push({
      id: String(a.id ?? `${vName}-${vendorMap[vName].count}`),
      partName: a.scope || a.contractNumber || 'AMC Service',
      quantity: a.visitsPerYear ?? null,
      cost,
      warrantyFromDate: a.startDate ?? null,
      warrantyToDate: a.endDate ?? null,
      machineName: a.machineName ?? null,
      source: 'workorder' as const,
      date: a.startDate ?? '',
    });
  });

  const totalCost = amcs.reduce((sum, a) => {
    const cost = typeof a.annualCost === 'number' ? a.annualCost : Number(a.annualCost) || 0;
    return sum + cost;
  }, 0);

  return {
    machineData,
    vendorData: Object.values(vendorMap),
    allTimeTotalCost: totalCost,
  };
};
