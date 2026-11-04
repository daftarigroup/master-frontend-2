// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Check,
  CheckCircle2,
  XCircle,
  Table,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  TrendingUp,
  RefreshCw,
  Calculator,
  Sigma,
  ListFilter,
  Eye,
  FolderTree,
  FileBarChart2,
  ArrowUpRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  getDesignByProject,
  getExecutions,
  saveExecution,
  updateExecution
} from '@/systems/pms/utils/storageManager';
import { generateId, formatDate, buildChainageDiffMap } from '@/systems/pms/utils/helpers';
import FinalComparativeView from '../abstract/FinalComparative/FinalComparativeView';

// Standard pipeline diameters common in lift irrigation & water works
const DEFAULT_DIAMETERS = [110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500];

/**
 * Helper to compute chainage diffs per alignment group from a list of execution entries.
 * Exactly matches how Excavation&Murum.jsx computes lengthAsPerSite via buildChainageDiffMap,
 * but safely scoped per alignment so chainages never cross-subtract between different alignments.
 */
function buildAlignmentChainageDiffMap(entries) {
  const map = new Map();
  const alignGroups = new Map();
  entries.forEach(e => {
    const a = e.alignment || e.component || 'MAIN';
    if (!alignGroups.has(a)) alignGroups.set(a, []);
    alignGroups.get(a).push(e);
  });

  alignGroups.forEach((groupEntries) => {
    groupEntries.sort((a, b) => {
      const sA = a.serialNo !== undefined && a.serialNo !== null ? Number(a.serialNo) : null;
      const sB = b.serialNo !== undefined && b.serialNo !== null ? Number(b.serialNo) : null;
      if (sA !== null && sB !== null && !isNaN(sA) && !isNaN(sB)) return sA - sB;
      return (parseFloat(a.execution?.chainage) || 0) - (parseFloat(b.execution?.chainage) || 0);
    });

    groupEntries.forEach((item, i) => {
      const cur = parseFloat(item.execution?.chainage ?? item.chainage);
      if (Number.isNaN(cur) || cur === 0) {
        map.set(item.id, 0);
        return;
      }
      if (i === 0) {
        map.set(item.id, cur);
        return;
      }
      const prev = parseFloat(groupEntries[i - 1].execution?.chainage ?? groupEntries[i - 1].chainage);
      map.set(item.id, Number.isNaN(prev) ? cur : Math.max(0, cur - prev));
    });
  });

  return map;
}

/**
 * Helper to build consolidated Alignment Groups from a list of detailed rows.
 * Computes:
 * - Chainage range: min - max (e.g., 1800 - 1920)
 * - Elevation range: min - max (e.g., 261.24 - 262.39)
 * - Pipe Dia: single dia or range (e.g., 140)
 * - Status for Excavation, Pipe Laying, Back Filling: TRUE, FALSE, or PARTIAL (X/Y)
 * - Remarks: distinct valves and notes combined
 * - Red diameter columns: SUM of quantities (RMT pipe) in each diameter column for this alignment
 */
function buildAlignmentGroups(rows, sortedDias = DEFAULT_DIAMETERS, minorsList = []) {
  const groupsMap = new Map();

  rows.forEach(r => {
    // Unique key per minor and alignment so each minor has its own separate rows!
    const minorId = r.minorId || r.minorName || 'default';
    const minorName = r.minorName || '';
    const alignKey = r.alignment || 'MAIN';
    const groupKey = `${minorId}__${alignKey}`;

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        minorId,
        minorName,
        alignment: alignKey,
        rows: []
      });
    }
    groupsMap.get(groupKey).rows.push(r);
  });

  const grouped = [];

  groupsMap.forEach(({ minorId, minorName, alignment: alignKey, rows: groupRows }, groupKey) => {
    // Sort rows by chainage ascending
    groupRows.sort((a, b) => (parseFloat(a.chainage) || 0) - (parseFloat(b.chainage) || 0));

    // 1. Chainage Range
    const chainages = groupRows
      .map(r => parseFloat(r.chainage))
      .filter(c => !isNaN(c));
    const minCh = chainages.length > 0 ? Math.min(...chainages) : 0;
    const maxCh = chainages.length > 0 ? Math.max(...chainages) : 0;
    const chainageDisplay =
      chainages.length === 0
        ? '-'
        : minCh === maxCh
        ? `${minCh}`
        : `${minCh} - ${maxCh}`;

    // 2. Elevation Range
    const elevations = groupRows
      .map(r => parseFloat(r.elevation))
      .filter(e => !isNaN(e) && e !== 0);
    let elevationDisplay = '-';
    if (elevations.length > 0) {
      const minElev = Math.min(...elevations);
      const maxElev = Math.max(...elevations);
      elevationDisplay =
        minElev === maxElev
          ? minElev.toFixed(2)
          : `${minElev.toFixed(2)} - ${maxElev.toFixed(2)}`;
    }

    // 3. Pipe Dia (Range: e.g. 140 - 630 or single 140)
    const dias = Array.from(
      new Set<number>(groupRows.map(r => parseFloat(r.pipeDia)).filter(d => !isNaN(d) && d > 0))
    ).sort((a: number, b: number) => a - b);
    const minDia = dias.length > 0 ? dias[0] : null;
    const maxDia = dias.length > 0 ? dias[dias.length - 1] : null;
    const pipeDiaDisplay =
      dias.length === 0
        ? '-'
        : minDia === maxDia
        ? String(minDia)
        : `${minDia} - ${maxDia}`;

    // 4. Execution Stages
    const total = groupRows.length;
    const excCount = groupRows.filter(r => r.excavation).length;
    const plCount = groupRows.filter(r => r.pipeLaying).length;
    const bfCount = groupRows.filter(r => r.backFilling).length;
    const fullyExecCount = groupRows.filter(r => r.isExecuted).length;

    const getStatus = (count, totalCount) => {
      if (totalCount > 0 && count === totalCount) return { label: 'TRUE', type: 'all', count, total: totalCount };
      return { label: 'PENDING', type: 'pending', count, total: totalCount };
    };

    const excStatus = getStatus(excCount, total);
    const plStatus = getStatus(plCount, total);
    const bfStatus = getStatus(bfCount, total);

    // 5. Remarks & Valves
    const remarksSet = new Set<string>();
    groupRows.forEach(r => {
      const rm = (r.remark || r.valve || '').trim();
      if (rm && rm !== '-' && rm !== 'FALSE' && rm !== 'TRUE' && rm !== 'PENDING') {
        remarksSet.add(rm);
      }
    });
    const remarkDisplay = Array.from(remarksSet).join(', ') || '-';

    // 6. Minor Name for this group row
    const displayMinorName = minorName || groupRows[0]?.minorName || '';

    // 7. Sum of Quantities for Red / Peach Diameter Columns
    const diaSums = {};
    let groupTotalRmt = 0;
    let groupExecutedRmt = 0;

    sortedDias.forEach(d => {
      diaSums[d] = 0;
    });

    groupRows.forEach(r => {
      const d = parseFloat(r.pipeDia);
      const rmt = r.rmtLength || 0;
      groupTotalRmt += rmt;
      if (r.isExecuted) {
        groupExecutedRmt += rmt;
      }
      if (d) {
        if (diaSums[d] === undefined) diaSums[d] = 0;
        diaSums[d] += rmt;
      }
    });

    // Round dia sums to 2 decimal places
    sortedDias.forEach(d => {
      if (diaSums[d]) {
        diaSums[d] = Math.round(diaSums[d] * 100) / 100;
      }
    });

    grouped.push({
      id: `align_group_${groupKey}`,
      groupKey,
      alignment: alignKey,
      minorNamesDisplay: displayMinorName,
      minorId: minorId || groupRows[0]?.minorId || null,
      minorName: displayMinorName,
      totalRows: total,
      minChainage: minCh,
      maxChainage: maxCh,
      chainageDisplay,
      elevationDisplay,
      pipeDiaDisplay,
      excCount,
      plCount,
      bfCount,
      fullyExecCount,
      excStatus,
      plStatus,
      bfStatus,
      remarkDisplay,
      diaSums,
      groupTotalRmt: Math.round(groupTotalRmt * 100) / 100,
      groupExecutedRmt: Math.round(groupExecutedRmt * 100) / 100,
      subRows: groupRows
    });
  });

  // Sort groups: First by Minor (preserving minors order), then by Alignment (numerically/alphabetically)
  const minorOrderMap = new Map();
  if (Array.isArray(minorsList)) {
    minorsList.forEach((m, idx) => {
      if (m.id) minorOrderMap.set(m.id, idx);
      if (m.minorName) minorOrderMap.set(m.minorName, idx);
    });
  }

  grouped.sort((a, b) => {
    const aOrder = minorOrderMap.has(a.minorId)
      ? minorOrderMap.get(a.minorId)
      : (minorOrderMap.has(a.minorName) ? minorOrderMap.get(a.minorName) : 999);
    const bOrder = minorOrderMap.has(b.minorId)
      ? minorOrderMap.get(b.minorId)
      : (minorOrderMap.has(b.minorName) ? minorOrderMap.get(b.minorName) : 999);

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    const minorCmp = (a.minorName || '').localeCompare(b.minorName || '');
    if (minorCmp !== 0) return minorCmp;

    return a.alignment.localeCompare(b.alignment, undefined, { numeric: true });
  });

  return grouped;
}

export default function MinorsDPRTable({ project, minors = [], onDataUpdated }) {
  const navigate = useNavigate();

  // Active tab: 'COMBINED_ALL' (if 2+ minors), minor.id, or 'FINAL_COMPARATIVE'
  const [activeTab, setActiveTab] = useState(() => {
    if (minors.length >= 2) return 'COMBINED_ALL';
    return minors.length > 0 ? minors[0].id : 'COMBINED_ALL';
  });

  const [dataSourceMode, setDataSourceMode] = useState('excavation'); // 'excavation' (default - basis of excavation page table) | 'all_design'
  const [searchQuery, setSearchQuery] = useState('');
  const [alignmentFilter, setAlignmentFilter] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' (as requested) | 'detailed'
  const [expandedAlignments, setExpandedAlignments] = useState<Set<string>>(() => new Set<string>());
  const [editingRemarkRow, setEditingRemarkRow] = useState(null); // rowId
  const [tempRemark, setTempRemark] = useState('');

  // Load all executions for this project / minors
  const allExecutions = useMemo(() => {
    return getExecutions();
  }, [minors, activeTab]);

  // Determine current active view
  const isCombinedView = activeTab === 'COMBINED_ALL';
  const isFinalComparativeView = activeTab === 'FINAL_COMPARATIVE';
  const isDPRTableView = !isFinalComparativeView;

  const currentMinor = useMemo(() => {
    if (isCombinedView || !isDPRTableView) return null;
    return minors.find(m => m.id === activeTab) || minors[0] || null;
  }, [minors, activeTab, isCombinedView, isDPRTableView]);

  // 1. Compute Combined Data across ALL Minors (The Total / Sum of all reports)
  const allMinorsSummary = useMemo(() => {
    const allCombinedRows = [];
    const gDiaTotals = {};
    const gDiaExecutedTotals = {};
    const gDiaPercentages = {};
    let gTotalRmt = 0;
    let gTotalExecutedRmt = 0;
    let gTotalExcavationRmt = 0;
    let gTotalPipeLayingRmt = 0;
    let gTotalBackFillingRmt = 0;
    let gTotalDesignRows = 0;
    let totalExecutedEntriesCount = 0;

    DEFAULT_DIAMETERS.forEach(d => {
      gDiaTotals[d] = 0;
      gDiaExecutedTotals[d] = 0;
    });

    const allAlignmentsSet = new Set<string>();
    const allDiametersSet = new Set<number>(DEFAULT_DIAMETERS);

    minors.forEach(m => {
      const dRows = getDesignByProject(m.id) || (m.serialNo ? getDesignByProject(m.serialNo) : []);
      gTotalDesignRows += dRows.length;

      const mExecs = allExecutions.filter(
        e => e.projectNo === m.id || (m.serialNo && e.projectNo === m.serialNo)
      );
      totalExecutedEntriesCount += mExecs.length;

      if (dataSourceMode === 'excavation') {
        // =====================================================================
        // MODE A: EXCAVATION PAGE BASIS (DEFAULT)
        // Strictly uses the excavation table records from getExecutions().
        // Unexecuted alignments (L-1..L-12) & minors have 0 entries, so FALSE
        // entries WON'T GET DISPLAYED!
        // =====================================================================
        if (mExecs.length === 0) return;

        const chainageDiffMap = buildAlignmentChainageDiffMap(mExecs);

        const sortedExecs = [...mExecs].sort((a, b) => {
          const sA = a.serialNo !== undefined && a.serialNo !== null ? Number(a.serialNo) : null;
          const sB = b.serialNo !== undefined && b.serialNo !== null ? Number(b.serialNo) : null;
          if (sA !== null && sB !== null && !isNaN(sA) && !isNaN(sB)) return sA - sB;
          return (parseFloat(a.execution?.chainage) || 0) - (parseFloat(b.execution?.chainage) || 0);
        });

        sortedExecs.forEach((e, idx) => {
          const align = e.alignment || e.component || 'MAIN';
          allAlignmentsSet.add(align);

          const rmtLength = Math.round((chainageDiffMap.get(e.id) ?? 0) * 1000) / 1000;
          const chVal = e.execution?.chainage !== undefined && e.execution?.chainage !== null && e.execution?.chainage !== ''
            ? String(e.execution.chainage)
            : (e.chainage ? String(e.chainage) : '0');
          const elevVal = e.execution?.elevation ?? e.design?.elevation ?? e.elevation ?? '';
          const pipeDiaVal = e.execution?.pipeDia ?? e.design?.pipeDia ?? e.pipeDia ?? '';
          const rowDia = parseFloat(pipeDiaVal);
          if (!isNaN(rowDia) && rowDia > 0) {
            allDiametersSet.add(rowDia);
          }

          const excavation = e.excavation !== false;
          const pipeLaying = e.pipeLaying !== false;
          const backFilling = e.backFilling !== false;
          const isExecuted = excavation && pipeLaying && backFilling;
          const remark = (e.remarks || e.execution?.remarks || e.valveName || e.valve || e.design?.remarks || '').trim();

          const rowObj = {
            ...e.design,
            ...e,
            __id: `exec_${e.id || idx}`,
            __serialNo: e.serialNo ?? (idx + 1),
            alignment: align,
            chainage: chVal,
            elevation: elevVal,
            pipeDia: pipeDiaVal,
            minorName: m.minorName,
            minorId: m.id,
            rmtLength,
            excavation,
            pipeLaying,
            backFilling,
            isExecuted,
            remark,
            execEntryId: e.id || null
          };

          allCombinedRows.push(rowObj);

          if (rowDia) {
            if (gDiaTotals[rowDia] === undefined) {
              gDiaTotals[rowDia] = 0;
              gDiaExecutedTotals[rowDia] = 0;
            }
            gDiaTotals[rowDia] += rmtLength;
            gTotalRmt += rmtLength;

            if (excavation) gTotalExcavationRmt += rmtLength;
            if (pipeLaying) gTotalPipeLayingRmt += rmtLength;
            if (backFilling) gTotalBackFillingRmt += rmtLength;

            if (isExecuted) {
              gDiaExecutedTotals[rowDia] += rmtLength;
              gTotalExecutedRmt += rmtLength;
            }
          }
        });
      } else {
        // =====================================================================
        // MODE B: ALL PLANNED DESIGN ROWS
        // =====================================================================
        const execBySerial = new Map();
        const execByAlignCh = new Map();
        mExecs.forEach(e => {
          if (e.serialNo !== undefined && e.serialNo !== null) {
            execBySerial.set(Number(e.serialNo), e);
          }
          const align = String(e.alignment || e.component || '').trim().toUpperCase();
          const ch = parseFloat(e.execution?.chainage ?? e.chainage);
          if (align && !isNaN(ch)) {
            execByAlignCh.set(`${align}_${ch.toFixed(3)}`, e);
          }
        });

        const alignmentGroups = new Map();
        dRows.forEach((r, idx) => {
          const align = r.alignment || 'MAIN';
          allAlignmentsSet.add(align);
          if (r.pipeDia) allDiametersSet.add(parseFloat(r.pipeDia));

          if (!alignmentGroups.has(align)) alignmentGroups.set(align, []);
          alignmentGroups.get(align).push({ ...r, __originalIndex: idx + 1, minorName: m.minorName, minorId: m.id });
        });

        alignmentGroups.forEach(group => {
          group.sort((a, b) => (parseFloat(a.chainage) || 0) - (parseFloat(b.chainage) || 0));

          group.forEach((r, i) => {
            const curCh = parseFloat(r.chainage) || 0;
            let rmtLength = 0;
            if (i === 0) {
              const nextCh = group[1] ? parseFloat(group[1].chainage) || 0 : 0;
              rmtLength = nextCh > curCh ? nextCh - curCh : 20;
            } else {
              const prevCh = parseFloat(group[i - 1].chainage) || 0;
              rmtLength = Math.max(0, curCh - prevCh);
            }
            rmtLength = Math.round(rmtLength * 1000) / 1000;

            const rAlign = String(r.alignment || '').trim().toUpperCase();
            const rCh = parseFloat(r.chainage);
            const execEntry =
              execBySerial.get(Number(r.serialNo)) ||
              execBySerial.get(r.__originalIndex) ||
              (!isNaN(rCh) ? execByAlignCh.get(`${rAlign}_${rCh.toFixed(3)}`) : null);

            const excavation = execEntry ? Boolean(execEntry.excavation ?? execEntry.execution?.excavation ?? true) : false;
            const pipeLaying = execEntry ? Boolean(execEntry.pipeLaying ?? execEntry.execution?.pipeLaying ?? true) : false;
            const backFilling = execEntry ? Boolean(execEntry.backFilling ?? execEntry.execution?.backFilling ?? true) : false;
            const isExecuted = excavation && pipeLaying && backFilling;
            const remark = execEntry?.remarks || execEntry?.execution?.remarks || r.valve || r.remarks || '';

            const rowObj = {
              ...r,
              __id: `row_${m.id}_${r.__originalIndex}`,
              __serialNo: r.__originalIndex,
              minorName: m.minorName,
              minorId: m.id,
              rmtLength,
              excavation,
              pipeLaying,
              backFilling,
              isExecuted,
              remark,
              execEntryId: execEntry?.id || null
            };

            allCombinedRows.push(rowObj);

            const rowDia = parseFloat(r.pipeDia);
            if (rowDia) {
              if (gDiaTotals[rowDia] === undefined) {
                gDiaTotals[rowDia] = 0;
                gDiaExecutedTotals[rowDia] = 0;
              }
              gDiaTotals[rowDia] += rmtLength;
              gTotalRmt += rmtLength;

              if (excavation) gTotalExcavationRmt += rmtLength;
              if (pipeLaying) gTotalPipeLayingRmt += rmtLength;
              if (backFilling) gTotalBackFillingRmt += rmtLength;

              if (isExecuted) {
                gDiaExecutedTotals[rowDia] += rmtLength;
                gTotalExecutedRmt += rmtLength;
              }
            }
          });
        });
      }
    });

    const sortedCombinedDias = Array.from(allDiametersSet)
      .filter(d => !Number.isNaN(d) && d > 0)
      .sort((a, b) => a - b);

    sortedCombinedDias.forEach(dia => {
      const tot = gDiaTotals[dia] || 0;
      const exec = gDiaExecutedTotals[dia] || 0;
      if (tot > 0) {
        gDiaPercentages[dia] = Number(((exec / tot) * 100).toFixed(2));
      } else {
        gDiaPercentages[dia] = null;
      }
    });

    const gOverallPct = gTotalRmt > 0 ? Number(((gTotalExecutedRmt / gTotalRmt) * 100).toFixed(2)) : 0;

    // Group the combined rows by Alignment and Minor
    const combinedGroupedRows = buildAlignmentGroups(allCombinedRows, sortedCombinedDias, minors);

    return {
      allCombinedRows,
      combinedGroupedRows,
      allAlignments: Array.from(allAlignmentsSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      sortedCombinedDias,
      gDiaTotals,
      gDiaExecutedTotals,
      gDiaPercentages,
      gTotalRmt,
      gTotalExecutedRmt,
      gTotalExcavationRmt,
      gTotalPipeLayingRmt,
      gTotalBackFillingRmt,
      gTotalDesignRows,
      totalExecutedEntriesCount,
      gOverallPct
    };
  }, [minors, allExecutions, dataSourceMode]);

  // 2. Process Current Individual Minor's Rows & Totals
  const currentMinorData = useMemo(() => {
    if (!currentMinor) return null;

    const designRows =
      getDesignByProject(currentMinor.id) ||
      (currentMinor.serialNo ? getDesignByProject(currentMinor.serialNo) : []);

    const minorExecs = allExecutions.filter(
      e => e.projectNo === currentMinor.id || (currentMinor.serialNo && e.projectNo === currentMinor.serialNo)
    );

    const dTotals = {};
    const dExecTotals = {};
    const dPercentages = {};
    let totalRmt = 0;
    let totalExecRmt = 0;

    allMinorsSummary.sortedCombinedDias.forEach(dia => {
      dTotals[dia] = 0;
      dExecTotals[dia] = 0;
    });

    const processedRows = [];

    if (dataSourceMode === 'excavation') {
      // MODE A: EXCAVATION PAGE BASIS
      const chainageDiffMap = buildAlignmentChainageDiffMap(minorExecs);

      const sortedExecs = [...minorExecs].sort((a, b) => {
        const sA = a.serialNo !== undefined && a.serialNo !== null ? Number(a.serialNo) : null;
        const sB = b.serialNo !== undefined && b.serialNo !== null ? Number(b.serialNo) : null;
        if (sA !== null && sB !== null && !isNaN(sA) && !isNaN(sB)) return sA - sB;
        return (parseFloat(a.execution?.chainage) || 0) - (parseFloat(b.execution?.chainage) || 0);
      });

      sortedExecs.forEach((e, idx) => {
        const align = e.alignment || e.component || 'MAIN';
        const rmtLength = Math.round((chainageDiffMap.get(e.id) ?? 0) * 1000) / 1000;
        const chVal = e.execution?.chainage !== undefined && e.execution?.chainage !== null && e.execution?.chainage !== ''
          ? String(e.execution.chainage)
          : (e.chainage ? String(e.chainage) : '0');
        const elevVal = e.execution?.elevation ?? e.design?.elevation ?? e.elevation ?? '';
        const pipeDiaVal = e.execution?.pipeDia ?? e.design?.pipeDia ?? e.pipeDia ?? '';
        const rowDia = parseFloat(pipeDiaVal);

        const excavation = e.excavation !== false;
        const pipeLaying = e.pipeLaying !== false;
        const backFilling = e.backFilling !== false;
        const isExecuted = excavation && pipeLaying && backFilling;
        const remark = (e.remarks || e.execution?.remarks || e.valveName || e.valve || e.design?.remarks || '').trim();

        processedRows.push({
          ...e.design,
          ...e,
          __id: `exec_${e.id || idx}`,
          __serialNo: e.serialNo ?? (idx + 1),
          alignment: align,
          chainage: chVal,
          elevation: elevVal,
          pipeDia: pipeDiaVal,
          minorName: currentMinor.minorName,
          minorId: currentMinor.id,
          rmtLength,
          excavation,
          pipeLaying,
          backFilling,
          isExecuted,
          remark,
          execEntryId: e.id || null
        });

        if (rowDia && dTotals[rowDia] !== undefined) {
          dTotals[rowDia] += rmtLength;
          totalRmt += rmtLength;
          if (isExecuted) {
            dExecTotals[rowDia] += rmtLength;
            totalExecRmt += rmtLength;
          }
        }
      });
    } else {
      // MODE B: ALL PLANNED DESIGN ROWS
      const execBySerial = new Map();
      const execByAlignCh = new Map();
      minorExecs.forEach(e => {
        if (e.serialNo !== undefined && e.serialNo !== null) {
          execBySerial.set(Number(e.serialNo), e);
        }
        const align = String(e.alignment || e.component || '').trim().toUpperCase();
        const ch = parseFloat(e.execution?.chainage ?? e.chainage);
        if (align && !isNaN(ch)) {
          execByAlignCh.set(`${align}_${ch.toFixed(3)}`, e);
        }
      });

      const alignmentGroups = new Map();
      designRows.forEach((r, idx) => {
        const align = r.alignment || 'MAIN';
        if (!alignmentGroups.has(align)) alignmentGroups.set(align, []);
        alignmentGroups.get(align).push({ ...r, __originalIndex: idx + 1 });
      });

      alignmentGroups.forEach(group => {
        group.sort((a, b) => (parseFloat(a.chainage) || 0) - (parseFloat(b.chainage) || 0));

        group.forEach((r, i) => {
          const curCh = parseFloat(r.chainage) || 0;
          let rmtLength = 0;
          if (i === 0) {
            const nextCh = group[1] ? parseFloat(group[1].chainage) || 0 : 0;
            rmtLength = nextCh > curCh ? nextCh - curCh : 20;
          } else {
            const prevCh = parseFloat(group[i - 1].chainage) || 0;
            rmtLength = Math.max(0, curCh - prevCh);
          }
          rmtLength = Math.round(rmtLength * 1000) / 1000;

          const rAlign = String(r.alignment || '').trim().toUpperCase();
          const rCh = parseFloat(r.chainage);
          const execEntry =
            execBySerial.get(Number(r.serialNo)) ||
            execBySerial.get(r.__originalIndex) ||
            (!isNaN(rCh) ? execByAlignCh.get(`${rAlign}_${rCh.toFixed(3)}`) : null);

          const excavation = execEntry ? Boolean(execEntry.excavation ?? execEntry.execution?.excavation ?? true) : false;
          const pipeLaying = execEntry ? Boolean(execEntry.pipeLaying ?? execEntry.execution?.pipeLaying ?? true) : false;
          const backFilling = execEntry ? Boolean(execEntry.backFilling ?? execEntry.execution?.backFilling ?? true) : false;
          const isExecuted = excavation && pipeLaying && backFilling;
          const remark = execEntry?.remarks || execEntry?.execution?.remarks || r.valve || r.remarks || '';

          processedRows.push({
            ...r,
            __id: `row_${currentMinor.id}_${r.__originalIndex}`,
            __serialNo: r.__originalIndex,
            minorName: currentMinor.minorName,
            minorId: currentMinor.id,
            rmtLength,
            excavation,
            pipeLaying,
            backFilling,
            isExecuted,
            remark,
            execEntryId: execEntry?.id || null
          });

          const rowDia = parseFloat(r.pipeDia);
          if (rowDia && dTotals[rowDia] !== undefined) {
            dTotals[rowDia] += rmtLength;
            totalRmt += rmtLength;

            if (isExecuted) {
              dExecTotals[rowDia] += rmtLength;
              totalExecRmt += rmtLength;
            }
          }
        });
      });
    }

    processedRows.sort((a, b) => a.__serialNo - b.__serialNo);

    allMinorsSummary.sortedCombinedDias.forEach(dia => {
      const tot = dTotals[dia];
      const exec = dExecTotals[dia];
      if (tot > 0) {
        dPercentages[dia] = Number(((exec / tot) * 100).toFixed(2));
      } else {
        dPercentages[dia] = null;
      }
    });

    const overallPct = totalRmt > 0 ? Number(((totalExecRmt / totalRmt) * 100).toFixed(2)) : 0;

    // Group the minor's rows by Alignment
    const minorGroupedRows = buildAlignmentGroups(processedRows, allMinorsSummary.sortedCombinedDias, [currentMinor]);

    return {
      rows: processedRows,
      groupedRows: minorGroupedRows,
      dTotals,
      dExecTotals,
      dPercentages,
      totalRmt,
      totalExecRmt,
      overallPct,
      executedCount: minorExecs.length,
      designCount: designRows.length
    };
  }, [currentMinor, allExecutions, allMinorsSummary.sortedCombinedDias, dataSourceMode]);

  // 3. Filtered Grouped Rows (The Primary Alignment-Grouped View)
  const activeGroupedRows = useMemo(() => {
    const rawGroups = isCombinedView
      ? allMinorsSummary.combinedGroupedRows
      : currentMinorData?.groupedRows || [];

    return rawGroups.filter(g => {
      if (alignmentFilter && g.alignment !== alignmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          String(g.alignment || '').toLowerCase().includes(q) ||
          String(g.chainageDisplay || '').toLowerCase().includes(q) ||
          String(g.pipeDiaDisplay || '').toLowerCase().includes(q) ||
          String(g.remarkDisplay || '').toLowerCase().includes(q) ||
          String(g.minorNamesDisplay || '').toLowerCase().includes(q) ||
          g.subRows.some(sr =>
            String(sr.chainage || '').toLowerCase().includes(q) ||
            String(sr.remark || '').toLowerCase().includes(q)
          );
        if (!matches) return false;
      }
      return true;
    });
  }, [
    isCombinedView,
    allMinorsSummary.combinedGroupedRows,
    currentMinorData?.groupedRows,
    alignmentFilter,
    searchQuery
  ]);

  // 4. Filtered Detailed Rows (Flat view fallback)
  const activeDetailedRows = useMemo(() => {
    const raw = isCombinedView ? allMinorsSummary.allCombinedRows : currentMinorData?.rows || [];

    return raw.filter(r => {
      if (alignmentFilter && r.alignment !== alignmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          String(r.minorName || '').toLowerCase().includes(q) ||
          String(r.alignment || '').toLowerCase().includes(q) ||
          String(r.chainage || '').toLowerCase().includes(q) ||
          String(r.pipeDia || '').toLowerCase().includes(q) ||
          String(r.remark || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [isCombinedView, allMinorsSummary.allCombinedRows, currentMinorData?.rows, alignmentFilter, searchQuery]);

  // 5. Expand / Collapse handlers
  const toggleExpand = (groupId: string) => {
    setExpandedAlignments(prev => {
      const next = new Set<string>(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedAlignments(new Set<string>(activeGroupedRows.map(g => g.id)));
  };

  const handleCollapseAll = () => {
    setExpandedAlignments(new Set<string>());
  };

  // 6. ABSTRACT COMPARATIVE TABLE (All Minors with Grand Total Row)
  const abstractData = useMemo(() => {
    let grandRows = 0;
    let grandRmt = 0;
    let grandExc = 0;
    let grandPl = 0;
    let grandBf = 0;
    let grandFullyExec = 0;

    const list = minors.map(m => {
      const dRows = getDesignByProject(m.id) || (m.serialNo ? getDesignByProject(m.serialNo) : []);
      const mExecs = allExecutions.filter(
        e => e.projectNo === m.id || (m.serialNo && e.projectNo === m.serialNo)
      );

      let totalRmt = 0;
      let excRmt = 0;
      let plRmt = 0;
      let bfRmt = 0;
      let fullyExecutedRmt = 0;

      const alignMap = new Map();
      dRows.forEach((r, idx) => {
        const a = r.alignment || 'MAIN';
        if (!alignMap.has(a)) alignMap.set(a, []);
        alignMap.get(a).push({ ...r, __idx: idx + 1 });
      });

      const execBySerial = new Map();
      const execByAlignCh = new Map();
      mExecs.forEach(e => {
        if (e.serialNo !== undefined && e.serialNo !== null) {
          execBySerial.set(Number(e.serialNo), e);
        }
        const a = String(e.alignment || e.component || '').trim().toUpperCase();
        const ch = parseFloat(e.execution?.chainage ?? e.chainage);
        if (a && !isNaN(ch)) {
          execByAlignCh.set(`${a}_${ch.toFixed(3)}`, e);
        }
      });

      alignMap.forEach(group => {
        group.sort((a, b) => (parseFloat(a.chainage) || 0) - (parseFloat(b.chainage) || 0));
        group.forEach((r, i) => {
          const curCh = parseFloat(r.chainage) || 0;
          let rmt = 20;
          if (i > 0) {
            const prevCh = parseFloat(group[i - 1].chainage) || 0;
            rmt = Math.max(0, curCh - prevCh);
          }
          totalRmt += rmt;

          const rAlign = String(r.alignment || '').trim().toUpperCase();
          const e =
            execBySerial.get(Number(r.serialNo)) ||
            execBySerial.get(r.__idx) ||
            (!isNaN(curCh) ? execByAlignCh.get(`${rAlign}_${curCh.toFixed(3)}`) : null);

          if (e) {
            const isExc = e.excavation !== false;
            const isPl = e.pipeLaying !== false;
            const isBf = e.backFilling !== false;
            if (isExc) excRmt += rmt;
            if (isPl) plRmt += rmt;
            if (isBf) bfRmt += rmt;
            if (isExc && isPl && isBf) {
              fullyExecutedRmt += rmt;
            }
          }
        });
      });

      const pct = totalRmt > 0 ? Math.min(100, Math.round((fullyExecutedRmt / totalRmt) * 100)) : 0;

      grandRows += dRows.length;
      grandRmt += totalRmt;
      grandExc += excRmt;
      grandPl += plRmt;
      grandBf += bfRmt;
      grandFullyExec += fullyExecutedRmt;

      return {
        id: m.id,
        minorName: m.minorName,
        contractorName: m.contractorName || 'Sai Krupa Engineering Works',
        totalRows: dRows.length,
        totalRmt: Math.round(totalRmt),
        excRmt: Math.round(excRmt),
        plRmt: Math.round(plRmt),
        bfRmt: Math.round(bfRmt),
        fullyExecutedRmt: Math.round(fullyExecutedRmt),
        percentage: pct
      };
    });

    const grandOverallPct = grandRmt > 0 ? Math.min(100, Math.round((grandFullyExec / grandRmt) * 100)) : 0;

    return {
      minorsList: list,
      totals: {
        totalRows: grandRows,
        totalRmt: Math.round(grandRmt),
        excRmt: Math.round(grandExc),
        plRmt: Math.round(grandPl),
        bfRmt: Math.round(grandBf),
        fullyExecutedRmt: Math.round(grandFullyExec),
        percentage: grandOverallPct
      }
    };
  }, [minors, allExecutions]);

  // 7. Handle Save Remark for a row
  const handleSaveRemark = (row) => {
    const minorId = row.minorId || currentMinor?.id;
    if (!minorId) return;

    if (row.execEntryId) {
      updateExecution(row.execEntryId, { remarks: tempRemark });
    } else {
      const newEntry = {
        id: generateId(),
        projectNo: minorId,
        projectName: row.minorName || 'Minor',
        serialNo: row.__serialNo,
        alignment: row.alignment,
        submitDate: new Date().toISOString().split('T')[0],
        remarks: tempRemark,
        excavation: row.excavation,
        pipeLaying: row.pipeLaying,
        backFilling: row.backFilling,
        design: {
          alignment: row.alignment,
          chainage: row.chainage,
          elevation: row.elevation,
          pipeDia: row.pipeDia,
          valve: row.valve || ''
        },
        execution: {
          chainage: row.chainage,
          elevation: row.elevation,
          pipeDia: row.pipeDia
        }
      };
      saveExecution(newEntry);
    }
    setEditingRemarkRow(null);
    setTempRemark('');
    toast.success('Remark updated');
    onDataUpdated && onDataUpdated();
  };

  // 10. Export to Excel (.xlsx) with Grouped Alignment Sheet, Detailed Rows, and Abstract
  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: ALIGNMENT GROUPED DPR SHEET (As requested)
    const groupedHeaders = [
      ...(isCombinedView ? ['Minor Name'] : []),
      'Alignment',
      'Chainage Range',
      'Elevation Range',
      'Pipe Dia',
      'Excavation',
      'Pipe Laying',
      'Back Filling',
      'Remarks / Valves',
      ...allMinorsSummary.sortedCombinedDias
    ];

    const groupedExportRows = [groupedHeaders];
    activeGroupedRows.forEach(g => {
      const row = [
        ...(isCombinedView ? [g.minorNamesDisplay || ''] : []),
        g.alignment,
        g.chainageDisplay,
        g.elevationDisplay,
        g.pipeDiaDisplay,
        g.excStatus.label,
        g.plStatus.label,
        g.bfStatus.label,
        g.remarkDisplay
      ];
      allMinorsSummary.sortedCombinedDias.forEach(d => {
        row.push(g.diaSums[d] || 0);
      });
      groupedExportRows.push(row);
    });

    // Grand Total Row
    const grandTotalRow = [
      ...(isCombinedView ? ['ALL MINORS'] : []),
      'TOTAL RMT PIPE',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ...allMinorsSummary.sortedCombinedDias.map(d => allMinorsSummary.gDiaTotals[d] || 0)
    ];
    groupedExportRows.push(grandTotalRow);

    const wsGrouped = XLSX.utils.aoa_to_sheet(groupedExportRows);
    XLSX.utils.book_append_sheet(wb, wsGrouped, 'ALIGNMENTS_SUMMARY');

    // Sheet 2: DETAILED CHAINAGE ROWS
    const detailedHeaders = [
      ...(isCombinedView ? ['Minor Name'] : []),
      'Alignment',
      'Chainage',
      'Elevation',
      'Pipe Dia',
      'Excavation',
      'Pipe Laying',
      'Back Filling',
      'Remark',
      ...allMinorsSummary.sortedCombinedDias
    ];
    const detailedExportRows = [detailedHeaders];
    activeDetailedRows.forEach(r => {
      const diaNum = parseFloat(r.pipeDia);
      const row = [
        ...(isCombinedView ? [r.minorName] : []),
        r.alignment || 'MAIN',
        r.chainage,
        r.elevation,
        r.pipeDia,
        r.excavation ? 'TRUE' : 'PENDING',
        r.pipeLaying ? 'TRUE' : 'PENDING',
        r.backFilling ? 'TRUE' : 'PENDING',
        r.remark || ''
      ];
      allMinorsSummary.sortedCombinedDias.forEach(d => {
        row.push(d === diaNum ? r.rmtLength : 0);
      });
      detailedExportRows.push(row);
    });
    const wsDetailed = XLSX.utils.aoa_to_sheet(detailedExportRows);
    XLSX.utils.book_append_sheet(wb, wsDetailed, 'DETAILED_CHAINAGES');

    // Sheet 3: ABSTRACT COMPARATIVE SHEET
    const abstractHeaders = [
      'Minor Name',
      'Contractor',
      'Total Rows',
      'Total RMT Pipe',
      'Excavation (RMT)',
      'Pipe Laying (RMT)',
      'Back Filling (RMT)',
      'Overall Execution %'
    ];
    const abstractRows = [
      abstractHeaders,
      ...abstractData.minorsList.map(a => [
        a.minorName,
        a.contractorName,
        a.totalRows,
        a.totalRmt,
        a.excRmt,
        a.plRmt,
        a.bfRmt,
        `${a.percentage}%`
      ]),
      [
        'TOTAL / SUM (ALL MINORS)',
        'ALL CONTRACTORS',
        abstractData.totals.totalRows,
        abstractData.totals.totalRmt,
        abstractData.totals.excRmt,
        abstractData.totals.plRmt,
        abstractData.totals.bfRmt,
        `${abstractData.totals.percentage}%`
      ]
    ];
    const wsAbstract = XLSX.utils.aoa_to_sheet(abstractRows);
    XLSX.utils.book_append_sheet(wb, wsAbstract, 'ABSTRACT');

    XLSX.writeFile(wb, `DPR_grouped_alignments_${project?.serialNo || 'Project'}.xlsx`);
    toast.success('DPR Excel sheet with alignment groups downloaded!');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-4">
      {isDPRTableView ? (
        <>
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900">
                {isCombinedView
                  ? 'DPR All Minors Execution Sheet'
                  : `DPR Execution Sheet — ${currentMinor?.minorName || 'Minor'}`}
              </h3>
              {dataSourceMode === 'excavation' && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                  Excavation Page Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Data Source Mode Switch: Excavation Page (Default) vs All Planned Design */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setDataSourceMode('excavation')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                dataSourceMode === 'excavation'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Based on Excavation Page table: only executed entries shown, no false entries"
            >
              <CheckCircle2 size={12} />
              <span>
                Excavation Entries {allMinorsSummary.totalExecutedEntriesCount > 0 ? `(${allMinorsSummary.totalExecutedEntriesCount})` : ''}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDataSourceMode('all_design')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                dataSourceMode === 'all_design'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Display all planned design rows including unexecuted items"
            >
              <Layers size={12} />
              <span>All Planned Design</span>
            </button>
          </div>

          {/* View Mode Segmented Switch */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grouped'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderTree size={12} />
              <span>Grouped Alignments</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'detailed'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table size={12} />
              <span>Detailed Rows</span>
            </button>
          </div>

          {/* Quick Expand All / Collapse All for Grouped Mode */}
          {viewMode === 'grouped' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium cursor-pointer"
                title="Expand all alignment groups to see detailed chainage points"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium cursor-pointer"
                title="Collapse all alignment groups to compact view"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* Search Chainage / Alignment / Remark */}
          <div className="relative min-w-[150px] sm:min-w-[180px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Alignment Filter */}
          {allMinorsSummary.allAlignments.length > 1 && (
            <select
              value={alignmentFilter}
              onChange={(e) => setAlignmentFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Alignments ({allMinorsSummary.allAlignments.length})</option>
              {allMinorsSummary.allAlignments.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}

          {/* Export to Excel Button */}
          <button
            type="button"
            onClick={handleExportToExcel}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded shadow-xs transition-colors cursor-pointer flex-shrink-0 whitespace-nowrap"
          >
            <Download size={13} />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* 3. Main Table Area */}
      {/* SPREADSHEET TABLE VIEW (GROUPED OR DETAILED) */}
      <div className="overflow-auto min-h-[380px] max-h-[620px] relative scroll-smooth">
          {(viewMode === 'grouped' ? activeGroupedRows.length === 0 : activeDetailedRows.length === 0) ? (
            <div className="p-12 text-center text-slate-500 space-y-3 bg-slate-50/50 rounded-lg m-4 border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <FileSpreadsheet size={24} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-800">
                  {isCombinedView
                    ? 'No excavation entries recorded across any minors yet.'
                    : `No excavation entries recorded for "${currentMinor?.minorName}" yet (0% executed).`}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {dataSourceMode === 'excavation'
                    ? 'This sheet is currently showing records based on the Excavation Page table. Only verified executed work is displayed so false entries are omitted.'
                    : 'No design rows uploaded for this minor. Upload a design file to populate the sheet.'}
                </p>
              </div>
              {dataSourceMode === 'excavation' && (
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDataSourceMode('all_design')}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md text-xs font-semibold cursor-pointer border border-slate-300 shadow-2xs"
                  >
                    View All Planned Design Rows
                  </button>
                </div>
              )}
            </div>
          ) : (
            <table className="min-w-full text-xs text-left border-collapse font-sans">
              {/* Header Row */}
              <thead className="sticky top-0 z-20 shadow-xs select-none">
                <tr className="text-[11px] font-bold text-slate-800">
                  {/* Minor Column (Visible on Combined View) */}
                  {isCombinedView && (
                    <th className="bg-[#d2e3fc] text-blue-950 px-3 py-2 border-b-2 border-blue-400 border-r border-blue-200 text-center whitespace-nowrap">
                      Minor Name
                    </th>
                  )}

                  {/* Green Section on Left */}
                  <th className="bg-[#e6f4ea] text-emerald-950 px-3 py-2 border-b-2 border-emerald-400 border-r border-emerald-200 text-center whitespace-nowrap">
                    Alignment
                  </th>
                  <th
                    className="bg-[#e6f4ea] text-emerald-950 px-3 py-2 border-b-2 border-emerald-400 border-r border-emerald-200 text-center whitespace-nowrap"
                    title="Chainage range for this alignment (min - max)"
                  >
                    Chainage {viewMode === 'grouped' ? '(Range)' : ''}
                  </th>
                  <th
                    className="bg-[#e6f4ea] text-emerald-950 px-3 py-2 border-b-2 border-emerald-400 border-r border-emerald-200 text-center whitespace-nowrap"
                    title="Elevation range for this alignment (min - max)"
                  >
                    Elevation {viewMode === 'grouped' ? '(Range)' : ''}
                  </th>
                  <th
                    className="bg-[#e6f4ea] text-emerald-950 px-3 py-2 border-b-2 border-emerald-400 border-r border-emerald-200 text-center whitespace-nowrap"
                    title="Pipe diameter range for this alignment (min - max)"
                  >
                    Pipe Dia {viewMode === 'grouped' ? '(Range)' : ''}
                  </th>
                  <th className="bg-[#e6f4ea] text-emerald-950 px-3 py-2 border-b-2 border-emerald-400 border-r border-emerald-200 text-center whitespace-nowrap">
                    Excavation
                  </th>
                  <th className="bg-[#e6f4ea] text-emerald-950 px-3 py-2 border-b-2 border-emerald-400 border-r border-emerald-200 text-center whitespace-nowrap">
                    Pipe Laying
                  </th>
                  <th className="bg-[#e6f4ea] text-emerald-950 px-3 py-2 border-b-2 border-emerald-400 border-r border-emerald-200 text-center whitespace-nowrap">
                    Back Filling
                  </th>
                  <th className="bg-[#e6f4ea] text-emerald-950 px-4 py-2 border-b-2 border-emerald-400 border-r-2 border-slate-400 text-left whitespace-nowrap min-w-[140px]">
                    Remark / Valves
                  </th>

                  {/* Red / Peach Diameter Columns on Right (Sum of Quantities Column-wise) */}
                  {allMinorsSummary.sortedCombinedDias.map(dia => (
                    <th
                      key={dia}
                      className="bg-[#fce8e6] text-[#b06000] px-3 py-2 border-b-2 border-amber-400 border-r border-amber-200 text-center font-black font-mono whitespace-nowrap min-w-[65px]"
                      title={`Sum of RMT pipe length for diameter ${dia}`}
                    >
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px]">
                {viewMode === 'grouped' ? (
                  /* ============================================================== */
                  /* A. GROUPED VIEW: 1 Consolidated Row Per Alignment              */
                  /* Green columns show ranges; Red columns show column-wise sums   */
                  /* ============================================================== */
                  activeGroupedRows.map((g) => {
                    const isExpanded = expandedAlignments.has(g.id);
                    const isFullyExecuted = g.fullyExecCount === g.totalRows && g.totalRows > 0;

                    return (
                      <React.Fragment key={g.id}>
                        {/* 1. Main Consolidated Alignment Row */}
                        <tr
                          className={`hover:bg-amber-50/50 transition-colors ${
                            isFullyExecuted ? 'bg-emerald-50/30' : isExpanded ? 'bg-indigo-50/20' : 'bg-white'
                          }`}
                        >
                          {/* Minor Name (in Combined View) */}
                          {isCombinedView && (
                            <td className="px-2.5 py-2 text-center font-bold text-indigo-700 bg-indigo-50/40 border-r border-slate-200 whitespace-nowrap">
                              {g.minorNamesDisplay || 'Project'}
                            </td>
                          )}

                          {/* Alignment Name with Expand Chevron & Point Count */}
                          <td className="px-2.5 py-2 text-center font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 justify-center">
                              <button
                                type="button"
                                onClick={() => toggleExpand(g.id)}
                                className="p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors"
                                title={isExpanded ? 'Collapse chainage points' : 'Expand chainage points'}
                              >
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                              <span className="font-bold text-slate-900 font-mono">{g.alignment}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-semibold">
                                {g.totalRows} pts
                              </span>
                            </div>
                          </td>

                          {/* Chainage Range (e.g. 1800 - 1920) */}
                          <td className="px-3 py-2 text-center font-mono font-bold text-emerald-950 bg-emerald-50/30 border-r border-slate-200 whitespace-nowrap">
                            {g.chainageDisplay}
                          </td>

                          {/* Elevation Range (e.g. 261.24 - 262.39) */}
                          <td className="px-3 py-2 text-center font-mono text-slate-700 bg-emerald-50/15 border-r border-slate-200 whitespace-nowrap">
                            {g.elevationDisplay}
                          </td>

                          {/* Pipe Dia (single or range, e.g. 140) */}
                          <td className="px-3 py-2 text-center font-mono font-bold text-slate-900 bg-emerald-50/15 border-r border-slate-200 whitespace-nowrap">
                            {g.pipeDiaDisplay}
                          </td>

                          {/* Excavation Status (Normal Text) */}
                          <td className="px-3 py-2 text-center font-mono font-bold text-[11px] border-r border-slate-200 whitespace-nowrap">
                            <span className={g.excStatus.label === 'TRUE' ? 'text-emerald-700' : 'text-amber-600'}>
                              {g.excStatus.label}
                            </span>
                          </td>

                          {/* Pipe Laying Status (Normal Text) */}
                          <td className="px-3 py-2 text-center font-mono font-bold text-[11px] border-r border-slate-200 whitespace-nowrap">
                            <span className={g.plStatus.label === 'TRUE' ? 'text-emerald-700' : 'text-amber-600'}>
                              {g.plStatus.label}
                            </span>
                          </td>

                          {/* Back Filling Status (Normal Text) */}
                          <td className="px-3 py-2 text-center font-mono font-bold text-[11px] border-r border-slate-200 whitespace-nowrap">
                            <span className={g.bfStatus.label === 'TRUE' ? 'text-emerald-700' : 'text-amber-600'}>
                              {g.bfStatus.label}
                            </span>
                          </td>

                          {/* Remark / Distinct Valves */}
                          <td className="px-3 py-2 border-r-2 border-slate-400 whitespace-nowrap max-w-[200px] truncate" title={g.remarkDisplay}>
                            <span className={g.remarkDisplay !== '-' ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                              {g.remarkDisplay}
                            </span>
                          </td>

                          {/* Red / Peach Columns: Sum of Quantities (RMT pipe) for this alignment */}
                          {allMinorsSummary.sortedCombinedDias.map(dia => {
                            const val = g.diaSums[dia] || 0;
                            const hasVal = val > 0;
                            return (
                              <td
                                key={dia}
                                className={`px-3 py-2 text-center font-mono border-r border-slate-200 whitespace-nowrap ${
                                  hasVal
                                    ? 'bg-amber-100/50 font-black text-amber-950 text-xs'
                                    : 'text-slate-300'
                                }`}
                              >
                                {hasVal ? val.toFixed(1) : 0}
                              </td>
                            );
                          })}
                        </tr>

                        {/* 2. Expanded Child Rows (Indented Chainage Points Drill-Down) */}
                        {isExpanded &&
                          g.subRows.map((r, subIdx) => {
                            const rowDia = parseFloat(r.pipeDia);
                            return (
                              <tr
                                key={r.__id || `${g.id}_${subIdx}`}
                                className="bg-slate-50/70 hover:bg-amber-50/30 transition-colors border-b border-slate-200/60 text-[10.5px]"
                              >
                                {isCombinedView && (
                                  <td className="px-2.5 py-1 text-center font-mono text-slate-400 border-r border-slate-200">
                                    ↳ {r.minorName}
                                  </td>
                                )}

                                <td className="px-2 py-1 text-left font-mono text-slate-500 border-r border-slate-200 pl-6">
                                  <span className="text-slate-400">↳ Pt {subIdx + 1}</span>
                                </td>

                                <td className="px-3 py-1 text-center font-mono font-medium text-slate-700 border-r border-slate-200">
                                  {r.chainage}
                                </td>

                                <td className="px-3 py-1 text-center font-mono text-slate-500 border-r border-slate-200">
                                  {r.elevation ? Number(r.elevation).toFixed(2) : '-'}
                                </td>

                                <td className="px-3 py-1 text-center font-mono font-semibold text-slate-700 border-r border-slate-200">
                                  {r.pipeDia}
                                </td>

                                <td className="px-3 py-1 text-center font-mono font-semibold text-[11px] border-r border-slate-200">
                                  <span className={r.excavation ? 'text-emerald-700' : 'text-amber-600'}>
                                    {r.excavation ? 'TRUE' : 'PENDING'}
                                  </span>
                                </td>

                                <td className="px-3 py-1 text-center font-mono font-semibold text-[11px] border-r border-slate-200">
                                  <span className={r.pipeLaying ? 'text-emerald-700' : 'text-amber-600'}>
                                    {r.pipeLaying ? 'TRUE' : 'PENDING'}
                                  </span>
                                </td>

                                <td className="px-3 py-1 text-center font-mono font-semibold text-[11px] border-r border-slate-200">
                                  <span className={r.backFilling ? 'text-emerald-700' : 'text-amber-600'}>
                                    {r.backFilling ? 'TRUE' : 'PENDING'}
                                  </span>
                                </td>

                                <td className="px-3 py-1 text-left border-r-2 border-slate-400 whitespace-nowrap">
                                  {editingRemarkRow === r.__id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={tempRemark}
                                        onChange={(e) => setTempRemark(e.target.value)}
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveRemark(r);
                                          if (e.key === 'Escape') setEditingRemarkRow(null);
                                        }}
                                        className="border border-indigo-400 rounded px-1.5 py-0.5 text-xs w-28 focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveRemark(r)}
                                        className="p-0.5 text-emerald-600 hover:text-emerald-800"
                                      >
                                        <Check size={12} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      onClick={() => {
                                        setEditingRemarkRow(r.__id);
                                        setTempRemark(r.remark || '');
                                      }}
                                      className={`cursor-pointer hover:underline ${
                                        r.remark ? 'text-slate-700' : 'text-slate-300 italic'
                                      }`}
                                    >
                                      {r.remark || '-'}
                                    </span>
                                  )}
                                </td>

                                {allMinorsSummary.sortedCombinedDias.map(dia => {
                                  const isMatch = dia === rowDia;
                                  return (
                                    <td
                                      key={dia}
                                      className={`px-3 py-1 text-center font-mono border-r border-slate-200 ${
                                        isMatch ? 'text-slate-900 font-semibold bg-amber-50/50' : 'text-slate-300'
                                      }`}
                                    >
                                      {isMatch ? r.rmtLength : 0}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                ) : (
                  /* ============================================================== */
                  /* B. DETAILED VIEW: All Individual Chainage Rows (Flat List)     */
                  /* ============================================================== */
                  activeDetailedRows.map((r, rIdx) => {
                    const rowDia = parseFloat(r.pipeDia);
                    return (
                      <tr
                        key={r.__id || rIdx}
                        className={`hover:bg-amber-50/40 transition-colors ${r.isExecuted ? 'bg-emerald-50/20' : ''}`}
                      >
                        {isCombinedView && (
                          <td className="px-2.5 py-1.5 text-center font-bold text-indigo-700 bg-indigo-50/40 border-r border-slate-200 whitespace-nowrap">
                            {r.minorName}
                          </td>
                        )}

                        <td className="px-3 py-1.5 text-center font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {r.alignment || 'MAIN'}
                        </td>

                        <td className="px-3 py-1.5 text-center font-mono font-medium text-slate-800 border-r border-slate-200 whitespace-nowrap">
                          {r.chainage}
                        </td>

                        <td className="px-3 py-1.5 text-center font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap">
                          {r.elevation ? Number(r.elevation).toFixed(2) : '-'}
                        </td>

                        <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                          {r.pipeDia}
                        </td>

                        <td className="px-3 py-1.5 text-center font-mono font-bold text-[11px] border-r border-slate-200 whitespace-nowrap">
                          <span className={r.excavation ? 'text-emerald-700' : 'text-amber-600'}>
                            {r.excavation ? 'TRUE' : 'PENDING'}
                          </span>
                        </td>

                        <td className="px-3 py-1.5 text-center font-mono font-bold text-[11px] border-r border-slate-200 whitespace-nowrap">
                          <span className={r.pipeLaying ? 'text-emerald-700' : 'text-amber-600'}>
                            {r.pipeLaying ? 'TRUE' : 'PENDING'}
                          </span>
                        </td>

                        <td className="px-3 py-1.5 text-center font-mono font-bold text-[11px] border-r border-slate-200 whitespace-nowrap">
                          <span className={r.backFilling ? 'text-emerald-700' : 'text-amber-600'}>
                            {r.backFilling ? 'TRUE' : 'PENDING'}
                          </span>
                        </td>

                        <td className="px-3 py-1.5 border-r-2 border-slate-400 whitespace-nowrap">
                          {editingRemarkRow === r.__id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={tempRemark}
                                onChange={(e) => setTempRemark(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRemark(r);
                                  if (e.key === 'Escape') setEditingRemarkRow(null);
                                }}
                                className="border border-indigo-400 rounded px-1.5 py-0.5 text-xs w-32 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRemark(r)}
                                className="p-1 text-emerald-600 hover:text-emerald-800"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingRemarkRow(r.__id);
                                setTempRemark(r.remark || '');
                              }}
                              className={`cursor-pointer hover:underline ${
                                r.remark ? 'font-semibold text-slate-800' : 'text-slate-300 italic'
                              }`}
                            >
                              {r.remark || '-'}
                            </span>
                          )}
                        </td>

                        {allMinorsSummary.sortedCombinedDias.map(dia => {
                          const isMatch = dia === rowDia;
                          return (
                            <td
                              key={dia}
                              className={`px-3 py-1.5 text-center font-mono border-r border-slate-200 whitespace-nowrap ${
                                isMatch
                                  ? 'bg-amber-50/60 font-bold text-slate-900'
                                  : 'text-slate-400'
                              }`}
                            >
                              {isMatch ? r.rmtLength : 0}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* TFOOT: SUMMARY ROWS (SHOWING TOTALS FOR CURRENT AND GRAND TOTAL ACROSS BOTH/ALL MINORS) */}
              <tfoot className="sticky bottom-0 z-20 font-mono text-[11px] font-bold shadow-lg border-t-2 border-slate-400 bg-white">
                {/* 1. CURRENT MINOR TOTALS (if viewing a single minor) */}
                {!isCombinedView && currentMinorData && (
                  <>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-300">
                      <td colSpan={8} className="px-4 py-2.5 text-right uppercase tracking-wider font-extrabold border-r-2 border-slate-400">
                        <span className="flex items-center justify-end gap-1.5">
                          <Sigma size={15} className="text-slate-600" />
                          <span>{currentMinor?.minorName || 'TOTAL'} — TOTAL RMT PIPE</span>
                        </span>
                      </td>
                      {allMinorsSummary.sortedCombinedDias.map(dia => (
                        <td key={dia} className="px-3 py-2.5 text-center border-r border-slate-300 font-extrabold text-slate-900 bg-slate-50/50">
                          {currentMinorData.dTotals[dia] > 0 ? currentMinorData.dTotals[dia].toFixed(2) : 0}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-300">
                      <td colSpan={8} className="px-4 py-2 text-right uppercase tracking-wider font-extrabold border-r-2 border-slate-400">
                        {currentMinor?.minorName || 'TOTAL'} — DIA WISE %
                      </td>
                      {allMinorsSummary.sortedCombinedDias.map(dia => {
                        const pct = currentMinorData.dPercentages[dia];
                        if (pct === null) {
                          return (
                            <td key={dia} className="px-3 py-2 text-center text-slate-400 font-normal border-r border-slate-300">
                              -
                            </td>
                          );
                        }
                        const isHigh = pct >= 90;
                        const isMid = pct > 0 && pct < 90;
                        return (
                          <td
                            key={dia}
                            className={`px-3 py-2 text-center border-r border-slate-300 font-extrabold ${
                              isHigh
                                ? 'bg-[#34a853]/30 text-emerald-950 font-black'
                                : isMid
                                ? 'bg-[#fbbc04]/30 text-amber-950 font-black'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {pct.toFixed(2)}%
                          </td>
                        );
                      })}
                    </tr>
                  </>
                )}

                {/* 2. GRAND TOTAL ROW ACROSS BOTH/ALL MINORS (Only displayed when 2+ minors exist!) */}
                {minors.length >= 2 && (
                  <>
                    <tr className="bg-amber-100/90 text-amber-950 border-b-2 border-amber-300 font-black">
                      <td
                        colSpan={isCombinedView ? 9 : 8}
                        className="px-4 py-2.5 text-right uppercase tracking-wider font-black text-amber-900 border-r-2 border-amber-400 flex-1"
                      >
                        <span className="flex items-center justify-end gap-1.5">
                          <Sigma size={15} className="text-amber-700" />
                          <span>TOTAL / SUM OF ALL {minors.length} MINORS REPORTS (RMT PIPE)</span>
                        </span>
                      </td>
                      {allMinorsSummary.sortedCombinedDias.map(dia => (
                        <td
                          key={dia}
                          className="px-3 py-2.5 text-center border-r border-amber-300 font-black text-amber-950 bg-amber-50"
                        >
                          {allMinorsSummary.gDiaTotals[dia] > 0
                            ? allMinorsSummary.gDiaTotals[dia].toFixed(2)
                            : 0}
                        </td>
                      ))}
                    </tr>

                    {/* 3. COMBINED DIA-WISE % ACROSS ALL MINORS */}
                    <tr className="bg-amber-50/70 border-b border-amber-300">
                      <td
                        colSpan={isCombinedView ? 9 : 8}
                        className="px-4 py-2 text-right uppercase tracking-wider font-extrabold text-amber-900 border-r-2 border-amber-400"
                      >
                        COMBINED DIA WISE % (ALL {minors.length} MINORS)
                      </td>
                      {allMinorsSummary.sortedCombinedDias.map(dia => {
                        const pct = allMinorsSummary.gDiaPercentages[dia];
                        if (pct === null) {
                          return (
                            <td key={dia} className="px-3 py-2 text-center text-slate-400 font-normal border-r border-amber-200">
                              -
                            </td>
                          );
                        }
                        const isHigh = pct >= 90;
                        const isMid = pct > 0 && pct < 90;
                        return (
                          <td
                            key={dia}
                            className={`px-3 py-2 text-center border-r border-amber-200 font-extrabold ${
                              isHigh
                                ? 'bg-[#34a853]/40 text-emerald-950 font-black'
                                : isMid
                                ? 'bg-[#fbbc04]/40 text-amber-950 font-black'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {pct.toFixed(2)}%
                          </td>
                        );
                      })}
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          )}
        </div>
        </>
      ) : (
        <div className="p-2 sm:p-4 overflow-y-auto">
          <FinalComparativeView
            projectNo={project?.serialNo || 'PN-002'}
            projectName={project?.projectName || 'Project'}
          />
        </div>
      )}

      {/* 4. Bottom Sheet Tabs Bar (Google Sheets Style) */}
      <div className="bg-slate-100 border-t border-slate-300 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto shadow-inner select-none">
        {/* TOTAL (ALL MINORS) TAB */}
        {minors.length >= 2 && (
          <button
            type="button"
            onClick={() => setActiveTab('COMBINED_ALL')}
            className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-t-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border-t border-x ${
              activeTab === 'COMBINED_ALL'
                ? 'bg-amber-100 text-amber-950 border-amber-400 shadow-sm border-b-2 border-b-amber-600 -mb-1.5 pb-2 font-black'
                : 'bg-slate-200/80 text-amber-900 hover:bg-slate-200 border-transparent hover:text-amber-950'
            }`}
          >
            <Sigma size={13} className="text-amber-700" />
            <span>TOTAL (ALL {minors.length} MINORS)</span>
          </button>
        )}

        {/* Individual Minors Sheets */}
        {minors.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActiveTab(m.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border-t border-x ${
              activeTab === m.id
                ? 'bg-white text-indigo-700 border-slate-300 shadow-sm border-b-2 border-b-indigo-600 -mb-1.5 pb-2'
                : 'bg-slate-200/80 text-slate-600 hover:bg-slate-200 border-transparent hover:text-slate-900'
            }`}
          >
            <span>{m.minorName}</span>
          </button>
        ))}

        {/* Divider */}
        <div className="h-5 w-px bg-slate-300 mx-1 flex-shrink-0" />

        {/* FINAL COMPARATIVE TAB & BUTTON (TOTAL OF ALL MINORS) */}
        <div className="inline-flex items-center">
          <button
            type="button"
            onClick={() => setActiveTab('FINAL_COMPARATIVE')}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border-t border-x ${
              activeTab === 'FINAL_COMPARATIVE'
                ? 'bg-teal-100 text-teal-950 border-teal-400 shadow-sm border-b-2 border-b-teal-600 -mb-1.5 pb-2 font-black'
                : 'bg-slate-200/80 text-teal-900 hover:bg-slate-200 border-transparent hover:text-teal-950'
            }`}
            title="Final Comparative Report (Total of All Minors)"
          >
            <FileBarChart2 size={13} className="text-teal-700" />
            <span>FINAL COMPARATIVE</span>
            <span className="text-[10px] bg-teal-200/90 text-teal-950 px-1 py-0.2 rounded font-extrabold">TOTAL</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/pms/final-comparative/${encodeURIComponent(project?.serialNo || 'PN-002')}`);
            }}
            className="p-1 text-slate-400 hover:text-teal-700 transition cursor-pointer"
            title="Open Final Comparative in Full Page"
          >
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
