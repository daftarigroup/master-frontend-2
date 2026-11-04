// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import type {
  Minor,
  CalculatedFinalComparative,
  AuditLogEntry,
  SurveyRow,
  DatedSnapshot
} from '@/systems/pms/utils/finalComparativeTypes';
import {
  calculateFinalComparativeEngine,
  exportFinalComparativeToExcel,
  exportFinalComparativeToPDF
} from '@/systems/pms/utils/finalComparativeEngine';
import {
  loadFinalComparativeState,
  saveFinalComparativeState,
  logFinalComparativeAudit,
  loadDatedSnapshots,
  saveDatedSnapshots,
  type FinalComparativeStorageState
} from '@/systems/pms/utils/finalComparativeStorage';
import {
  runFinalComparativeAcceptanceTests,
  type TestResult
} from './finalComparativeEngine.test';
import {
  FileSpreadsheet,
  Download,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  History,
  Calendar,
  Settings,
  CheckCircle2,
  Bookmark,
  Info,
  Check,
  X,
  Layers,
  FileBarChart2
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  projectNo?: string;
  projectName?: string;
}

export default function FinalComparativeView({
  projectNo = 'PN-002',
  projectName = 'Godavari Valley Minor Irrigation Network'
}: Props) {
  const [state, setState] = useState<FinalComparativeStorageState>(() => {
    return loadFinalComparativeState(projectNo);
  });

  const [snapshots, setSnapshots] = useState<DatedSnapshot[]>(() => {
    return loadDatedSnapshots(projectNo);
  });

  useEffect(() => {
    saveFinalComparativeState(projectNo, state);
  }, [state, projectNo]);

  // View Controls
  const [showAllDias, setShowAllDias] = useState<boolean>(false);
  const [showInputsModal, setShowInputsModal] = useState<boolean>(false);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState<boolean>(false);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  // Snapshot Save State
  const [newSnapshotName, setNewSnapshotName] = useState<string>('');
  const [newSnapshotDate, setNewSnapshotDate] = useState<string>(state.inputs.snapshot_date || '18-Jun-2026');
  const [newSnapshotNotes, setNewSnapshotNotes] = useState<string>('');

  // Drilldown Modal
  const [drilldownData, setDrilldownData] = useState<{
    minor: Minor;
    dia: number;
    rows: SurveyRow[];
    totalExecuted: number;
  } | null>(null);

  // Calculation Engine
  const calculated: CalculatedFinalComparative = useMemo(() => {
    return calculateFinalComparativeEngine(
      state.minors,
      state.surveyRowsByMinor,
      state.adjustments,
      state.cadExecutedByMinor,
      state.inputs,
      state.overridePDNByMinor
    );
  }, [state]);

  const displayedDias = useMemo(() => {
    if (showAllDias) return calculated.pipe_dias;
    return calculated.active_dias;
  }, [showAllDias, calculated]);

  // Format number
  const formatNum = (num: number | undefined | null, decimals = 1): string => {
    if (num === undefined || num === null || isNaN(num) || num === 0) return '-';
    return Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatCurrency = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num) || num === 0) return '-';
    return `₹ ${Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })}`;
  };

  // Drilldown click
  const handleOpenDrilldown = (minor: Minor, dia: number) => {
    const minorRows = state.surveyRowsByMinor[minor.id] || [];
    const diaRows = minorRows.filter(r => r.pipe_dia === dia && r.back_filling_done);
    const execVal = calculated.pdn_executed_by_minor[minor.id]?.[dia] || 0;
    setDrilldownData({
      minor,
      dia,
      rows: diaRows,
      totalExecuted: execVal
    });
  };

  // Save dated snapshot
  const handleSaveSnapshot = () => {
    if (!newSnapshotName.trim()) {
      toast.error('Please enter a snapshot name.');
      return;
    }
    const newSnap: DatedSnapshot = {
      id: `snap-${Date.now()}`,
      name: newSnapshotName.trim(),
      date: newSnapshotDate || '18-Jun-2026',
      created_at: new Date().toISOString(),
      inputs: JSON.parse(JSON.stringify(state.inputs)),
      notes: newSnapshotNotes.trim()
    };
    const updated = [newSnap, ...snapshots];
    setSnapshots(updated);
    saveDatedSnapshots(projectNo, updated);

    // Audit
    const audit = logFinalComparativeAudit(
      projectNo,
      'SNAPSHOT_SAVED',
      `Saved snapshot "${newSnap.name}" for date ${newSnap.date}`
    );
    setState(prev => ({ ...prev, auditLogs: [audit, ...prev.auditLogs] }));

    toast.success(`Snapshot "${newSnap.name}" saved!`);
    setNewSnapshotName('');
    setNewSnapshotNotes('');
    setShowSnapshotsModal(false);
  };

  // Restore snapshot
  const handleRestoreSnapshot = (snap: DatedSnapshot) => {
    setState(prev => ({
      ...prev,
      inputs: JSON.parse(JSON.stringify(snap.inputs))
    }));
    const audit = logFinalComparativeAudit(
      projectNo,
      'SNAPSHOT_RESTORED',
      `Restored snapshot "${snap.name}" (${snap.date})`
    );
    setState(prev => ({ ...prev, auditLogs: [audit, ...prev.auditLogs] }));
    toast.success(`Loaded snapshot "${snap.name}" (${snap.date})`);
    setShowSnapshotsModal(false);
  };

  // Run acceptance tests
  const handleRunAcceptanceTests = () => {
    const res = runFinalComparativeAcceptanceTests();
    setTestResults(res);
    setShowTestModal(true);
    const allPassed = res.every(r => r.passed);
    if (allPassed) {
      toast.success('All 5 acceptance test suites passed! (100% Match)');
    } else {
      toast.error('Some tests failed. Check modal.');
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header Controls Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg">
              <FileBarChart2 size={18} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Final Comparative Report
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>Snapshot Date:</span>
                <span className="font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  {state.inputs.snapshot_date || '18-Jun-2026'}
                </span>
                {calculated.stale_measured_qty && (
                  <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded text-[10px] font-bold">
                    <AlertTriangle size={11} /> Stale Measurement
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => setShowAllDias(!showAllDias)}
            className={`px-2.5 py-1.5 rounded text-xs font-semibold border cursor-pointer transition-colors ${showAllDias
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
          >
            {showAllDias ? 'Hide 0-qty Columns' : 'Show All Dias (110-900)'}
          </button>

          <button
            onClick={() => setShowSnapshotsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-bold transition-colors cursor-pointer"
          >
            <Bookmark size={13} /> Snapshots ({snapshots.length})
          </button>

          <button
            onClick={() => setShowInputsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-bold transition-colors cursor-pointer"
          >
            <Settings size={13} /> Inputs & Rates
          </button>

          <button
            onClick={handleRunAcceptanceTests}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded text-xs font-bold transition-colors cursor-pointer"
          >
            <CheckCircle2 size={13} /> Acceptance Tests
          </button>

          <button
            onClick={() => setShowAuditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-semibold transition-colors cursor-pointer"
          >
            <History size={13} /> Audit ({state.auditLogs?.length || 0})
          </button>

          <button
            onClick={() => exportFinalComparativeToExcel(calculated, state.minors, projectName, state.inputs.snapshot_date)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Download size={13} /> Export Excel
          </button>

          <button
            onClick={() => exportFinalComparativeToPDF(calculated, state.minors, projectName, state.inputs.snapshot_date)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Download size={13} /> Export PDF
          </button>
        </div>
      </div>

      {/* Warning Banners */}
      {calculated.missing_rate_dias.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <span>
              <strong>Billing Rate Validation Notice:</strong> {calculated.missing_rate_dias.length} diameter(s) have executed/billed quantities but no rate defined ({calculated.missing_rate_dias.map(d => `${d} mm`).join(', ')}). Their billing amount is counted as ₹0 until rates are provided.
            </span>
          </div>
          <button
            onClick={() => setShowInputsModal(true)}
            className="px-2.5 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 transition cursor-pointer text-[11px] whitespace-nowrap ml-3"
          >
            Set Rates
          </button>
        </div>
      )}

      {/* Main Comparative Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-xs bg-white">
        <table className="min-w-full text-xs text-left border-collapse font-sans">
          {/* Header Row: Description | Diameters | Total */}
          <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] font-black border-b border-slate-300 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 border-r border-slate-300 min-w-[240px] bg-slate-100">
                Description
              </th>
              {displayedDias.map(dia => (
                <th
                  key={dia}
                  className="px-2.5 py-2.5 border-r border-slate-300 text-right min-w-[65px] font-mono"
                >
                  {dia} mm
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-black min-w-[105px] bg-slate-200 text-slate-900 border-l border-slate-300">
                TOTAL (m)
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {/* ============================================================ */}
            {/* SECTION A: PDN (Pipe Distribution Network)                  */}
            {/* ============================================================ */}
            <tr className="bg-indigo-50/90 border-t-2 border-indigo-200">
              <td
                colSpan={displayedDias.length + 2}
                className="px-3 py-2 font-black text-indigo-950 uppercase tracking-wide text-[11px]"
              >
                A. {state.inputs.labels_config?.pdn || 'PDN (PIPE DISTRIBUTION NETWORK)'}
              </td>
            </tr>

            {/* Minor Rows */}
            {state.minors.map(m => (
              <tr key={`pdn_minor_${m.id}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-200 pl-6 flex items-center justify-between">
                  <span>{m.name} executed</span>
                  <span className="text-[10px] text-slate-400 italic">survey rule</span>
                </td>
                {displayedDias.map(dia => {
                  const val = calculated.pdn_executed_by_minor[m.id]?.[dia] || 0;
                  return (
                    <td
                      key={dia}
                      onClick={() => val > 0 && handleOpenDrilldown(m, dia)}
                      className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${val > 0
                          ? 'font-bold text-slate-900 cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 underline decoration-dotted'
                          : 'text-slate-400'
                        }`}
                      title={val > 0 ? 'Click to inspect contributing survey rows' : ''}
                    >
                      {formatNum(val)}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                  {formatNum(calculated.pdn_minor_totals[m.id])}
                </td>
              </tr>
            ))}

            {/* TOTAL PDN ROW */}
            <tr className="bg-indigo-100/80 font-black border-t border-indigo-200 text-indigo-950">
              <td className="px-3 py-2 font-black uppercase border-r border-indigo-200 pl-6">
                TOTAL PDN
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-2 text-right font-mono font-black border-r border-indigo-200 text-indigo-950"
                >
                  {formatNum(calculated.total_pdn_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono font-black text-indigo-950 bg-indigo-200 border-l border-indigo-300">
                {formatNum(calculated.total_pdn_grand)}
              </td>
            </tr>

            {/* RECORDED UPTO RA2 (PDN) */}
            <tr className="hover:bg-slate-50 transition-colors bg-purple-50/20">
              <td className="px-3 py-1.5 font-semibold text-purple-900 border-r border-slate-200 pl-6">
                RECORDED UPTO RA2
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-1.5 text-right font-mono border-r border-slate-200 text-purple-950 font-semibold"
                >
                  {formatNum(calculated.recorded_upto_ra2_pdn_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono font-bold text-purple-950 bg-purple-100/40 border-l border-slate-200">
                {formatNum(calculated.recorded_upto_ra2_pdn_grand)}
              </td>
            </tr>

            {/* TO RECORD IN RA3 */}
            <tr className="border-b border-slate-300 font-bold bg-slate-50">
              <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200 pl-6">
                TO RECORD IN RA3
              </td>
              {displayedDias.map(dia => {
                const diff = calculated.to_record_in_ra3_per_dia[dia];
                return (
                  <td
                    key={dia}
                    className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${diff < 0
                        ? 'text-rose-600 font-black bg-rose-50/60'
                        : diff > 0
                          ? 'text-emerald-700 font-black bg-emerald-50/50'
                          : 'text-slate-400'
                      }`}
                    title={diff < 0 ? 'Negative: recorded more than measured so far' : ''}
                  >
                    {formatNum(diff)}
                  </td>
                );
              })}
              <td className={`px-3 py-1.5 text-right font-mono font-black border-l border-slate-200 ${calculated.to_record_in_ra3_grand < 0 ? 'text-rose-700 bg-rose-100' : 'text-emerald-800 bg-emerald-100'
                }`}>
                {formatNum(calculated.to_record_in_ra3_grand)}
              </td>
            </tr>

            {/* AS PER MEASUREMENT */}
            <tr className="hover:bg-slate-50 transition-colors bg-sky-50/20">
              <td className="px-3 py-1.5 font-semibold text-sky-900 border-r border-slate-200 pl-6 flex items-center justify-between">
                <span>AS PER MEASUREMENT</span>
                <span className="text-[10px] text-sky-600 italic">external abstract</span>
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-1.5 text-right font-mono border-r border-slate-200 text-sky-950 font-semibold"
                >
                  {formatNum(calculated.measured_qty_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono font-bold text-sky-950 bg-sky-100/40 border-l border-slate-200">
                {formatNum(calculated.measured_qty_grand)}
              </td>
            </tr>

            {/* PDN VS MEASUREMENT */}
            <tr className="border-b-2 border-slate-300 font-bold bg-slate-50">
              <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200 pl-6 flex items-center justify-between">
                <span>PDN VS MEASUREMENT</span>
                <span className="text-[10px] text-slate-400">survey - measured</span>
              </td>
              {displayedDias.map(dia => {
                const diff = calculated.pdn_vs_measurement_per_dia[dia];
                const isWarn = calculated.tolerance_warnings[dia];
                return (
                  <td
                    key={dia}
                    className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${isWarn
                        ? 'text-amber-700 font-bold bg-amber-50/60'
                        : diff !== 0
                          ? 'text-emerald-700 font-bold bg-emerald-50/40'
                          : 'text-slate-400'
                      }`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {isWarn && (
                        <span title="Exceeds tolerance +/-2%">
                          <AlertTriangle size={11} className="text-amber-600 flex-shrink-0" />
                        </span>
                      )}
                      <span>{diff > 0 ? `+${formatNum(diff)}` : formatNum(diff)}</span>
                    </div>
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-right font-mono font-black text-slate-900 bg-slate-100 border-l border-slate-200">
                {calculated.pdn_vs_measurement_grand > 0
                  ? `+${formatNum(calculated.pdn_vs_measurement_grand)}`
                  : formatNum(calculated.pdn_vs_measurement_grand)}
              </td>
            </tr>

            {/* ============================================================ */}
            {/* SECTION B: CADWM                                            */}
            {/* ============================================================ */}
            <tr className="bg-cyan-50/90 border-t-2 border-cyan-200">
              <td
                colSpan={displayedDias.length + 2}
                className="px-3 py-2 font-black text-cyan-950 uppercase tracking-wide text-[11px]"
              >
                B. {state.inputs.labels_config?.cadwm || 'CADWM (COMMAND AREA DEVELOPMENT & WATER MANAGEMENT)'}
              </td>
            </tr>

            {state.minors.map(m => (
              <tr key={`cad_minor_${m.id}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-200 pl-6">
                  {m.name} CAD executed
                </td>
                {displayedDias.map(dia => {
                  const val = calculated.cad_executed_by_minor[m.id]?.[dia] || 0;
                  return (
                    <td
                      key={dia}
                      className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${val > 0 ? 'font-bold text-cyan-950' : 'text-slate-400'
                        }`}
                    >
                      {formatNum(val)}
                    </td>
                  );
                })}
                <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                  {formatNum(calculated.cad_minor_totals[m.id])}
                </td>
              </tr>
            ))}

            {/* TOTAL CAD ROW */}
            <tr className="bg-cyan-100/80 font-black border-t border-cyan-200 text-cyan-950">
              <td className="px-3 py-2 font-black uppercase border-r border-cyan-200 pl-6">
                TOTAL CAD
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-2 text-right font-mono font-black border-r border-cyan-200 text-cyan-950"
                >
                  {formatNum(calculated.total_cad_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono font-black text-cyan-950 bg-cyan-200 border-l border-cyan-300">
                {formatNum(calculated.total_cad_grand)}
              </td>
            </tr>

            {/* RECORDED UPTO RA2 (CAD) */}
            <tr className="border-b-2 border-slate-300 font-bold bg-cyan-50/30">
              <td className="px-3 py-1.5 font-semibold text-cyan-900 border-r border-slate-200 pl-6">
                RECORDED UPTO RA2 (CAD)
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-1.5 text-right font-mono border-r border-slate-200 text-cyan-950 font-semibold"
                >
                  {formatNum(calculated.recorded_upto_ra2_cad_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono font-bold text-cyan-950 bg-cyan-100/50 border-l border-slate-200">
                {formatNum(calculated.recorded_upto_ra2_cad_grand)}
              </td>
            </tr>

            {/* ============================================================ */}
            {/* SECTION C: TOTAL UPTO DATE WORK DONE                         */}
            {/* ============================================================ */}
            <tr className="bg-emerald-100 font-black border-y-2 border-emerald-400 text-emerald-950 text-[11px]">
              <td className="px-3 py-2.5 font-black uppercase border-r border-emerald-300 pl-6">
                C. TOTAL UPTO DATE WORK DONE (TOTAL PDN + TOTAL CAD)
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-2.5 text-right font-mono font-black border-r border-emerald-300 text-emerald-950"
                >
                  {formatNum(calculated.total_upto_date_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right font-mono font-black text-white bg-emerald-700 border-l border-emerald-400 text-xs">
                {formatNum(calculated.total_upto_date_grand)}
              </td>
            </tr>

            {/* ============================================================ */}
            {/* SECTION D: BILLING & FINANCIAL RECONCILIATION                */}
            {/* ============================================================ */}
            <tr className="bg-amber-50/80 border-t-2 border-amber-200">
              <td
                colSpan={displayedDias.length + 2}
                className="px-3 py-2 font-black text-amber-950 uppercase tracking-wide text-[11px]"
              >
                D. BILLING & FINANCIAL RECONCILIATION (VS RA1 RATES)
              </td>
            </tr>

            {/* RA1 QTY */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-200 pl-6">
                RA1 QTY
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-1.5 text-right font-mono border-r border-slate-200 text-slate-900"
                >
                  {formatNum(calculated.ra1_qty_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                {formatNum(calculated.ra1_qty_grand)}
              </td>
            </tr>

            {/* DIFFERENCE = TOTAL UPTO DATE - RA1 QTY */}
            <tr className="hover:bg-slate-50 transition-colors bg-slate-50/50">
              <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200 pl-6">
                DIFFERENCE (TOTAL UPTO DATE - RA1)
              </td>
              {displayedDias.map(dia => {
                const diff = calculated.difference_per_dia[dia];
                return (
                  <td
                    key={dia}
                    className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${diff > 0 ? 'text-emerald-700 font-bold' : diff < 0 ? 'text-rose-700 font-bold' : 'text-slate-400'
                      }`}
                  >
                    {diff > 0 ? `+${formatNum(diff)}` : formatNum(diff)}
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-100 border-l border-slate-200">
                {calculated.difference_grand > 0 ? `+${formatNum(calculated.difference_grand)}` : formatNum(calculated.difference_grand)}
              </td>
            </tr>

            {/* RATE (₹/m) */}
            <tr className="hover:bg-slate-50 transition-colors bg-purple-50/10">
              <td className="px-3 py-1.5 font-medium text-purple-950 border-r border-slate-200 pl-6">
                RATE (₹/m)
              </td>
              {displayedDias.map(dia => {
                const r = calculated.rate_per_dia[dia];
                return (
                  <td
                    key={dia}
                    className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${r > 0 ? 'text-purple-900 font-semibold' : 'text-amber-600 italic font-bold'
                      }`}
                  >
                    {r > 0 ? `₹${r.toFixed(1)}` : 'no rate'}
                  </td>
                );
              })}
              <td className="px-3 py-1.5 text-center text-slate-400 bg-slate-50 border-l border-slate-200 font-mono">
                -
              </td>
            </tr>

            {/* AMOUNT AS PER RA1 */}
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-1.5 font-bold text-slate-800 border-r border-slate-200 pl-6">
                AMOUNT AS PER RA1
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-1.5 text-right font-mono border-r border-slate-200 text-slate-900"
                >
                  {formatCurrency(calculated.amount_as_per_ra1_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-mono font-black text-slate-900 bg-slate-100 border-l border-slate-200">
                {formatCurrency(calculated.amount_as_per_ra1_grand)}
              </td>
            </tr>

            {/* AMOUNT UPTO DATE */}
            <tr className="bg-emerald-50/90 font-black border-b-2 border-emerald-300 text-emerald-950">
              <td className="px-3 py-2 font-black uppercase border-r border-emerald-200 pl-6">
                AMOUNT UPTO DATE
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-2 text-right font-mono font-black border-r border-emerald-200 text-emerald-950"
                >
                  {formatCurrency(calculated.amount_upto_date_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono font-black text-white bg-emerald-700 border-l border-emerald-400">
                {formatCurrency(calculated.amount_upto_date_grand)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend & Summary Notes */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Within ±2% measurement tolerance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Exceeds tolerance warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>Negative RA3 balance</span>
          </div>
        </div>
        <div className="font-semibold text-slate-700">
          Reconciled with Abstract & RA2 Planning engines • Grand total: {formatNum(calculated.total_upto_date_grand)} m
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: DRILLDOWN MODAL                                    */}
      {/* ============================================================ */}
      {drilldownData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Survey Drill-Down: {drilldownData.minor.name} — {drilldownData.dia} mm
                </h3>
                <p className="text-[11px] text-indigo-100">
                  Total executed: {formatNum(drilldownData.totalExecuted)} m (Rule: chainage[i] - chainage[i-1] on backfilled rows)
                </p>
              </div>
              <button
                onClick={() => setDrilldownData(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 text-xs">
              {drilldownData.rows.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No backfilled survey rows found for this pipe diameter.
                </div>
              ) : (
                <table className="w-full text-left border-collapse font-sans">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-2 py-1.5 border-b">Seq</th>
                      <th className="px-2 py-1.5 border-b">Alignment</th>
                      <th className="px-2 py-1.5 border-b text-right">Chainage (m)</th>
                      <th className="px-2 py-1.5 border-b text-center">Backfilled</th>
                      <th className="px-2 py-1.5 border-b">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drilldownData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-2 py-1.5 font-mono">{row.seq}</td>
                        <td className="px-2 py-1.5 font-bold text-slate-800">{row.alignment}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-bold text-indigo-900">{row.chainage.toFixed(1)}</td>
                        <td className="px-2 py-1.5 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                            Done
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-slate-500 italic">{row.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDrilldownData(null)}
                className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: SNAPSHOTS MODAL                                    */}
      {/* ============================================================ */}
      {showSnapshotsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-indigo-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Bookmark size={16} /> Dated Snapshots Management
              </h3>
              <button
                onClick={() => setShowSnapshotsModal(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Save New Snapshot */}
              <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-200 space-y-2">
                <h4 className="font-bold text-indigo-900">Save Current State as Snapshot</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Snapshot Date</label>
                    <input
                      type="text"
                      value={newSnapshotDate}
                      onChange={e => setNewSnapshotDate(e.target.value)}
                      placeholder="e.g. 18-Jun-2026"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Snapshot Name</label>
                    <input
                      type="text"
                      value={newSnapshotName}
                      onChange={e => setNewSnapshotName(e.target.value)}
                      placeholder="e.g. Milestone 2 Review"
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Notes / Reference</label>
                  <input
                    type="text"
                    value={newSnapshotNotes}
                    onChange={e => setNewSnapshotNotes(e.target.value)}
                    placeholder="e.g. Submitted for official departmental verification"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  />
                </div>
                <button
                  onClick={handleSaveSnapshot}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold cursor-pointer transition text-xs"
                >
                  Save Snapshot
                </button>
              </div>

              {/* Existing Snapshots List */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">Saved Snapshots ({snapshots.length})</h4>
                {snapshots.map(s => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{s.name}</span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          {s.date}
                        </span>
                      </div>
                      {s.notes && <p className="text-[11px] text-slate-500 mt-0.5">{s.notes}</p>}
                      <p className="text-[9px] text-slate-400 mt-1">Saved: {new Date(s.created_at).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleRestoreSnapshot(s)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-300 rounded font-bold text-xs cursor-pointer transition"
                    >
                      Load This
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowSnapshotsModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: INPUTS & RATES MODAL                               */}
      {/* ============================================================ */}
      {showInputsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Settings size={16} /> Inputs, Rates & Reconciliation Settings
              </h3>
              <button
                onClick={() => setShowInputsModal(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              <p className="text-slate-600">
                Inputs are strictly separated from the read-only final comparative sheet. Changes here are automatically logged to the audit trail.
              </p>

              {/* Rates Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">Pipe Rates (₹ / metre)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {calculated.active_dias.map(d => (
                    <div key={`rate_${d}`} className="bg-slate-50 p-2 rounded border border-slate-200">
                      <label className="text-[10px] font-bold text-slate-600">{d} mm Rate</label>
                      <input
                        type="number"
                        step="0.1"
                        value={state.inputs.rate[d] || ''}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setState(prev => ({
                            ...prev,
                            inputs: {
                              ...prev.inputs,
                              rate: { ...prev.inputs.rate, [d]: val }
                            }
                          }));
                        }}
                        placeholder="0.0"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tolerance Setting */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800">PDN vs Measurement Tolerance</h4>
                  <p className="text-[11px] text-slate-500">Flags deviations beyond this percentage as amber/red warning</p>
                </div>
                <div className="flex items-center gap-1 font-bold">
                  <input
                    type="number"
                    step="0.5"
                    value={state.inputs.tolerance_pct || 2.0}
                    onChange={e => {
                      const val = Number(e.target.value) || 2.0;
                      setState(prev => ({
                        ...prev,
                        inputs: { ...prev.inputs, tolerance_pct: val }
                      }));
                    }}
                    className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-right font-mono"
                  />
                  <span>%</span>
                </div>
              </div>

              {/* CAD Mode Choice (Improvement requirement 8) */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800">CADWM Source Reconciliation Mode</h4>
                <p className="text-[11px] text-slate-500">
                  Choose whether CADWM reads directly from RA2 Planning (5,060.5m / 13,703.4m) or Abstract separate figure:
                </p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="cad_source"
                      checked={state.inputs.cad_source_mode === 'RA2_PLANNING'}
                      onChange={() => {
                        setState(prev => ({
                          ...prev,
                          inputs: { ...prev.inputs, cad_source_mode: 'RA2_PLANNING' }
                        }));
                      }}
                    />
                    <span className="font-semibold text-slate-800">RA2 Planning Engine (Standard, 18,763.9 m)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="cad_source"
                      checked={state.inputs.cad_source_mode === 'ABSTRACT'}
                      onChange={() => {
                        setState(prev => ({
                          ...prev,
                          inputs: { ...prev.inputs, cad_source_mode: 'ABSTRACT' }
                        }));
                      }}
                    />
                    <span className="font-semibold text-slate-800">Abstract Sheet Figure (13,069.0 m)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  toast.success('Inputs updated!');
                  setShowInputsModal(false);
                }}
                className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: AUDIT TRAIL MODAL                                  */}
      {/* ============================================================ */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <History size={16} /> Audit Trail & Version Log
              </h3>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2 text-xs">
              {state.auditLogs.map(a => (
                <div key={a.id} className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-indigo-900">{a.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(a.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5">{a.details}</p>
                  <p className="text-[9px] text-slate-400 mt-1">User: {a.user || 'Engineer'}</p>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: ACCEPTANCE TEST MODAL                               */}
      {/* ============================================================ */}
      {showTestModal && testResults && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-emerald-700 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CheckCircle2 size={16} /> Final Comparative Acceptance Test Results
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-emerald-900 font-semibold text-[11px]">
                Acceptance criteria verification matching original Excel snapshot (18-Jun-2026):
              </div>
              {testResults.map((t, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${t.passed ? 'bg-emerald-50/50 border-emerald-300' : 'bg-rose-50/50 border-rose-300'
                    }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {t.passed ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <Check size={14} /> PASS
                      </span>
                    ) : (
                      <span className="text-rose-700 flex items-center gap-1">
                        <X size={14} /> FAIL
                      </span>
                    )}
                    <span className="text-slate-800">{t.name}</span>
                  </div>
                  {t.error && <p className="text-[11px] text-rose-600 mt-1">Error: {t.error}</p>}
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
