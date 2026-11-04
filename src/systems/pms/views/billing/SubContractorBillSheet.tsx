// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Users, FileText, Save, Calculator, AlertTriangle, CheckCircle, Percent, ArrowRight, ShieldAlert } from 'lucide-react';
import { TABLE_1_ITEMS, TABLE_1_MINORS } from '@/systems/pms/utils/table1SeedData';
import { calculateSubContractorBill } from '@/systems/pms/utils/billingEngine';
import type { SubContractorItemInput, SubContractorDeductionConfig } from '@/systems/pms/utils/billingEngine';
import { addRMBill, getRMBills, getActuals } from '@/systems/pms/utils/storageManager';
import { generateRMNo } from '@/systems/pms/utils/rmUtils';
import { generateId } from '@/systems/pms/utils/helpers';

interface Props {
  selectedSubContractor: string;
  selectedMinor: string;
  onBillGenerated: () => void;
}

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹ ' + Math.round(val).toLocaleString('en-IN');
};

export default function SubContractorBillSheet({ selectedSubContractor, selectedMinor, onBillGenerated }: Props) {
  // Bill Meta
  const [billNo, setBillNo] = useState('SUB-RA-01');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [workOrderNo, setWorkOrderNo] = useState(`WO/SUREWADA/${selectedMinor.toUpperCase()}/2025`);
  const [remarks, setRemarks] = useState('');

  // Deduction configs
  const [materialRecovery, setMaterialRecovery] = useState(0);
  const [advanceRecoveryPct, setAdvanceRecoveryPct] = useState(10);
  const [retentionPct, setRetentionPct] = useState(5);
  const [tdsPct, setTdsPct] = useState(1); // 1% for individual/proprietor, 2% for company
  const [dieselCharges, setDieselCharges] = useState(0);
  const [otherDebits, setOtherDebits] = useState(0);

  // Filter Table 1 items down to work items for this minor
  const minorWorkItems = useMemo(() => {
    return TABLE_1_ITEMS.filter(it => {
      // Must be a work item (Earthwork, Laying, Valves, Structures)
      if (it.row < 28 || it.row > 139) return false;

      // Must have quantity in this minor
      const mData = it.minors[selectedMinor];
      return mData && (mData.designQty > 0 || mData.tenderQty > 0);
    });
  }, [selectedMinor]);

  // Sub-contractor PO rates (default to ~70-80% of Department tender rate to reflect subcontracting cost)
  const [subRates, setSubRates] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    minorWorkItems.forEach(it => {
      // Set reasonable default contractor rate (e.g. 75% of dept rate)
      map[it.row] = parseFloat((it.rate * 0.75).toFixed(2));
    });
    return map;
  });

  // Current Claimed Quantities (default to ~30% progress of this minor's design qty)
  const [claimedQuantities, setClaimedQuantities] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    minorWorkItems.forEach(it => {
      const dQty = it.minors[selectedMinor]?.designQty || 0;
      map[it.row] = dQty > 0 ? parseFloat((dQty * 0.30).toFixed(2)) : 0;
    });
    return map;
  });

  const [prevBilledQuantities, setPrevBilledQuantities] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    minorWorkItems.forEach(it => {
      map[it.row] = 0;
    });
    return map;
  });

  // Reconcile with Department certified bills
  const deptCertifiedBills = getRMBills().filter(b => b.billType === 'Execution');

  // Calculate Sub-Contractor Bill
  const calculation = useMemo(() => {
    const inputItems: SubContractorItemInput[] = minorWorkItems.map(it => {
      const designQty = it.minors[selectedMinor]?.designQty || 0;

      // Find department certified qty from previous RM1 bills if any
      let deptCertifiedQty = designQty;
      deptCertifiedBills.forEach(b => {
        const found = (b.entries || []).find((e: any) => e.row === it.row);
        if (found && found.cumulativeQty) {
          deptCertifiedQty = found.cumulativeQty;
        }
      });

      return {
        row: it.row,
        itemDescription: it.description,
        unit: it.unit,
        deptTenderRate: it.rate,
        subContractorRate: subRates[it.row] || 0,
        designQty,
        deptCertifiedQty,
        siteActualQty: designQty * 0.35, // site verified actual
        previousBilledQty: prevBilledQuantities[it.row] || 0,
        currentClaimedQty: claimedQuantities[it.row] || 0
      };
    });

    const deductionConfig: SubContractorDeductionConfig = {
      materialIssuesRecovery: materialRecovery,
      advanceRecoveryPct,
      retentionPct,
      tdsPct,
      dieselOrEquipCharges: dieselCharges,
      otherDebits
    };

    return calculateSubContractorBill(inputItems, deductionConfig);
  }, [
    minorWorkItems,
    selectedMinor,
    subRates,
    claimedQuantities,
    prevBilledQuantities,
    materialRecovery,
    advanceRecoveryPct,
    retentionPct,
    tdsPct,
    dieselCharges,
    otherDebits
  ]);

  const handleRateChange = (row: number, val: string) => {
    const num = parseFloat(val) || 0;
    setSubRates(prev => ({ ...prev, [row]: num }));
  };

  const handleQtyChange = (row: number, val: string) => {
    const num = parseFloat(val) || 0;
    setClaimedQuantities(prev => ({ ...prev, [row]: num }));
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();

    if (!billNo.trim()) {
      toast.error('Bill Number is required');
      return;
    }

    if (calculation.hasOverClaim) {
      if (!window.confirm('WARNING: One or more claimed quantities exceed Department certified limits! Do you still want to proceed?')) {
        return;
      }
    }

    const rmBills = getRMBills();
    const rmNo = generateRMNo(rmBills);

    const billRecord = {
      id: generateId(),
      rmNo,
      billNo: billNo.trim(),
      billDate,
      workOrderNo,
      subContractorName: selectedSubContractor,
      minorName: selectedMinor,
      billRemarks: remarks,
      billType: 'Actual', // Sub-Contractor RA Bill
      status: 'billed',
      projectNo: 'PN-SUREWADA-01',
      projectName: `Surewada LIS - Minor ${selectedMinor.toUpperCase()}`,
      grossAmount: calculation.grossWorkDone,
      billAmount: calculation.netPayable,
      totalMargin: calculation.totalMargin,
      deductions: calculation.deductions,
      entries: calculation.itemResults.map(r => ({
        row: r.row,
        description: r.itemDescription,
        unit: r.unit,
        subRate: r.subContractorRate,
        deptRate: r.deptTenderRate,
        previousQty: r.previousBilledQty,
        currentQty: r.currentClaimedQty,
        cumulativeQty: r.cumulativeClaimed,
        amount: r.subAmount,
        margin: r.grossMargin
      })),
      createdAt: new Date().toISOString()
    };

    addRMBill(billRecord);
    toast.success(`Sub-Contractor Bill ${billNo} generated! (Gross: ${formatCurrency(calculation.grossWorkDone)} | Net: ${formatCurrency(calculation.netPayable)})`);
    onBillGenerated();
  };

  return (
    <form onSubmit={handleSaveBill} className="space-y-4">
      {/* Header Parameters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Users className="text-indigo-600" size={20} />
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Generate Sub-Contractor Measurement Bill</h2>
              <p className="text-[11px] text-gray-500">
                Billing Sub-Contractor <span className="font-bold text-indigo-700">{selectedSubContractor}</span> on Minor <span className="font-bold text-gray-800 uppercase">{selectedMinor}</span>
              </p>
            </div>
          </div>

          {calculation.hasOverClaim && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold animate-pulse">
              <ShieldAlert size={14} /> Over-Claim Warning
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Sub-Contractor Bill No</label>
            <input
              type="text"
              value={billNo}
              onChange={e => setBillNo(e.target.value)}
              placeholder="e.g. SUB-RA-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-semibold"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Bill Date</label>
            <input
              type="date"
              value={billDate}
              onChange={e => setBillDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Work Order / PO Number</label>
            <input
              type="text"
              value={workOrderNo}
              onChange={e => setWorkOrderNo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Remarks / Location Note</label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Pipe laying from RD 200m to 850m"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Commercial Deductions Panel */}
      <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs">
        <h3 className="text-xs font-bold text-amber-900 uppercase tracking-tight flex items-center gap-1.5 mb-3">
          <Calculator size={14} className="text-amber-700" />
          Sub-Contractor Deductions & Material Recoveries
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-white p-2.5 rounded-lg border border-amber-200">
            <label className="block text-[11px] font-medium text-gray-700">Material Recovery (Pipes)</label>
            <input
              type="number"
              value={materialRecovery}
              onChange={e => setMaterialRecovery(parseFloat(e.target.value) || 0)}
              className="w-full px-1.5 py-1 text-xs border rounded font-semibold text-right mt-1"
              placeholder="₹ 0"
            />
            <div className="text-[10px] text-gray-400 mt-0.5">HDPE pipes issued</div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-amber-200">
            <label className="block text-[11px] font-medium text-gray-700">Advance Recovery</label>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                value={advanceRecoveryPct}
                onChange={e => setAdvanceRecoveryPct(parseFloat(e.target.value) || 0)}
                className="w-14 px-1.5 py-1 text-xs border rounded font-semibold text-right"
              />
              <span className="text-[11px] text-gray-500">%</span>
            </div>
            <div className="text-[11px] font-bold text-gray-900 mt-1">{formatCurrency(calculation.deductions.advanceRecovery)}</div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-amber-200">
            <label className="block text-[11px] font-medium text-gray-700">Retention Money (5%)</label>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                value={retentionPct}
                onChange={e => setRetentionPct(parseFloat(e.target.value) || 0)}
                className="w-14 px-1.5 py-1 text-xs border rounded font-semibold text-right"
              />
              <span className="text-[11px] text-gray-500">%</span>
            </div>
            <div className="text-[11px] font-bold text-gray-900 mt-1">{formatCurrency(calculation.deductions.retentionAmount)}</div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-amber-200">
            <label className="block text-[11px] font-medium text-gray-700">TDS u/s 194C</label>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                value={tdsPct}
                onChange={e => setTdsPct(parseFloat(e.target.value) || 0)}
                className="w-14 px-1.5 py-1 text-xs border rounded font-semibold text-right"
              />
              <span className="text-[11px] text-gray-500">%</span>
            </div>
            <div className="text-[11px] font-bold text-gray-900 mt-1">{formatCurrency(calculation.deductions.tdsAmount)}</div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-amber-200">
            <label className="block text-[11px] font-medium text-gray-700">Diesel / Machinery</label>
            <input
              type="number"
              value={dieselCharges}
              onChange={e => setDieselCharges(parseFloat(e.target.value) || 0)}
              className="w-full px-1.5 py-1 text-xs border rounded font-semibold text-right mt-1"
              placeholder="₹ 0"
            />
            <div className="text-[10px] text-gray-400 mt-0.5">Excavator/Crane charges</div>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-amber-200">
            <label className="block text-[11px] font-medium text-gray-700">Other Debits / Penalties</label>
            <input
              type="number"
              value={otherDebits}
              onChange={e => setOtherDebits(parseFloat(e.target.value) || 0)}
              className="w-full px-1.5 py-1 text-xs border rounded font-semibold text-right mt-1"
              placeholder="₹ 0"
            />
            <div className="text-[10px] text-gray-400 mt-0.5">Debit notes</div>
          </div>
        </div>
      </div>

      {/* Financial Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Sub Gross Work Done</div>
            <div className="text-xl font-black text-white font-mono">{formatCurrency(calculation.grossWorkDone)}</div>
          </div>
          <div className="h-8 w-px bg-slate-700 hidden sm:block" />
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-400">Total Deductions</div>
            <div className="text-xl font-black text-amber-300 font-mono">- {formatCurrency(calculation.deductions.totalDeductions)}</div>
          </div>
          <div className="h-8 w-px bg-slate-700 hidden sm:block" />
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-400">Net Payable to Sub</div>
            <div className="text-2xl font-black text-emerald-300 font-mono">{formatCurrency(calculation.netPayable)}</div>
          </div>
          <div className="h-8 w-px bg-slate-700 hidden sm:block" />
          <div>
            <div className="text-[10px] uppercase font-bold text-indigo-300">Main Contractor Margin</div>
            <div className="text-xl font-black text-indigo-200 font-mono">
              +{formatCurrency(calculation.totalMargin)} <span className="text-xs font-normal text-indigo-300">({calculation.totalMarginPct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          <Save size={16} /> Generate Sub-Contractor Bill
        </button>
      </div>

      {/* Measurement Items Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 uppercase">
            Work Items for Minor: {selectedMinor.toUpperCase()} ({minorWorkItems.length} items)
          </span>
          <span className="text-[11px] text-gray-500">Edit Sub PO Rate & Current Claimed Qty</span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="bg-slate-800 text-white sticky top-0 z-10 text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-2 text-center w-12 border-r border-slate-700">Row</th>
                <th className="py-2.5 px-3 min-w-[260px] border-r border-slate-700">Item Description</th>
                <th className="py-2.5 px-2 text-center w-14 border-r border-slate-700">Unit</th>
                <th className="py-2.5 px-2 text-right w-20 border-r border-slate-700">Dept Rate</th>
                <th className="py-2.5 px-2 text-right w-24 border-r border-slate-700 bg-amber-900/40 text-amber-200 font-bold">Sub PO Rate</th>
                <th className="py-2.5 px-2 text-right w-20 border-r border-slate-700">Minor Design</th>
                <th className="py-2.5 px-2 text-right w-20 border-r border-slate-700">Dept Certified</th>
                <th className="py-2.5 px-3 text-right w-28 border-r border-slate-700 bg-indigo-900/60 text-amber-300 font-bold">Claimed Qty</th>
                <th className="py-2.5 px-3 text-right w-28 border-r border-slate-700">Sub Amount (₹)</th>
                <th className="py-2.5 px-2 text-center w-24">Safety Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
              {calculation.itemResults.map(r => (
                <tr key={r.row} className="hover:bg-gray-50">
                  <td className="py-2 px-2 text-center text-gray-400 border-r border-gray-200">{r.row}</td>
                  <td className="py-2 px-3 border-r border-gray-200 font-sans font-medium text-gray-900 leading-tight">
                    {r.itemDescription}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-600 border-r border-gray-200 font-sans">{r.unit}</td>
                  <td className="py-2 px-2 text-right border-r border-gray-200 font-semibold text-gray-600">
                    {r.deptTenderRate.toLocaleString('en-IN')}
                  </td>

                  {/* Sub PO Rate Edit */}
                  <td className="py-1.5 px-2 text-right border-r border-gray-200 bg-amber-50/30">
                    <input
                      type="number"
                      value={subRates[r.row] ?? 0}
                      onChange={e => handleRateChange(r.row, e.target.value)}
                      className="w-full px-1.5 py-1 text-right text-xs font-bold text-amber-950 border border-amber-200 rounded focus:ring-1 focus:ring-amber-500 bg-white"
                      step="0.01"
                    />
                  </td>

                  <td className="py-2 px-2 text-right text-gray-600 border-r border-gray-200">{r.designQty.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-2 text-right text-blue-700 font-semibold border-r border-gray-200">{r.deptCertifiedQty.toLocaleString('en-IN')}</td>

                  {/* Claimed Qty Edit */}
                  <td className="py-1.5 px-2 text-right border-r border-gray-200 bg-indigo-50/30">
                    <input
                      type="number"
                      value={claimedQuantities[r.row] ?? 0}
                      onChange={e => handleQtyChange(r.row, e.target.value)}
                      className="w-full px-2 py-1 text-right text-xs font-bold text-indigo-900 border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                      step="0.01"
                    />
                  </td>

                  <td className="py-2 px-3 text-right font-bold text-indigo-950 border-r border-gray-200">
                    {formatCurrency(r.subAmount)}
                  </td>

                  {/* Back to Back Safety Check */}
                  <td className="py-2 px-2 text-center font-sans">
                    {r.isOverClaim ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center justify-center gap-0.5">
                        <ShieldAlert size={11} /> Over-Claim
                      </span>
                    ) : r.isDesignExcess ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Design Excess
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        ✓ OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}
