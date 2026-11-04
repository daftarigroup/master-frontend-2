// @ts-nocheck
import React, { useState } from 'react';
import { FileText, Printer, CheckCircle2, Clock, Eye, Trash2, Calendar, User, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { getRMBills, saveRMBills } from '@/systems/pms/utils/storageManager';
import { toast } from 'sonner';

interface Props {
  onRefresh: () => void;
}

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹ ' + Math.round(val).toLocaleString('en-IN');
};

export default function DepartmentBillHistory({ onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const bills = getRMBills().filter(b => b.billType === 'Execution');

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this certified RA bill record?')) return;
    const all = getRMBills();
    const filtered = all.filter(b => b.id !== id);
    saveRMBills(filtered);
    toast.success('Bill record removed');
    onRefresh();
  };

  const handlePrint = (bill: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print bill.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Running Account Bill - ${bill.billNo || bill.rmNo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; font-size: 12px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
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
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; margin-top: 60px; text-align: center; }
          .sig-box { border-top: 1px dashed #666; padding-top: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Government of Maharashtra - Water Resources Department</h1>
          <h2>Running Account Bill Form (Schedule B Abstract)</h2>
          <div style="font-weight: bold; margin-top: 5px;">Surewada Lift Irrigation Scheme (RD 0 to 10000 m, 2073 Ha)</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">Bill Number:</span> <span>${bill.billNo || bill.rmNo}</span></div>
          <div class="meta-item"><span class="meta-label">Bill Date:</span> <span>${bill.billDate || '-'}</span></div>
          <div class="meta-item"><span class="meta-label">Agreement No:</span> <span>${bill.agreementNo || 'EE/WRD/SUREWADA/2025/08'}</span></div>
          <div class="meta-item"><span class="meta-label">Certified By:</span> <span>${bill.executiveEngineer || 'Executive Engineer'}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">Item</th>
              <th>Description</th>
              <th class="text-center" style="width: 50px;">Unit</th>
              <th class="text-right" style="width: 70px;">Rate (₹)</th>
              <th class="text-right" style="width: 70px;">Prev Qty</th>
              <th class="text-right" style="width: 70px;">Curr Qty</th>
              <th class="text-right" style="width: 70px;">Upto Date</th>
              <th class="text-right" style="width: 90px;">Current Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${(bill.entries || []).map((e: any) => `
              <tr>
                <td class="text-center">${e.row || '-'}</td>
                <td>${e.description || '-'}</td>
                <td class="text-center">${e.unit || '-'}</td>
                <td class="text-right">${Number(e.rate || 0).toLocaleString('en-IN')}</td>
                <td class="text-right">${Number(e.previousQty || 0).toLocaleString('en-IN')}</td>
                <td class="text-right" style="font-weight: bold;">${Number(e.currentQty || 0).toLocaleString('en-IN')}</td>
                <td class="text-right">${Number(e.cumulativeQty || 0).toLocaleString('en-IN')}</td>
                <td class="text-right">${Number(e.currentAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="summary-table">
          <tr>
            <td><strong>Gross Work Done:</strong></td>
            <td class="text-right"><strong>₹ ${Number(bill.grossAmount || bill.billAmount || 0).toLocaleString('en-IN')}</strong></td>
          </tr>
          ${bill.deductions?.securityDeposit ? `
          <tr>
            <td>Security Deposit (5%):</td>
            <td class="text-right">- ₹ ${Number(bill.deductions.securityDeposit).toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${bill.deductions?.tdsAmount ? `
          <tr>
            <td>IT TDS (2%):</td>
            <td class="text-right">- ₹ ${Number(bill.deductions.tdsAmount).toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${bill.deductions?.gstTdsAmount ? `
          <tr>
            <td>GST TDS (2%):</td>
            <td class="text-right">- ₹ ${Number(bill.deductions.gstTdsAmount).toLocaleString('en-IN')}</td>
          </tr>` : ''}
          ${bill.deductions?.labourCess ? `
          <tr>
            <td>Labour Cess (1%):</td>
            <td class="text-right">- ₹ ${Number(bill.deductions.labourCess).toLocaleString('en-IN')}</td>
          </tr>` : ''}
          <tr style="background: #eef2ff;">
            <td><strong>Net Amount Payable:</strong></td>
            <td class="text-right"><strong style="font-size: 14px;">₹ ${Number(bill.billAmount || 0).toLocaleString('en-IN')}</strong></td>
          </tr>
        </table>

        <div class="signatures">
          <div class="sig-box">Sub-Divisional Officer (SDO)</div>
          <div class="sig-box">Agency / Contractor Representative</div>
          <div class="sig-box">Executive Engineer (EE)</div>
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

  if (bills.length === 0) {
    return (
      <div className="bg-white p-12 text-center rounded-xl border border-gray-200">
        <FileText className="mx-auto text-gray-300 mb-3" size={48} />
        <h3 className="text-sm font-bold text-gray-700 uppercase">No Certified Department RA Bills Yet</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Switch to the <strong>Generate RA Bill</strong> tab to create and certify your first Running Account bill with statutory recoveries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bills.map(bill => {
        const isExpanded = expandedId === bill.id;
        const gross = bill.grossAmount || bill.billAmount || 0;
        const net = bill.billAmount || 0;
        const deductions = bill.deductions?.totalDeductions || (gross - net);

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
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800">
                      Certified
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {bill.billDate || '-'}</span>
                    <span>Ref: {bill.rmNo}</span>
                    <span>Agr: {bill.agreementNo || 'EE/WRD/2025'}</span>
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
                  <div className="text-[10px] text-rose-400 font-bold uppercase">Deductions</div>
                  <div className="text-xs font-bold text-rose-600 font-mono">- {formatCurrency(deductions)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-500 font-bold uppercase">Net Certified</div>
                  <div className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(net)}</div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => handlePrint(bill)}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Print RA Bill"
                  >
                    <Printer size={15} /> Print
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
                        <th className="py-2 px-2 text-right w-24">Rate (₹)</th>
                        <th className="py-2 px-2 text-right w-24">Prev Qty</th>
                        <th className="py-2 px-2 text-right w-24 text-indigo-700 font-bold">Current Qty</th>
                        <th className="py-2 px-2 text-right w-24">Upto Date</th>
                        <th className="py-2 px-3 text-right w-32 font-bold">Current Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                      {(bill.entries || []).map((e: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-1.5 px-2 text-center text-gray-400">{e.row || idx + 1}</td>
                          <td className="py-1.5 px-3 font-sans font-medium text-gray-900">{e.description}</td>
                          <td className="py-1.5 px-2 text-center text-gray-600 font-sans">{e.unit}</td>
                          <td className="py-1.5 px-2 text-right text-gray-700">{Number(e.rate || 0).toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-2 text-right text-gray-500">{Number(e.previousQty || 0).toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-2 text-right text-indigo-900 font-bold bg-indigo-50/20">{Number(e.currentQty || 0).toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-2 text-right font-semibold text-gray-900">{Number(e.cumulativeQty || 0).toLocaleString('en-IN')}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-gray-950">{formatCurrency(e.currentAmount)}</td>
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
