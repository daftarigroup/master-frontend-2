// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Tag, User, Layers, Receipt } from 'lucide-react';
import { getRMBills, updateRMBill, getExecutions, getActuals } from '@/systems/pms/utils/storageManager';
import { buildChainageDiffMap } from '@/systems/pms/utils/helpers';
import { MEASURE_COLUMNS, displayVal, formatDate, billHomePath } from '@/systems/pms/utils/rmUtils';

// Full page for one RM bill's line items - reached by clicking a row in RM1 (Department
// Billing, Execution-type bills) or RM2 (Sub Contractor Billings, Actual-type bills).
// Rows can be checked for editing via the checkbox in the Edit column, and saved via the top
// "Save Changes" button. Displays Exe (or Act) as the single main value.
export default function RMBillDetail() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [entries, setEntries] = useState([]);
  const [selectedEditIds, setSelectedEditIds] = useState([]);

  const load = () => {
    const found = getRMBills().find(b => b.id === decodeURIComponent(billId || ''));
    setBill(found || null);
    if (found) {
      setEntries(found.entries.map(e => ({ ...e, billed: { ...(e.billed || e.original) } })));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billId]);

  const editable = bill?.status === 'pending';

  const toggleRow = (sourceId) => {
    setSelectedEditIds(prev =>
      prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]
    );
  };

  const isAllSelected = entries.length > 0 && selectedEditIds.length === entries.length;
  const isIndeterminate = selectedEditIds.length > 0 && selectedEditIds.length < entries.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEditIds([]);
    } else {
      setSelectedEditIds(entries.map(e => e.sourceId));
    }
  };

  const handleFieldChange = (sourceId, field, value) => {
    setEntries(prev => prev.map(e => {
      if (e.sourceId !== sourceId) return e;
      return {
        ...e,
        billed: {
          ...e.billed,
          [field]: value
        }
      };
    }));
  };

  const handleSaveAll = () => {
    if (!bill) return;
    const updated = updateRMBill(bill.id, { entries });
    if (updated) {
      setBill(updated);
    }
    setSelectedEditIds([]);
    toast.success('Changes saved successfully');
  };

  const backTo = bill ? billHomePath(bill) : '/pms/billing/department';

  // Same "chainage diff from the previous serial no" calculation Execution Details/Actual
  // Details show - computed here from this bill's own project's full source list (Execution or
  // Actual, matching Bill Type), sorted by Serial No, so the diff is correct even though the
  // bill only carries a subset of that project's entries.
  const uniquePipeDias = Array.from(new Set(entries.map(e => e.billed?.pipeDia)))
    .filter(v => v !== undefined && v !== null && v !== '')
    .sort((a, b) => Number(a) - Number(b));

  let chainageDiffMap = new Map();
  let source = [];
  if (bill) {
    source = bill.billType === 'Execution' ? getExecutions() : getActuals();
    const sameProject = source.filter(s => s.projectNo === bill.projectNo).sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));
    chainageDiffMap = bill.billType === 'Execution'
      ? buildChainageDiffMap(sameProject, s => s.execution?.chainage, s => s.id)
      : buildChainageDiffMap(sameProject, s => s.actual?.chainage, s => s.id);
  }

  const pipeDiaTotals = uniquePipeDias.map(dia =>
    entries.reduce((sum, entry) => {
      if (String(entry.billed?.pipeDia) !== String(dia)) return sum;
      const diff = chainageDiffMap.get(entry.sourceId);
      return diff !== undefined ? sum + diff : sum;
    }, 0)
  );

  if (!bill) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">
          RM bill not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Back */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full px-2 sm:px-0">
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold w-fit flex-shrink-0"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-lg md:text-xl font-black text-gray-800 flex items-center gap-2">
          <Receipt size={18} className="text-indigo-500" /> {bill.rmNo} - {bill.billType} Line Items
        </h1>

        {editable && (
          <div className="flex items-center gap-2 lg:ml-auto">
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-semibold px-4 py-1.5 rounded-lg h-[32px] md:h-[38px] flex-shrink-0"
            >
              Save Changes
            </button>
            <button
              onClick={() => navigate(bill.billType === 'Actual' ? `/pms/billing/subcontractor/bill/${encodeURIComponent(bill.id)}` : `/pms/billing/department/bill/${encodeURIComponent(bill.id)}`)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold px-4 py-1.5 rounded-lg h-[32px] md:h-[38px] flex-shrink-0"
            >
              <Receipt size={14} /> Calculate & Generate Bill
            </button>
          </div>
        )}
      </div>

      {/* Bill Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex items-start gap-2 min-w-0">
            <Building2 size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project Name</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{bill.projectName}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Tag size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project No</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{bill.projectNo}</p>
            </div>
          </div>
          {bill.minorName && (
            <div className="flex items-start gap-2 min-w-0">
              <Tag size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Minor Name</p>
                <p className="text-base md:text-lg text-indigo-600 font-bold truncate">{bill.minorName}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 min-w-0">
            <User size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Subcontractor</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{bill.contractorName || '-'}</p>
            </div>
          </div>
          {bill.billType === 'Execution' && (
            <div className="flex items-start gap-2 min-w-0">
              <Layers size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Status</p>
                <p className={`text-base md:text-lg font-bold truncate ${editable ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {editable ? 'Pending' : 'Billed'}
                </p>
              </div>
            </div>
          )}
          {!editable && (
            <div className="flex items-start gap-2 min-w-0">
              <Receipt size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Bill No / Amount / Date</p>
                <p className="text-base md:text-lg text-gray-900 font-bold truncate">
                  {bill.billNo || '-'} / {displayVal(bill.billAmount)} / {formatDate(bill.billDate)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto mx-2 sm:mx-0">
        <table className="w-full border-collapse text-[11px] min-w-[1000px]" style={entries.length > 0 ? { height: '100%' } : undefined}>
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {editable && (
                <th className="px-4 py-3 text-center font-semibold text-gray-900 uppercase tracking-wider whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={el => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      title={isAllSelected ? "Deselect all" : "Select all to edit"}
                    />
                    <span>Edit</span>
                  </div>
                </th>
              )}
              <th className="px-4 py-3 text-center font-semibold text-gray-900 uppercase tracking-wider whitespace-nowrap">Serial No</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 uppercase tracking-wider whitespace-nowrap">Alignment</th>
              {MEASURE_COLUMNS.map(col => (
                <th key={col.key} className="px-4 py-3 text-center font-semibold text-gray-900 uppercase tracking-wider whitespace-nowrap">{col.label}</th>
              ))}
              <th className="px-4 py-3 text-center font-semibold text-gray-900 uppercase tracking-wider whitespace-nowrap">Back Filling Value</th>
              {uniquePipeDias.map(dia => (
                <th key={dia} className="px-4 py-3 text-center font-semibold text-gray-900 uppercase tracking-wider whitespace-nowrap">{dia}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {entries.map(entry => {
              const isEditingRow = selectedEditIds.includes(entry.sourceId);
              const isExecutionBill = bill?.billType === 'Execution';
              const sourceLabel = isExecutionBill ? 'Exe:' : 'Act:';
              const liveRecord = source.find(s => s.id === entry.sourceId);
              const bfVal = liveRecord?.backFillingValue ?? entry.backFillingValue ?? (liveRecord?.backFilling !== false ? 'True' : '-');

              return (
                <tr key={entry.sourceId} className="hover:bg-gray-50/70 transition-colors">
                  {editable && (
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isEditingRow}
                        onChange={() => toggleRow(entry.sourceId)}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-center text-xs text-indigo-600 font-bold whitespace-nowrap">{entry.serialNo}</td>
                  <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{entry.alignment}</td>
                  {MEASURE_COLUMNS.map(col => {
                    const sourceVal = isExecutionBill
                      ? (liveRecord?.execution?.[col.key] ?? entry.execution?.[col.key] ?? entry.original?.[col.key])
                      : (liveRecord?.actual?.[col.key] ?? entry.actual?.[col.key] ?? entry.original?.[col.key]);
                    const currentVal = entry.billed?.[col.key] ?? sourceVal;

                    return (
                      <td key={col.key} className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap">
                        {isEditingRow ? (
                          <input
                            type="text"
                            value={entry.billed?.[col.key] ?? ''}
                            onChange={(e) => handleFieldChange(entry.sourceId, col.key, e.target.value)}
                            className="w-20 border border-indigo-300 rounded px-1.5 py-1 text-center text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <span className="font-semibold text-gray-800 text-[11px]">
                            {sourceLabel} {displayVal(currentVal)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap font-semibold text-indigo-700">
                    {bfVal || '-'}
                  </td>
                  {uniquePipeDias.map(dia => {
                    const isMatch = String(entry.billed?.pipeDia) === String(dia);
                    const diff = isMatch ? chainageDiffMap.get(entry.sourceId) : undefined;
                    return (
                      <td key={dia} className={`px-4 py-2.5 text-center text-[11px] whitespace-nowrap ${diff !== undefined ? 'text-gray-700 font-semibold' : 'text-gray-300'}`}>
                        {diff !== undefined ? diff.toFixed(3) : '-'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {entries.length > 0 && (
            <tbody aria-hidden="true" style={{ height: '100%' }}>
              <tr style={{ height: '100%' }}>
                <td colSpan={(editable ? 1 : 0) + 2 + MEASURE_COLUMNS.length + uniquePipeDias.length} style={{ padding: 0, border: 'none' }} />
              </tr>
            </tbody>
          )}
          {entries.length > 0 && (
            <tfoot className="sticky bottom-0 z-10">
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                {editable && <td className="px-4 py-2.5 text-center font-bold text-gray-900 whitespace-nowrap">-</td>}
                <td className="px-4 py-2.5 text-center font-bold text-gray-900 whitespace-nowrap">Total</td>
                <td className="px-4 py-2.5 text-center font-bold text-gray-900 whitespace-nowrap">-</td>
                {MEASURE_COLUMNS.map(col => (
                  <td key={col.key} className="px-4 py-2.5 text-center font-bold text-gray-900 whitespace-nowrap">-</td>
                ))}
                {pipeDiaTotals.map((total, idx) => (
                  <td key={uniquePipeDias[idx]} className="px-4 py-2.5 text-center font-bold text-gray-900 whitespace-nowrap">{total.toFixed(3)}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

    </div>
  );
}
