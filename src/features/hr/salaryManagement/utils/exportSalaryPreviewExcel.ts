import * as XLSX from 'xlsx';
import type { PayrollEmployee } from '../types/types';

export interface ExportSalaryPreviewOptions {
  employees: PayrollEmployee[];
  month: number;
  year: number;
  monthName: string;
}

const formatCurrency = (val: number | null | undefined): number => {
  if (val == null || isNaN(val)) return 0;
  return Math.round(val);
};

export function exportSalaryPreviewToExcel({
  employees,
  month: _month,
  year,
  monthName,
}: ExportSalaryPreviewOptions) {
  // 1. Column Definitions
  const columns = [
    // Employee Info
    { group: 'EMPLOYEE INFO', header: 'Emp Code', wch: 14 },
    { group: 'EMPLOYEE INFO', header: 'Employee Name', wch: 24 },
    { group: 'EMPLOYEE INFO', header: 'Company', wch: 22 },
    { group: 'EMPLOYEE INFO', header: 'Location', wch: 18 },
    { group: 'EMPLOYEE INFO', header: 'Department', wch: 20 },
    { group: 'EMPLOYEE INFO', header: 'Designation', wch: 20 },

    // Bank Details
    { group: 'BANK DETAILS', header: 'Bank Name', wch: 22 },
    { group: 'BANK DETAILS', header: 'Account No.', wch: 20 },
    { group: 'BANK DETAILS', header: 'IFSC Code', wch: 15 },
    { group: 'BANK DETAILS', header: 'UAN', wch: 16 },
    { group: 'BANK DETAILS', header: 'Insurance / ESIC ID', wch: 20 },
    { group: 'BANK DETAILS', header: 'Payment Mode', wch: 14 },

    // Attendance
    { group: 'ATTENDANCE', header: 'Working Days', wch: 14 },
    { group: 'ATTENDANCE', header: 'Days Present', wch: 14 },
    { group: 'ATTENDANCE', header: 'Weekend Worked', wch: 16 },
    { group: 'ATTENDANCE', header: 'Holiday Worked', wch: 16 },
    { group: 'ATTENDANCE', header: 'OT Hours', wch: 12 },

    // Earnings
    { group: 'EARNINGS (₹)', header: 'Monthly CTC', wch: 15, isNum: true },
    { group: 'EARNINGS (₹)', header: 'Basic', wch: 14, isNum: true },
    { group: 'EARNINGS (₹)', header: 'HRA', wch: 14, isNum: true },
    { group: 'EARNINGS (₹)', header: 'Conveyance', wch: 14, isNum: true },
    { group: 'EARNINGS (₹)', header: 'Medical Allow.', wch: 15, isNum: true },
    { group: 'EARNINGS (₹)', header: 'Special Allow.', wch: 15, isNum: true },
    { group: 'EARNINGS (₹)', header: 'OT Pay', wch: 13, isNum: true },
    { group: 'EARNINGS (₹)', header: 'Weekend Pay', wch: 13, isNum: true },
    { group: 'EARNINGS (₹)', header: 'Holiday Pay', wch: 13, isNum: true },
    { group: 'EARNINGS (₹)', header: 'Gross Earnings', wch: 16, isNum: true },

    // Deductions
    { group: 'DEDUCTIONS (₹)', header: "Emp'ee PF", wch: 14, isNum: true },
    { group: 'DEDUCTIONS (₹)', header: "Emp'er PF", wch: 14, isNum: true },
    { group: 'DEDUCTIONS (₹)', header: "Emp'ee ESIC", wch: 14, isNum: true },
    { group: 'DEDUCTIONS (₹)', header: "Emp'er ESIC", wch: 14, isNum: true },
    { group: 'DEDUCTIONS (₹)', header: 'Loan Deduct.', wch: 14, isNum: true },
    { group: 'DEDUCTIONS (₹)', header: 'Total Deductions', wch: 16, isNum: true },

    // Payroll & Status
    { group: 'PAYROLL & STATUS', header: 'Net In-Hand Salary', wch: 18, isNum: true },
    { group: 'PAYROLL & STATUS', header: 'Calculation Type', wch: 18 },
    { group: 'PAYROLL & STATUS', header: 'Payslip Status', wch: 16 },
    { group: 'PAYROLL & STATUS', header: 'Hold Status', wch: 14 },
    { group: 'PAYROLL & STATUS', header: 'Hold Reason', wch: 22 },
  ];

  // 2. Build rows array (Array of Arrays)
  const rows: (string | number)[][] = [];

  // Title Row (Row 1)
  const titleRow = new Array(columns.length).fill('');
  titleRow[0] = `Salary Preview Report - ${monthName} ${year}`;
  rows.push(titleRow);

  // Subtitle / Metadata Row (Row 2)
  const metaRow = new Array(columns.length).fill('');
  const nowStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  metaRow[0] = `Exported on: ${nowStr} | Total Records: ${employees.length}`;
  rows.push(metaRow);

  // Blank spacer row (Row 3)
  rows.push(new Array(columns.length).fill(''));

  // Group Headers (Row 4)
  const groupRow = columns.map((col) => col.group);
  rows.push(groupRow);

  // Column Headers (Row 5)
  const headerRow = columns.map((col) => col.header);
  rows.push(headerRow);

  // Running totals for summary row
  let sumMonthlyCtc = 0;
  let sumBasic = 0;
  let sumHra = 0;
  let sumConveyance = 0;
  let sumMedical = 0;
  let sumSpecial = 0;
  let sumOtPay = 0;
  let sumWeekendPay = 0;
  let sumHolidayPay = 0;
  let sumGross = 0;
  let sumEmpPf = 0;
  let sumErPf = 0;
  let sumEmpEsic = 0;
  let sumErEsic = 0;
  let sumLoan = 0;
  let sumTotalDeductions = 0;
  let sumNetPay = 0;

  // 3. Employee Data Rows
  employees.forEach((emp) => {
    const bd = emp.salaryBreakdown;
    const isPreview = bd?.isPreview ?? !emp.payslip;

    const monthlyCtc = formatCurrency(emp.monthlySalary);
    const basic = formatCurrency(bd?.basic);
    const hra = formatCurrency(bd?.hra);
    const conveyance = formatCurrency(bd?.conveyance);
    const medical = formatCurrency(bd?.medicalAllowance);
    const special = formatCurrency(bd?.specialAllowance);
    const otPay = formatCurrency(emp.payslip?.otPay);
    const weekendPay = formatCurrency(emp.payslip?.weekendPay);
    const holidayPay = formatCurrency(emp.payslip?.holidayPay);
    const gross = formatCurrency(emp.payslip?.grossEarnings ?? bd?.grossEarnings);

    const empPf = formatCurrency(bd?.empPF);
    const erPf = formatCurrency(bd?.erPF);
    const empEsic = formatCurrency(bd?.empESIC);
    const erEsic = formatCurrency(bd?.erESIC);

    const loanTotal = (emp.payslip?.deductionBreakdown ?? [])
      .filter((d) => d.id.startsWith('loan_'))
      .reduce((s, d) => s + d.amount, 0);
    const loanDeduct = formatCurrency(loanTotal);

    const totalDeductions = formatCurrency(
      emp.payslip?.totalDeductions ?? empPf + empEsic + loanDeduct
    );

    const netPay = formatCurrency(
      emp.payslip?.netPay ??
        (gross > 0 ? Math.max(0, gross - empPf - empEsic - loanDeduct) : 0)
    );

    // Accumulate sums
    sumMonthlyCtc += monthlyCtc;
    sumBasic += basic;
    sumHra += hra;
    sumConveyance += conveyance;
    sumMedical += medical;
    sumSpecial += special;
    sumOtPay += otPay;
    sumWeekendPay += weekendPay;
    sumHolidayPay += holidayPay;
    sumGross += gross;
    sumEmpPf += empPf;
    sumErPf += erPf;
    sumEmpEsic += empEsic;
    sumErEsic += erEsic;
    sumLoan += loanDeduct;
    sumTotalDeductions += totalDeductions;
    sumNetPay += netPay;

    const calcType = isPreview ? 'Preview (Unfinalized)' : 'Finalized';
    const payslipStatus = emp.payslip
      ? emp.payslip.status === 'paid'
        ? `Paid (${emp.payslip.paidDate || ''})`
        : 'Generated'
      : 'Not Generated';

    const holdStatus = emp.salaryOnHold ? 'On Hold' : 'Active';
    const holdReason = emp.salaryHoldReason || '—';

    rows.push([
      // Employee Info
      emp.empCode || emp.employeeId || '—',
      emp.name || '—',
      emp.company || '—',
      emp.location || '—',
      emp.department?.name || '—',
      emp.designation || '—',

      // Bank Details (Keep as string to avoid formatting loss)
      emp.bankName || '—',
      emp.bankAccount ? String(emp.bankAccount) : '—',
      emp.ifscCode || '—',
      emp.uan ? String(emp.uan) : '—',
      emp.insuranceId ? String(emp.insuranceId) : '—',
      emp.mode || '—',

      // Attendance
      emp.workingDays ?? 0,
      emp.daysPresent ?? 0,
      emp.weekendWorkDays ?? 0,
      emp.holidayWorkDays ?? 0,
      emp.overtimeHours ?? 0,

      // Earnings
      monthlyCtc,
      basic,
      hra,
      conveyance,
      medical,
      special,
      otPay,
      weekendPay,
      holidayPay,
      gross,

      // Deductions
      empPf,
      erPf,
      empEsic,
      erEsic,
      loanDeduct,
      totalDeductions,

      // Payroll & Status
      netPay,
      calcType,
      payslipStatus,
      holdStatus,
      holdReason,
    ]);
  });

  // 4. Summary / Total Row
  const totalRow: (string | number)[] = new Array(columns.length).fill('');
  totalRow[0] = 'TOTAL';
  totalRow[1] = `${employees.length} Employee(s)`;

  // Fill in total numbers
  totalRow[17] = sumMonthlyCtc;
  totalRow[18] = sumBasic;
  totalRow[19] = sumHra;
  totalRow[20] = sumConveyance;
  totalRow[21] = sumMedical;
  totalRow[22] = sumSpecial;
  totalRow[23] = sumOtPay;
  totalRow[24] = sumWeekendPay;
  totalRow[25] = sumHolidayPay;
  totalRow[26] = sumGross;
  totalRow[27] = sumEmpPf;
  totalRow[28] = sumErPf;
  totalRow[29] = sumEmpEsic;
  totalRow[30] = sumErEsic;
  totalRow[31] = sumLoan;
  totalRow[32] = sumTotalDeductions;
  totalRow[33] = sumNetPay;

  rows.push(totalRow);

  // 5. Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = columns.map((col) => ({ wch: col.wch }));

  // Merges for header groups
  // Title row merge across first 6 columns
  // Subtitle row merge across first 6 columns
  // Group Header merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // Subtitle
    { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // Employee Info
    { s: { r: 3, c: 6 }, e: { r: 3, c: 11 } }, // Bank Details
    { s: { r: 3, c: 12 }, e: { r: 3, c: 16 } }, // Attendance
    { s: { r: 3, c: 17 }, e: { r: 3, c: 26 } }, // Earnings
    { s: { r: 3, c: 27 }, e: { r: 3, c: 32 } }, // Deductions
    { s: { r: 3, c: 33 }, e: { r: 3, c: 37 } }, // Payroll & Status
  ];

  // Number formatting for data rows + summary row
  const startRow = 5; // 0-indexed row 5 is 1st data row (Excel row 6)
  const endRow = rows.length - 1;

  for (let r = startRow; r <= endRow; r++) {
    columns.forEach((col, c) => {
      if (col.isNum) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (cell && typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = '#,##0';
        }
      }
    });
  }

  // 6. Create workbook and write file
  const wb = XLSX.utils.book_new();
  const sheetName = `Payroll_${monthName}_${year}`.slice(0, 31); // Max 31 chars in sheet name
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeMonth = monthName.toLowerCase();
  const filename = `Salary_Preview_${safeMonth}_${year}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
