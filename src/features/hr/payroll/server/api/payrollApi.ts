// HR Payroll API - Mock data functions

import type { PayrollRecord, PayrollSummary } from '../../types/types';

const mockPayrollData: PayrollRecord[] = [
  {
    id: '1',
    employeeId: 'EMP-0001',
    employeeName: 'John Smith',
    department: 'Engineering',
    designation: 'Senior Developer',
    month: 'December',
    year: 2024,
    basicSalary: 50000,
    hra: 20000,
    conveyance: 5000,
    otherAllowances: 8000,
    grossSalary: 83000,
    pf: 6000,
    esi: 1500,
    tax: 8000,
    otherDeductions: 0,
    totalDeductions: 15500,
    netSalary: 67500,
    status: 'processed',
  },
  {
    id: '2',
    employeeId: 'EMP-0002',
    employeeName: 'Priya Sharma',
    department: 'HR',
    designation: 'HR Manager',
    month: 'December',
    year: 2024,
    basicSalary: 45000,
    hra: 18000,
    conveyance: 5000,
    otherAllowances: 5000,
    grossSalary: 73000,
    pf: 5400,
    esi: 1300,
    tax: 6500,
    otherDeductions: 0,
    totalDeductions: 13200,
    netSalary: 59800,
    status: 'processed',
  },
  {
    id: '3',
    employeeId: 'EMP-0003',
    employeeName: 'Rahul Verma',
    department: 'Production',
    designation: 'Production Manager',
    month: 'December',
    year: 2024,
    basicSalary: 55000,
    hra: 22000,
    conveyance: 5000,
    otherAllowances: 10000,
    grossSalary: 92000,
    pf: 6600,
    esi: 1700,
    tax: 10000,
    otherDeductions: 500,
    totalDeductions: 18800,
    netSalary: 73200,
    status: 'pending',
  },
  {
    id: '4',
    employeeId: 'EMP-0004',
    employeeName: 'Anita Desai',
    department: 'Quality',
    designation: 'QA Engineer',
    month: 'December',
    year: 2024,
    basicSalary: 35000,
    hra: 14000,
    conveyance: 4000,
    otherAllowances: 3000,
    grossSalary: 56000,
    pf: 4200,
    esi: 1000,
    tax: 3000,
    otherDeductions: 0,
    totalDeductions: 8200,
    netSalary: 47800,
    status: 'processed',
  },
  {
    id: '5',
    employeeId: 'EMP-0005',
    employeeName: 'Suresh Kumar',
    department: 'Finance',
    designation: 'Accountant',
    month: 'December',
    year: 2024,
    basicSalary: 40000,
    hra: 16000,
    conveyance: 4500,
    otherAllowances: 4000,
    grossSalary: 64500,
    pf: 4800,
    esi: 1100,
    tax: 4500,
    otherDeductions: 0,
    totalDeductions: 10400,
    netSalary: 54100,
    status: 'pending',
  },
];

export const fetchPayrollData = async (): Promise<PayrollRecord[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return mockPayrollData;
};

export const fetchPayrollSummary = async (): Promise<PayrollSummary> => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return {
    totalEmployees: mockPayrollData.length,
    totalGrossSalary: mockPayrollData.reduce((acc, p) => acc + p.grossSalary, 0),
    totalDeductions: mockPayrollData.reduce((acc, p) => acc + p.totalDeductions, 0),
    totalNetSalary: mockPayrollData.reduce((acc, p) => acc + p.netSalary, 0),
    processed: mockPayrollData.filter((p) => p.status === 'processed').length,
    pending: mockPayrollData.filter((p) => p.status === 'pending').length,
  };
};

export const getDepartments = (): string[] => {
  return [...new Set(mockPayrollData.map((p) => p.department))];
};
