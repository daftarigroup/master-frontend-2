// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import {
  Minor,
  WorkType,
  CalculatedRAPlanning,
  AuditLogEntry,
  SurveyRow
} from '@/systems/pms/utils/raPlanningTypes';
import {
  calculateRAPlanningEngine,
  exportRAPlanningToExcel,
  exportRAPlanningToPDF
} from '@/systems/pms/utils/raPlanningEngine';
import {
  loadRAPlanningState,
  saveRAPlanningState,
  logRAPlanningAuditAction,
  RAPlanningStorageState
} from '@/systems/pms/utils/raPlanningStorage';
import { runRAPlanningAcceptanceTests, TestResult } from './raPlanningEngine.test';
import {
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  History,
  Edit2,
  RefreshCw,
  Info,
  Check,
  X,
  Search,
  Eye,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  projectNo?: string;
  projectName?: string;
}

export default function RAPlanningView({
  projectNo = 'PN-002',
  projectName = 'Godavari Valley Minor Irrigation Network'
}: Props) {
  const [state, setState] = useState<RAPlanningStorageState>(() => {
    return loadRAPlanningState(projectNo);
  });

  // Sync state changes to storage
  useEffect(() => {
    saveRAPlanningState(projectNo, state);
  }, [state, projectNo]);

  // Selected filters
  const [billNo, setBillNo] = useState<string>('RA2');
  const [workTypeFilter, setWorkTypeFilter] = useState<'ALL' | 'PDN' | 'CAD'>('ALL');
  const [minorFilter, setMinorFilter] = useState<string>('ALL');
  const [showAllDias, setShowAllDias] = useState<boolean>(false);
  const [collapsedMinors, setCollapsedMinors] = useState<Record<string, boolean>>({});

  // Modals & Drilldown states
  const [drilldownData, setDrilldownData] = useState<{
    minor: Minor;
    dia: number;
    rows: SurveyRow[];
    totalExecuted: number;
  } | null>(null);

  const [editTarget, setEditTarget] = useState<{
    minor: Minor;
    workType: WorkType;
    dia: number;
    currentValue: number;
    targetType: 'PLANNED' | 'CAD_EXECUTED';
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);

  // Synchronize inputs.bill_no
  useEffect(() => {
    setState(prev => ({
      ...prev,
      inputs: { ...prev.inputs, bill_no: billNo }
    }));
  }, [billNo]);

  // Calculation Engine
  const calculated: CalculatedRAPlanning = useMemo(() => {
    return calculateRAPlanningEngine(
      state.minors,
      state.surveyRowsByMinor,
      state.adjustments,
      state.plannedByBill,
      state.cadExecuted,
      state.inputs,
      state.overridePDNByMinor
    );
  }, [state]);

  // Determine which diameters to display in table
  const displayedDias = useMemo(() => {
    if (showAllDias) return calculated.pipe_dias;
    return calculated.active_dias;
  }, [showAllDias, calculated]);

  // Minors to display
  const displayedMinors = useMemo(() => {
    if (minorFilter === 'ALL') return calculated.minors;
    return calculated.minors.filter(m => m.id === minorFilter);
  }, [minorFilter, calculated.minors]);

  // Format number
  const formatNumber = (num: number | undefined | null, decimals = 1): string => {
    if (num === undefined || num === null || isNaN(num) || num === 0) return '-';
    return Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // Toggle minor collapse
  const toggleMinorCollapse = (minorId: string) => {
    setCollapsedMinors(prev => ({ ...prev, [minorId]: !prev[minorId] }));
  };

  // Drill-down into survey rows for an executed cell
  const handleOpenDrilldown = (minor: Minor, dia: number) => {
    const minorRows = state.surveyRowsByMinor[minor.id] || [];
    const diaRows = minorRows.filter(r => r.pipe_dia === dia && r.back_filling_done);
    const execVal = calculated.pdn_blocks[minor.id]?.executed_per_dia[dia] || 0;
    setDrilldownData({
      minor,
      dia,
      rows: diaRows,
      totalExecuted: execVal
    });
  };

  // Open inline edit
  const handleStartEdit = (minor: Minor, workType: WorkType, dia: number, isCadExec = false) => {
    let currentVal = 0;
    if (isCadExec) {
      currentVal = state.cadExecuted[minor.id]?.[dia]?.qty || 0;
      setEditTarget({ minor, workType, dia, currentValue: currentVal, targetType: 'CAD_EXECUTED' });
    } else {
      currentVal = state.plannedByBill[billNo]?.[workType]?.[minor.id]?.[dia] || 0;
      setEditTarget({ minor, workType, dia, currentValue: currentVal, targetType: 'PLANNED' });
    }
    setEditValue(String(currentVal || ''));
    setEditReason('');
  };

  // Save edit with audit log
  const handleSaveEdit = () => {
    if (!editTarget) return;
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid non-negative number');
      return;
    }

    setState(prev => {
      let nextState = { ...prev };
      if (editTarget.targetType === 'PLANNED') {
        const plannedByBill = JSON.parse(JSON.stringify(prev.plannedByBill));
        if (!plannedByBill[billNo]) plannedByBill[billNo] = { PDN: {}, CAD: {} };
        if (!plannedByBill[billNo][editTarget.workType]) plannedByBill[billNo][editTarget.workType] = {};
        if (!plannedByBill[billNo][editTarget.workType][editTarget.minor.id]) {
          plannedByBill[billNo][editTarget.workType][editTarget.minor.id] = {};
        }
        plannedByBill[billNo][editTarget.workType][editTarget.minor.id][editTarget.dia] = num;

        nextState = logRAPlanningAuditAction(
          { ...nextState, plannedByBill },
          'UPDATE_PLANNED',
          `Updated planned ${editTarget.workType} for ${editTarget.minor.name} ${editTarget.dia}mm from ${editTarget.currentValue}m to ${num}m (${billNo})${editReason ? ': ' + editReason : ''}`,
          {
            bill_no: billNo,
            minor_id: editTarget.minor.id,
            work_type: editTarget.workType,
            pipe_dia: editTarget.dia,
            old_val: editTarget.currentValue,
            new_val: num
          }
        );
      } else {
        const cadExecuted = JSON.parse(JSON.stringify(prev.cadExecuted));
        if (!cadExecuted[editTarget.minor.id]) cadExecuted[editTarget.minor.id] = {};
        cadExecuted[editTarget.minor.id][editTarget.dia] = {
          qty: num,
          source_note: editReason || 'Manual field update',
          last_refreshed: new Date().toISOString()
        };

        nextState = logRAPlanningAuditAction(
          { ...nextState, cadExecuted },
          'UPDATE_CAD',
          `Updated CAD executed for ${editTarget.minor.name} ${editTarget.dia}mm from ${editTarget.currentValue}m to ${num}m${editReason ? ': ' + editReason : ''}`,
          {
            minor_id: editTarget.minor.id,
            work_type: 'CAD',
            pipe_dia: editTarget.dia,
            old_val: editTarget.currentValue,
            new_val: num
          }
        );
      }
      return nextState;
    });

    toast.success(`Updated ${editTarget.dia}mm quantity to ${num}m`);
    setEditTarget(null);
  };

  // Run acceptance tests
  const handleRunAcceptanceTests = () => {
    const res = runRAPlanningAcceptanceTests();
    setTestResults(res);
    const allPassed = res.every(r => r.passed);
    if (allPassed) {
      toast.success('All acceptance tests passed! (5/5)');
    } else {
      toast.error('Some acceptance tests failed. Check modal.');
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Actions: Export Excel & Export PDF */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => exportRAPlanningToExcel(calculated, projectName)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs cursor-pointer transition-colors"
        >
          <Download size={13} /> Export Excel
        </button>

        <button
          onClick={exportRAPlanningToPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold shadow-xs cursor-pointer transition-colors"
        >
          <Download size={13} /> Export PDF
        </button>
      </div>

      {/* Main Comparison Spreadsheet Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-xs bg-white">
        <table className="min-w-full text-xs text-left border-collapse font-sans">
          {/* Header Row: Description | Diameters | Total Qty | % Achieved */}
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
              <th className="px-3 py-2.5 text-right font-black min-w-[95px] bg-slate-200 text-slate-900 border-l border-slate-300">
                TOTAL (m)
              </th>
              <th className="px-3 py-2.5 text-center font-black min-w-[85px] bg-slate-200 text-slate-900 border-l border-slate-300">
                % ACHIEVED
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {/* ============================================================ */}
            {/* SECTION A: PDN (Pipe Distribution Network)                  */}
            {/* ============================================================ */}
            {(workTypeFilter === 'ALL' || workTypeFilter === 'PDN') && (
              <>
                <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                  <td
                    colSpan={displayedDias.length + 3}
                    className="px-3 py-2 font-black text-indigo-900 uppercase tracking-wide text-[11px]"
                  >
                    A. {state.inputs.labels_config?.pdn || 'PDN (PIPE DISTRIBUTION NETWORK)'}
                  </td>
                </tr>

                {displayedMinors.map(m => {
                  const block = calculated.pdn_blocks[m.id];
                  if (!block) return null;
                  const isCollapsed = !!collapsedMinors[`pdn_${m.id}`];

                  return (
                    <React.Fragment key={`pdn_${m.id}`}>
                      {/* Minor Block Header */}
                      <tr className="bg-slate-50/70 border-t border-slate-200 text-slate-700">
                        <td
                          colSpan={displayedDias.length + 3}
                          className="px-3 py-1 font-bold text-xs flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => toggleMinorCollapse(`pdn_${m.id}`)}
                        >
                          <span className="flex items-center gap-1.5 text-slate-800">
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            <span className="font-extrabold">{m.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              (Exec: {formatNumber(block.total_executed)}m / Plan: {formatNumber(block.total_planned)}m)
                            </span>
                          </span>
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${
                            block.completion_ratio !== null && block.completion_ratio >= 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {block.completion_ratio !== null ? `${block.completion_ratio}%` : '-'}
                          </span>
                        </td>
                      </tr>

                      {!isCollapsed && (
                        <>
                          {/* Row 1: [MINOR] executed */}
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-200 pl-6">
                              <span className="flex items-center justify-between">
                                <span>{m.name} executed</span>
                                <span className="text-[10px] text-slate-400 italic">survey rule</span>
                              </span>
                            </td>
                            {displayedDias.map(dia => {
                              const val = block.executed_per_dia[dia];
                              return (
                                <td
                                  key={dia}
                                  onClick={() => val > 0 && handleOpenDrilldown(m, dia)}
                                  className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${
                                    val > 0
                                      ? 'font-bold text-slate-900 cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 underline decoration-dotted'
                                      : 'text-slate-400'
                                  }`}
                                  title={val > 0 ? 'Click to inspect contributing survey rows' : ''}
                                >
                                  {formatNumber(val)}
                                </td>
                              );
                            })}
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                              {formatNumber(block.total_executed)}
                            </td>
                            <td className="px-3 py-1.5 text-center text-slate-400 border-l border-slate-200 font-mono">
                              -
                            </td>
                          </tr>

                          {/* Row 2: RA2 PLANNED QTY */}
                          <tr className="hover:bg-slate-50 transition-colors bg-purple-50/20">
                            <td className="px-3 py-1.5 font-medium text-purple-900 border-r border-slate-200 pl-6 flex items-center justify-between">
                              <span>{billNo} PLANNED QTY</span>
                              <span className="text-[10px] text-purple-600 font-semibold">click to edit</span>
                            </td>
                            {displayedDias.map(dia => {
                              const planVal = block.planned_per_dia[dia];
                              return (
                                <td
                                  key={dia}
                                  onClick={() => handleStartEdit(m, 'PDN', dia)}
                                  className="px-2 py-1.5 text-right font-mono border-r border-slate-200 cursor-pointer hover:bg-purple-100/70 transition-colors text-purple-950 font-semibold"
                                  title="Click to edit planned quantity"
                                >
                                  {planVal > 0 ? formatNumber(planVal) : '-'}
                                </td>
                              );
                            })}
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-purple-950 bg-purple-100/40 border-l border-slate-200">
                              {formatNumber(block.total_planned)}
                            </td>
                            <td className="px-3 py-1.5 text-center text-slate-400 border-l border-slate-200 font-mono">
                              -
                            </td>
                          </tr>

                          {/* Row 3: BALANCE (planned - executed) */}
                          <tr className="border-b-2 border-slate-300 font-bold bg-slate-50/90">
                            <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200 pl-6">
                              BALANCE (planned - executed)
                            </td>
                            {displayedDias.map(dia => {
                              const bal = block.balance_per_dia[dia];
                              const isTolWarn = block.tolerance_warn_per_dia[dia];
                              const isZeroPlanWarn = block.zero_plan_warn_per_dia[dia];

                              return (
                                <td
                                  key={dia}
                                  className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${
                                    bal < 0
                                      ? 'text-rose-600 font-bold bg-rose-50/50'
                                      : bal > 0
                                      ? 'text-amber-700 font-bold bg-amber-50/40'
                                      : bal === 0 && block.total_planned > 0
                                      ? 'text-emerald-700 font-bold bg-emerald-50/40'
                                      : 'text-slate-400'
                                  }`}
                                  title={
                                    isZeroPlanWarn
                                      ? 'Warning: Executed > 0 with 0 Planned!'
                                      : isTolWarn
                                      ? 'Warning: Executed exceeds Planned tolerance!'
                                      : ''
                                  }
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    {(isTolWarn || isZeroPlanWarn) && (
                                      <AlertTriangle size={11} className="text-amber-600 flex-shrink-0" />
                                    )}
                                    <span>{bal !== 0 ? formatNumber(bal) : (block.planned_per_dia[dia] > 0 ? '0.0' : '-')}</span>
                                  </div>
                                </td>
                              );
                            })}
                            {/* Total Balance Qty */}
                            <td className={`px-3 py-1.5 text-right font-mono font-black border-l border-slate-200 ${
                              block.total_balance_qty < 0 ? 'text-rose-700 bg-rose-100/60' : 'text-slate-900 bg-slate-100'
                            }`}>
                              {formatNumber(block.total_balance_qty)}
                            </td>
                            {/* % Achieved (Completion Ratio) */}
                            <td className={`px-3 py-1.5 text-center font-mono font-black border-l border-slate-200 ${
                              block.completion_ratio !== null && block.completion_ratio >= 100
                                ? 'text-emerald-700 bg-emerald-100/70'
                                : block.completion_ratio !== null
                                ? 'text-amber-700 bg-amber-100/60'
                                : 'text-slate-400 bg-slate-50'
                            }`}>
                              {block.completion_ratio !== null ? `${block.completion_ratio}%` : '-'}
                            </td>
                          </tr>
                        </>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* TOTAL PDN ROW */}
                <tr className="bg-indigo-100 font-black border-y-2 border-indigo-300 text-indigo-950">
                  <td className="px-3 py-2 font-black uppercase border-r border-indigo-200">
                    TOTAL PDN EXECUTED
                  </td>
                  {displayedDias.map(dia => {
                    const diaTotal = Object.values(calculated.pdn_blocks).reduce(
                      (sum, b) => sum + (b.executed_per_dia[dia] || 0),
                      0
                    );
                    return (
                      <td
                        key={dia}
                        className="px-2 py-2 text-right font-mono font-bold border-r border-indigo-200 text-indigo-950"
                      >
                        {formatNumber(diaTotal)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono font-black text-indigo-950 bg-indigo-200 border-l border-indigo-300">
                    {formatNumber(calculated.total_pdn_executed_grand)}
                  </td>
                  <td className="px-3 py-2 text-center text-indigo-950 bg-indigo-200 border-l border-indigo-300 font-mono">
                    -
                  </td>
                </tr>
              </>
            )}

            {/* ============================================================ */}
            {/* SECTION B: CADWM                                            */}
            {/* ============================================================ */}
            {(workTypeFilter === 'ALL' || workTypeFilter === 'CAD') && (
              <>
                <tr className="bg-cyan-50 border-t-2 border-cyan-200">
                  <td
                    colSpan={displayedDias.length + 3}
                    className="px-3 py-2 font-black text-cyan-900 uppercase tracking-wide text-[11px]"
                  >
                    B. {state.inputs.labels_config?.cadwm || 'CADWM (COMMAND AREA DEVELOPMENT & WATER MANAGEMENT)'}
                  </td>
                </tr>

                {displayedMinors.map(m => {
                  const block = calculated.cad_blocks[m.id];
                  if (!block) return null;
                  const isCollapsed = !!collapsedMinors[`cad_${m.id}`];

                  return (
                    <React.Fragment key={`cad_${m.id}`}>
                      {/* Minor CAD Block Header */}
                      <tr className="bg-slate-50/70 border-t border-slate-200 text-slate-700">
                        <td
                          colSpan={displayedDias.length + 3}
                          className="px-3 py-1 font-bold text-xs flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => toggleMinorCollapse(`cad_${m.id}`)}
                        >
                          <span className="flex items-center gap-1.5 text-slate-800">
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            <span className="font-extrabold">{m.name} CADWM</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              (Exec: {formatNumber(block.total_executed)}m / Plan: {formatNumber(block.total_planned)}m)
                            </span>
                          </span>
                          <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${
                            block.completion_ratio !== null && block.completion_ratio >= 100
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {block.completion_ratio !== null ? `${block.completion_ratio}%` : '-'}
                          </span>
                        </td>
                      </tr>

                      {!isCollapsed && (
                        <>
                          {/* Row 1: [MINOR] executed CAD */}
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-200 pl-6 flex items-center justify-between">
                              <span>{m.name} executed CAD</span>
                              <span className="text-[10px] text-cyan-600 font-semibold">click to edit</span>
                            </td>
                            {displayedDias.map(dia => {
                              const val = block.executed_per_dia[dia];
                              return (
                                <td
                                  key={dia}
                                  onClick={() => handleStartEdit(m, 'CAD', dia, true)}
                                  className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 cursor-pointer hover:bg-cyan-50 transition-colors ${
                                    val > 0 ? 'font-bold text-cyan-950' : 'text-slate-400'
                                  }`}
                                  title="Click to update CAD quantity"
                                >
                                  {formatNumber(val)}
                                </td>
                              );
                            })}
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 bg-slate-50 border-l border-slate-200">
                              {formatNumber(block.total_executed)}
                            </td>
                            <td className="px-3 py-1.5 text-center text-slate-400 border-l border-slate-200 font-mono">
                              -
                            </td>
                          </tr>

                          {/* Row 2: RA2 PLANNED QTY (CAD) */}
                          <tr className="hover:bg-slate-50 transition-colors bg-purple-50/20">
                            <td className="px-3 py-1.5 font-medium text-purple-900 border-r border-slate-200 pl-6 flex items-center justify-between">
                              <span>{billNo} PLANNED QTY (CAD)</span>
                              <span className="text-[10px] text-purple-600 font-semibold">click to edit</span>
                            </td>
                            {displayedDias.map(dia => {
                              const planVal = block.planned_per_dia[dia];
                              return (
                                <td
                                  key={dia}
                                  onClick={() => handleStartEdit(m, 'CAD', dia, false)}
                                  className="px-2 py-1.5 text-right font-mono border-r border-slate-200 cursor-pointer hover:bg-purple-100/70 transition-colors text-purple-950 font-semibold"
                                  title="Click to edit planned CAD quantity"
                                >
                                  {planVal > 0 ? formatNumber(planVal) : '-'}
                                </td>
                              );
                            })}
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-purple-950 bg-purple-100/40 border-l border-slate-200">
                              {formatNumber(block.total_planned)}
                            </td>
                            <td className="px-3 py-1.5 text-center text-slate-400 border-l border-slate-200 font-mono">
                              -
                            </td>
                          </tr>

                          {/* Row 3: BALANCE (planned - executed) */}
                          <tr className="border-b-2 border-slate-300 font-bold bg-slate-50/90">
                            <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200 pl-6">
                              BALANCE (planned - executed)
                            </td>
                            {displayedDias.map(dia => {
                              const bal = block.balance_per_dia[dia];
                              const isTolWarn = block.tolerance_warn_per_dia[dia];
                              const isZeroPlanWarn = block.zero_plan_warn_per_dia[dia];

                              return (
                                <td
                                  key={dia}
                                  className={`px-2 py-1.5 text-right font-mono border-r border-slate-200 ${
                                    bal < 0
                                      ? 'text-rose-600 font-bold bg-rose-50/50'
                                      : bal > 0
                                      ? 'text-amber-700 font-bold bg-amber-50/40'
                                      : bal === 0 && block.total_planned > 0
                                      ? 'text-emerald-700 font-bold bg-emerald-50/40'
                                      : 'text-slate-400'
                                  }`}
                                  title={
                                    isZeroPlanWarn
                                      ? 'Warning: Executed > 0 with 0 Planned!'
                                      : isTolWarn
                                      ? 'Warning: Executed exceeds Planned tolerance!'
                                      : ''
                                  }
                                >
                                  <div className="flex items-center justify-end gap-1">
                                    {(isTolWarn || isZeroPlanWarn) && (
                                      <AlertTriangle size={11} className="text-amber-600 flex-shrink-0" />
                                    )}
                                    <span>{bal !== 0 ? formatNumber(bal) : (block.planned_per_dia[dia] > 0 ? '0.0' : '-')}</span>
                                  </div>
                                </td>
                              );
                            })}
                            {/* Total Balance Qty */}
                            <td className={`px-3 py-1.5 text-right font-mono font-black border-l border-slate-200 ${
                              block.total_balance_qty < 0 ? 'text-rose-700 bg-rose-100/60' : 'text-slate-900 bg-slate-100'
                            }`}>
                              {formatNumber(block.total_balance_qty)}
                            </td>
                            {/* % Achieved (Completion Ratio) */}
                            <td className={`px-3 py-1.5 text-center font-mono font-black border-l border-slate-200 ${
                              block.completion_ratio !== null && block.completion_ratio >= 100
                                ? 'text-emerald-700 bg-emerald-100/70'
                                : block.completion_ratio !== null
                                ? 'text-amber-700 bg-amber-100/60'
                                : 'text-slate-400 bg-slate-50'
                            }`}>
                              {block.completion_ratio !== null ? `${block.completion_ratio}%` : '-'}
                            </td>
                          </tr>
                        </>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* TOTAL CAD ROW */}
                <tr className="bg-cyan-100 font-black border-y-2 border-cyan-300 text-cyan-950">
                  <td className="px-3 py-2 font-black uppercase border-r border-cyan-200">
                    TOTAL CAD EXECUTED
                  </td>
                  {displayedDias.map(dia => {
                    const diaTotal = Object.values(calculated.cad_blocks).reduce(
                      (sum, b) => sum + (b.executed_per_dia[dia] || 0),
                      0
                    );
                    return (
                      <td
                        key={dia}
                        className="px-2 py-2 text-right font-mono font-bold border-r border-cyan-200 text-cyan-950"
                      >
                        {formatNumber(diaTotal)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-mono font-black text-cyan-950 bg-cyan-200 border-l border-cyan-300">
                    {formatNumber(calculated.total_cad_executed_grand)}
                  </td>
                  <td className="px-3 py-2 text-center text-cyan-950 bg-cyan-200 border-l border-cyan-300 font-mono">
                    -
                  </td>
                </tr>
              </>
            )}

            {/* ============================================================ */}
            {/* SECTION C: TOTAL UPTO DATE WORK DONE (EXECUTED ONLY)         */}
            {/* ============================================================ */}
            <tr className="bg-emerald-100 font-black border-y-2 border-emerald-400 text-emerald-950 text-[11px]">
              <td className="px-3 py-2.5 font-black uppercase border-r border-emerald-300">
                C. TOTAL UPTO DATE WORK DONE (EXECUTED ONLY: PDN + CAD)
              </td>
              {displayedDias.map(dia => (
                <td
                  key={dia}
                  className="px-2 py-2.5 text-right font-mono font-black border-r border-emerald-300 text-emerald-950"
                >
                  {formatNumber(calculated.total_upto_date_executed_per_dia[dia])}
                </td>
              ))}
              <td className="px-3 py-2.5 text-right font-mono font-black text-white bg-emerald-700 border-l border-emerald-400 text-xs">
                {formatNumber(calculated.total_upto_date_grand)}
              </td>
              <td className="px-3 py-2.5 text-center text-emerald-950 bg-emerald-200 border-l border-emerald-300 font-mono font-bold">
                100.0%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Notes & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Balance &gt; 0: Scope pending to execute</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
            <span>Balance &lt; 0: Executed more than planned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Balance = 0: Target completely met</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-500" />
            <span>Warning: Tolerance exceeded or unbudgeted execution</span>
          </div>
        </div>
        <div>
          Total Executed (PDN + CAD): <span className="font-extrabold text-slate-900">{formatNumber(calculated.total_upto_date_grand)} m</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DRILLDOWN MODAL: SURVEY ROWS CONTRIBUTING TO EXECUTED CELL   */}
      {/* ============================================================ */}
      {drilldownData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-indigo-950 uppercase">
                  Survey Drill-down — {drilldownData.minor.name} ({drilldownData.dia} mm)
                </h3>
                <p className="text-xs text-indigo-700">
                  Total Executed Length: <span className="font-bold">{drilldownData.totalExecuted} m</span>
                </p>
              </div>
              <button
                onClick={() => setDrilldownData(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {drilldownData.rows.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-8">
                  No explicit individual survey rows found for this diameter.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="px-3 py-2 border-r border-slate-200">Seq</th>
                        <th className="px-3 py-2 border-r border-slate-200">Alignment</th>
                        <th className="px-3 py-2 border-r border-slate-200 text-right">Chainage (m)</th>
                        <th className="px-3 py-2 border-r border-slate-200 text-center">Backfilling Done</th>
                        <th className="px-3 py-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {drilldownData.rows.map(r => (
                        <tr key={r.seq} className="hover:bg-slate-50">
                          <td className="px-3 py-2 border-r border-slate-200">{r.seq}</td>
                          <td className="px-3 py-2 border-r border-slate-200 font-bold">{r.alignment}</td>
                          <td className="px-3 py-2 border-r border-slate-200 text-right">{r.chainage}</td>
                          <td className="px-3 py-2 border-r border-slate-200 text-center">
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
                              TRUE
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 font-sans">{r.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDrilldownData(null)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* INLINE EDIT MODAL                                            */}
      {/* ============================================================ */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Edit {editTarget.targetType === 'PLANNED' ? `${billNo} Planned Qty` : 'CAD Executed Qty'}
              </h3>
              <p className="text-xs text-slate-500">
                {editTarget.minor.name} — {editTarget.dia} mm ({editTarget.workType})
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quantity (metres):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                  placeholder="0.0"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Revision (Audit Trail Note):
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-purple-600"
                  placeholder="e.g. Approved DPR adjustment or revised survey target"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setEditTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded cursor-pointer shadow-xs"
              >
                Save Quantity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ACCEPTANCE TESTS MODAL                                       */}
      {/* ============================================================ */}
      {testResults && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-emerald-950 uppercase flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Acceptance Test Verification (Section 6)
                </h3>
                <p className="text-xs text-emerald-700">
                  {testResults.filter(r => r.passed).length} of {testResults.length} test suites passing
                </p>
              </div>
              <button
                onClick={() => setTestResults(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
              {testResults.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                    t.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  {t.passed ? (
                    <Check size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <X size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold ${t.passed ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {t.name}
                    </p>
                    {t.error && <p className="text-rose-700 text-[11px] mt-1">{t.error}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setTestResults(null)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* AUDIT TRAIL MODAL                                            */}
      {/* ============================================================ */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase flex items-center gap-1.5">
                  <History size={16} className="text-purple-600" />
                  RA Planning Audit Trail
                </h3>
                <p className="text-xs text-slate-500">
                  Complete historical record of planned and CAD revisions
                </p>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
              {(state.auditLogs || []).length === 0 ? (
                <p className="text-center text-slate-400 py-8">No audit logs recorded yet.</p>
              ) : (
                state.auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-purple-700">{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="font-medium text-slate-800">{log.details}</p>
                    <div className="text-[10px] text-slate-400">User: {log.user}</div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
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
