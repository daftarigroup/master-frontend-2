/**
 * In-memory Mock Data Store for HR & Facilities System
 * Provides realistic initial data and CRUD handling for frontend preview
 */

export interface MockEmployee {
  id: number;
  tenantId: string;
  employeeId: string;
  empCode: string;
  name: string;
  designation: string;
  departmentId: string;
  departmentName: string;
  joiningDate: string;
  phone: string;
  email: string;
  status: string;
  managerName: string;
  workLocation: string;
  bloodGroup: string;
  bankAccount: string;
  ifscCode: string;
  photo?: string | null;
  onboardingChecklist?: any;
  exitChecklist?: any;
  salaryOnHold?: boolean;
  offerLetterIssued?: boolean;
  idCardIssued?: boolean;
  inductionDone?: boolean;
  customChecklistItems?: any[];
}

export interface MockCandidate {
  id: number;
  tenantId: string;
  candidateEnquiryNo: string;
  candidateName: string;
  dob: string;
  phoneNo: string;
  email: string;
  previousCompany: string;
  experience: string;
  previousPosition: string;
  maritalStatus: string;
  aadharNo: string;
  lastSalary: string;
  reasonForLeaving: string;
  currentAddress: string;
  status: string;
  createdAt: string;
  indentId?: number;
  notes?: string;
  nextCallDate?: string;
  followUpNotes?: string;
}

export interface MockIndent {
  id: number;
  recordId: string;
  tenantId: string;
  title: string;
  departmentId: string;
  departmentName: string;
  gender: 'MALE' | 'FEMALE' | 'ANY';
  prefer: 'FRESHER' | 'EXPERIENCE' | 'ANY';
  experienceYears: string;
  noOfPost: number;
  completionDate: string;
  socialsite: string[];
  jobType: string[];
  budget: number;
  priority: string;
  status: string;
  createdAt: string;
}

export interface MockAttendance {
  id: number;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  empCode: string;
  departmentName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'present' | 'absent' | 'half-day' | 'leave';
  workingHours: number;
  overtime: number;
}

export interface MockLeave {
  id: number;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  departmentName: string;
  hodName: string;
  substitute: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface MockAdvanceRequest {
  id: number;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  empCode: string;
  departmentName: string;
  requestAmount: number;
  monthlyDeduction: number;
  noOfMonths: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAmount?: number;
  approvedMonthlyDeduction?: number;
  approvedNoOfMonths?: number;
  approvedDate?: string;
  startDeductionMonth?: string;
  loanId?: string;
  priorOutstandingBalance?: number;
  priorLoanId?: string;
}

export interface MockGatePass {
  id: number;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  empCode?: string;
  departmentName?: string;
  placeToVisit: string;
  reason: string;
  departureTime: string;
  expectedArrival: string;
  outTime?: string;
  inTime?: string;
  type?: string;
  approvedBy?: string;
  whatsappNo?: string;
  status: 'issued' | 'open' | 'out' | 'closed' | 'returned' | 'pending' | 'rejected';
  createdAt: string;
}

// Initial Seed Data
const initialEmployees: MockEmployee[] = [
  {
    id: 1,
    tenantId: 'tenant-1',
    employeeId: 'EMP-001',
    empCode: 'EMP001',
    name: 'Aakash Sharma',
    designation: 'Senior Project Engineer',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    joiningDate: '2023-04-10',
    phone: '+91 98234 56789',
    email: 'aakash.sharma@masterinfra.com',
    status: 'active',
    managerName: 'Vikram Joshi',
    workLocation: 'Surewada Site',
    bloodGroup: 'B+',
    bankAccount: '918237461928',
    ifscCode: 'HDFC0001234',
    offerLetterIssued: true,
    idCardIssued: true,
    inductionDone: true,
  },
  {
    id: 2,
    tenantId: 'tenant-1',
    employeeId: 'EMP-002',
    empCode: 'EMP002',
    name: 'Neha Verma',
    designation: 'HR Executive',
    departmentId: 'dept-5',
    departmentName: 'Human Resources',
    joiningDate: '2023-07-15',
    phone: '+91 98765 12345',
    email: 'neha.verma@masterinfra.com',
    status: 'active',
    managerName: 'Priya Sharma',
    workLocation: 'Head Office',
    bloodGroup: 'O+',
    bankAccount: '501002348576',
    ifscCode: 'ICIC0005678',
    offerLetterIssued: true,
    idCardIssued: true,
    inductionDone: true,
  },
  {
    id: 3,
    tenantId: 'tenant-1',
    employeeId: 'EMP-003',
    empCode: 'EMP003',
    name: 'Rohan Deshmukh',
    designation: 'Quality Control Inspector',
    departmentId: 'dept-3',
    departmentName: 'Quality',
    joiningDate: '2024-01-05',
    phone: '+91 97654 32109',
    email: 'rohan.d@masterinfra.com',
    status: 'active',
    managerName: 'Sunil Patil',
    workLocation: 'Surewada Site',
    bloodGroup: 'A+',
    bankAccount: '304958671203',
    ifscCode: 'SBIN0004321',
    offerLetterIssued: true,
    idCardIssued: true,
    inductionDone: true,
  },
  {
    id: 4,
    tenantId: 'tenant-1',
    employeeId: 'EMP-004',
    empCode: 'EMP004',
    name: 'Kavita Nair',
    designation: 'Accounts Officer',
    departmentId: 'dept-6',
    departmentName: 'Finance & Accounts',
    joiningDate: '2024-03-20',
    phone: '+91 99887 76655',
    email: 'kavita.n@masterinfra.com',
    status: 'active',
    managerName: 'Anil Verma',
    workLocation: 'Head Office',
    bloodGroup: 'AB+',
    bankAccount: '827364519283',
    ifscCode: 'KKBK0009876',
    offerLetterIssued: true,
    idCardIssued: true,
    inductionDone: true,
  },
];

const initialCandidates: MockCandidate[] = [
  {
    id: 1,
    tenantId: 'tenant-1',
    candidateEnquiryNo: 'ENQ-2026-001',
    candidateName: 'Amit Bhardwaj',
    dob: '1996-08-14',
    phoneNo: '+91 98450 11223',
    email: 'amit.bhardwaj@gmail.com',
    previousCompany: 'L&T Construction',
    experience: '4 Years',
    previousPosition: 'Site Engineer',
    maritalStatus: 'Single',
    aadharNo: '4829-1928-3746',
    lastSalary: '45,000 / month',
    reasonForLeaving: 'Looking for better career growth and site exposure',
    currentAddress: 'Sector 14, Navi Mumbai',
    status: 'interview_scheduled',
    createdAt: '2026-08-28',
    notes: 'Strong technical knowledge in RCC and structural steel.',
    nextCallDate: '2026-09-08',
  },
  {
    id: 2,
    tenantId: 'tenant-1',
    candidateEnquiryNo: 'ENQ-2026-002',
    candidateName: 'Sneha Kulkarni',
    dob: '1998-11-22',
    phoneNo: '+91 98112 33445',
    email: 'sneha.kulkarni@outlook.com',
    previousCompany: 'Shapoorji Pallonji',
    experience: '2.5 Years',
    previousPosition: 'Junior Billing Engineer',
    maritalStatus: 'Married',
    aadharNo: '7362-9182-4657',
    lastSalary: '32,000 / month',
    reasonForLeaving: 'Relocation to Pune',
    currentAddress: 'Kothrud, Pune',
    status: 'shortlisted',
    createdAt: '2026-09-01',
    notes: 'Good understanding of BOQ and measurement sheets.',
  },
];

const initialIndents: MockIndent[] = [
  {
    id: 1,
    recordId: 'IND-2026-001',
    tenantId: 'tenant-1',
    title: 'Site Civil Engineer (Highway & Grading)',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    gender: 'ANY',
    prefer: 'EXPERIENCE',
    experienceYears: '3-5 Years',
    noOfPost: 2,
    completionDate: '2026-09-30',
    socialsite: ['Naukri', 'LinkedIn'],
    jobType: ['Full Time', 'On-site'],
    budget: 55000,
    priority: 'High',
    status: 'open',
    createdAt: '2026-08-20',
  },
  {
    id: 2,
    recordId: 'IND-2026-002',
    tenantId: 'tenant-1',
    title: 'Store & Inventory Supervisor',
    departmentId: 'dept-7',
    departmentName: 'Administration',
    gender: 'MALE',
    prefer: 'EXPERIENCE',
    experienceYears: '2+ Years',
    noOfPost: 1,
    completionDate: '2026-09-25',
    socialsite: ['Indeed', 'Direct Reference'],
    jobType: ['Full Time', 'Site-based'],
    budget: 35000,
    priority: 'Urgent',
    status: 'open',
    createdAt: '2026-08-24',
  },
];

const initialLeaves: MockLeave[] = [
  {
    id: 1,
    tenantId: 'tenant-1',
    employeeId: 'EMP-001',
    employeeName: 'Aakash Sharma',
    departmentId: 'dept-1',
    departmentName: 'Engineering',
    hodName: 'Vikram Joshi',
    substitute: 'Rohan Deshmukh',
    leaveType: 'Privilege Leave (PL)',
    fromDate: '2026-09-10',
    toDate: '2026-09-12',
    days: 3,
    reason: 'Family wedding event',
    status: 'pending',
    createdAt: '2026-09-02',
  },
  {
    id: 2,
    tenantId: 'tenant-1',
    employeeId: 'EMP-003',
    employeeName: 'Rohan Deshmukh',
    departmentId: 'dept-3',
    departmentName: 'Quality',
    hodName: 'Sunil Patil',
    substitute: 'Aakash Sharma',
    leaveType: 'Casual Leave (CL)',
    fromDate: '2026-09-01',
    toDate: '2026-09-01',
    days: 1,
    reason: 'Personal paperwork at native place',
    status: 'approved',
    createdAt: '2026-08-29',
    approvedBy: 'Sunil Patil',
    approvedDate: '2026-08-30',
  },
];

const initialAdvances: MockAdvanceRequest[] = [
  {
    id: 1,
    tenantId: 'tenant-1',
    employeeId: 'EMP-001',
    employeeName: 'Aakash Sharma',
    empCode: 'EMP001',
    departmentName: 'Engineering',
    requestAmount: 25000,
    monthlyDeduction: 5000,
    noOfMonths: 5,
    reason: 'Medical expense for family treatment',
    status: 'pending',
    requestDate: '2026-09-02',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 2,
    tenantId: 'tenant-1',
    employeeId: 'EMP-003',
    employeeName: 'Rohan Deshmukh',
    empCode: 'EMP003',
    departmentName: 'Quality',
    requestAmount: 15000,
    monthlyDeduction: 3000,
    noOfMonths: 5,
    reason: 'Home renovation',
    status: 'approved',
    requestDate: '2026-08-15',
    createdAt: '2026-08-15T09:30:00.000Z',
    updatedAt: '2026-08-16T14:20:00.000Z',
    approvedAmount: 15000,
    approvedMonthlyDeduction: 3000,
    approvedNoOfMonths: 5,
    approvedDate: '2026-08-16',
    startDeductionMonth: '2026-09',
    loanId: 'LN-2026-001',
  },
];

const initialGatePasses: MockGatePass[] = [
  {
    id: 1,
    tenantId: 'tenant-1',
    employeeId: 'EMP-001',
    employeeName: 'John Smith',
    empCode: 'EMP001',
    departmentName: 'Engineering',
    type: 'Personal',
    placeToVisit: 'City Clinic',
    reason: 'Medical Emergency',
    departureTime: '11:00 AM',
    expectedArrival: '02:00 PM',
    outTime: '11:00 AM',
    inTime: '02:00 PM',
    status: 'open',
    approvedBy: 'Sarah Wilson',
    createdAt: '2026-09-07T11:00:00.000Z',
  },
  {
    id: 2,
    tenantId: 'tenant-1',
    employeeId: 'EMP-002',
    employeeName: 'Rahul Verma',
    empCode: 'EMP002',
    departmentName: 'Engineering',
    type: 'Official',
    placeToVisit: 'Navi Mumbai Municipal Corp',
    reason: 'Client Meeting',
    departureTime: '10:30 AM',
    expectedArrival: '01:30 PM',
    outTime: '10:30 AM',
    inTime: '-',
    status: 'out',
    approvedBy: 'Amit Patel',
    createdAt: '2026-09-07T10:30:00.000Z',
  },
  {
    id: 3,
    tenantId: 'tenant-1',
    employeeId: 'EMP-003',
    employeeName: 'Priya Sharma',
    empCode: 'EMP003',
    departmentName: 'Quality',
    type: 'Personal',
    placeToVisit: 'State Bank of India',
    reason: 'Bank Work',
    departureTime: '03:00 PM',
    expectedArrival: '04:30 PM',
    outTime: '03:00 PM',
    inTime: '04:30 PM',
    status: 'closed',
    approvedBy: 'Rajesh Kumar',
    createdAt: '2026-09-06T15:00:00.000Z',
  },
  {
    id: 4,
    tenantId: 'tenant-1',
    employeeId: 'EMP-004',
    employeeName: 'Aakash Sharma',
    empCode: 'EMP004',
    departmentName: 'Engineering',
    type: 'Official',
    placeToVisit: 'Surewada Quarry & Batching Plant',
    reason: 'Inspection of aggregate dispatch',
    departureTime: '10:15 AM',
    expectedArrival: '02:00 PM',
    outTime: '10:15 AM',
    inTime: '-',
    status: 'pending',
    approvedBy: 'Vikram Joshi',
    createdAt: '2026-09-07T10:15:00.000Z',
  },
];

const today = new Date().toISOString().slice(0, 10);
const initialAttendance: MockAttendance[] = initialEmployees.map((emp, idx) => ({
  id: idx + 1,
  tenantId: 'tenant-1',
  employeeId: emp.employeeId,
  employeeName: emp.name,
  empCode: emp.empCode,
  departmentName: emp.departmentName,
  date: today,
  checkIn: idx % 2 === 0 ? '09:05' : '08:55',
  checkOut: '18:00',
  status: 'present',
  workingHours: 9,
  overtime: 0,
}));

class MockHrStore {
  employees: MockEmployee[] = [...initialEmployees];
  candidates: MockCandidate[] = [...initialCandidates];
  indents: MockIndent[] = [...initialIndents];
  leaves: MockLeave[] = [...initialLeaves];
  advances: MockAdvanceRequest[] = [...initialAdvances];
  gatePasses: MockGatePass[] = [...initialGatePasses];
  attendance: MockAttendance[] = [...initialAttendance];
  checklistConfig = {
    disabledStandardKeys: [] as string[],
    globalCustomItems: [] as { key: string; label: string }[],
  };

  getDashboardStats() {
    return {
      totalEmployees: this.employees.length,
      activeEmployees: this.employees.filter((e) => e.status === 'active').length,
      presentToday: this.attendance.filter((a) => a.status === 'present').length,
      onLeaveToday: this.attendance.filter((a) => a.status === 'leave').length,
      openIndents: this.indents.filter((i) => i.status === 'open').length,
      activeCandidates: this.candidates.length,
      pendingLeaves: this.leaves.filter((l) => l.status === 'pending').length,
      pendingAdvances: this.advances.filter((a) => a.status === 'pending').length,
      todayGatePasses: this.gatePasses.filter((g) => g.status === 'issued').length,
      upcomingBirthdays: [
        { name: 'Amit Bhardwaj', date: '14th Sep', department: 'Engineering' },
        { name: 'Sneha Kulkarni', date: '22nd Sep', department: 'Quality' },
      ],
      workAnniversaries: [
        { name: 'Aakash Sharma', years: 2, date: '10th Sep', department: 'Engineering' },
      ],
    };
  }
}

export const mockHrStore = new MockHrStore();
