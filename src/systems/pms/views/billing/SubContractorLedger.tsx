// @ts-nocheck
import React, { useState } from 'react';
import { Users, FileText, Printer, CheckCircle2, Trash2, Calendar, Tag, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';
import { getRMBills, saveRMBills } from '@/systems/pms/utils/storageManager';
import { toast } from 'sonner';

interface Props {
  onRefresh: () => void;
}

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹ ' + Math.round(val).toLocaleString('en-IN');
};

export default function SubContractorLedger({ onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const subBills = getRMBills().filter(b => b.billType === 'Actual');

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this sub-contractor bill record?')) return;
    const all = getRMBills();
    const filtered = all.filter(b => b.id !== id);
    saveRMBills(filtered);
    toast.success('Sub-contractor bill record deleted');
    onRefresh();
  };

  const handlePrint = (bill: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print voucher.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sub-Contractor Payment Certificate - ${bill.billNo || bill.rmNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; font-size: 12px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0 0 5px 0; font-size: 16px; text-transform: uppercase; }
          .header h2 { margin: 0; font-size: 13px; font-weight: normal; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
          .meta-item { display: flex; }
          .meta-label { font-weight: bold; width: 160px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #444; padding: 6px 8px; }
          th { background: #f0f0f0; text-align: left; font-size: 11px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .summary-table { width: 350px; margin-left: auto; margin-top: 20px; }
          .summary-table td { padding: 5px 8px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; margin-top: 60px; text-align: center; }
          .sig-box { border-top: 1px dashed #666; padding-top: 8px; font-weight: bold; width: 220px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Sub-Contractor Payment Certificate / Measurement Voucher</h1>
          <h2>Project: Construction of Pipe Distribution Network & CADWM (Surewada LIS)</h2>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Sub-Contractor:</span> <span><strong>${bill.subContractorName || bill.contractorName || 'M/s Sub Contractor'}</strong></span></div>
          <div class="meta-item"><span class="meta-label">Bill Number:</span> <span>${bill.billNo || bill.rmNo}</span></div>
          <div class="meta-item"><span class="meta-label">Minor Name:</span> <span style="text-transform: uppercase;">${bill.minorName || 'General'}</span></div>
          <div class="meta-item"><span class="meta-label">Bill Date:</span> <span>${bill.billDate || '-'}</span></div>
          <div class="meta-item"><span class="meta-label">Work Order No:</span> <span>${bill.workOrderNo || 'WO/SUREWADA/2025'}</span></div>
          <div class="meta-item"><span class="meta-label">Reference No:</span> <span>${bill.rmNo}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">Row</th>
              <th>Item Description</th>
              <th class="text-center" style="width: 50px;">Unit</th>
              <th class="text-right" style="width: 80px;">Sub PO Rate (₹)</th>
              <th class="text-right" style="width: 80px;">Prev Qty</th>
              <th class="text-right" style="width: 80px;">Claimed Qty</th>
              <th class="text-right" style="width: 80px;">Cumulative</th>
              <th class="text-right" style="width: 100px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${(bill.entries || []).map((e: any) => `
              <tr>
                <td class="text-center">${e.row || '-'}</td>
                <td>${e.description || '-'}</td>
                <td class="text-center">${e.unit || '-'}</td>
                <td class="text-right">${Number(e.subRate || e.rate || 0).toLocaleString('en-IN')}</td>
                <td class="text-right">${Number(e.previousQty || 0).toLocaleString('en-IN')}</td>
                <td class="text-right" style="font-weight: bold;">${Number(e.currentQty || 0).toLocaleString('en-IN')}</td>
                <td class="text-right">${Number(e.cumulativeQty || 0).toLocaleString('en-IN')}</td>
                <td class="text-right">${Number(e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="summary-table">
          <tr>
            <td><strong>Gross Sub-Contractor Work Done:</strong></td>
            <td class="text-right"><strong>₹ ${Number(bill.grossAmount || bill.billAmount || 0).toLocaleString('en-IN')}</strong></td>
          </tr>
          ${bill.deductions?.materialIssuesRecovery ? `
          <tr>
            <td>Material Recovery (Pipes/Valves):</td>
            <td class="text-right">- ₹ ${Number(bill.deductions.materialIssuesRecovery).toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${bill.deductions?.advanceRecovery ? `
          <tr>
            <td>Advance Recovery:</td>
            <td class="text-right">- ₹ ${Number(bill.deductions.advanceRecovery).toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${bill.deductions?.retentionAmount ? `
          <tr>
            <td>Retention Money (5%):</td>
            <td class="text-right">- ₹ ${Number(bill.deductions.retentionAmount).toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${bill.deductions?.tdsAmount ? `
          <tr>
            <td>IT TDS (u/s 194C):</td>
            <td class="text-right">- ₹ ${Number(bill.deductions.tdsAmount).toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${bill.deductions?.dieselOrEquipCharges ? `
          <tr>
            <td>Equipment / Diesel Charges:</td>
            <td class="text-right">- ₹ ${Number(bill.deductions.dieselOrEquipCharges).toLocaleString('en-IN')}</td>
          </tr>` : ''}
          <tr style="background: #eef2ff;">
            <td><strong>Net Payable to Sub-Contractor:</strong></td>
            <td class="text-right"><strong style="font-size: 14px; color: #1e3a8a;">₹ ${Number(bill.billAmount || 0).toLocaleString('en-IN')}</strong></td>
          </tr>
        </table>

        <div class="signatures">
          <div class="sig-box">Project Manager / Billing Engineer</div>
          <div class="sig-box">Sub-Contractor Acknowledgment</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (subBills.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
        <Users className="mx-auto text-gray-300 mb-3" size={48} />
        <h3 className="text-sm font-bold text-gray-700 uppercase">No Sub-Contractor Bills Generated Yet</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Switch to the <strong>Generate Sub Bill</strong> tab to bill a sub-contractor on their assigned minor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {subBills.map(bill => {
        const isExpanded = expandedId === bill.id;
        const gross = bill.grossAmount || bill.billAmount || 0;
        const net = bill.billAmount || 0;
        const deductions = bill.deductions?.totalDeductions || (gross - net);
        const margin = bill.totalMargin || 0;

        return (
          <div key={bill.id} className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 flex flex-wrap items-center justify-between gap-4 bg-gray-50/50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : bill.id)}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer"
                >
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-indigo-700 text-sm">{bill.billNo || bill.rmNo}</span>
                    <span className="text-xs font-bold text-gray-900">{bill.subContractorName || bill.contractorName || 'Sub Contractor'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-100 text-indigo-800">
                      Minor: {bill.minorName || 'General'}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {bill.billDate || '-'}</span>
                    <span>WO: {bill.workOrderNo || 'WO/2025'}</span>
                    <span>Ref: {bill.rmNo}</span>
                  </div>
                </div>
              </div>

              {/* Amounts */}
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Gross Work</div>
                  <div className="text-xs font-bold text-gray-800 font-mono">{formatCurrency(gross)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-500 font-bold uppercase">Deductions</div>
                  <div className="text-xs font-bold text-amber-700 font-mono">- {formatCurrency(deductions)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Net Payable to Sub</div>
                  <div className="text-sm font-black text-emerald-700 font-mono">{formatCurrency(net)}</div>
                </div>
                {margin > 0 && (
                  <div>
                    <div className="text-[10px] text-indigo-500 font-bold uppercase">Contractor Margin</div>
                    <div className="text-xs font-black text-indigo-600 font-mono">+{formatCurrency(margin)}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => handlePrint(bill)}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Print Voucher"
                  >
                    <Printer size={15} /> Voucher
                  </button>
                  <button
                    onClick={() => handleDelete(bill.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Entries Breakdown */}
            {isExpanded && (
              <div className="p-4 bg-white border-t border-gray-100 space-y-4">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2 px-2 text-center w-12">Row</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-2 text-center w-16">Unit</th>
                        <th className="py-2 px-2 text-right w-24">Sub Rate (₹)</th>
                        <th className="py-2 px-2 text-right w-24">Dept Rate (₹)</th>
                        <th className="py-2 px-2 text-right w-24 text-indigo-700 font-bold">Claimed Qty</th>
                        <th className="py-2 px-3 text-right w-28 font-bold">Sub Amount (₹)</th>
                        <th className="py-2 px-3 text-right w-28 text-emerald-700 font-bold">Margin (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                      {(bill.entries || []).map((e: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-1.5 px-2 text-center text-gray-400">{e.row || idx + 1}</td>
                          <td className="py-1.5 px-3 font-sans font-medium text-gray-900">{e.description}</td>
                          <td className="py-1.5 px-2 text-center text-gray-600 font-sans">{e.unit}</td>
                          <td className="py-1.5 px-2 text-right text-indigo-900 font-bold">{Number(e.subRate || e.rate || 0).toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-2 text-right text-gray-500">{Number(e.deptRate || 0).toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-2 text-right text-indigo-900 font-bold bg-indigo-50/20">{Number(e.currentQty || 0).toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-gray-950">{formatCurrency(e.amount)}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-emerald-700">+{formatCurrency(e.margin || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
