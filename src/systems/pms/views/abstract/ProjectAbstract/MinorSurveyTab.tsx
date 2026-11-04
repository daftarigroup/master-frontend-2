// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  SurveyRow,
  Minor,
  Adjustment,
  STANDARD_PIPE_DIAS
} from '@/systems/pms/utils/abstractTypes';
import {
  calculateMinorSurveyExecuted
} from '@/systems/pms/utils/abstractEngine';
import {
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Clipboard,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface Props {
  minors: Minor[];
  selectedMinorId: string;
  onSelectMinor: (id: string) => void;
  surveyRows: SurveyRow[];
  plannedQty: Record<number, number>;
  adjustments: Adjustment[];
  onUpdateSurveyRows: (minorId: string, rows: SurveyRow[]) => void;
  onAddMinor: (name: string) => void;
}

export default function MinorSurveyTab({
  minors,
  selectedMinorId,
  onSelectMinor,
  surveyRows,
  plannedQty,
  adjustments,
  onUpdateSurveyRows,
  onAddMinor
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [newMinorName, setNewMinorName] = useState('');
  const [showAddMinorModal, setShowAddMinorModal] = useState(false);

  const currentMinor = minors.find(m => m.id === selectedMinorId) || minors[0];

  // Core execution calculation for this minor
  const calculation = useMemo(() => {
    return calculateMinorSurveyExecuted(surveyRows);
  }, [surveyRows]);

  // Minor adjustments total per dia
  const minorAdjMap = useMemo(() => {
    const map: Record<number, number> = {};
    adjustments.filter(a => a.minor_id === selectedMinorId).forEach(a => {
      map[a.pipe_dia] = (map[a.pipe_dia] || 0) + Number(a.value_m || 0);
    });
    return map;
  }, [adjustments, selectedMinorId]);

  // Overall KPIs calculation
  const kpis = useMemo(() => {
    let totalExecutedFinal = 0;
    let totalPlanned = 0;

    const diaBreakdown: Record<number, { raw: number; adj: number; final: number; planned: number; pct: number | null }> = {};

    STANDARD_PIPE_DIAS.forEach(dia => {
      const raw = calculation.executedByDia[dia] || 0;
      const adj = minorAdjMap[dia] || 0;
      const finalVal = Math.round((raw + adj) * 100) / 100;
      const planned = plannedQty[dia] || 0;

      // Show "-" if planned is 0 or blank, not #DIV/0!
      const pct = planned > 0 ? Math.round((finalVal / planned) * 1000) / 10 : null;

      diaBreakdown[dia] = { raw, adj, final: finalVal, planned, pct };

      totalExecutedFinal += finalVal;
      totalPlanned += planned;
    });

    const overallPct = totalPlanned > 0 ? Math.round((totalExecutedFinal / totalPlanned) * 1000) / 10 : null;

    return {
      totalExecutedFinal: Math.round(totalExecutedFinal * 100) / 100,
      totalPlanned: Math.round(totalPlanned * 100) / 100,
      overallPct,
      diaBreakdown
    };
  }, [calculation, minorAdjMap, plannedQty]);

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return surveyRows;
    const q = searchQuery.toLowerCase();
    return surveyRows.filter(
      r =>
        r.alignment.toLowerCase().includes(q) ||
        String(r.chainage).includes(q) ||
        String(r.pipe_dia).includes(q) ||
        r.remark.toLowerCase().includes(q)
    );
  }, [surveyRows, searchQuery]);

  // Pagination for 1,000+ rows performance
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Update a single row field
  const handleRowChange = (id: string, field: keyof SurveyRow, value: any) => {
    const updated = surveyRows.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    onUpdateSurveyRows(selectedMinorId, updated);
  };

  // Add new empty survey row
  const handleAddRow = () => {
    const lastRow = surveyRows[surveyRows.length - 1];
    const newSeq = (lastRow?.seq || 0) + 1;
    const newRow: SurveyRow = {
      id: `${selectedMinorId}_row_${Date.now()}`,
      minor_id: selectedMinorId,
      seq: newSeq,
      alignment: lastRow?.alignment || 'L-1',
      chainage: (Number(lastRow?.chainage) || 0) + 20,
      pipe_dia: lastRow?.pipe_dia || 140,
      excavation_done: true,
      pipe_laying_done: true,
      back_filling_done: true,
      remark: 'New survey point'
    };
    onUpdateSurveyRows(selectedMinorId, [...surveyRows, newRow]);
    toast.success('Survey row added');
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    const updated = surveyRows.filter(r => r.id !== id);
    onUpdateSurveyRows(selectedMinorId, updated);
    toast.success('Survey row deleted');
  };

  // Bulk paste handler
  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim()) return;
    const lines = bulkPasteText.trim().split(/\r?\n/);
    const newRows: SurveyRow[] = [];
    let startSeq = surveyRows.length > 0 ? surveyRows[surveyRows.length - 1].seq + 1 : 1;

    lines.forEach((line, idx) => {
      // Split by tab or comma
      const parts = line.split(/[\t,]/).map(s => s.trim());
      if (parts.length < 2) return;

      // format: alignment, chainage, pipe_dia, exc, pl, bf, remark
      const alignment = parts[0] || 'SM-1';
      const chainage = parseFloat(parts[1]) || 0;
      const pipe_dia = parseFloat(parts[2]) || 140;
      const excavation_done = parts[3] ? ['true', '1', 'yes', 'y'].includes(parts[3].toLowerCase()) : true;
      const pipe_laying_done = parts[4] ? ['true', '1', 'yes', 'y'].includes(parts[4].toLowerCase()) : true;
      const back_filling_done = parts[5] ? ['true', '1', 'yes', 'y'].includes(parts[5].toLowerCase()) : true;
      const remark = parts[6] || '';

      newRows.push({
        id: `${selectedMinorId}_bulk_${Date.now()}_${idx}`,
        minor_id: selectedMinorId,
        seq: startSeq + idx,
        alignment,
        chainage,
        pipe_dia,
        excavation_done,
        pipe_laying_done,
        back_filling_done,
        remark
      });
    });

    if (newRows.length > 0) {
      onUpdateSurveyRows(selectedMinorId, [...surveyRows, ...newRows]);
      toast.success(`${newRows.length} survey rows imported!`);
      setBulkPasteText('');
      setShowBulkPasteModal(false);
    } else {
      toast.error('No valid survey rows parsed. Check format.');
    }
  };

  // File import (CSV or Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length <= 1) {
          toast.error('Imported spreadsheet has no data rows');
          return;
        }

        const newRows: SurveyRow[] = [];
        let seq = 1;

        // Skip header if first row has text
        const startRowIdx = isNaN(parseFloat(json[0][1])) ? 1 : 0;

        for (let i = startRowIdx; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;

          const alignment = String(row[0] || 'SM-1').trim();
          const chainage = parseFloat(row[1]) || 0;
          const pipe_dia = parseFloat(row[2]) || 140;
          const excavation_done = row[3] !== undefined ? String(row[3]).toLowerCase() === 'true' || row[3] === 1 : true;
          const pipe_laying_done = row[4] !== undefined ? String(row[4]).toLowerCase() === 'true' || row[4] === 1 : true;
          const back_filling_done = row[5] !== undefined ? String(row[5]).toLowerCase() === 'true' || row[5] === 1 : true;
          const remark = String(row[6] || '').trim();

          newRows.push({
            id: `${selectedMinorId}_imp_${Date.now()}_${i}`,
            minor_id: selectedMinorId,
            seq: seq++,
            alignment,
            chainage,
            pipe_dia,
            excavation_done,
            pipe_laying_done,
            back_filling_done,
            remark
          });
        }

        if (newRows.length > 0) {
          onUpdateSurveyRows(selectedMinorId, newRows);
          toast.success(`Imported ${newRows.length} survey rows successfully!`);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse file. Please upload standard CSV or XLSX.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-4">
      {/* Minor Selector Navigation Pills */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1">
            Village / Minor:
          </span>
          {minors.map(m => (
            <button
              key={m.id}
              onClick={() => {
                onSelectMinor(m.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                m.id === selectedMinorId
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {m.name}
            </button>
          ))}
          <button
            onClick={() => setShowAddMinorModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
          >
            <Plus size={13} /> Add Minor
          </button>
        </div>

        {/* Diagnostic flags summary */}
        <div className="flex items-center gap-2 text-xs">
          {calculation.diagnostics.negativeSegments.length > 0 && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <AlertTriangle size={12} /> {calculation.diagnostics.negativeSegments.length} Decreased Chainage Segment(s)
            </span>
          )}
          {calculation.diagnostics.blankDiaRows.length > 0 && (
            <span className="bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <AlertTriangle size={12} /> {calculation.diagnostics.blankDiaRows.length} Missing Pipe Dia on Backfill
            </span>
          )}
        </div>
      </div>

      {/* Minor Detail Header & KPIs Banner */}
      <div className="bg-slate-900 text-white rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>{currentMinor?.name}</span>
              <span className="text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                {surveyRows.length} Survey Rows
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Contractor: {currentMinor?.contractor || 'Pooja Construction'} | Village: {currentMinor?.village || currentMinor?.name}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Overall Minor Completion %</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {kpis.overallPct !== null ? `${kpis.overallPct}%` : '-'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.min(100, kpis.overallPct || 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Executed Final: {kpis.totalExecutedFinal.toLocaleString()} m</span>
            <span>Planned Qty: {kpis.totalPlanned.toLocaleString()} m</span>
          </div>
        </div>
      </div>

      {/* Survey Table Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search alignment, chainage, remarks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredRows.length} rows
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-xs cursor-pointer"
          >
            <Plus size={13} /> Add Point
          </button>
          <button
            onClick={() => setShowBulkPasteModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold cursor-pointer border border-slate-300"
          >
            <Clipboard size={13} /> Bulk Paste
          </button>
          <label className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold cursor-pointer border border-slate-300">
            <Upload size={13} /> Import Excel/CSV
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Survey Rows Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-xs bg-white">
        <table className="min-w-full text-xs text-left border-collapse font-sans">
          <thead className="bg-slate-100 text-slate-800 uppercase text-[10px] font-black border-b border-slate-300 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 border-r border-slate-200 text-center w-12">Seq</th>
              <th className="px-3 py-2.5 border-r border-slate-200 min-w-[100px]">Alignment</th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-right min-w-[100px]">Chainage (m)</th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-right min-w-[90px]">Seg Length (m)</th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-center min-w-[90px]">Pipe Dia (mm)</th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-center min-w-[90px] bg-blue-50/60 text-blue-900">
                Excavation
              </th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-center min-w-[90px] bg-amber-50/60 text-amber-900">
                Pipe Laying
              </th>
              <th className="px-3 py-2.5 border-r border-slate-200 text-center min-w-[90px] bg-emerald-50 text-emerald-950 font-black">
                Back Filling *
              </th>
              <th className="px-3 py-2.5 border-r border-slate-200 min-w-[180px]">Remark</th>
              <th className="px-3 py-2.5 text-center w-14">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {paginatedRows.map((row, idx) => {
              // Calculate segment length from prior row in full surveyRows
              const globalIdx = surveyRows.findIndex(r => r.id === row.id);
              let segLen = 0;
              let isNegative = false;
              if (globalIdx > 0) {
                const prev = surveyRows[globalIdx - 1];
                segLen = (Number(row.chainage) || 0) - (Number(prev.chainage) || 0);
                if (segLen < 0) isNegative = true;
              }

              const isBlankDia = row.back_filling_done && (!row.pipe_dia || Number(row.pipe_dia) <= 0);

              return (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    isNegative ? 'bg-amber-50/70' : isBlankDia ? 'bg-rose-50/70' : ''
                  }`}
                >
                  {/* Sequence */}
                  <td className="px-3 py-1.5 text-center font-mono text-slate-500 border-r border-slate-200">
                    {row.seq}
                  </td>

                  {/* Alignment */}
                  <td className="px-2 py-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.alignment}
                      onChange={(e) => handleRowChange(row.id, 'alignment', e.target.value)}
                      className="w-full px-1.5 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded bg-transparent font-medium"
                    />
                  </td>

                  {/* Chainage */}
                  <td className="px-2 py-1 text-right font-mono border-r border-slate-200">
                    <div className="flex items-center justify-end gap-1">
                      {isNegative && (
                        <span title="Warning: Chainage decreased from prior row!" className="text-amber-600 font-bold">
                          ⚠️
                        </span>
                      )}
                      <input
                        type="number"
                        step="any"
                        value={row.chainage}
                        onChange={(e) => handleRowChange(row.id, 'chainage', parseFloat(e.target.value) || 0)}
                        className={`w-20 text-right px-1.5 py-0.5 text-xs font-mono border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded bg-transparent ${
                          isNegative ? 'text-amber-700 font-bold' : ''
                        }`}
                      />
                    </div>
                  </td>

                  {/* Segment Length */}
                  <td className="px-3 py-1.5 text-right font-mono border-r border-slate-200">
                    {globalIdx === 0 ? (
                      <span className="text-slate-400 italic">0 (Start)</span>
                    ) : (
                      <span className={`font-semibold ${isNegative ? 'text-rose-600' : 'text-slate-700'}`}>
                        {segLen.toFixed(1)} m
                      </span>
                    )}
                  </td>

                  {/* Pipe Dia */}
                  <td className="px-2 py-1 text-center font-mono border-r border-slate-200">
                    <select
                      value={row.pipe_dia}
                      onChange={(e) => handleRowChange(row.id, 'pipe_dia', parseFloat(e.target.value) || 0)}
                      className={`px-1.5 py-0.5 text-xs border rounded bg-transparent font-mono ${
                        isBlankDia ? 'border-rose-400 bg-rose-50 text-rose-700 font-bold' : 'border-transparent hover:border-slate-300'
                      }`}
                    >
                      <option value="0">-- Select --</option>
                      {STANDARD_PIPE_DIAS.map(d => (
                        <option key={d} value={d}>{d} mm</option>
                      ))}
                    </select>
                  </td>

                  {/* Excavation Checkbox */}
                  <td className="px-3 py-1.5 text-center border-r border-slate-200 bg-blue-50/30">
                    <input
                      type="checkbox"
                      checked={row.excavation_done}
                      onChange={(e) => handleRowChange(row.id, 'excavation_done', e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                    />
                  </td>

                  {/* Pipe Laying Checkbox */}
                  <td className="px-3 py-1.5 text-center border-r border-slate-200 bg-amber-50/30">
                    <input
                      type="checkbox"
                      checked={row.pipe_laying_done}
                      onChange={(e) => handleRowChange(row.id, 'pipe_laying_done', e.target.checked)}
                      className="w-3.5 h-3.5 text-amber-600 rounded cursor-pointer"
                    />
                  </td>

                  {/* Back Filling Checkbox (Core calculation driver) */}
                  <td className="px-3 py-1.5 text-center border-r border-slate-200 bg-emerald-50/50">
                    <input
                      type="checkbox"
                      checked={row.back_filling_done}
                      onChange={(e) => handleRowChange(row.id, 'back_filling_done', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                    />
                  </td>

                  {/* Remark */}
                  <td className="px-2 py-1 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.remark}
                      onChange={(e) => handleRowChange(row.id, 'remark', e.target.value)}
                      placeholder="Add remark..."
                      className="w-full px-1.5 py-0.5 text-xs border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded bg-transparent"
                    />
                  </td>

                  {/* Action */}
                  <td className="px-3 py-1.5 text-center">
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete row"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-slate-300 rounded px-2 py-1 text-xs"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="1000">1000 (All)</option>
          </select>
          <span className="text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-1 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-2 font-mono font-semibold">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-1 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Bottom Summary: Dia-wise Totals & KPIs (Section 2 & 4) */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp size={14} className="text-indigo-600" />
            {currentMinor?.name} — Diameter-Wise Executed Summary & Completion %
          </h4>
          <span className="text-[11px] text-slate-500 italic">
            * Note: Only Back Filling counts as executed. First survey row produces 0 length.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 border-r border-slate-200">Diameter (mm)</th>
                <th className="px-3 py-2 border-r border-slate-200 text-right">Raw Executed (m)</th>
                <th className="px-3 py-2 border-r border-slate-200 text-right">Adjustment (m)</th>
                <th className="px-3 py-2 border-r border-slate-200 text-right">Executed Final (m)</th>
                <th className="px-3 py-2 border-r border-slate-200 text-right">Planned Qty (m)</th>
                <th className="px-3 py-2 text-center">Completion %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {STANDARD_PIPE_DIAS.filter(d => {
                const b = kpis.diaBreakdown[d];
                return (b.raw > 0 || b.adj !== 0 || b.planned > 0);
              }).map(dia => {
                const b = kpis.diaBreakdown[dia];
                return (
                  <tr key={dia} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-bold text-slate-900 border-r border-slate-200">{dia} mm</td>
                    <td className="px-3 py-1.5 text-right text-slate-700 border-r border-slate-200">{b.raw.toLocaleString()} m</td>
                    <td className={`px-3 py-1.5 text-right border-r border-slate-200 ${b.adj !== 0 ? 'font-bold text-purple-700' : 'text-slate-400'}`}>
                      {b.adj !== 0 ? `${b.adj > 0 ? '+' : ''}${b.adj} m` : '-'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold text-indigo-900 border-r border-slate-200">{b.final.toLocaleString()} m</td>
                    <td className="px-3 py-1.5 text-right text-slate-600 border-r border-slate-200">{b.planned > 0 ? `${b.planned.toLocaleString()} m` : '-'}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        b.pct === null ? 'text-slate-400' : b.pct >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {b.pct !== null ? `${b.pct}%` : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-mono text-xs font-bold">
              <tr>
                <td className="px-3 py-2 uppercase text-amber-300 border-r border-slate-700">Total / Overall</td>
                <td className="px-3 py-2 text-right border-r border-slate-700">-</td>
                <td className="px-3 py-2 text-right border-r border-slate-700">-</td>
                <td className="px-3 py-2 text-right font-black text-amber-300 border-r border-slate-700">{kpis.totalExecutedFinal.toLocaleString()} m</td>
                <td className="px-3 py-2 text-right font-black text-white border-r border-slate-700">{kpis.totalPlanned.toLocaleString()} m</td>
                <td className="px-3 py-2 text-center text-emerald-400 font-black">
                  {kpis.overallPct !== null ? `${kpis.overallPct}%` : '-'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bulk Paste Modal */}
      {showBulkPasteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-5 space-y-3 shadow-xl">
            <h4 className="font-bold text-slate-900 text-sm">Bulk Paste Survey Points</h4>
            <p className="text-xs text-slate-500">
              Paste lines from Excel or CSV. Format per line:<br />
              <code>Alignment [tab] Chainage [tab] PipeDia [tab] Excavation [tab] PipeLaying [tab] BackFilling [tab] Remark</code>
            </p>
            <textarea
              rows={8}
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              placeholder="SM-1	20	140	true	true	true	Offtake point&#10;SM-1	45	140	true	true	true	Standard section"
              className="w-full text-xs font-mono p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBulkPasteModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkPaste}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold"
              >
                Apply Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Minor Modal */}
      {showAddMinorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-3 shadow-xl">
            <h4 className="font-bold text-slate-900 text-sm">Add New Minor</h4>
            <p className="text-xs text-slate-500">Enter name for the new irrigation minor / village.</p>
            <input
              type="text"
              value={newMinorName}
              onChange={(e) => setNewMinorName(e.target.value)}
              placeholder="e.g. Minor - 7 or Village Name"
              className="w-full text-xs p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddMinorModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newMinorName.trim()) {
                    onAddMinor(newMinorName.trim());
                    setNewMinorName('');
                    setShowAddMinorModal(false);
                  }
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold"
              >
                Add Minor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
