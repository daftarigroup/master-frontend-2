// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { openRaBillVoucher } from '@/systems/pms/utils/raBillVoucher';
import {
  Receipt,
  Search,
  Eye,
  RotateCcw,
  Clock,
  History as HistoryIcon,
  CheckCircle2,
  Calendar,
  Building2,
  Calculator,
  Printer,
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  getRMBills,
  saveRMBills,
  updateRMBill,
  getProjectOrMinor,
  getExecutions
} from '@/systems/pms/utils/storageManager';
import { buildChainageDiffMap } from '@/systems/pms/utils/helpers';
import { computeBillFromExecutionEntries } from '@/systems/pms/utils/dynamicBillCalculator';

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹ ' + Math.round(val).toLocaleString('en-IN');
};

const formatDate = (val: string) => {
  if (!val) return '-';
  const parts = String(val).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
};

export default function RM1() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'billed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = () => {
    const all = getRMBills();
    // Only bills sent from Execution Details (billType === 'Execution')
    const executionBills = all.filter(b => b.billType === 'Execution');
    setBills(executionBills);
  };

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Compute live quantities and amounts for each pending bill from its sent execution entries using Schedule - B rates
  const billsWithCalculations = useMemo(() => {
    return bills.map(bill => {
      const projOrMinor = getProjectOrMinor(bill.projectNo);
      const calc = computeBillFromExecutionEntries(bill, { rateMode: 'SCHEDULE_B' });
      return {
        ...bill,
        projOrMinor,
        projectName: bill.minorName && projOrMinor?.originalProjectName
          ? `${projOrMinor.originalProjectName} (${bill.minorName})`
          : (projOrMinor?.projectName || bill.projectName || 'Project'),
        minorName: bill.minorName || projOrMinor?.minorName || '',
        contractorName: bill.contractorName || projOrMinor?.contractorName || '-',
        liveAmount: bill.status === 'billed' && bill.billAmount ? bill.billAmount : calc.totalAmount,
        liveLength: calc.totalLengthMeters,
        liveItemsCount: bill.entries?.length || 0,
        pipeDiaBreakdown: calc.pipeDiaBreakdown,
        itemBreakdown: bill.itemBreakdown || calc.lineItems
      };
    });
  }, [bills]);

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
        String(b.contractorName || '').toLowerCase().includes(q)
      );
    });
  }, [currentList, searchQuery]);


  const handleDeleteBill = (id: string) => {
    if (!window.confirm('Delete this bill record?')) return;
    const all = getRMBills();
    saveRMBills(all.filter(b => b.id !== id));
    toast.success('Bill record removed');
    refresh();
  };

  const handlePrint = (bill: any) => {
    const ok = openRaBillVoucher({
      bill,
      items: bill.itemBreakdown || [],
      totalAmount: Number(bill.liveAmount || bill.billAmount || 0),
      isSubContractor: false,
    });
    if (!ok) toast.error('Pop-up blocked. Please allow pop-ups to print bill.');
  };


  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="text-indigo-600 shrink-0" size={22} />
          Department Billing (RM1)
        </h1>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock size={15} />
            Pending Bills ({pendingBills.length})
          </button>

          <button
            onClick={() => setActiveTab('billed')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'billed'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HistoryIcon size={15} />
            Billed History ({billedHistory.length})
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
              placeholder="Search bill no, project, contractor..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50/50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {(
        <div className="space-y-3">
          {filteredList.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
              <Receipt className="mx-auto text-gray-300 mb-3" size={44} />
              <h3 className="text-sm font-bold text-gray-700 uppercase">
                {activeTab === 'pending' ? 'No Pending Execution Bills' : 'No Certified Bills Found'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {activeTab === 'pending'
                  ? 'Go to Execution Details Report, select rows of executed works, and click "Send for Payment" to create a bill here.'
                  : 'Certified bills will appear here once generated.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-800 text-white uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Actions</th>
                      <th className="py-2.5 px-3">RM / Bill No</th>
                      <th className="py-2.5 px-3">Project / Minor</th>
                      <th className="py-2.5 px-3">Contractor</th>
                      <th className="py-2.5 px-2 text-center">Items Sent</th>
                      <th className="py-2.5 px-3 text-right">Pipe Length</th>
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
                                  onClick={() => navigate(`/pms/billing/department/bill/${encodeURIComponent(bill.id)}`)}
                                  className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <Calculator size={13} /> Calculate & Bill
                                </button>
                              ) : (
                                <button
                                  onClick={() => handlePrint(bill)}
                                  className="px-2 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md flex items-center gap-1 cursor-pointer"
                                >
                                  <Printer size={13} /> Voucher
                                </button>
                              )}

                              <button
                                onClick={() => navigate(`/pms/billing/department/bill/${encodeURIComponent(bill.id)}`)}
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

                          <td className="py-2.5 px-3 font-bold text-indigo-900">
                            {bill.billNo || bill.rmNo}
                            {bill.billNo && <div className="text-[10px] text-gray-400 font-normal">Ref: {bill.rmNo}</div>}
                          </td>

                          <td className="py-2.5 px-3 font-sans font-medium text-gray-900">
                            <div>{bill.projectName}</div>
                            {bill.minorName && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold">
                                Minor: {bill.minorName}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-sans text-gray-700">{bill.contractorName}</td>

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
                                Certified
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
