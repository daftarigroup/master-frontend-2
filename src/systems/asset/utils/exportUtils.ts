import * as XLSX from 'xlsx';
import type { AssetProduct } from '../types';
import { formatTimestampToDDMMYYYY } from './dateUtils';
import { calculateLiveRunningHours } from './liveHours';

function specsToString(specs: AssetProduct['specs']): string {
  if (!Array.isArray(specs)) return '';
  return specs
    .map((s) => (s.value ? `${s.name}: ${s.value}` : s.name))
    .filter(Boolean)
    .join(', ');
}

export function exportAssetsToExcel(products: AssetProduct[]): number {
  const rows = products.map((p, index) => {
    const liveHours = calculateLiveRunningHours(p.initialEntryDate, p.runningHours, p.status, p.operationalStatus);
    return {
      'S.No': index + 1,
      'Serial No / Asset Tag': p.sn || '',
      'Product / Equipment Name': p.productName || '',
      Category: p.category || '',
      Type: p.type || '',
      Brand: p.brand || '',
      Model: p.model || '',
      'Serial Number': p.serialNo || '',
      SKU: p.sku || '',
      'Manufacturing Date': formatTimestampToDDMMYYYY(p.mfgDate) || '',
      Origin: p.origin || '',
      Status: p.status || '',
      'Operational Status': p.operationalStatus || '',
      'Live Running Hours': `${liveHours} hrs`,
      'Initial Entry Date': formatTimestampToDDMMYYYY(p.initialEntryDate) || '',
      'Entry Source': p.isFromMachineParts ? 'Machine Parts Master' : 'Direct Entry',
      'Asset / Purchase Date': formatTimestampToDDMMYYYY(p.assetDate) || '',
      'Invoice No': p.invoiceNo || '',
      'Cost (₹)': p.cost || p.assetValue || '',
      Quantity: p.quantity || '1',
      'Supplier / Vendor': p.supplierName || '',
      'Supplier Contact': p.supplierPhone || '',
      'Supplier Email': p.supplierEmail || '',
      'Payment Mode': p.paymentMode || '',
      'Location / Plant': p.location || '',
      Division: p.division || '',
      Department: p.department || '',
      'Machine Area / Bay': p.machineArea || '',
      'Assigned Custodian': p.assignedTo || '',
      'Responsible Supervisor': p.responsiblePerson || '',
      'Storage Location': p.storageLoc || '',
      'Usage Type': p.usageType || '',
      'Warranty Available': p.warrantyAvailable || '',
      'Warranty Provider': p.warrantyProvider || '',
      'Warranty End Date': formatTimestampToDDMMYYYY(p.warrantyEnd) || '',
      'AMC Available': p.amc || '',
      'AMC Provider': p.amcProvider || '',
      'AMC End Date': formatTimestampToDDMMYYYY(p.amcEnd) || '',
      'Maintenance Required': p.maintenanceRequired || '',
      'Maintenance Type': p.maintenanceType || '',
      'Maintenance Priority': p.priority || '',
      'Maintenance Frequency': p.frequency || '',
      'Next Service Date': formatTimestampToDDMMYYYY(p.nextService) || '',
      'Last Repair Date': formatTimestampToDDMMYYYY(p.lastRepairDate) || 'Never',
      'Last Repair Cost (₹)': p.repairCost || '0',
      'Total Repairs Count': p.repairCount || '0',
      'Total Repair Cost (₹)': p.totalRepairCost || '0',
      'Parts Changed': p.partChanged || 'No',
      'Replaced Parts': (p.partNames || []).filter(Boolean).join(', '),
      'Parts / Specifications': specsToString(p.specs),
      'Depreciation Method': p.depMethod || '',
      'Depreciation Rate (%)': p.depRate || '',
      'Asset Life (Years)': p.assetLife || '',
      'Residual Value (₹)': p.residualValue || '',
      Condition: p.condition || '',
      'Internal Notes': p.internalNotes || '',
      'Usage Remarks': p.usageRemarks || '',
      'Created By': p.createdBy || '',
      'Created Date': formatTimestampToDDMMYYYY(p.createdDate) || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Assets_Master_Report_${dateStr}.xlsx`);
  return rows.length;
}
