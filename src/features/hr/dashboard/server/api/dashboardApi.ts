// HR Dashboard API - real backend
import { api } from '@/lib/axios';
import type {
  DashboardData,
  V3HrActiveEmployee,
  V3HrAdvanceReqItem,
  V3HrAdvanceSummary,
  V3HrCandidate,
  V3HrDashboardPayload,
  V3HrDeptSalary,
  V3HrFunnel,
  V3HrJoining,
  V3HrKPI,
  V3HrLeaveRequest,
  V3HrRecruitmentRow,
  V3HrSalarySummary,
  V3HrVacancy,
} from '../../types/types';

export const fetchHrDashboardData = async (): Promise<DashboardData> => {
  const response = await api.get('/hrfms/dashboard/stats');
  return response.data.data;
};

// ── V3 HR Dashboard ──────────────────────────────────────────────────

const safeArray = (val: any): any[] => {
  if (Array.isArray(val)) return val;
  if (val?.data && Array.isArray(val.data)) return val.data;
  if (val?.items && Array.isArray(val.items)) return val.items;
  return [];
};

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const endOfDay = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

const asString = (val: unknown, fallback = '—'): string => {
  if (val == null) return fallback;
  if (typeof val === 'string') return val.trim() || fallback;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.name === 'string') return obj.name;
    if (typeof obj.title === 'string') return obj.title;
    if (typeof obj.label === 'string') return obj.label;
  }
  return fallback;
};

export const fetchHrDashboardV3 = async (): Promise<V3HrDashboardPayload> => {
  const [statsRes, indentRes, candidateRes, leaveRes, usersRes, employeeRes, advanceRes] =
    await Promise.all([
      api.get('/hrfms/dashboard/stats').catch(() => null),
      api.get('/hrfms/indent').catch(() => null),
      api.post('/hrfms/candidate/history', {}).catch(() => null),
      api.get('/hrfms/leave').catch(() => null),
      api.get('/auth/users').catch(() => null),
      api.get('/hrfms/employee').catch(() => null),
      api.get('/hrfms/advance-request').catch(() => null),
    ]);

  const baseStats = statsRes?.data?.data ?? {};
  const indents: any[] = safeArray(indentRes?.data?.data ?? indentRes?.data);
  const candidates: any[] = safeArray(candidateRes?.data?.data ?? candidateRes?.data);
  const leaves: any[] = safeArray(leaveRes?.data?.data ?? leaveRes?.data);
  const allUsers: any[] = safeArray(usersRes?.data?.data ?? usersRes?.data);
  const hrEmployees: any[] = safeArray(employeeRes?.data?.data ?? employeeRes?.data);
  const advanceReqs: any[] = safeArray(advanceRes?.data?.data ?? advanceRes?.data);

  // Derive joining data from candidates (no separate /hrfms/joining endpoint exists)
  const joinings: any[] = candidates
    .filter((c: any) => c.joining != null)
    .map((c: any) => ({ ...c.joining, candidate: c }));

  const monthStart = startOfMonth();
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  // ── Vacancies (job indents) ─────────────────────────────────────────
  const openVacancies: V3HrVacancy[] = indents
    .filter((i: any) => {
      const status = String(i.status ?? '').toLowerCase();
      return (
        status === 'open' || status === 'approved' || status === 'active' || status === 'pending'
      );
    })
    .map((i: any) => {
      const total = Number(i.noOfPost ?? i.totalSeats ?? i.seats ?? i.numberOfSeats ?? 0);
      const filled = Number(i._count?.candidates ?? i.filledSeats ?? i.filled ?? 0);
      return {
        id: String(i.id ?? i._id ?? ''),
        title: asString(i.title ?? i.jobTitle ?? i.designation, 'Untitled'),
        department: asString(i.department?.name ?? i.department ?? i.dept),
        totalSeats: total,
        filledSeats: filled,
        remainingSeats: Math.max(0, total - filled),
        applicantCount: Number(i.candidates?.length ?? i.applicantCount ?? i.applications ?? 0),
        deadline: i.completionDate ?? i.deadline ?? i.closingDate ?? null,
        status: asString(i.status, 'open'),
      };
    });

  const totalOpenSeats = openVacancies.reduce((s, v) => s + v.remainingSeats, 0);

  // Indents lookup map by ID and recordId
  const indentMap = new Map<string, any>();
  for (const ind of indents) {
    if (ind?.id != null) indentMap.set(String(ind.id), ind);
    if (ind?.recordId != null) indentMap.set(String(ind.recordId), ind);
  }

  const resolveCandidateDesignation = (c: any): string => {
    const indentId = c?.indentId ?? c?.indent_id;
    const matchedIndent = indentId ? indentMap.get(String(indentId)) : null;
    const raw =
      c?.vacancyTitle ??
      matchedIndent?.title ??
      c?.indent?.title ??
      c?.joining?.designationOffered ??
      c?.joining?.designation_offered ??
      c?.employee?.designation ??
      c?.previousPosition ??
      c?.previous_position ??
      (typeof c?.indent === 'string' ? c?.indent : null);
    return asString(raw, 'General');
  };

  // ── Candidates ──────────────────────────────────────────────────────
  const totalApplications = candidates.length;
  let selectedCandidates = 0;
  let rejectedCandidates = 0;
  for (const c of candidates) {
    const st = String(c.finalResult ?? c.status ?? '').toLowerCase();
    if (['selected', 'joining_initiated', 'joined'].includes(st)) selectedCandidates++;
    else if (['rejected', 'offer_declined'].includes(st)) rejectedCandidates++;
  }
  const recentCandidates: V3HrCandidate[] = [...candidates]
    .sort((a: any, b: any) => {
      const at = new Date(a.appliedDate ?? a.createdAt ?? a.created_at ?? 0).getTime();
      const bt = new Date(b.appliedDate ?? b.createdAt ?? b.created_at ?? 0).getTime();
      return bt - at;
    })
    .slice(0, 8)
    .map((c: any) => ({
      id: String(c.id ?? c._id ?? ''),
      name: asString(c.candidateName ?? c.candidate_name ?? c.name, 'Unknown'),
      vacancyTitle: resolveCandidateDesignation(c),
      appliedDate: c.appliedDate ?? c.createdAt ?? c.created_at ?? '',
      status: asString(c.applicationStatus ?? c.status, 'applied'),
      finalResult: asString(c.finalResult, 'pending'),
    }));

  // ── Joinings ────────────────────────────────────────────────────────
  const recentJoinings: V3HrJoining[] = [...joinings]
    .sort((a: any, b: any) => {
      const at = new Date(a.joiningDate ?? a.createdAt ?? a.created_at ?? 0).getTime();
      const bt = new Date(b.joiningDate ?? b.createdAt ?? b.created_at ?? 0).getTime();
      return bt - at;
    })
    .slice(0, 8)
    .map((j: any) => {
      const c = j.candidate;
      const indentId = c?.indentId ?? c?.indent_id;
      const matchedIndent = indentId ? indentMap.get(String(indentId)) : null;
      return {
        id: String(j.id ?? j._id ?? ''),
        employeeName: asString(
          c?.candidateName ?? c?.candidate_name ?? j.employeeName ?? j.candidateName ?? j.name,
          'Unknown'
        ),
        department: asString(
          matchedIndent?.department?.name ??
            c?.indent?.department?.name ??
            j.department ??
            c?.department?.name ??
            c?.department
        ),
        designation: asString(
          j.designationOffered ??
            j.designation_offered ??
            resolveCandidateDesignation(c) ??
            j.designation,
          '—'
        ),
        joiningDate: j.joiningDate ?? j.createdAt ?? j.created_at ?? '',
        status: asString(j.status ?? j.joiningStatus, 'pending'),
      };
    });

  // Count candidates whose joining was completed this month
  const newJoiningThisMonth = candidates.filter((c: any) => {
    if (!['joined'].includes(String(c.status ?? '').toLowerCase())) return false;
    const joiningDate = c.joining?.joiningDate ?? c.createdAt;
    return new Date(joiningDate ?? 0).getTime() >= monthStart;
  }).length;

  // Count candidates with joining initiated but not yet fully joined
  const pendingJoining = candidates.filter((c: any) => {
    const status = String(c.status ?? '').toLowerCase();
    return status === 'joining_initiated';
  }).length;

  // ── Leave Requests ──────────────────────────────────────────────────
  const pendingLeaveRequests: V3HrLeaveRequest[] = leaves
    .filter((l: any) => String(l.status ?? '').toLowerCase() === 'pending')
    .map((l: any) => ({
      id: String(l.id ?? l._id ?? ''),
      employeeName: asString(l.employeeName ?? l.employee?.name, 'Unknown'),
      leaveType: asString(l.leaveType ?? l.type),
      fromDate: l.fromDate ?? l.startDate ?? '',
      toDate: l.toDate ?? l.endDate ?? '',
      totalDays: Number(l.totalDays ?? l.days ?? 0),
      reason: asString(l.reason, ''),
      status: asString(l.status, 'pending'),
      appliedDate: l.appliedDate ?? l.createdAt ?? '',
    }))
    .sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());

  const employeesOnLeaveToday = leaves.filter((l: any) => {
    const status = String(l.status ?? '').toLowerCase();
    if (status !== 'approved') return false;
    const from = new Date(l.fromDate ?? l.startDate ?? 0).getTime();
    const to = new Date(l.toDate ?? l.endDate ?? 0).getTime();
    return from <= todayEnd && to >= todayStart;
  }).length;

  const approvedLeaveThisMonth = leaves.filter((l: any) => {
    const status = String(l.status ?? '').toLowerCase();
    if (status !== 'approved') return false;
    const t = new Date(l.appliedDate ?? l.createdAt ?? 0).getTime();
    return t >= monthStart;
  }).length;

  // ── Hiring Funnel ───────────────────────────────────────────────────
  // Our pipeline: applied → shortlisted → interviewed → selected → joining_initiated → joined
  // Each stage is cumulative: anyone deeper also counts in earlier stages
  let shortlisted = 0;
  let interviewed = 0;
  let offerSent = 0;
  let fullyJoined = 0;
  for (const c of candidates) {
    const status = String(c.applicationStatus ?? c.status ?? '').toLowerCase();
    if (
      [
        'shortlisted',
        'interviewed',
        'interview_scheduled',
        'interview_completed',
        'selected',
        'joining_initiated',
        'joined',
      ].includes(status)
    )
      shortlisted++;
    if (
      [
        'interviewed',
        'interview_scheduled',
        'interview_completed',
        'selected',
        'joining_initiated',
        'joined',
      ].includes(status)
    )
      interviewed++;
    if (['joining_initiated', 'joined', 'offer_sent', 'offer_accepted'].includes(status))
      offerSent++;
    if (status === 'joined') fullyJoined++;
  }

  const hiringFunnel: V3HrFunnel[] = [
    { stage: 'Applied', count: totalApplications },
    { stage: 'Shortlisted', count: shortlisted },
    { stage: 'Interviewed', count: interviewed },
    { stage: 'Selected', count: selectedCandidates },
    { stage: 'Joining Init', count: offerSent },
    { stage: 'Joined', count: fullyJoined },
  ];

  // ── Active Employees (from HrEmployee records, falling back to active Users) ──
  const activeEmployeesFromHr: V3HrActiveEmployee[] = hrEmployees
    .filter((e: any) => {
      const empStatus = String(e.status ?? '').toLowerCase();
      if (['left', 'completed', 'terminated', 'joining_initiated'].includes(empStatus))
        return false;
      // If linked to a candidate, only count as active once they're fully joined
      if (e.candidate) return String(e.candidate.status ?? '').toLowerCase() === 'joined';
      return true;
    })
    .map((e: any) => ({
      id: String(e.id ?? ''),
      name: asString(e.name ?? e.user?.name, 'Unknown'),
      photo: e.photo ?? e.user?.photo ?? null,
      department: asString(e.department?.name ?? e.department),
      designation: asString(e.designation),
      joiningDate: e.joiningDate ?? e.createdAt ?? null,
      status: 'active',
    }));

  const hrEmployeeUserIds = new Set(hrEmployees.map((e: any) => e.userId).filter(Boolean));
  const activeEmployeesFromUsers: V3HrActiveEmployee[] = allUsers
    .filter(
      (u: any) =>
        u.isActive === true &&
        String(u.role ?? '').toUpperCase() !== 'SUPER_ADMIN' &&
        !hrEmployeeUserIds.has(u.id)
    )
    .map((u: any) => ({
      id: String(u.id ?? ''),
      name: asString(u.name ?? u.email, 'Unknown'),
      photo: u.photo ?? u.avatarUrl ?? null,
      department: asString(u.department?.name ?? u.department),
      designation: asString(u.role === 'ADMIN' ? 'Admin' : (u.designation ?? u.role)),
      joiningDate: u.createdAt ?? null,
      status: 'active',
    }));

  const activeEmployees: V3HrActiveEmployee[] = [
    ...activeEmployeesFromHr,
    ...activeEmployeesFromUsers,
  ];

  // ── Recruitment pipeline by designation ────────────────────────────
  const recruitmentMap = new Map<string, V3HrRecruitmentRow>();
  for (const c of candidates) {
    const title = resolveCandidateDesignation(c);
    if (!recruitmentMap.has(title)) {
      recruitmentMap.set(title, {
        designation: title,
        applied: 0,
        ongoing: 0,
        joining: 0,
        rejected: 0,
      });
    }
    const row = recruitmentMap.get(title)!;
    row.applied++;
    const st = String(
      (c as Record<string, unknown>).applicationStatus ??
        (c as Record<string, unknown>).status ??
        ''
    ).toLowerCase();
    if (
      [
        'shortlisted',
        'interviewed',
        'interview_scheduled',
        'interview_completed',
        'selected',
      ].includes(st)
    ) {
      row.ongoing++;
    } else if (['joining_initiated', 'joined', 'offer_sent', 'offer_accepted'].includes(st)) {
      row.joining++;
    } else if (['rejected', 'offer_declined', 'cancelled'].includes(st)) {
      row.rejected++;
    }
  }
  const recruitmentByDesignation = Array.from(recruitmentMap.values()).sort(
    (a, b) => b.applied - a.applied
  );

  // ── Salary Summary ──────────────────────────────────────────────────
  const deptSalaryMap = new Map<string, V3HrDeptSalary>();
  for (const emp of hrEmployees) {
    const salary = Number(
      emp.monthlySalary ??
        emp.monthly_salary ??
        emp.joining?.monthlySalary ??
        emp.joining?.monthly_salary ??
        emp.candidate?.joining?.monthlySalary ??
        emp.candidate?.joining?.monthly_salary ??
        0
    );
    const indentId = emp.candidate?.indentId ?? emp.candidate?.indent_id;
    const matchedIndent = indentId ? indentMap.get(String(indentId)) : null;
    const dept = asString(
      emp.department?.name ??
        emp.departmentName ??
        emp.department ??
        matchedIndent?.department?.name ??
        emp.candidate?.department?.name ??
        emp.candidate?.department,
      'Unassigned'
    );
    if (!deptSalaryMap.has(dept)) {
      deptSalaryMap.set(dept, { department: dept, total: 0, employees: [] });
    }
    const entry = deptSalaryMap.get(dept)!;
    entry.total += salary;
    entry.employees.push({
      id: String(emp.employeeId ?? emp.id ?? ''),
      name: asString(emp.name),
      designation: asString(emp.designation),
      salary,
      email: asString(emp.email, ''),
      joiningDate: emp.joiningDate ?? emp.joining_date ?? null,
      tenant: (emp.tenant as { id: string; name: string } | undefined) ?? null,
    });
  }
  const byDepartment = Array.from(deptSalaryMap.values()).sort((a, b) => b.total - a.total);
  const salarySummary: V3HrSalarySummary = {
    totalMonthly: byDepartment.reduce((s, d) => s + d.total, 0),
    byDepartment,
  };

  // ── Advance / Salary Hold Summary ──────────────────────────────────
  const holdEmployees: V3HrAdvanceReqItem[] = hrEmployees
    .filter((e) => e.advancePaymentTaken === true && e.advancePaymentSettled === false)
    .map((e) => ({
      id: String(e.id ?? ''),
      employeeId: String(e.employeeId ?? e.id ?? ''),
      employeeName: asString(e.name),
      department: asString(e.department?.name ?? e.department, 'Unassigned'),
      requestAmount: Number(e.advancePaymentAmount ?? 0),
      monthlyDeduction: 0,
      noOfMonths: 0,
      reason: 'Active salary deduction',
      status: 'active',
      requestDate: e.joiningDate ?? '',
    }));

  const loanRequests: V3HrAdvanceReqItem[] = advanceReqs
    .filter((r) => ['pending', 'approved'].includes(String(r.status ?? '').toLowerCase()))
    .map((r) => ({
      id: String(r.id ?? ''),
      employeeId: String(r.employeeId ?? ''),
      employeeName: asString(r.employeeName ?? r.employee?.name, 'Unknown'),
      department: asString(r.department?.name ?? r.departmentId, '—'),
      requestAmount: Number(r.approvedAmount ?? r.requestAmount ?? 0),
      monthlyDeduction: Number(r.approvedMonthlyDeduction ?? r.monthlyDeduction ?? 0),
      noOfMonths: Number(r.approvedNoOfMonths ?? r.noOfMonths ?? 0),
      reason: asString(r.reason, ''),
      status: asString(r.status, 'pending'),
      requestDate: r.requestDate ?? r.createdAt ?? '',
    }));

  const advanceSummary: V3HrAdvanceSummary = {
    holdCount: holdEmployees.length,
    loanCount: loanRequests.length,
    holdEmployees,
    loanRequests,
  };

  // ── KPI ─────────────────────────────────────────────────────────────
  const kpi: V3HrKPI = {
    totalActiveEmployees: activeEmployees.length,
    newJoiningThisMonth,
    openVacancies: openVacancies.length,
    totalOpenSeats,
    totalApplications,
    selectedCandidates,
    rejectedCandidates,
    pendingJoining,
    employeesOnLeaveToday,
    pendingLeaveRequests: pendingLeaveRequests.length,
    approvedLeaveThisMonth,
  };

  const sanitizedDepartmentDist = safeArray(baseStats?.departmentData).map((d: any) => ({
    department: asString(d?.department),
    employees: Number(d?.employees ?? 0),
  }));
  const sanitizedDesignationDist = safeArray(baseStats?.designationData).map((d: any) => ({
    designation: asString(d?.designation),
    employees: Number(d?.employees ?? 0),
  }));
  const sanitizedLeaveStatusDist = safeArray(baseStats?.leaveStatusData).map((d: any) => ({
    status: asString(d?.status, 'unknown'),
    count: Number(d?.count ?? 0),
  }));
  const sanitizedLeaveTypeDist = safeArray(baseStats?.leaveTypeData).map((d: any) => ({
    type: asString(d?.type, 'unknown'),
    count: Number(d?.count ?? 0),
  }));
  const sanitizedMonthlyHiring = safeArray(baseStats?.monthlyHiringData).map((d: any) => ({
    month: asString(d?.month),
    hired: Number(d?.hired ?? 0),
    left: Number(d?.left ?? 0),
  }));

  return {
    kpi,
    hiringFunnel,
    monthlyHiring: sanitizedMonthlyHiring,
    departmentDist: sanitizedDepartmentDist,
    designationDist: sanitizedDesignationDist,
    leaveStatusDist: sanitizedLeaveStatusDist,
    leaveTypeDist: sanitizedLeaveTypeDist,
    openVacancies: openVacancies.slice(0, 8),
    recentCandidates,
    pendingLeaveRequests: pendingLeaveRequests.slice(0, 8),
    recentJoinings,
    activeEmployees,
    recruitmentByDesignation,
    salarySummary,
    advanceSummary,
  };
};
