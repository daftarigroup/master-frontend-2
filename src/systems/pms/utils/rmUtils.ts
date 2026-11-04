// @ts-nocheck
import { DESIGN_COLUMNS } from '../views/execution/UploadDesign';

// Alignment already has its own column - exclude it from the measurement fields
export const MEASURE_COLUMNS = DESIGN_COLUMNS.filter(col => col.key !== 'alignment' && col.key !== 'valve');

// Show the value as-is (0 included) - only fall back to '-' when it's actually empty
export const displayVal = (v) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

// YYYY-MM-DD (from a date input) -> DD/MM/YYYY for display
export const formatDate = (d) => {
  if (!d) return '-';
  const [y, m, day] = String(d).split('-');
  return (y && m && day) ? `${day}/${m}/${y}` : d;
};

// Next RA-NNN number, based on the highest existing RA- (or legacy RM-) number (not the current count), so
// deleting a bill never causes a later one to reuse its number - same convention as the
// project's own PN-### serial numbers (see Add_Project.jsx).
export const generateRMNo = (existingBills) => {
  const maxNo = existingBills.reduce((max, b) => {
    const match = /^(?:RM|RA)-(\d+)$/i.exec(b.rmNo || '');
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `RA-${String(maxNo + 1).padStart(3, '0')}`;
};

export const formatBillNo = (val) => {
  if (!val) return '';
  return String(val).replace(/^RM-/i, 'RA-');
};

// Identifies one Execution/Actual entry across RM bills, independent of which bill it ends up in
export const sourceKey = (billType, sourceId) => `${billType}:${sourceId}`;

// Which page an RM bill belongs to: Execution-type bills live in Department Billing (RM1),
// Actual-type bills live in Sub Contractor Billings (RM2) - each with its own Pending/History.
export const billHomePath = (bill) => (bill.billType === 'Execution' ? '/rm1' : '/rm2');
