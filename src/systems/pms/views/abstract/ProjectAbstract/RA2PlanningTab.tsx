// @ts-nocheck
import React, { useState } from 'react';
import {
  Minor,
  CalculatedAbstract,
  STANDARD_PIPE_DIAS
} from '@/systems/pms/utils/abstractTypes';
import { TrendingUp, CheckCircle, AlertCircle, ArrowUpDown } from 'lucide-react';

interface Props {
  abstract: CalculatedAbstract;
  minors: Minor[];
}

export default function RA2PlanningTab({ abstract, minors }: Props) {
  const [selectedMinorId, setSelectedMinorId] = useState<string>(minors[0]?.id || '');

  const currentMinor = minors.find(m => m.id === selectedMinorId) || minors[0];
  const summary = currentMinor ? abstract.minor_summaries[currentMinor.id] : null;

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Select Minor for Balance Analysis:
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {minors.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMinorId(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  m.id === selectedMinorId
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Overall Balance: <span className="font-bold text-slate-900">
            {summary ? ((summary.total_planned - summary.total_executed_final)).toLocaleString() : 0} m
          </span>
        </div>
      </div>

      {/* RA2 Planning Breakdown Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-xs bg-white">
        <table className="min-w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] font-black border-b border-slate-300">
            <tr>
              <th className="px-3 py-2.5 border-r border-slate-200">Pipe Dia (mm)</th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-right">Planned Scope (m)</th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-right">Executed Final (m)</th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-right">Balance to Execute (m)</th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-center">Progress %</th>
              <th className="px-3 py-2.5 text-center">Execution Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {STANDARD_PIPE_DIAS.map(dia => {
              const diaData = summary?.dias[dia];
              const planned = diaData?.planned || 0;
              const executed = diaData?.executed_final || 0;
              const balance = Math.round((planned - executed) * 100) / 100;
              const pct = diaData?.completion_pct;

              if (planned === 0 && executed === 0) return null;

              return (
                <tr key={dia} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">
                    {dia} mm
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-200">
                    {planned > 0 ? planned.toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-indigo-900 border-r border-slate-200">
                    {executed > 0 ? executed.toLocaleString() : '-'}
                  </td>
                  <td className={`px-3 py-2 text-right font-black border-r border-slate-200 ${
                    balance < 0 ? 'text-rose-600' : balance === 0 ? 'text-emerald-600' : 'text-slate-800'
                  }`}>
                    {balance.toLocaleString()} m
                  </td>
                  <td className="px-3 py-2 text-center border-r border-slate-200">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      pct === null ? 'text-slate-400' : pct >= 100 ? 'bg-emerald-100 text-emerald-800' : pct >= 70 ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {pct !== null ? `${pct}%` : '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {balance < 0 ? (
                      <span className="text-rose-700 font-bold text-[10px] bg-rose-50 px-2 py-0.5 rounded">
                        Excess (+{Math.abs(balance)}m)
                      </span>
                    ) : balance === 0 ? (
                      <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                        Completed
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold text-[10px] bg-amber-50 px-2 py-0.5 rounded">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-mono text-xs font-bold">
            <tr>
              <td className="px-3 py-2 uppercase text-amber-300 border-r border-slate-700">Total</td>
              <td className="px-3 py-2 text-right border-r border-slate-700">{summary?.total_planned.toLocaleString()} m</td>
              <td className="px-3 py-2 text-right border-r border-slate-700 text-amber-300">{summary?.total_executed_final.toLocaleString()} m</td>
              <td className="px-3 py-2 text-right border-r border-slate-700 text-emerald-400">
                {summary ? (summary.total_planned - summary.total_executed_final).toLocaleString() : 0} m
              </td>
              <td className="px-3 py-2 text-center text-emerald-400 border-r border-slate-700">
                {summary?.overall_pct !== null ? `${summary?.overall_pct}%` : '-'}
              </td>
              <td className="px-3 py-2 text-center text-slate-400 text-[10px]">
                {summary && summary.total_executed_final >= summary.total_planned ? 'Target Met' : 'In Progress'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
