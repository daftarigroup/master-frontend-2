// @ts-nocheck
// Excel Exporter for Table 1 and Department RA Bills
// Uses 'xlsx' (SheetJS) to generate exact spreadsheet files

import * as XLSX from 'xlsx';
import type { Table1CalculationResult } from '@/systems/pms/utils/billingEngine';

export function exportTable1ToExcel(calcResult: Table1CalculationResult, filename = 'Table_1_Quantity_Abstract_Surewada.xlsx') {
  const { items, minors, tenderGrandTotal, designGrandTotal, diffGrandTotal, pctDiffGrandTotal } = calcResult;

  const wb = XLSX.utils.book_new();

  // 1. Header rows
  const wsData: any[][] = [];

  wsData.push([
    'Name of Work :- Construction of Pipe Distribution Network on Minors along with CADWM from RD 0 to 10000 M on Main Canal of Surewada Lift Irrigation Scheme (Irrigation Potential of 2073 Ha)'
  ]);

  // Row 2: Sub-headers
  const row2: string[] = ['Name of Item', '', '', 'Unit', 'Rate'];
  minors.forEach(m => {
    row2.push('Tender', 'Design');
  });
  row2.push('Total Tender Qty', 'Amount AS PER TENDER', 'Total Design Qty', 'Amount AS PER DESIGN', 'Difference (Y-W)', '% Difference');
  wsData.push(row2);

  // Row 3: Minor Names
  const row3: string[] = ['', '', '', '', ''];
  minors.forEach(m => {
    row3.push(`${m.name} @ ${m.rd}`, '');
  });
  row3.push('Total', '', 'Total', '', '', '');
  wsData.push(row3);

  // Row 4: Column Sub-labels
  const row4: string[] = ['', '', '', '', ''];
  minors.forEach(() => {
    row4.push('Qty', 'Qty');
  });
  row4.push('Qty', 'Amount', 'Qty', 'Amount', 'Diff', '%');
  wsData.push(row4);

  // Data rows
  items.forEach(it => {
    const row: any[] = [
      it.itemNo || '',
      it.subItem || '',
      it.pipeDiaMm ? 'mm' : '',
      it.unit || '',
      it.rate || ''
    ];

    minors.forEach(m => {
      const mData = it.minors[m.id];
      row.push(mData?.tenderQty || 0, mData?.designQty || 0);
    });

    row.push(
      it.calculatedTenderQty,
      it.calculatedTenderAmount,
      it.calculatedDesignQty,
      it.calculatedDesignAmount,
      it.calculatedDiffAmount,
      (it.calculatedPctDiff / 100)
    );

    wsData.push(row);
  });

  // Grand Total Row
  const grandTotalRow: any[] = ['GRAND TOTAL', '', '', '', ''];
  minors.forEach(() => grandTotalRow.push('', ''));
  grandTotalRow.push(
    '',
    tenderGrandTotal,
    '',
    designGrandTotal,
    diffGrandTotal,
    pctDiffGrandTotal / 100
  );
  wsData.push(grandTotalRow);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 15 }, { wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 14 },
    ...minors.flatMap(() => [{ wch: 12 }, { wch: 12 }]),
    { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 14 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Table 1');
  XLSX.writeFile(wb, filename);
}
