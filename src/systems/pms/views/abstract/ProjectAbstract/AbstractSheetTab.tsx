// @ts-nocheck
import React from 'react';
import {
  CalculatedAbstract,
  AbstractInputs
} from '@/systems/pms/utils/abstractTypes';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  Info
} from 'lucide-react';
import { exportAbstractToExcel, exportAbstractToPDF } from '@/systems/pms/utils/abstractEngine';

interface Props {
  abstract: CalculatedAbstract;
  inputs: AbstractInputs;
  projectName: string;
  onRefreshCAD?: () => void;
}

export default function AbstractSheetTab({
  abstract,
  inputs,
  projectName,
  onRefreshCAD
}: Props) {

  const formatNumber = (num: number | undefined | null, decimals = 1): string => {
    if (num === undefined || num === null || isNaN(num) || num === 0) return '-';
    return Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatCurrency = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num) || num === 0) return '-';
    return '₹ ' + Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  };

  const pipeDias = abstract.pipe_dias;

  return (
    <div className="space-y-4">
      {/* Clean Compact Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
            <FileSpreadsheet size={16} className="text-indigo-600" />
            Project Abstract — Execution & Billing Summary
          </span>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Live Calculated
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportAbstractToExcel(abstract, projectName)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <Download size={13} /> Export Excel (.xlsx)
          </button>
          <button
            onClick={() => exportAbstractToPDF(abstract, projectName)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* Main Abstract Table matching Layout Section 3 */}
      <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-xs bg-white">
        <table className="min-w-full text-xs text-left border-collapse font-sans">
          {/* Header Row: Description | Diameters | Total */}
          <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] font-black border-b border-slate-300 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 border-r border-slate-300 min-w-[200px] bg-slate-100">
                Description
              </th>
              {pipeDias.map(dia => (
                <th
                  key={dia}
                  className={`px-2.5 py-2.5 border-r border-slate-300 text-right min-w-[68px] font-mono ${
                    dia === 900 ? 'bg-amber-50 text-amber-900 font-extrabold' : ''
                  }`}
                >
                  {dia} mm
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-black min-w-[90px] bg-slate-200 text-slate-900 border-l border-slate-300">
                TOTAL (m)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {/* ============================================================ */}
            {/* SECTION A: PDN (Pipe Distribution Network)                  */}
            {/* ============================================================ */}
            <tr className="bg-indigo-50/70 border-t-2 border-indigo-200">
              <td
                colSpan={pipeDias.length + 2}
                className="px-3 py-2 font-black text-indigo-900 uppercase tracking-wide text-[11px]"
              >
                A. {inputs.labels_config?.pdn || 'PDN (Pipe Distribution Network)'}
              </td>
            </tr>

            {abstract.minors.map(m => {
              const summary = abstract.minor_summaries[m.id];
              return (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-200">
                    <span className="truncate">{m.name}</span>
                  </td>
                  {pipeDias.map(dia => {
                    const diaRes = summary?.dias[dia];
                    const val = diaRes?.executed_final;
                    return (
                      <td
                        key={dia}
                        className={`px-2 py-1.5 text-right font-mono text-slate-700 border-r border-slate-200 ${
                          val && val > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {formatNumber(val)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-indigo-900 bg-indigo-50/30 border-l border-slate-200">
                    {formatNumber(summary?.total_executed_final)}
                  </td>
                </tr>
              );
            })}

            {/* TOTAL PDN ROW */}
            <tr className="bg-indigo-100/80 font-black border-y-2 border-indigo-300 text-indigo-950">
              <td className="px-3 py-2 font-black uppercase border-r border-indigo-200">
                TOTAL PDN
              </td>
              {pipeDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-2 text-right font-mono font-bold border-r border-indigo-200 text-indigo-950"
                >
                  {formatNumber(abstract.total_pdn_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono font-black text-indigo-950 bg-indigo-200 border-l border-indigo-300">
                {formatNumber(abstract.total_pdn_grand)}
              </td>
            </tr>

            {/* ============================================================ */}
            {/* SECTION B: RECORDED UPTO RA2 & TO RECORD IN RA3              */}
            {/* ============================================================ */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-1.5 font-bold text-slate-800 border-r border-slate-200">
                B. RECORDED UPTO {inputs.labels_config?.ra2 || 'RA2'}
              </td>
              {pipeDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-1.5 text-right font-mono text-slate-700 border-r border-slate-200"
                >
                  {formatNumber(abstract.recorded_upto_ra2_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                {formatNumber(abstract.recorded_upto_ra2_grand)}
              </td>
            </tr>

            <tr className="bg-purple-50 font-bold border-b border-purple-200 text-purple-950">
              <td className="px-3 py-2 font-black uppercase border-r border-purple-200">
                TO RECORD IN {inputs.labels_config?.ra3 || 'RA3'} (TOTAL PDN - RA2)
              </td>
              {pipeDias.map(dia => {
                const v = abstract.to_record_in_ra3_per_dia[dia];
                return (
                  <td
                    key={dia}
                    className={`px-2 py-2 text-right font-mono font-bold border-r border-purple-200 ${
                      v < 0 ? 'text-rose-600' : 'text-purple-950'
                    }`}
                  >
                    {formatNumber(v)}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-mono font-black text-purple-950 bg-purple-100 border-l border-purple-200">
                {formatNumber(abstract.to_record_in_ra3_grand)}
              </td>
            </tr>

            {/* ============================================================ */}
            {/* SECTION C: CADWM Section                                     */}
            {/* ============================================================ */}
            <tr className="bg-cyan-50/70 border-t-2 border-cyan-200">
              <td
                colSpan={pipeDias.length + 2}
                className="px-3 py-2 font-black text-cyan-900 uppercase tracking-wide text-[11px]"
              >
                C. {inputs.labels_config?.cadwm || 'CADWM (Command Area Development & Water Management)'}
              </td>
            </tr>

            {abstract.minors.map(m => {
              const mCad = abstract.cad_per_minor_per_dia[m.id] || {};
              const mCadTotal = abstract.cad_minor_totals[m.id] || 0;
              return (
                <tr key={`cad_${m.id}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-200">
                    CAD - {m.name}
                  </td>
                  {pipeDias.map(dia => {
                    const v = mCad[dia];
                    return (
                      <td
                        key={dia}
                        className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${
                          v > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {formatNumber(v)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right font-mono font-bold text-cyan-950 bg-cyan-50/30 border-l border-slate-200">
                    {formatNumber(mCadTotal)}
                  </td>
                </tr>
              );
            })}

            {/* TOTAL CAD ROW */}
            <tr className="bg-cyan-100/80 font-black border-y-2 border-cyan-300 text-cyan-950">
              <td className="px-3 py-2 font-black uppercase border-r border-cyan-200">
                TOTAL CAD
              </td>
              {pipeDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-2 text-right font-mono font-bold border-r border-cyan-200 text-cyan-950"
                >
                  {formatNumber(abstract.total_cad_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono font-black text-cyan-950 bg-cyan-200 border-l border-cyan-300">
                {formatNumber(abstract.total_cad_grand)}
              </td>
            </tr>

            {/* Optional CAD Previous Recorded Row */}
            {abstract.cad_previous_recorded_grand > 0 && (
              <tr className="hover:bg-slate-50 transition-colors text-slate-600 text-[11px]">
                <td className="px-3 py-1.5 font-medium border-r border-slate-200 italic">
                  {inputs.cad_previous_recorded_label || 'CAD Previous Recorded (Reference)'}
                </td>
                {pipeDias.map(dia => (
                  <td
                    key={dia}
                    className="px-2 py-1.5 text-right font-mono border-r border-slate-200"
                  >
                    {formatNumber(abstract.cad_previous_recorded_per_dia[dia])}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right font-mono font-bold bg-slate-50 border-l border-slate-200">
                  {formatNumber(abstract.cad_previous_recorded_grand)}
                </td>
              </tr>
            )}

            {/* ============================================================ */}
            {/* SECTION D: TOTAL UPTO DATE WORK DONE = TOTAL CAD + TOTAL PDN */}
            {/* (Fixed bug from original sheet: grand total is sum of dias)  */}
            {/* ============================================================ */}
            <tr className="bg-emerald-100 font-black border-y-2 border-emerald-400 text-emerald-950 text-[11px]">
              <td className="px-3 py-2.5 font-black uppercase border-r border-emerald-300">
                D. TOTAL UPTO DATE WORK DONE (TOTAL CAD + TOTAL PDN)
              </td>
              {pipeDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-2.5 text-right font-mono font-black border-r border-emerald-300 text-emerald-950"
                >
                  {formatNumber(abstract.total_upto_date_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right font-mono font-black text-white bg-emerald-700 border-l border-emerald-400 text-xs">
                {formatNumber(abstract.total_upto_date_grand)}
              </td>
            </tr>

            {/* ============================================================ */}
            {/* SECTION E: Billing Comparison & Amounts                     */}
            {/* ============================================================ */}
            <tr className="bg-amber-50/70 border-t-2 border-amber-200">
              <td
                colSpan={pipeDias.length + 2}
                className="px-3 py-2 font-black text-amber-900 uppercase tracking-wide text-[11px]"
              >
                E. BILLING COMPARISON & RATES
              </td>
            </tr>

            {/* RA1 QTY */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-1.5 font-bold text-slate-800 border-r border-slate-200">
                {inputs.labels_config?.ra1 || 'RA1'} QTY
              </td>
              {pipeDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-1.5 text-right font-mono text-slate-700 border-r border-slate-200"
                >
                  {formatNumber(abstract.ra1_qty_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                {formatNumber(abstract.ra1_qty_grand)}
              </td>
            </tr>

            {/* DIFFERENCE = TOTAL UPTO DATE - RA1 QTY */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-1.5 font-bold text-slate-800 border-r border-slate-200">
                DIFFERENCE (TOTAL UPTO DATE - RA1)
              </td>
              {pipeDias.map(dia => {
                const diff = abstract.difference_per_dia[dia];
                return (
                  <td
                    key={dia}
                    className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${
                      diff < 0 ? 'text-rose-600 font-bold' : 'text-slate-800 font-semibold'
                    }`}
                  >
                    {formatNumber(diff)}
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                {formatNumber(abstract.difference_grand)}
              </td>
            </tr>

            {/* RATE (rupees / m) */}
            <tr className="bg-slate-50 font-semibold text-slate-900">
              <td className="px-3 py-1.5 font-bold border-r border-slate-200">
                RATE (₹ per metre)
              </td>
              {pipeDias.map(dia => {
                const rate = abstract.rate_per_dia[dia];
                const hasQty = abstract.total_upto_date_per_dia[dia] > 0;
                const isMissing = hasQty && (!rate || rate <= 0);
                return (
                  <td
                    key={dia}
                    className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${
                      isMissing
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : rate > 0
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    }`}
                    title={isMissing ? 'Rate is missing for this dia with quantity!' : ''}
                  >
                    {rate > 0 ? `₹ ${rate}` : isMissing ? '⚠️ Missing' : '-'}
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-center text-slate-400 font-mono bg-slate-100 border-l border-slate-200">
                -
              </td>
            </tr>

            {/* AMOUNT AS PER RA1 */}
            <tr className="hover:bg-slate-50 transition-colors font-medium">
              <td className="px-3 py-1.5 font-bold text-slate-800 border-r border-slate-200">
                AMOUNT AS PER {inputs.labels_config?.ra1 || 'RA1'} (₹)
              </td>
              {pipeDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-1.5 text-right font-mono text-slate-700 border-r border-slate-200"
                >
                  {formatNumber(abstract.amount_as_per_ra1_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono font-bold text-indigo-950 bg-indigo-50 border-l border-slate-200">
                {formatCurrency(abstract.amount_as_per_ra1_grand)}
              </td>
            </tr>

            {/* AMOUNT UPTO DATE */}
            <tr className="bg-amber-100/90 font-black border-t-2 border-amber-300 text-amber-950">
              <td className="px-3 py-2.5 font-black uppercase border-r border-amber-200">
                AMOUNT UPTO DATE (₹)
              </td>
              {pipeDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-2.5 text-right font-mono font-bold border-r border-amber-200 text-amber-950"
                >
                  {formatNumber(abstract.amount_upto_date_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right font-mono font-black text-amber-950 bg-amber-200 border-l border-amber-300 text-xs">
                {formatCurrency(abstract.amount_upto_date_grand)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Notes & CADWM Refresh info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-slate-400" />
          <span>
            CADWM Data status: <span className="font-semibold text-slate-700">Stored local dataset</span>
            {inputs.cad_last_refreshed && (
              <span className="text-slate-400 ml-1">
                (Last refreshed: {new Date(inputs.cad_last_refreshed).toLocaleString()})
              </span>
            )}
          </span>
        </div>
        {onRefreshCAD && (
          <button
            onClick={onRefreshCAD}
            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            <RefreshCw size={12} /> Refresh CADWM Data
          </button>
        )}
      </div>
    </div>
  );
}
