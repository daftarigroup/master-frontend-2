import { mockHrStore } from './mockHrStore';

/**
 * HR System Mock API Adapter
 * Intercepts /hrfms/* requests and returns realistic in-memory data
 */
export const api = {
  async get(url: string, _config?: any): Promise<any> {
    // Artificial latency for realistic async feel
    await new Promise((r) => setTimeout(r, 80));

    if (url.includes('/hrfms/dashboard')) {
      const stats = mockHrStore.getDashboardStats();
      return {
        data: {
          success: true,
          data: {
            stats,
            monthlyHiringData: [
              { month: 'Apr', count: 3 },
              { month: 'May', count: 4 },
              { month: 'Jun', count: 2 },
              { month: 'Jul', count: 5 },
              { month: 'Aug', count: 3 },
              { month: 'Sep', count: 2 },
            ],
            departmentData: [
              { department: 'Engineering', count: 12 },
              { department: 'Production', count: 18 },
              { department: 'Quality', count: 6 },
              { department: 'HR', count: 3 },
              { department: 'Finance', count: 4 },
              { department: 'Admin', count: 5 },
            ],
            designationData: [
              { designation: 'Engineer', count: 10 },
              { designation: 'Supervisor', count: 8 },
              { designation: 'Inspector', count: 5 },
              { designation: 'Officer', count: 6 },
              { designation: 'Technician', count: 15 },
            ],
            leaveStatusData: [
              { status: 'Approved', count: 14 },
              { status: 'Pending', count: 3 },
              { status: 'Rejected', count: 1 },
            ],
            leaveTypeData: [
              { type: 'Casual Leave', count: 8 },
              { type: 'Privilege Leave', count: 5 },
              { type: 'Sick Leave', count: 3 },
            ],
          },
        },
      };
    }

    if (url.includes('/hrfms/indent/get-pending') || url.includes('/hrfms/indent')) {
      return {
        data: {
          success: true,
          data: mockHrStore.indents as any,
        },
      };
    }

    if (url.includes('/hrfms/candidate')) {
      const match = url.match(/\/hrfms\/candidate\/(\d+)/);
      if (match) {
        const id = Number(match[1]);
        const found = mockHrStore.candidates.find((c) => c.id === id);
        return { data: { success: true, data: found || mockHrStore.candidates[0] } };
      }
      return {
        data: {
          success: true,
          data: mockHrStore.candidates as any,
        },
      };
    }

    if (url.includes('/hrfms/employee/checklist-config')) {
      return {
        data: {
          success: true,
          data: mockHrStore.checklistConfig,
        },
      };
    }

    if (url.includes('/hrfms/employee/onboarding')) {
      const onboardingEmployees = mockHrStore.employees.map((emp) => ({
        ...emp,
        department: emp.departmentName ? { id: emp.departmentId || 'dept-1', name: emp.departmentName } : null,
        joining: null,
        candidate: null,
        offerLetterIssued: emp.offerLetterIssued ?? false,
        idCardIssued: emp.idCardIssued ?? false,
        inductionDone: emp.inductionDone ?? false,
        onboardingChecklist: emp.onboardingChecklist ?? {},
        customChecklistItems: emp.customChecklistItems ?? [],
      }));
      return {
        data: {
          success: true,
          data: onboardingEmployees as any,
        },
      };
    }

    if (url.includes('/hrfms/employee/joined-without-account')) {
      return {
        data: {
          success: true,
          data: [],
        },
      };
    }

    if (url.includes('/hrfms/employee')) {
      return {
        data: {
          success: true,
          data: mockHrStore.employees as any,
        },
      };
    }

    if (url.includes('/hrfms/attendance/shifts')) {
      return {
        data: {
          success: true,
          data: [
            {
              id: 'shift-1',
              name: 'General Shift (09:00 - 18:00)',
              startTime: '09:00',
              endTime: '18:00',
              isActive: true,
              isDefault: true,
              weeklyOffDays: '0,6',
            },
            {
              id: 'shift-2',
              name: 'Morning Shift (06:00 - 14:30)',
              startTime: '06:00',
              endTime: '14:30',
              isActive: true,
              isDefault: false,
              weeklyOffDays: '0',
            },
            {
              id: 'shift-3',
              name: 'Evening Shift (14:00 - 22:30)',
              startTime: '14:00',
              endTime: '22:30',
              isActive: true,
              isDefault: false,
              weeklyOffDays: '0',
            },
          ],
        },
      };
    }

    if (url.includes('/hrfms/attendance/employees')) {
      const emps = mockHrStore.employees.map((e, idx) => ({
        employeeId: e.employeeId,
        name: e.name,
        email: e.email,
        designation: e.designation,
        joiningDate: e.joiningDate,
        department: e.departmentName ? { id: idx + 1, name: e.departmentName } : null,
        companyShiftId: 'shift-1',
        companyShift: {
          id: 'shift-1',
          name: 'General Shift (09:00 - 18:00)',
          startTime: '09:00',
          endTime: '18:00',
          weeklyOffDays: '0,6',
        },
      }));
      return {
        data: {
          success: true,
          data: emps,
        },
      };
    }

    if (url.includes('/hrfms/attendance/daily')) {
      const dailyRecords = mockHrStore.attendance.map((a) => ({
        ...a,
        status: (a.status === 'half-day' ? 'half_day' : a.status) as any,
        shiftId: 'shift-1',
        shift: {
          id: 'shift-1',
          name: 'General Shift (09:00 - 18:00)',
          startTime: '09:00',
          endTime: '18:00',
        },
        hrEmployee: {
          employeeId: a.employeeId,
          name: a.employeeName,
          email: `${a.employeeId.toLowerCase()}@company.com`,
          designation: 'Staff',
          department: { id: 1, name: a.departmentName },
          companyShiftId: 'shift-1',
          companyShift: {
            id: 'shift-1',
            name: 'General Shift (09:00 - 18:00)',
            startTime: '09:00',
            endTime: '18:00',
            weeklyOffDays: '0,6',
          },
        },
      }));
      return {
        data: {
          success: true,
          data: dailyRecords,
        },
      };
    }

    if (url.includes('/hrfms/attendance/monthly-summary')) {
      const summary = mockHrStore.employees.map((e) => ({
        employeeId: e.employeeId,
        employeeName: e.name,
        department: e.departmentName || 'General',
        workingDays: 26,
        regularDays: 22,
        holidayWorked: 1,
        weekendWorked: 1,
        totalPresent: 24,
        absentDays: 2,
        halfDays: 0,
        leaveDays: 0,
        lateDays: 1,
        attendancePercentage: 92,
      }));
      return {
        data: {
          success: true,
          data: summary,
        },
      };
    }

    if (url.includes('/hrfms/attendance/monthly')) {
      return {
        data: {
          success: true,
          data: mockHrStore.attendance,
        },
      };
    }

    if (url.includes('/hrfms/attendance/claims')) {
      return {
        data: {
          success: true,
          data: [],
        },
      };
    }

    if (url.includes('/hrfms/attendance/config')) {
      return {
        data: {
          success: true,
          data: {
            id: 'cfg-1',
            tenantId: 'tenant-1',
            fullDayHours: 8,
            halfDayMinHours: 4,
            lateGraceMinutes: 15,
          },
        },
      };
    }

    if (url.includes('/settings/holidays')) {
      const year = new Date().getFullYear();
      return {
        data: {
          success: true,
          data: [
            { id: '1', title: 'New Year', date: `${year}-01-01`, isYearly: true },
            { id: '2', title: 'Republic Day', date: `${year}-01-26`, isYearly: true },
            { id: '3', title: 'Independence Day', date: `${year}-08-15`, isYearly: true },
            { id: '4', title: 'Gandhi Jayanti', date: `${year}-10-02`, isYearly: true },
            { id: '5', title: 'Christmas', date: `${year}-12-25`, isYearly: true },
          ],
        },
      };
    }

    if (url.includes('/hrfms/attendance')) {
      return {
        data: {
          success: true,
          data: {
            records: mockHrStore.attendance,
            stats: {
              present: mockHrStore.attendance.filter((a) => a.status === 'present').length,
              absent: mockHrStore.attendance.filter((a) => a.status === 'absent').length,
              halfDay: mockHrStore.attendance.filter((a) => a.status === 'half-day').length,
              leave: mockHrStore.attendance.filter((a) => a.status === 'leave').length,
            },
          },
        },
      };
    }

    if (url.includes('/hrfms/leave')) {
      return {
        data: {
          success: true,
          data: mockHrStore.leaves as any,
        },
      };
    }

    if (url.includes('/hrfms/advance-request/stats')) {
      const approved = mockHrStore.advances.filter((a) => a.status === 'approved');
      const employeeSummary = approved.map((a) => {
        const disbursed = a.approvedAmount ?? a.requestAmount ?? 0;
        const monthly = a.approvedMonthlyDeduction ?? a.monthlyDeduction ?? 1;
        const months =
          a.approvedNoOfMonths ??
          a.noOfMonths ??
          (monthly > 0 ? Math.ceil(disbursed / monthly) : 1);
        const collected = 0;
        const outstanding = Math.max(0, disbursed - collected);
        return {
          advanceId: a.id,
          employeeId: a.employeeId,
          employeeName: a.employeeName,
          department: a.departmentName || 'General',
          disbursedAmount: disbursed,
          monthlyEmi: monthly,
          totalMonths: months,
          startDeductionMonth: a.startDeductionMonth || '2026-09',
          approvedDate: a.approvedDate || a.requestDate || '2026-09-01',
          loanId: a.loanId || `LN-${a.id}`,
          outstandingBalance: outstanding,
          loanStatus: outstanding === 0 ? 'paid' : 'active',
          collected: collected,
          createdAt: a.createdAt || a.requestDate || '2026-09-01',
        };
      });

      const totalDisbursed = employeeSummary.reduce((sum, e) => sum + e.disbursedAmount, 0);
      const totalOutstanding = employeeSummary.reduce((sum, e) => sum + e.outstandingBalance, 0);
      const totalCollected = employeeSummary.reduce((sum, e) => sum + e.collected, 0);
      const recoveryRate =
        totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 1000) / 10 : 0;
      const activeLoanCount = employeeSummary.filter((e) => e.loanStatus === 'active').length;
      const paidLoanCount = employeeSummary.filter((e) => e.loanStatus === 'paid').length;

      const deptMap: Record<string, { count: number; amount: number }> = {};
      employeeSummary.forEach((e) => {
        const dept = e.department || 'General';
        if (!deptMap[dept]) deptMap[dept] = { count: 0, amount: 0 };
        deptMap[dept].count += 1;
        deptMap[dept].amount += e.disbursedAmount;
      });
      const departmentBreakdown = Object.entries(deptMap).map(([name, val]) => ({
        name,
        count: val.count,
        amount: val.amount,
      }));

      return {
        data: {
          success: true,
          data: {
            totalDisbursed,
            totalOutstanding,
            totalCollected,
            recoveryRate,
            activeLoanCount,
            paidLoanCount,
            totalApprovedCount: employeeSummary.length,
            departmentBreakdown,
            monthlyTrend: [
              { label: 'Jul 2026', disbursed: 0, count: 0 },
              { label: 'Aug 2026', disbursed: 15000, count: 1 },
              { label: 'Sep 2026', disbursed: totalDisbursed, count: employeeSummary.length },
            ],
            employeeSummary,
          },
        },
      };
    }

    if (url.includes('/loan-history')) {
      return {
        data: {
          success: true,
          data: {
            id: 'loan-1',
            amount: 15000,
            emiAmount: 3000,
            outstandingBalance: 12000,
            purpose: 'Advance',
            startDate: '2026-08-15',
            status: 'active',
            deductions: [
              {
                id: 'ded-1',
                month: 8,
                year: 2026,
                scheduledEmi: 3000,
                actualDeduction: 3000,
                balanceBefore: 15000,
                balanceAfter: 12000,
              },
            ],
          },
        },
      };
    }

    if (url.includes('/hrfms/advance-request/employee/')) {
      const empId = url.split('/hrfms/advance-request/employee/')[1]?.split('?')[0];
      const list = empId
        ? mockHrStore.advances.filter((a) => a.employeeId.toLowerCase() === empId.toLowerCase())
        : mockHrStore.advances;
      return {
        data: {
          success: true,
          data: list as any,
        },
      };
    }

    if (url.match(/\/hrfms\/advance-request\/(\d+)$/)) {
      const match = url.match(/\/hrfms\/advance-request\/(\d+)$/);
      const id = match ? parseInt(match[1], 10) : 0;
      const found = mockHrStore.advances.find((a) => a.id === id) || mockHrStore.advances[0];
      return {
        data: {
          success: true,
          data: found as any,
        },
      };
    }

    if (url.includes('/hrfms/advance-request') || url.includes('/hrfms/advance')) {
      return {
        data: {
          success: true,
          data: mockHrStore.advances as any,
        },
      };
    }

    if (url.includes('/hrfms/gatepass/stats')) {
      const all = mockHrStore.gatePasses;
      return {
        data: {
          success: true,
          data: {
            total: all.length,
            issued: all.filter((g) => g.status === 'issued' || g.status === 'open').length,
            currentlyOut: all.filter((g) => g.status === 'out').length,
            returned: all.filter((g) => g.status === 'returned' || g.status === 'closed').length,
            pending: all.filter((g) => g.status === 'pending').length,
          },
        },
      };
    }

    if (url.includes('/hrfms/gatepass')) {
      return {
        data: {
          success: true,
          data: mockHrStore.gatePasses as any,
        },
      };
    }

    if (url.includes('/hrfms/salary')) {
      return {
        data: {
          success: true,
          data: {
            basicPercent: 40,
            hraPercent: 20,
            conveyancePercent: 10,
            medicalPercent: 5,
            specialAllowancePercent: 25,
            deductions: [{ name: 'PF Employee', percent: 12 }, { name: 'ESIC', percent: 0.75 }],
            employees: mockHrStore.employees,
            month: 9,
            year: 2026,
            workingDays: 26,
            payslips: [],
            summary: { totalGross: 450000, totalDeductions: 54000, netPayable: 396000 },
          } as any,
        },
      };
    }

    if (url.includes('/hrfms/letter-template')) {
      return {
        data: {
          success: true,
          data: [
            { id: 1, name: 'Standard Offer Letter', letterType: 'OFFER', isDefault: true, isActive: true },
            { id: 2, name: 'Relieving & Experience Certificate', letterType: 'EXPERIENCE', isDefault: true, isActive: true },
            { id: 3, name: 'Appointment Letter', letterType: 'JOINING', isDefault: true, isActive: true },
          ] as any,
        },
      };
    }

    // Default fallback
    return {
      data: {
        success: true,
        data: [] as any,
      },
    };
  },

  async post(url: string, data?: any, _config?: any): Promise<any> {
    const payload = data || {};
    await new Promise((r) => setTimeout(r, 120));

    if (url.includes('/hrfms/indent')) {
      const newIndent = {
        id: mockHrStore.indents.length + 1,
        recordId: `IND-2026-00${mockHrStore.indents.length + 1}`,
        tenantId: 'tenant-1',
        title: data.title,
        departmentId: data.departmentId || 'dept-1',
        departmentName: data.department || 'Engineering',
        gender: data.gender || 'ANY',
        prefer: data.prefer || 'ANY',
        experienceYears: data.experienceYears || '1-3 Years',
        noOfPost: Number(data.noOfPost) || 1,
        completionDate: data.completionDate || new Date().toISOString(),
        socialsite: data.socialsite || [],
        jobType: data.jobType || ['Full Time'],
        budget: Number(data.budget) || 0,
        priority: data.priority || 'Normal',
        status: 'open',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      mockHrStore.indents.unshift(newIndent);
      return { data: { success: true, message: 'Indent created successfully', data: newIndent } };
    }

    if (url.includes('/hrfms/candidate/history')) {
      return {
        data: {
          success: true,
          data: mockHrStore.candidates,
        },
      };
    }

    if (url.includes('/hrfms/candidate/call') || url.includes('/hrfms/candidate/update')) {
      const id = data?.id || data?.candidateId;
      const candidate = mockHrStore.candidates.find((c) => c.id === Number(id));
      if (candidate) {
        if (data?.payload?.status) candidate.status = data.payload.status;
        if (data?.payload?.notes) candidate.notes = data.payload.notes;
        if (data?.status) candidate.status = data.status;
        if (data?.notes) candidate.notes = data.notes;
      }
      return { data: { success: true, message: 'Candidate updated', data: candidate || mockHrStore.candidates[0] } };
    }

    if (url.includes('/hrfms/candidate/follow-up')) {
      const candidate = mockHrStore.candidates.find((c) => c.id === Number(data?.candidateId));
      if (candidate) {
        candidate.nextCallDate = data.followUpDate;
        candidate.notes = data.notes;
      }
      return { data: { success: true, message: 'Follow up saved', data: candidate || mockHrStore.candidates[0] } };
    }

    if (url.includes('/hrfms/candidate/initiate-joining') || url.includes('/hrfms/joining/initiate')) {
      const candidate = mockHrStore.candidates.find((c) => c.id === Number(data?.candidateId || data?.id));
      if (candidate) {
        candidate.status = 'joining_initiated';
      }
      return { data: { success: true, message: 'Joining initiated', data: candidate || mockHrStore.candidates[0] } };
    }

    if (url.includes('/hrfms/candidate/mark-joined')) {
      const candidate = mockHrStore.candidates.find((c) => c.id === Number(data?.candidateId || data?.id));
      if (candidate) {
        candidate.status = 'joined';
      }
      return { data: { success: true, message: 'Marked as joined', data: candidate || mockHrStore.candidates[0] } };
    }

    if (url.includes('/hrfms/candidate/verify-docs')) {
      return { data: { success: true, message: 'Documents verified', data } };
    }

    if (url.includes('/hrfms/candidate')) {
      const newCandidate = {
        id: mockHrStore.candidates.length + 1,
        tenantId: 'tenant-1',
        candidateEnquiryNo: `ENQ-2026-00${mockHrStore.candidates.length + 1}`,
        candidateName: data?.candidateName || 'New Candidate',
        dob: data?.dob || '1995-01-01',
        phoneNo: data?.phoneNo || '+91 90000 00000',
        email: data?.email || '',
        previousCompany: data?.previousCompany || 'N/A',
        experience: data?.experience || 'Fresher',
        previousPosition: data?.previousPosition || 'Trainee',
        maritalStatus: data?.maritalStatus || 'Single',
        aadharNo: data?.aadharNo || '0000-0000-0000',
        lastSalary: data?.lastSalary || '0',
        reasonForLeaving: data?.reasonForLeaving || 'New Opportunity',
        currentAddress: data?.currentAddress || '',
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      mockHrStore.candidates.unshift(newCandidate);
      return { data: { success: true, message: 'Candidate enquiry registered', data: newCandidate } };
    }

    if (url.includes('/hrfms/leave')) {
      const newLeave = {
        id: mockHrStore.leaves.length + 1,
        tenantId: 'tenant-1',
        employeeId: data.employeeId || 'EMP-001',
        employeeName: data.employeeName || 'Aakash Sharma',
        departmentId: 'dept-1',
        departmentName: 'Engineering',
        hodName: 'Vikram Joshi',
        substitute: data.substitute || 'N/A',
        leaveType: data.leaveType || 'Casual Leave',
        fromDate: data.fromDate,
        toDate: data.toDate,
        days: data.days || 1,
        reason: data.reason || 'Personal',
        status: 'pending' as const,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      mockHrStore.leaves.unshift(newLeave);
      return { data: { success: true, message: 'Leave application submitted', data: newLeave } };
    }

    if (url.includes('/hrfms/advance-request')) {
      const newAdvance = {
        id: mockHrStore.advances.length + 1,
        tenantId: 'tenant-1',
        employeeId: data.employeeId || 'EMP-001',
        employeeName: data.employeeName || 'Aakash Sharma',
        empCode: 'EMP001',
        departmentName: 'Engineering',
        requestAmount: Number(data.requestAmount) || 10000,
        monthlyDeduction: Number(data.monthlyDeduction) || 2000,
        noOfMonths: Number(data.noOfMonths) || 5,
        reason: data.reason || 'Salary advance',
        status: 'pending' as const,
        requestDate: new Date().toISOString().slice(0, 10),
      };
      mockHrStore.advances.unshift(newAdvance);
      return { data: { success: true, message: 'Advance requested', data: newAdvance } };
    }

    if (url.includes('/hrfms/gatepass')) {
      const emp = mockHrStore.employees.find(
        (e) => e.employeeId === data.employeeId || e.empCode === data.employeeId
      );
      const newPass = {
        id: mockHrStore.gatePasses.length + 1,
        tenantId: 'tenant-1',
        employeeId: data.employeeId || 'EMP-001',
        employeeName: data.employeeName || emp?.name || 'Aakash Sharma',
        empCode: data.empCode || emp?.empCode || 'EMP001',
        departmentName: data.departmentName || emp?.departmentName || 'Engineering',
        type: data.type || 'Official',
        placeToVisit: data.placeToVisit,
        reason: data.reason,
        departureTime: data.departureTime,
        expectedArrival: data.expectedArrival,
        outTime: data.outTime || data.departureTime,
        inTime: data.inTime || data.expectedArrival,
        approvedBy: data.approvedBy || 'Admin',
        whatsappNo: data.whatsappNo || '',
        status: data.status || 'open',
        createdAt: new Date().toISOString(),
      };
      mockHrStore.gatePasses.unshift(newPass as any);
      return { data: { success: true, message: 'Gate pass generated', data: newPass } };
    }

    if (url.includes('/hrfms/employee/bulk-import')) {
      const rows = data?.rows || [];
      const created = rows.map((r: any, i: number) => {
        const emp = {
          id: mockHrStore.employees.length + i + 1,
          tenantId: 'tenant-1',
          employeeId: `EMP-${mockHrStore.employees.length + i + 1}`,
          empCode: r.empCode || `EMP00${mockHrStore.employees.length + i + 1}`,
          name: r.name,
          designation: r.designation || 'Staff',
          departmentId: 'dept-1',
          departmentName: r.department || 'Engineering',
          joiningDate: r.joiningDate || new Date().toISOString().slice(0, 10),
          phone: r.phone || '',
          email: r.email || '',
          status: 'active',
          managerName: r.managerName || '',
          workLocation: r.workLocation || '',
          bloodGroup: r.bloodGroup || '',
          bankAccount: r.bankAccount || '',
          ifscCode: r.ifscCode || '',
          offerLetterIssued: false,
          idCardIssued: false,
          inductionDone: false,
          onboardingChecklist: {},
          customChecklistItems: [],
        };
        mockHrStore.employees.unshift(emp);
        return {
          row: r.row ?? i + 1,
          employeeId: emp.employeeId,
          empCode: emp.empCode,
          name: emp.name,
        };
      });
      return {
        data: {
          success: true,
          message: 'Bulk import successful',
          data: {
            created,
            errors: [],
            pendingLinkConfirmations: [],
          },
        },
      };
    }

    if (url.includes('/hrfms/employee')) {
      const newEmp = {
        id: mockHrStore.employees.length + 1,
        tenantId: 'tenant-1',
        employeeId: `EMP-${mockHrStore.employees.length + 1}`,
        empCode: data?.empCode || `EMP00${mockHrStore.employees.length + 1}`,
        name: data?.name || 'New Employee',
        designation: data?.designation || 'Staff',
        departmentId: data?.departmentId || 'dept-1',
        departmentName: data?.department || 'Engineering',
        joiningDate: data?.joiningDate || new Date().toISOString().slice(0, 10),
        phone: data?.phone || '',
        email: data?.email || '',
        status: 'active',
        managerName: data?.managerName || '',
        workLocation: data?.workLocation || '',
        bloodGroup: data?.bloodGroup || '',
        bankAccount: data?.bankAccount || '',
        ifscCode: data?.ifscCode || '',
        offerLetterIssued: false,
        idCardIssued: false,
        inductionDone: false,
        onboardingChecklist: {},
        customChecklistItems: [],
      };
      mockHrStore.employees.unshift(newEmp);
      return {
        data: {
          success: true,
          message: 'Employee created successfully',
          data: newEmp,
        },
      };
    }

    return {
      data: {
        success: true,
        message: 'Action completed successfully',
        data: { id: Date.now(), ...data },
      },
    };
  },

  async patch(url: string, data?: any, _config?: any): Promise<any> {
    await new Promise((r) => setTimeout(r, 100));

    if (url.includes('/hrfms/employee/checklist-config')) {
      mockHrStore.checklistConfig = {
        disabledStandardKeys: data?.disabledStandardKeys || [],
        globalCustomItems: data?.globalCustomItems || [],
      };
      return {
        data: {
          success: true,
          message: 'Checklist config updated',
          data: mockHrStore.checklistConfig,
        },
      };
    }

    if (url.includes('/hrfms/employee') && url.includes('/onboarding')) {
      const match = url.match(/\/hrfms\/employee\/([^/]+)\/onboarding/);
      const empId = match ? match[1] : null;
      const emp = mockHrStore.employees.find(
        (e) => String(e.id) === empId || e.employeeId === empId || e.empCode === empId
      );
      if (emp) {
        if (data?.offerLetterIssued !== undefined) emp.offerLetterIssued = data.offerLetterIssued;
        if (data?.idCardIssued !== undefined) emp.idCardIssued = data.idCardIssued;
        if (data?.inductionDone !== undefined) emp.inductionDone = data.inductionDone;
        if (data?.onboardingChecklist !== undefined) emp.onboardingChecklist = data.onboardingChecklist;
        if (data?.customChecklistItems !== undefined) emp.customChecklistItems = data.customChecklistItems;
      }
      return {
        data: {
          success: true,
          message: 'Onboarding updated',
          data: emp || data,
        },
      };
    }

    if (url.includes('/hrfms/advance-request') && url.includes('/status')) {
      const match = url.match(/\/hrfms\/advance-request\/(\d+)\/status/);
      const id = match ? parseInt(match[1], 10) : null;
      const adv = mockHrStore.advances.find((a) => a.id === id);
      if (adv) {
        if (data?.status) adv.status = data.status;
        if (data?.remarks !== undefined) adv.reason = adv.reason || data.remarks;
        if (data?.approvedAmount !== undefined) adv.approvedAmount = Number(data.approvedAmount);
        if (data?.approvedMonthlyDeduction !== undefined)
          adv.approvedMonthlyDeduction = Number(data.approvedMonthlyDeduction);
        if (data?.status === 'approved') {
          adv.approvedDate = new Date().toISOString().slice(0, 10);
          adv.loanId = adv.loanId || `LN-2026-${adv.id.toString().padStart(3, '0')}`;
          adv.startDeductionMonth = data?.startDeductionMonth || '2026-09';
          if (adv.approvedAmount && adv.approvedMonthlyDeduction) {
            adv.approvedNoOfMonths = Math.ceil(adv.approvedAmount / adv.approvedMonthlyDeduction);
          }
        }
      }
      return {
        data: {
          success: true,
          message: 'Status updated successfully',
          data: adv || data,
        },
      };
    }

    if (url.includes('/hrfms/advance-request') && url.includes('/complete')) {
      const match = url.match(/\/hrfms\/advance-request\/(\d+)\/complete/);
      const id = match ? parseInt(match[1], 10) : null;
      const adv = mockHrStore.advances.find((a) => a.id === id);
      if (adv) {
        adv.status = 'approved';
      }
      return {
        data: {
          success: true,
          message: 'Marked as completed',
          data: adv || data,
        },
      };
    }

    if (url.includes('/hrfms/gatepass') && url.includes('/status')) {
      const match = url.match(/\/hrfms\/gatepass\/(\d+)\/status/);
      const id = match ? parseInt(match[1], 10) : null;
      const pass = mockHrStore.gatePasses.find((p) => p.id === id);
      if (pass && data?.status) {
        pass.status = data.status;
      }
      return {
        data: {
          success: true,
          message: 'Gate pass status updated',
          data: pass || data,
        },
      };
    }

    if (url.includes('/hrfms/advance-request/')) {
      const match = url.match(/\/hrfms\/advance-request\/(\d+)$/);
      const id = match ? parseInt(match[1], 10) : null;
      const adv = mockHrStore.advances.find((a) => a.id === id);
      if (adv && data) {
        Object.assign(adv, data);
      }
      return {
        data: {
          success: true,
          message: 'Advance updated',
          data: adv || data,
        },
      };
    }

    return {
      data: {
        success: true,
        message: 'Updated successfully',
        data,
      },
    };
  },

  async put(_url: string, data?: any, _config?: any): Promise<any> {
    await new Promise((r) => setTimeout(r, 100));
    return {
      data: {
        success: true,
        message: 'Updated successfully',
        data,
      },
    };
  },

  async delete(_url: string, _config?: any): Promise<any> {
    await new Promise((r) => setTimeout(r, 80));
    return {
      data: {
        success: true,
        message: 'Deleted successfully',
      },
    };
  },
};

export default api;
