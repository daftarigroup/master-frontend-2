import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatCurrency } from './helpers';

const COLUMNS = [
  { key: 'sn', label: 'Request No.' },
  { key: 'date', label: 'Date' },
  { key: 'projectName', label: 'Project Name' },
  { key: 'personName', label: 'Employee' },
  { key: 'direction', label: 'In / Out' },
  { key: 'groupHead', label: 'Category / Department' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
  { key: 'approvedBy', label: 'Approved By' },
];

const rowValue = (row: any, key: string) => {
  if (key === 'date') return formatDate(row.date);
  if (key === 'direction') return row.direction === 'IN' ? 'In' : 'Out';
  if (key === 'amount') return `${row.direction === 'IN' ? '+' : '-'}${formatCurrency(row.amount)}`;
  if (key === 'approvedBy') return row.approvedBy || '-';
  if (key === 'groupHead') return row.groupHead || '-';
  return row[key] ?? '-';
};

export function exportToExcel(rows: any[], projectName?: string) {
  const data = rows.map((row) => {
    const record: Record<string, any> = {};
    COLUMNS.forEach((col) => {
      record[col.label] = rowValue(row, col.key);
    });
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, `petty-cash-report-${projectName || 'all'}-${Date.now()}.xlsx`);
}

export function exportToPDF(rows: any[], projectName?: string, filters: any = {}) {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(14);
  doc.text('Petty Cash Report', 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Project: ${projectName || '-'}`, 14, 22);
  const filterLine = [
    filters.fromDate ? `From: ${filters.fromDate}` : null,
    filters.toDate ? `To: ${filters.toDate}` : null,
    filters.personName ? `Employee: ${filters.personName}` : null,
    filters.groupHead ? `Category/Dept: ${filters.groupHead}` : null,
    filters.status ? `Status: ${filters.status}` : null,
  ]
    .filter(Boolean)
    .join('   |   ');
  if (filterLine) doc.text(filterLine, 14, 28);

  autoTable(doc, {
    startY: filterLine ? 33 : 27,
    head: [COLUMNS.map((c) => c.label)],
    body: rows.map((row) => COLUMNS.map((col) => rowValue(row, col.key))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [14, 165, 233] },
  });

  doc.save(`petty-cash-report-${projectName || 'all'}-${Date.now()}.pdf`);
}
