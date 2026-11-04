// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { FileText, Save, Calculator, AlertTriangle, CheckCircle, Percent, ArrowRight } from 'lucide-react';
import type { Table1CalculationResult } from '@/systems/pms/utils/billingEngine';
import { calculateDepartmentRABill } from '@/systems/pms/utils/billingEngine';
import type { DeptBillInputItem, DeptBillDeductionConfig } from '@/systems/pms/utils/billingEngine';
import { addRMBill, getRMBills } from '@/systems/pms/utils/storageManager';
import { generateRMNo } from '@/systems/pms/utils/rmUtils';
import { generateId } from '@/systems/pms/utils/helpers';

interface Props {
  calcResult: Table1CalculationResult;
  onBillGenerated: () => void;
}

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹ ' + Math.round(val).toLocaleString('en-IN');
};

export default function DepartmentRAGenerator({ calcResult, onBillGenerated }: Props) {
  const { items } = calcResult;

  // Only items that feed the grand total (Rows 28 to 145)
  const billableItems = useMemo(() => {
    return items.filter(it => it.row >= 28 && it.row <= 145);
  }, [items]);

  // Form State
  const [billNo, setBillNo] = useState('RA-01');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [agreementNo, setAgreementNo] = useState('EE/WRD/SUREWADA/2025/08');
  const [executiveEngineer, setExecutiveEngineer] = useState('Executive Engineer, Lift Irrigation Division');
  const [remarks, setRemarks] = useState('');

  // Deduction configs
  const [securityDepositPct, setSecurityDepositPct] = useState(5);
  const [tdsPct, setTdsPct] = useState(2);
  const [gstTdsPct, setGstTdsPct] = useState(2);
  const [labourCessPct, setLabourCessPct] = useState(1);
  const [murumRoyaltyQty, setMurumRoyaltyQty] = useState(0);
  const [sandRoyaltyQty, setSandRoyaltyQty] = useState(0);
  const [advanceRecovery, setAdvanceRecovery] = useState(0);

  // Current executed quantities state (keyed by row)
  // Default to a reasonable first RA bill sample: 25% of design quantity
  const [currentQuantities, setCurrentQuantities] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    billableItems.forEach(it => {
      // Sample initial 20% work progress for RA-1
      map[it.row] = it.calculatedDesignQty > 0 ? parseFloat((it.calculatedDesignQty * 0.20).toFixed(2)) : 0;
    });
    return map;
  });

  const [previousQuantities, setPreviousQuantities] = useState<Record<number, number>>(() => {
    const map: Record<number, number> = {};
    billableItems.forEach(it => {
      map[it.row] = 0; // 0 for RA-1
    });
    return map;
  });

  // Calculate bill in real-time
  const billCalculation = useMemo(() => {
    const inputItems: DeptBillInputItem[] = billableItems.map(it => ({
      row: it.row,
      itemId: `item_${it.row}`,
      description: it.description,
      unit: it.unit,
      rate: it.rate,
      previousQty: previousQuantities[it.row] || 0,
      currentQty: currentQuantities[it.row] || 0
    }));

    const deductionConfig: DeptBillDeductionConfig = {
      securityDepositPct,
      tdsPct,
      gstTdsPct,
      labourCessPct,
      murumQtyCum: murumRoyaltyQty,
      sandQtyCum: sandRoyaltyQty,
      machineryAdvanceRecovery: advanceRecovery
    };

    return calculateDepartmentRABill(inputItems, deductionConfig);
  }, [
    billableItems,
    currentQuantities,
    previousQuantities,
    securityDepositPct,
    tdsPct,
    gstTdsPct,
    labourCessPct,
    murumRoyaltyQty,
    sandRoyaltyQty,
    advanceRecovery
  ]);

  const handleQtyChange = (row: number, val: string) => {
    const num = parseFloat(val) || 0;
    setCurrentQuantities(prev => ({ ...prev, [row]: num }));

    // Auto-update murum/sand royalty qty if editing row 31 (Murum) or row 34 (Sand)
    if (row === 31) setMurumRoyaltyQty(num);
    if (row === 34) setSandRoyaltyQty(num);
  };

  const handlePresetPercentage = (pct: number) => {
    const map: Record<number, number> = {};
    billableItems.forEach(it => {
      map[it.row] = it.calculatedDesignQty > 0 ? parseFloat((it.calculatedDesignQty * (pct / 100)).toFixed(2)) : 0;
    });
    setCurrentQuantities(map);
    toast.success(`Set current bill quantities to ${pct}% of design`);
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();

    if (!billNo.trim()) {
      toast.error('Bill Number is required');
      return;
    }

    const rmBills = getRMBills();
    const rmNo = generateRMNo(rmBills);

    const billRecord = {
      id: generateId(),
      rmNo,
      billNo: billNo.trim(),
      billDate,
      agreementNo,
      executiveEngineer,
      billRemarks: remarks,
      billType: 'Execution', // Department RA Bill
      status: 'billed',
      projectNo: 'PN-SUREWADA-01',
      projectName: 'Construction of Pipe Distribution Network on Minors along with CADWM (Surewada LIS)',
      grossAmount: billCalculation.grossCurrentAmount,
      billAmount: billCalculation.netPayable,
      deductions: billCalculation.deductions,
      entries: billCalculation.itemResults.map(r => ({
        row: r.row,
        description: r.description,
        unit: r.unit,
        rate: r.rate,
        previousQty: r.previousQty,
        currentQty: r.currentQty,
        cumulativeQty: r.cumulativeQty,
        currentAmount: r.currentAmount
      })),
      createdAt: new Date().toISOString()
    };

    addRMBill(billRecord);
    toast.success(`Department RA Bill ${billNo} certified & saved! (Gross: ${formatCurrency(billCalculation.grossCurrentAmount)} | Net: ${formatCurrency(billCalculation.netPayable)})`);
    onBillGenerated();
  };

  return (
    <div className="space-y-4">
      {/* Bill Meta & Parameters */}
      <form onSubmit={handleSaveBill} className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Generate Department Running Account (RA) Bill</h2>
                <p className="text-[11px] text-gray-500">Official Government client measurement abstract & deduction statement</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500">Quick Fill:</span>
              {[10, 25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePresetPercentage(pct)}
                  className="px-2 py-1 text-[10px] font-semibold bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-gray-700 transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">RA Bill Number</label>
              <input
                type="text"
                value={billNo}
                onChange={e => setBillNo(e.target.value)}
                placeholder="e.g. RA-01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Bill Date</label>
              <input
                type="date"
                value={billDate}
                onChange={e => setBillDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Agreement / Work Order No</label>
              <input
                type="text"
                value={agreementNo}
                onChange={e => setAgreementNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Executive Engineer / Authority</label>
              <input
                type="text"
                value={executiveEngineer}
                onChange={e => setExecutiveEngineer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Deductions Config Panel */}
        <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 shadow-xs">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-tight flex items-center gap-1.5 mb-3">
            <Calculator size={14} className="text-indigo-600" />
            Statutory Recoveries & Department Deductions
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <label className="block text-[11px] font-medium text-gray-600">Security Deposit</label>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  value={securityDepositPct}
                  onChange={e => setSecurityDepositPct(parseFloat(e.target.value) || 0)}
                  className="w-14 px-1.5 py-1 text-xs border rounded font-semibold text-right"
                  step="0.5"
                />
                <span className="text-[11px] text-gray-500">%</span>
              </div>
              <div className="text-[11px] font-bold text-gray-900 mt-1">{formatCurrency(billCalculation.deductions.securityDeposit)}</div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <label className="block text-[11px] font-medium text-gray-600">IT TDS (u/s 194C)</label>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  value={tdsPct}
                  onChange={e => setTdsPct(parseFloat(e.target.value) || 0)}
                  className="w-14 px-1.5 py-1 text-xs border rounded font-semibold text-right"
                  step="0.5"
                />
                <span className="text-[11px] text-gray-500">%</span>
              </div>
              <div className="text-[11px] font-bold text-gray-900 mt-1">{formatCurrency(billCalculation.deductions.tdsAmount)}</div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <label className="block text-[11px] font-medium text-gray-600">GST TDS (1%+1%)</label>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  value={gstTdsPct}
                  onChange={e => setGstTdsPct(parseFloat(e.target.value) || 0)}
                  className="w-14 px-1.5 py-1 text-xs border rounded font-semibold text-right"
                  step="0.5"
                />
                <span className="text-[11px] text-gray-500">%</span>
              </div>
              <div className="text-[11px] font-bold text-gray-900 mt-1">{formatCurrency(billCalculation.deductions.gstTdsAmount)}</div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <label className="block text-[11px] font-medium text-gray-600">Labour Cess</label>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  value={labourCessPct}
                  onChange={e => setLabourCessPct(parseFloat(e.target.value) || 0)}
                  className="w-14 px-1.5 py-1 text-xs border rounded font-semibold text-right"
                  step="0.5"
                />
                <span className="text-[11px] text-gray-500">%</span>
              </div>
              <div className="text-[11px] font-bold text-gray-900 mt-1">{formatCurrency(billCalculation.deductions.labourCess)}</div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <label className="block text-[11px] font-medium text-gray-600">Murum Royalty (CUM)</label>
              <input
                type="number"
                value={murumRoyaltyQty}
                onChange={e => setMurumRoyaltyQty(parseFloat(e.target.value) || 0)}
                className="w-full px-1.5 py-1 text-xs border rounded font-semibold text-right mt-1"
              />
              <div className="text-[10px] text-gray-400 mt-0.5">@ ₹141.43/CUM</div>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-gray-200">
              <label className="block text-[11px] font-medium text-gray-600">Machinery Advance</label>
              <input
                type="number"
                value={advanceRecovery}
                onChange={e => setAdvanceRecovery(parseFloat(e.target.value) || 0)}
                className="w-full px-1.5 py-1 text-xs border rounded font-semibold text-right mt-1"
                placeholder="₹ 0"
              />
              <div className="text-[10px] text-gray-400 mt-0.5">Direct recovery</div>
            </div>
          </div>
        </div>

        {/* Bill Financial Summary Bar */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gross Work Done</div>
              <div className="text-xl font-black text-white font-mono">{formatCurrency(billCalculation.grossCurrentAmount)}</div>
            </div>
            <div className="h-8 w-px bg-slate-700 hidden sm:block" />
            <div>
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Total Deductions</div>
              <div className="text-xl font-black text-rose-300 font-mono">- {formatCurrency(billCalculation.deductions.totalDeductions)}</div>
            </div>
            <div className="h-8 w-px bg-slate-700 hidden sm:block" />
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Net Amount Payable</div>
              <div className="text-2xl font-black text-emerald-300 font-mono">{formatCurrency(billCalculation.netPayable)}</div>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Save size={16} /> Certify & Save RA Bill
          </button>
        </div>

        {/* Measurement Line Items Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase">Bill Measurement Abstract (Rows 28 to 145)</span>
            <span className="text-[11px] text-gray-500">Edit Current Qty to adjust current bill certified amounts</span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-800 text-white sticky top-0 z-10 text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-2 text-center w-12 border-r border-slate-700">Row</th>
                  <th className="py-2.5 px-3 min-w-[280px] border-r border-slate-700">Description</th>
                  <th className="py-2.5 px-2 text-center w-14 border-r border-slate-700">Unit</th>
                  <th className="py-2.5 px-2 text-right w-20 border-r border-slate-700">Tender Rate</th>
                  <th className="py-2.5 px-2 text-right w-24 border-r border-slate-700">Tender Qty</th>
                  <th className="py-2.5 px-2 text-right w-24 border-r border-slate-700 bg-slate-900">Prev Qty (A)</th>
                  <th className="py-2.5 px-3 text-right w-28 border-r border-slate-700 bg-indigo-900/60 text-amber-300 font-bold">Current Qty (B)</th>
                  <th className="py-2.5 px-2 text-right w-24 border-r border-slate-700">Upto Date (C)</th>
                  <th className="py-2.5 px-3 text-right w-32 border-r border-slate-700">Current Amt (₹)</th>
                  <th className="py-2.5 px-2 text-center w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800 font-mono text-[11px]">
                {billCalculation.itemResults.map(r => {
                  const matchingItem = billableItems.find(it => it.row === r.row);
                  const tenderQty = matchingItem?.calculatedTenderQty || 0;
                  const isExcess = r.cumulativeQty > tenderQty && tenderQty > 0;

                  return (
                    <tr key={r.row} className="hover:bg-gray-50">
                      <td className="py-2 px-2 text-center text-gray-400 border-r border-gray-200 text-[10px]">{r.row}</td>
                      <td className="py-2 px-3 border-r border-gray-200 font-sans font-medium text-gray-900 leading-tight">
                        {r.description}
                      </td>
                      <td className="py-2 px-2 text-center text-gray-600 border-r border-gray-200 font-sans">{r.unit}</td>
                      <td className="py-2 px-2 text-right border-r border-gray-200 font-semibold">{r.rate > 0 ? r.rate.toLocaleString('en-IN') : '-'}</td>
                      <td className="py-2 px-2 text-right text-gray-600 border-r border-gray-200">{tenderQty > 0 ? tenderQty.toLocaleString('en-IN') : '-'}</td>
                      <td className="py-2 px-2 text-right text-gray-500 border-r border-gray-200 bg-gray-50/50">{r.previousQty > 0 ? r.previousQty.toLocaleString('en-IN') : '0'}</td>

                      {/* Current Qty Input */}
                      <td className="py-1.5 px-2 text-right border-r border-gray-200 bg-indigo-50/30">
                        <input
                          type="number"
                          value={currentQuantities[r.row] ?? 0}
                          onChange={e => handleQtyChange(r.row, e.target.value)}
                          className="w-full px-2 py-1 text-right text-xs font-bold text-indigo-900 border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                          step="0.01"
                        />
                      </td>

                      <td className="py-2 px-2 text-right font-bold text-gray-900 border-r border-gray-200">{r.cumulativeQty.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right font-bold text-indigo-950 border-r border-gray-200">{formatCurrency(r.currentAmount)}</td>
                      <td className="py-2 px-2 text-center font-sans">
                        {isExcess ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title="Excess over Schedule B">
                            Excess
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                            OK
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
      </form>
    </div>
  );
}
