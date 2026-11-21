// @ts-nocheck
// Final Comparative Report - built from the project's real minors: Execution entries (PDN executed),
// Actual entries (as per measurement) and Execution bills already sent for payment (recorded).
import React, { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileBarChart2, RefreshCw } from 'lucide-react';
import { getMinors, getExecutions, getActuals, getRMBills } from '@/systems/pms/utils/storageManager';
import { buildChainageDiffMap } from '@/systems/pms/utils/helpers';

interface Props {
  projectNo?: string;
  projectName?: string;
}

const r1 = (n: number) => Math.round((n || 0) * 10) / 10;
const fmt = (n: number) => (n ? n.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '-');
const fmtSigned = (n: number) => (n ? `${n > 0 ? '+' : ''}${fmt(n)}` : '-');

// Length of every entry = its chainage minus the previous entry's chainage (same minor, by serial no)
function lengthsByDia(entries: any[], dataKey: 'execution' | 'actual') {
  const sorted = [...entries].sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));
  const diff = buildChainageDiffMap(sorted, (s) => s[dataKey]?.chainage, (s) => s.id);
  const perDia: Record<number, number> = {};
  const perEntry = new Map<string, { dia: number; len: number }>();
  sorted.forEach((e) => {
    const dia = Number(e[dataKey]?.pipeDia);
    const len = diff.get(e.id) || 0;
    if (len > 0 && dia > 0) {
      perDia[dia] = (perDia[dia] || 0) + len;
      perEntry.set(e.id, { dia, len });
    }
  });
  return { perDia, perEntry };
}

export default function FinalComparativeView({ projectNo = '', projectName = 'Project' }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onFocus = () => setTick((t) => t + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const data = useMemo(() => {
    const minors = getMinors().filter((m) => m.projectNo === projectNo);
    const execAll = getExecutions();
    const actAll = getActuals();
    const bills = getRMBills().filter((b) => b.billType === 'Execution');

    const byMinor: Record<string, Record<number, number>> = {};
    const entryInfo = new Map<string, { dia: number; len: number }>();
    const measured: Record<number, number> = {};
    const dias = new Set<number>();

    minors.forEach((m) => {
      const ex = lengthsByDia(execAll.filter((e) => e.projectNo === m.id), 'execution');
      byMinor[m.id] = ex.perDia;
      ex.perEntry.forEach((v, k) => entryInfo.set(k, v));
      Object.keys(ex.perDia).forEach((d) => dias.add(Number(d)));
      const ac = lengthsByDia(actAll.filter((e) => e.projectNo === m.id), 'actual');
      Object.entries(ac.perDia).forEach(([d, v]) => {
        measured[Number(d)] = (measured[Number(d)] || 0) + (v as number);
        dias.add(Number(d));
      });
    });

    // Recorded = execution entries already sent for payment in a bill
    const recorded: Record<number, number> = {};
    bills.forEach((b) => (b.entries || []).forEach((e: any) => {
      const info = entryInfo.get(e.sourceId);
      if (info) recorded[info.dia] = (recorded[info.dia] || 0) + info.len;
    }));

    const diaList = Array.from(dias).sort((a, b) => a - b);
    const sum = (rec: Record<number, number>) => diaList.reduce((s, d) => s + (rec[d] || 0), 0);
    const total: Record<number, number> = {};
    diaList.forEach((d) => { total[d] = minors.reduce((s, m) => s + (byMinor[m.id][d] || 0), 0); });
    const toRecord: Record<number, number> = {};
    const vsMeasured: Record<number, number> = {};
    diaList.forEach((d) => {
      toRecord[d] = total[d] - (recorded[d] || 0);
      vsMeasured[d] = total[d] - (measured[d] || 0);
    });
    return { minors, byMinor, diaList, total, recorded, toRecord, measured, vsMeasured, sum };
  }, [projectNo, tick]);

  const { minors, byMinor, diaList, total, recorded, toRecord, measured, vsMeasured, sum } = data;

  const rows = [
    ...minors.map((m) => ({ label: `${m.minorName || m.name || m.id} executed`, vals: byMinor[m.id], kind: 'minor' })),
    { label: 'TOTAL PDN', vals: total, kind: 'total' },
    { label: 'RECORDED UPTO LAST BILL', vals: recorded, kind: 'recorded' },
    { label: 'TO RECORD IN NEXT BILL', vals: toRecord, kind: 'diff' },
    { label: 'AS PER MEASUREMENT (ACTUAL)', vals: measured, kind: 'measured' },
    { label: 'PDN VS MEASUREMENT', vals: vsMeasured, kind: 'diff' },
  ];

  const exportExcel = () => {
    const aoa = [
      [`FINAL COMPARATIVE REPORT - ${projectName}`],
      ['Description', ...diaList.map((d) => `${d} MM`), 'Total'],
      ...rows.map((r) => [r.label, ...diaList.map((d) => r1(r.vals[d] || 0)), r1(sum(r.vals))]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Final Comparative');
    XLSX.writeFile(wb, `Final_Comparative_${projectName.replace(/\W+/g, '_')}.xlsx`);
  };

  const rowClass = (kind: string) =>
    kind === 'total' ? 'bg-indigo-50 font-bold text-indigo-950'
      : kind === 'recorded' ? 'text-purple-800'
      : kind === 'measured' ? 'font-semibold text-slate-800'
      : kind === 'diff' ? 'bg-slate-50 font-semibold' : '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileBarChart2 className="text-indigo-600" size={22} />
          <div>
            <h2 className="text-base font-bold text-gray-900 uppercase">Final Comparative Report</h2>
            <p className="text-[11px] text-gray-500">
              Built from {minors.length} minor{minors.length === 1 ? '' : 's'} - Execution and Actual entries (length = chainage difference, grouped by pipe dia)
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTick((t) => t + 1)} className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg flex items-center gap-1.5 hover:bg-gray-50">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={exportExcel} disabled={!diaList.length} className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg flex items-center gap-1.5 hover:bg-emerald-700 disabled:opacity-50">
            <Download size={13} /> Export Excel
          </button>
        </div>
      </div>

      {!minors.length || !diaList.length ? (
        <div className="p-10 text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg">
          {!minors.length
            ? 'No minors found for this project.'
            : 'No Execution or Actual entries with chainage and pipe dia yet. Entries added in Execution / Actual will show up here.'}
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-[11px] border-collapse">
            <thead className="bg-slate-800 text-white uppercase">
              <tr>
                <th className="text-left px-3 py-2 sticky left-0 bg-slate-800">Description</th>
                {diaList.map((d) => <th key={d} className="px-3 py-2 text-right whitespace-nowrap">{d} MM</th>)}
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {rows.map((r, i) => (
                <tr key={i} className={rowClass(r.kind)}>
                  <td className="px-3 py-2 font-sans whitespace-nowrap sticky left-0 bg-inherit">{r.label}</td>
                  {diaList.map((d) => (
                    <td key={d} className="px-3 py-2 text-right">
                      {r.kind === 'diff' ? fmtSigned(r1(r.vals[d] || 0)) : fmt(r1(r.vals[d] || 0))}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-bold">
                    {r.kind === 'diff' ? fmtSigned(r1(sum(r.vals))) : fmt(r1(sum(r.vals)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
