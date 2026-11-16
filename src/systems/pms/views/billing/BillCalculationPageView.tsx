// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { openRaBillVoucher } from '@/systems/pms/utils/raBillVoucher';
import {
  ArrowLeft,
  Building2,
  Users,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Tag,
  Calendar,
  Layers,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { getTodayDate } from '@/systems/pms/utils/helpers';
import { getRMBills, updateRMBill, getProjectOrMinor, syncBackendPOsToLocal } from '@/systems/pms/utils/storageManager';
import { computeBillFromExecutionEntries } from '@/systems/pms/utils/dynamicBillCalculator';
import { getAvailablePOsForProject, resolvePoNumberForProject } from '@/systems/pms/utils/table1RateMaster';

interface Props {
  mode?: 'DEPARTMENT' | 'SUBCONTRACTOR';
}

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹ ' + Math.round(val).toLocaleString('en-IN');
};

export default function BillCalculationPage({ mode }: Props) {
  const { billId } = useParams();
  const navigate = useNavigate();

  const [bill, setBill] = useState<any | null>(null);
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(getTodayDate());
  const [remarks, setRemarks] = useState('');
  const [overrideRates, setOverrideRates] = useState<Record<string, number>>({});

  // Sub-contractor specifics
  const [selectedPoNumber, setSelectedPoNumber] = useState('');
  const [subContractorName, setSubContractorName] = useState('');

  const loadBill = () => {
    if (!billId) return;
    const all = getRMBills();
    const found = all.find(b => b.id === decodeURIComponent(billId));
    setBill(found || null);

    if (found) {
      const isSub = (mode || (found.billType === 'Actual' ? 'SUBCONTRACTOR' : 'DEPARTMENT')) === 'SUBCONTRACTOR';
      const defaultBillNo = isSub
        ? found.billNo || found.rmNo?.replace(/^RM-/i, 'SUB-RA-') || 'SUB-RA-01'
        : found.billNo || found.rmNo?.replace(/^RM-/i, 'RA-') || 'RA-01';

      setBillNo(defaultBillNo);
      setBillDate(found.billDate || getTodayDate());
      setRemarks(found.billRemarks || '');

      const initialSubName = found.subContractorName || found.contractorName || 'Sub-Contractor';
      setSubContractorName(initialSubName);

      const resolvedPo = (
        found.poNumber ||
        resolvePoNumberForProject(found.projectNo, initialSubName) ||
        ''
      ).trim();
      setSelectedPoNumber(resolvedPo);
    }
  };

  useEffect(() => {
    loadBill();
  }, [billId]);

  const isSubContractor = (mode || (bill?.billType === 'Actual' ? 'SUBCONTRACTOR' : 'DEPARTMENT')) === 'SUBCONTRACTOR';
  const backPath = isSubContractor ? '/pms/billing/subcontractor' : '/pms/billing/department';

  // Bring POs created in the Indent -> PO flow into the local PO list (and rates) used here
  const [poSyncTick, setPoSyncTick] = useState(0);
  useEffect(() => {
    syncBackendPOsToLocal().then(() => setPoSyncTick((t) => t + 1));
  }, []);

  // Discover available POs
  const availablePOs = useMemo(() => {
    if (!bill) return [];
    return getAvailablePOsForProject(bill.projectNo, subContractorName);
  }, [bill, subContractorName, poSyncTick]);

  // Compute live Table 1 bill: Qty x Rate = Amount (NO DEDUCTIONS)
  const calculation = useMemo(() => {
    if (!bill) return null;
    return computeBillFromExecutionEntries(bill, {
      rateMode: isSubContractor ? 'PO' : 'SCHEDULE_B',
      poNumber: selectedPoNumber,
      subContractorName,
      overrideRates
    });
  }, [bill, isSubContractor, selectedPoNumber, subContractorName, overrideRates, poSyncTick]);

  if (!bill) {
    return (
      <div className="p-4 sm:p-6 md:p-8 space-y-4 max-w-[1400px] mx-auto min-h-screen bg-slate-50/50">
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-xs hover:bg-gray-50 cursor-pointer w-fit"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-500 text-sm shadow-xs">
          Bill record not found.
        </div>
      </div>
    );
  }

  const projOrMinor = getProjectOrMinor(bill.projectNo);
  const isBilled = bill.status === 'billed';

  const handleRateChange = (itemId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setOverrideRates(prev => ({ ...prev, [itemId]: num }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billNo.trim()) {
      toast.error('Bill Number is required');
      return;
    }
    if (!calculation || calculation.totalAmount <= 0) {
      toast.error('Bill amount must be greater than zero');
      return;
    }

    const payload = {
      billNo: billNo.trim(),
      billDate,
      billRemarks: remarks,
      poNumber: isSubContractor ? selectedPoNumber : undefined,
      subContractorName: isSubContractor ? subContractorName : undefined,
      rateMode: isSubContractor ? 'PO' : 'SCHEDULE_B',
      grossAmount: calculation.totalAmount,
      billAmount: calculation.totalAmount,
      totalLengthMeters: calculation.totalLengthMeters,
      itemBreakdown: calculation.lineItems,
      pipeDiaBreakdown: calculation.pipeDiaBreakdown,
      contractorMargin: calculation.contractorMargin,
      contractorMarginPct: calculation.contractorMarginPct,
      deductions: { totalDeductions: 0 },
      status: 'billed'
    };

    updateRMBill(bill.id, payload);
    toast.success(
      isSubContractor
        ? `Sub-Contractor Voucher ${billNo} certified & saved successfully!`
        : `Department RA Bill ${billNo} certified & saved successfully!`
    );
    navigate(backPath);
  };

  const handlePrint = () => {
    const ok = openRaBillVoucher({
      bill,
      items: calculation?.lineItems || bill.itemBreakdown || [],
      totalAmount: Number(calculation?.totalAmount || bill.billAmount || 0),
      billNo,
      billDate,
      isSubContractor,
      partyName: isSubContractor ? subContractorName : (bill.contractorName || ''),
      poNumber: isSubContractor ? selectedPoNumber : undefined,
    });
    if (!ok) toast.error('Pop-up blocked. Please allow pop-ups to print voucher.');
  };

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-4 max-w-[1600px] mx-auto bg-slate-50/50 min-h-screen">
      {/* Top Header Card */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(backPath)}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to {isSubContractor ? 'Sub Contractor Billing' : 'Department Billing'}
            </button>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                isSubContractor ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {isSubContractor ? 'Rate from PO' : 'Rate from Schedule - B Report'}
            </span>
            <span className="text-xs text-gray-400 font-mono">Ref: {bill.rmNo}</span>
          </div>

          <h1 className="text-base sm:text-lg md:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2 mt-1">
            {isSubContractor ? (
              <Users className="text-purple-600 shrink-0" size={22} />
            ) : (
              <Building2 className="text-indigo-600 shrink-0" size={22} />
            )}
            {isSubContractor ? 'Sub-Contractor Payment Voucher' : 'Department RA Bill'} — {bill.projectName}
            {bill.minorName && (
              <span className={isSubContractor ? 'text-purple-600' : 'text-indigo-600'}>
                {' '}
                ({bill.minorName})
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isBilled && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors cursor-pointer"
            >
              <Printer size={15} /> Print Voucher
            </button>
          )}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bill Metadata */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">
              {isSubContractor ? 'Voucher Number *' : 'RA Bill Number *'}
            </label>
            <input
              type="text"
              value={billNo}
              onChange={e => setBillNo(e.target.value)}
              placeholder={isSubContractor ? 'e.g. SUB-RA-01' : 'e.g. RA-01'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold bg-white text-gray-900"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">Bill Date *</label>
            <input
              type="date"
              value={billDate}
              onChange={e => setBillDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
              required
            />
          </div>

          {isSubContractor ? (
            <div>
              <label className="block font-bold text-purple-900 uppercase mb-1 text-[10px] flex items-center justify-between">
                <span>Linked PO Number *</span>
                <span className="text-[9px] text-purple-700 font-normal">Rates from PO</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedPoNumber}
                  onChange={e => setSelectedPoNumber(e.target.value)}
                  placeholder="Enter or select PO #"
                  list="po-options"
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono font-bold bg-purple-50/30 text-purple-950"
                  required
                />
                <datalist id="po-options">
                  {availablePOs.map(p => (
                    <option key={p.poNumber} value={p.poNumber}>
                      {p.poNumber} ({p.vendorName})
                    </option>
                  ))}
                </datalist>
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">Rate Source</label>
              <div className="px-3 py-2 border border-indigo-200 bg-indigo-50/50 rounded-lg text-indigo-900 font-semibold truncate text-[11px] flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-600 shrink-0" />
                <span>Schedule - B Report</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1 text-[10px]">
              {isSubContractor ? 'Sub-Contractor Party' : 'Remarks / Note'}
            </label>
            {isSubContractor ? (
              <input
                type="text"
                value={subContractorName}
                onChange={e => setSubContractorName(e.target.value)}
                placeholder="Subcontractor Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white font-medium text-gray-900"
              />
            ) : (
              <input
                type="text"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Optional remarks"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
              />
            )}
          </div>
        </div>

        {/* Itemized Table 1 Abstract */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-gray-700 uppercase">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className={isSubContractor ? 'text-purple-600' : 'text-indigo-600'} />
              <span>
                Itemized Work Done ({bill.entries?.length || 0} entries sent from{' '}
                {isSubContractor ? 'Actual Details' : 'Execution Details'})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-gray-600 lowercase font-normal">
                {calculation?.totalLengthMeters.toLocaleString('en-IN')} m total pipe length
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-800 text-white uppercase text-[10px] font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-2 text-center w-16">Unit</th>
                  <th className="py-2.5 px-3 text-right w-28">Executed Qty</th>
                  <th className="py-2.5 px-3 text-right w-36">
                    {isSubContractor ? 'PO Rate (₹)' : 'Schedule B Rate (₹)'}
                  </th>
                  <th className="py-2.5 px-3 text-right w-36">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                {calculation?.lineItems.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2 px-3 text-center text-gray-400 font-sans">{idx + 1}</td>
                    <td className="py-2 px-3 font-sans font-medium text-gray-900 leading-tight">
                      <div>{item.description}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 font-mono">
                          {item.code}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-medium ${
                            isSubContractor
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {item.rateSource}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center text-gray-600 font-sans">{item.unit}</td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900">
                      {item.quantity.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={e => handleRateChange(item.id, e.target.value)}
                        className="w-28 px-2 py-1 text-right font-bold text-gray-900 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                        step="0.01"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-950 font-mono text-xs">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold text-xs text-gray-900">
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-right uppercase">
                    Total Work Done:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-indigo-900">
                    {calculation?.totalLengthMeters.toLocaleString('en-IN')} m
                  </td>
                  <td className="py-3 px-3 text-right text-gray-500 font-normal">
                    —
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-gray-950">
                    {formatCurrency(calculation?.totalAmount || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Bottom Action & Summary Card */}
        <div
          className={`p-4 sm:p-5 rounded-2xl text-white flex flex-wrap items-center justify-between gap-4 shadow-sm ${
            isSubContractor
              ? 'bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900'
              : 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900'
          }`}
        >
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                {isSubContractor ? 'Total Sub-Contractor Work Done' : 'Total Department Work Done'}
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-0.5">
                {formatCurrency(calculation?.totalAmount || 0)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all ${
                isSubContractor
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <CheckCircle2 size={16} />
              {isBilled
                ? 'Update Bill'
                : isSubContractor
                ? 'Certify & Save Sub Voucher'
                : 'Certify & Save RA Bill'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
