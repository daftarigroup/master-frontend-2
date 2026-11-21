// @ts-nocheck
import { scopeByProjectOrMinor, getActiveProject } from '@/systems/pms/utils/activeProject';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { openRaBillVoucher } from '@/systems/pms/utils/raBillVoucher';
import {
  Users,
  Search,
  Eye,
  RotateCcw,
  Clock,
  History as HistoryIcon,
  ShieldAlert,
  Calendar,
  Building2,
  Calculator,
  Printer,
  Trash2,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import {
  getProjects,
  getMinors,
  getRMBills,
  saveRMBills,
  updateRMBill,
  getProjectOrMinor,
  getActuals,
  getExternalPurchaseOrders,
  getSubContractorsForProject as getProjectSubContractors,
} from '@/systems/pms/utils/storageManager';
import { pmsApi } from '@/systems/pms/services/pmsApi';
import { setContractCache, getCachedContracts } from '@/systems/pms/utils/contractCache';
import { buildChainageDiffMap } from '@/systems/pms/utils/helpers';
import { computeBillFromExecutionEntries } from '@/systems/pms/utils/dynamicBillCalculator';

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹ ' + Math.round(val).toLocaleString('en-IN');
};

export default function RM2() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'pending' | 'billed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubContractor, setSelectedSubContractor] = useState('');
  const [selectedMinor, setSelectedMinor] = useState('');

  // Real Bills and Projects
  const [bills, setBills] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [subContractorsList, setSubContractorsList] = useState<string[]>([]);

  const refresh = () => {
    const rawBills = getRMBills();
    const active = getActiveProject();
    const scoped = scopeByProjectOrMinor(rawBills);
    // Also keep bills that belong to the open project by name (minor ids that don't resolve to the parent)
    const byName = active
      ? rawBills.filter((b) => !scoped.includes(b) && b.projectName && b.projectName === (active.projectName || active.project_name))
      : [];
    const allBills = [...scoped, ...byName];
    console.debug('[SubContractorBilling] bills total/scoped/byName:', rawBills.length, scoped.length, byName.length,
      rawBills.filter((b) => b.billType === 'Actual').map((b) => ({ rmNo: b.rmNo, projectNo: b.projectNo, projectName: b.projectName, status: b.status })));
    // Sub-Contractor bills are those of type 'Actual' sent from Actual Details
    const actualBills = allBills.filter(b => b.billType === 'Actual');
    setBills(actualBills);

    // Also look for projects that have completed Department Billing (Execution)
    const completedDeptBills = allBills.filter(b => b.billType === 'Execution' && b.status === 'billed');
    const eligibleProjectNos = new Set(
      actualBills.map(b => b.projectNo).concat(completedDeptBills.map(b => b.projectNo))
    );

    const projects = Array.from(eligibleProjectNos).map(id => {
      const projOrMinor = getProjectOrMinor(id);
      return projOrMinor || { serialNo: id, projectName: id };
    });
    setProjectsList(projects);

    // Extract all real subcontractors from mobilizations, POs, and projects
    const subs = new Set<string>();
    projects.forEach(p => {
      getProjectSubContractors(p.serialNo || p.id).forEach((c: any) => subs.add(c.name.trim()));
      if (p.contractorName && p.contractorName !== '-') subs.add(p.contractorName.trim());
    });
    getExternalPurchaseOrders().forEach((p: any) => {
      if (p.name?.trim()) subs.add(p.name.trim());
    });
    getCachedContracts().forEach((c) => { if (c.name?.trim()) subs.add(c.name.trim()); });

    const subList = Array.from(subs);
    if (subList.length === 0) {
      subList.push('Apex Engineering & Infrastructure', 'Shree Ram Construction Co.', 'Kalyan Earthmovers & Piping');
    }
    setSubContractorsList(subList);
    if (!selectedSubContractor && subList.length > 0) setSelectedSubContractor(subList[0]);
    if (!selectedMinor && projects.length > 0) setSelectedMinor(projects[0].minorName || projects[0].serialNo || 'injewada');
  };

  // Contracts live in the database; load them into the in-memory cache used for PO rates, then refresh
  useEffect(() => {
    pmsApi.get('/contract-vendors').then((res: any) => {
      setContractCache(Array.isArray(res) ? res : res?.data || []);
      refresh();
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Compute live quantities and amounts for each sub-contractor bill directly at PO rates
  const billsWithCalculations = useMemo(() => {
    return bills.map(bill => {
      const projOrMinor = getProjectOrMinor(bill.projectNo);
      const calc = computeBillFromExecutionEntries(bill, { rateMode: 'PO' });
      return {
        ...bill,
        projOrMinor,
        projectName:
          bill.minorName && projOrMinor?.originalProjectName
            ? `${projOrMinor.originalProjectName} (${bill.minorName})`
            : projOrMinor?.projectName || bill.projectName || 'Project',
        minorName: bill.minorName || projOrMinor?.minorName || '',
        subContractorName:
          bill.subContractorName ||
          bill.contractorName ||
          projOrMinor?.contractorName ||
          selectedSubContractor,
        poNumber: bill.poNumber || calc.poNumber,
        liveAmount: bill.status === 'billed' && bill.billAmount ? bill.billAmount : calc.totalAmount,
        liveLength: calc.totalLengthMeters,
        liveItemsCount: bill.entries?.length || 0,
        pipeDiaBreakdown: calc.pipeDiaBreakdown,
        itemBreakdown: bill.itemBreakdown || calc.lineItems,
        contractorMargin: bill.contractorMargin !== undefined ? bill.contractorMargin : calc.contractorMargin,
        contractorMarginPct: bill.contractorMarginPct !== undefined ? bill.contractorMarginPct : calc.contractorMarginPct
      };
    });
  }, [bills, selectedSubContractor]);

  const pendingBills = useMemo(() => {
    return billsWithCalculations.filter(b => b.status === 'pending');
  }, [billsWithCalculations]);

  const billedHistory = useMemo(() => {
    return billsWithCalculations.filter(b => b.status === 'billed');
  }, [billsWithCalculations]);

  const currentList = activeTab === 'pending' ? pendingBills : billedHistory;

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase();
    return currentList.filter(b => {
      return (
        String(b.rmNo || '').toLowerCase().includes(q) ||
        String(b.billNo || '').toLowerCase().includes(q) ||
        String(b.projectName || '').toLowerCase().includes(q) ||
        String(b.minorName || '').toLowerCase().includes(q) ||
        String(b.subContractorName || '').toLowerCase().includes(q) ||
        String(b.poNumber || '').toLowerCase().includes(q)
      );
    });
  }, [currentList, searchQuery]);


  const handleDeleteBill = (id: string) => {
    if (!window.confirm('Delete this Sub-Contractor payment voucher record?')) return;
    const all = getRMBills();
    saveRMBills(all.filter(b => b.id !== id));
    toast.success('Sub-Contractor voucher removed');
    refresh();
  };

  const handlePrint = (bill: any) => {
    const ok = openRaBillVoucher({
      bill,
      items: bill.itemBreakdown || [],
      totalAmount: Number(bill.liveAmount || bill.billAmount || 0),
      isSubContractor: true,
      partyName: bill.subContractorName || bill.contractorName,
      poNumber: bill.poNumber,
    });
    if (!ok) toast.error('Pop-up blocked. Please allow pop-ups to print voucher.');
  };

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="text-purple-600 shrink-0" size={22} />
          Sub Contractor Billing (RM2)
        </h1>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock size={15} />
            Pending Sub Bills ({pendingBills.length})
          </button>

          <button
            onClick={() => setActiveTab('billed')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'billed'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HistoryIcon size={15} />
            Paid Vouchers History ({billedHistory.length})
          </button>
        </div>

        {/* Search Bar */}
        {(
          <div className="relative min-w-[260px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search bill no, sub-contractor, PO #..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50/50 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {(
        <div className="space-y-3">
          {filteredList.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
              <Users className="mx-auto text-gray-300 mb-3" size={44} />
              <h3 className="text-sm font-bold text-gray-700 uppercase">
                {activeTab === 'pending'
                  ? 'No Pending Sub-Contractor Bills'
                  : 'No Sub-Contractor Vouchers Found'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {activeTab === 'pending'
                  ? 'Go to Actual Details Report, select rows of measured actual works, and click "Send for Payment" to create a sub-contractor bill here.'
                  : 'Paid vouchers will appear here once certified.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-800 text-white uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Actions</th>
                      <th className="py-2.5 px-3">RM / Voucher No</th>
                      <th className="py-2.5 px-3">Sub-Contractor</th>
                      <th className="py-2.5 px-3">Project / Minor</th>
                      <th className="py-2.5 px-3">Linked PO</th>
                      <th className="py-2.5 px-2 text-center">Items</th>
                      <th className="py-2.5 px-3 text-right">Actual Length</th>
                      <th className="py-2.5 px-3 text-right">Bill Amount (₹)</th>
                      <th className="py-2.5 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                    {filteredList.map(bill => {
                      const isBilled = bill.status === 'billed';

                      return (
                        <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex items-center gap-1.5">
                              {!isBilled ? (
                                <button
                                  onClick={() => navigate(`/pms/billing/subcontractor/bill/${encodeURIComponent(bill.id)}`)}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <Calculator size={13} /> Calculate & Pay
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePrint(bill)}
                                  className="px-2 py-1 text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md flex items-center gap-1 cursor-pointer"
                                >
                                  <Printer size={13} /> Voucher
                                </button>
                              )}

                              <button
                                onClick={() => navigate(`/pms/billing/subcontractor/bill/${encodeURIComponent(bill.id)}`)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer"
                                title="View Bill Details"
                              >
                                <Eye size={15} />
                              </button>

                              {isBilled && (
                                <button
                                  onClick={() => handleDeleteBill(bill.id)}
                                  className="p-1 hover:bg-rose-100 rounded text-rose-500 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-bold text-purple-900">
                            {bill.billNo || bill.rmNo}
                            {bill.billNo && (
                              <div className="text-[10px] text-gray-400 font-normal">
                                Ref: {bill.rmNo}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-sans font-bold text-gray-900">
                            {bill.subContractorName}
                          </td>

                          <td className="py-2.5 px-3 font-sans font-medium text-gray-800">
                            <div>{bill.projectName}</div>
                            {bill.minorName && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-semibold">
                                Minor: {bill.minorName}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-sans">
                            {bill.poNumber ? (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono font-bold">
                                {bill.poNumber}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-mono">PO Scope</span>
                            )}
                          </td>

                          <td className="py-2.5 px-2 text-center text-gray-700 font-bold">
                            {bill.liveItemsCount}
                          </td>

                          <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                            {(bill.liveLength || 0).toLocaleString('en-IN')} m
                          </td>

                          <td className="py-2.5 px-3 text-right font-black text-gray-950 font-mono">
                            {formatCurrency(bill.liveAmount)}
                          </td>

                          <td className="py-2.5 px-2 text-center font-sans">
                            {isBilled ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Paid Voucher
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 animate-pulse">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
