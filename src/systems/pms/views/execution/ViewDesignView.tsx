// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Building2, MapPin, Calendar, Tag, Search, RotateCcw, Hammer, Ruler, ListChecks, Check, GitCompare, Mountain, Layers, Workflow, FileUp, UploadCloud, User, Sliders, Package, CheckSquare, CalendarClock, Download, ExternalLink, X, FileText, Table, Loader2 } from 'lucide-react';
import { getDesignByProject, getExecutions, getAllActuals, getMinors, getProjectOrMinor, getScheduleForMinor, saveScheduleForMinor, getDrawingUploadForProject, syncProjectsCache } from '@/systems/pms/utils/storageManager';
import { getFileFromIndexedDB, getMemoryFile, saveFileToIndexedDB, setMemoryFile } from '@/systems/pms/utils/fileStorage';
import { parsePdfTableFile } from '@/systems/pms/utils/pdfTableParser';
import { buildChainageDiffMap } from '@/systems/pms/utils/helpers';
import DataTable from '@/systems/pms/components/DataTable';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';
import { DESIGN_COLUMNS } from './UploadDesign';
import UploadDesign from '../execution/UploadDesign';
import Execution from './Execution';
import Actual from './Actual';

// Show the value as-is (0 included) - only fall back to '-' when it's actually empty.
// Numeric values are shown with 3 digits after the decimal point; non-numeric text is untouched.
const displayVal = (v) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

export default function ViewDesign() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [rows, setRows] = useState([]);
  const [showUploadDesignModal, setShowUploadDesignModal] = useState(false);
  const [execRow, setExecRow] = useState(null);
  const [actualRow, setActualRow] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [actuals, setActuals] = useState([]);

  const initialFilters = { searchQuery: '', alignment: '', pipeDia: '' };
  const [filters, setFilters] = useState({ ...initialFilters });

  useEffect(() => {
    const decodedNo = decodeURIComponent(projectNo || '');
    const found = getProjectOrMinor(decodedNo);
    setProject(found || null);
    setRows(getDesignByProject(decodedNo));
    setExecutions(getExecutions());
    setActuals(getAllActuals());
    if (!found) {
      syncProjectsCache().then(() => setProject(getProjectOrMinor(decodedNo) || null)).catch(() => {});
    }
  }, [projectNo]);

  // Every design row's permanent Serial No = its position in the original uploaded order,
  // independent of any search/filter - this is what gets carried into Execution/Actual/Auto Comparison
  const rowIndexMap = new Map(rows.map((r, i) => [r, i + 1]));

  // Identify a design row by all of its own values (Alignment + 7 measurement fields)
  const rowKey = (row) => DESIGN_COLUMNS.map(col => String(row[col.key] ?? '')).join('|');
  // Rebuild the same key from a saved Execution/Actual entry's Alignment + Design snapshot
  const entryDesignKey = (entry) => DESIGN_COLUMNS
    .map(col => String(col.key === 'alignment' ? entry.alignment : entry.design?.[col.key] ?? ''))
    .join('|');

  const executedKeys = new Set(
    executions.filter(e => e.projectNo === project?.serialNo).map(entryDesignKey)
  );
  // Saved actual entry (partial or complete) and execution entry for each design row
  const actualByKey = new Map(
    actuals.filter(e => e.projectNo === project?.serialNo).map(e => [entryDesignKey(e), e])
  );
  const executionByKey = new Map(
    executions.filter(e => e.projectNo === project?.serialNo).map(e => [entryDesignKey(e), e])
  );
  const stageCount = (entry) => [entry.excavation, entry.pipeLaying, entry.backFilling].filter(Boolean).length;

  // Unique Pipe Dia values across all uploaded design rows, sorted ascending (small to high) -
  // rendered as extra headers after "Actual Measurement"
  const uniquePipeDias = Array.from(new Set(rows.map(r => r.pipeDia)))
    .filter(v => v !== undefined && v !== null && v !== '')
    .sort((a, b) => Number(a) - Number(b));

  // Value shown under a row's matching Pipe Dia column: this row's Chainage minus the
  // upper (previous) row's Chainage - see buildChainageDiffMap for the 0/missing-Chainage rule.
  const chainageDiffMap = buildChainageDiffMap(rows, r => r.chainage, r => r);

  const tableHeaders = ["Serial No", ...DESIGN_COLUMNS.map(col => col.label), "Execution Entry", "Actual Measurement", ...uniquePipeDias.map(String)];

  const handleClearFilters = () => {
    setFilters({ ...initialFilters });
    toast.success('Filters cleared');
  };

  const filteredRows = rows.filter(row => {
    if (filters.alignment && row.alignment !== filters.alignment) return false;
    if (filters.pipeDia && String(row.pipeDia) !== String(filters.pipeDia)) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      return DESIGN_COLUMNS.some(col => String(row[col.key] ?? '').toLowerCase().includes(q));
    }
    return true;
  });

  // Totals row: sum of each Pipe Dia column's values across the currently filtered rows
  const pipeDiaTotals = uniquePipeDias.map(dia =>
    filteredRows.reduce((sum, row) => {
      if (String(row.pipeDia) !== String(dia)) return sum;
      const diff = chainageDiffMap.get(row);
      return diff !== undefined ? sum + diff : sum;
    }, 0)
  );
  const totalRow = [
    'Total',
    ...DESIGN_COLUMNS.map(() => ''),
    '',
    '',
    ...pipeDiaTotals.map(t => t.toFixed(3))
  ];

  const renderRow = (item, idx) => {
    const key = rowKey(item);
    const isExecuted = executedKeys.has(key);
    const actualEntry = actualByKey.get(key);
    const isActualDone = Boolean(actualEntry) && (!actualEntry.staged || stageCount(actualEntry) === 3);
    const actualLabel = isActualDone ? 'Done' : actualEntry ? `Actual ${stageCount(actualEntry)}/3` : 'Actual';
    const serialNo = rowIndexMap.get(item);

    return (
      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors border-b border-gray-100">
        <td className="px-4 py-3 text-center text-sm text-gray-500 font-semibold whitespace-nowrap leading-none">
          {serialNo}
        </td>
        {DESIGN_COLUMNS.map(col => (
          <td key={col.key} className="px-4 py-3 text-center text-sm text-gray-700 whitespace-nowrap leading-none">
            {col.key === 'valve'
              ? (item[col.key] !== undefined && item[col.key] !== null && String(item[col.key]).trim() !== '' && !['true', 'false'].includes(String(item[col.key]).trim().toLowerCase())
                ? String(item[col.key])
                : '-')
              : displayVal(item[col.key])}
          </td>
        ))}
        <td className="px-2 py-2 text-center whitespace-nowrap">
          <button
            onClick={() => setExecRow({ ...item, __serialNo: serialNo })}
            disabled={isExecuted}
            className={`flex items-center justify-center gap-1.5 border w-full h-[30px] rounded text-[10px] font-semibold uppercase tracking-wide transition-colors ${isExecuted
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
              }`}
          >
            {isExecuted ? <Check size={12} /> : <Hammer size={12} />} {isExecuted ? 'Done' : 'Execution'}
          </button>
        </td>
        <td className="px-2 py-2 text-center whitespace-nowrap">
          <button
            onClick={() => setActualRow({ ...item, __serialNo: serialNo })}
            disabled={isActualDone}
            className={`flex items-center justify-center gap-1.5 border w-full h-[30px] rounded text-[10px] font-semibold uppercase tracking-wide transition-colors ${isActualDone
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
              }`}
          >
            {isActualDone ? <Check size={12} /> : <Ruler size={12} />} {actualLabel}
          </button>
        </td>
        {uniquePipeDias.map(dia => {
          const isMatch = String(item.pipeDia) === String(dia);
          const diff = chainageDiffMap.get(item);
          const value = isMatch && diff !== undefined ? diff : null;
          return (
            <td key={`dia-${dia}`} className={`px-4 py-3 text-center text-sm whitespace-nowrap leading-none ${value !== null ? 'text-gray-700 font-semibold' : 'text-gray-300'}`}>
              {value !== null ? value.toFixed(3) : '-'}
            </td>
          );
        })}
      </tr>
    );
  };

  const renderCard = (item, idx) => {
    const key = rowKey(item);
    const isExecuted = executedKeys.has(key);
    const actualEntry = actualByKey.get(key);
    const isActualDone = Boolean(actualEntry) && (!actualEntry.staged || stageCount(actualEntry) === 3);
    const actualLabel = isActualDone ? 'Done' : actualEntry ? `Actual ${stageCount(actualEntry)}/3` : 'Actual';
    const serialNo = rowIndexMap.get(item);

    return (
      <div key={idx} className="bg-white rounded-lg border border-indigo-50 shadow-sm p-3 space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-gray-500">Serial No:</span>
          <span className="text-gray-800 font-semibold">{serialNo}</span>
        </div>
        {DESIGN_COLUMNS.map(col => (
          <div key={col.key} className="flex justify-between text-[10px]">
            <span className="text-gray-500">{col.label}:</span>
            <span className="text-gray-800">
              {col.key === 'valve'
                ? (item[col.key] !== undefined && item[col.key] !== null && String(item[col.key]).trim() !== '' && !['true', 'false'].includes(String(item[col.key]).trim().toLowerCase())
                  ? String(item[col.key])
                  : '-')
                : displayVal(item[col.key])}
            </span>
          </div>
        ))}
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => setExecRow({ ...item, __serialNo: serialNo })}
            disabled={isExecuted}
            className={`flex-1 border py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1 ${isExecuted
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}
          >
            {isExecuted ? <Check size={11} /> : <Hammer size={11} />} {isExecuted ? 'Done' : 'Execution'}
          </button>
          <button
            onClick={() => setActualRow({ ...item, __serialNo: serialNo })}
            disabled={isActualDone}
            className={`flex-1 border py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1 ${isActualDone
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
          >
            {isActualDone ? <Check size={11} /> : <Ruler size={11} />} {actualLabel}
          </button>
        </div>
      </div>
    );
  };

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => project?.isMinor ? navigate(`/pms/minors/${encodeURIComponent(project.parentProjectNo)}`) : navigate('/pms/execution')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">
          Project not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Row 1: Back + Search + Filters + Add Requirement */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full px-2 sm:px-0">
        <button
          onClick={() => project?.isMinor ? navigate(`/pms/minors/${encodeURIComponent(project.parentProjectNo)}`) : navigate('/pms/execution')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold w-fit flex-shrink-0"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex-1 flex flex-wrap items-center gap-2 md:gap-3 min-w-0">
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-2.5 top-[9px] md:top-[11px] text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search design rows..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg md:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
            />
          </div>
          <div className="w-40 md:w-56 flex-shrink-0">
            <SearchableDropdown
              options={Array.from(new Set(rows.map(r => r.alignment))).filter(Boolean).sort().map(v => ({ value: v, label: String(v) }))}
              value={filters.alignment}
              onChange={(val) => setFilters({ ...filters, alignment: val })}
              placeholder="All Alignment"
              height="h-[32px] md:h-[38px]"
            />
          </div>
          <div className="w-32 md:w-44 flex-shrink-0">
            <SearchableDropdown
              options={Array.from(new Set(rows.map(r => r.pipeDia)))
                .filter(v => v !== undefined && v !== null && v !== '')
                .sort((a, b) => Number(a) - Number(b))
                .map(v => ({ value: v, label: String(v) }))}
              value={filters.pipeDia}
              onChange={(val) => setFilters({ ...filters, pipeDia: val })}
              placeholder="All Pipe Dia"
              height="h-[32px] md:h-[38px]"
            />
          </div>
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded-lg md:rounded w-[32px] h-[32px] md:w-[38px] md:h-[38px] hover:bg-gray-100 transition-colors shadow-sm flex-shrink-0"
            title="Clear Filters"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Row 2: Product IMF + Valve Report + Execution Details + Excavation & Murum + Actual Details + Auto Comparison */}
      <div className="flex items-center justify-end gap-2 flex-wrap w-full px-2 sm:px-0">
        {/* Sub Contractor IMF - disabled for now
        <button
          onClick={() => navigate(`/pms/product-imf/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-600 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm hover:bg-blue-50 transition"
        >
          <Package size={16} /> Sub Contractor IMF
        </button>
        */}
        <button
          onClick={() => navigate(`/pms/valve-report/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center justify-center gap-2 bg-white border border-teal-200 text-teal-600 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm hover:bg-teal-50 transition"
        >
          <Sliders size={16} /> Valve Report
        </button>
        <button
          onClick={() => navigate(`/pms/execution-details/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-600 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm hover:bg-indigo-50 transition"
        >
          <ListChecks size={16} /> Execution Details
        </button>
        <button
          onClick={() => navigate(`/pms/excavation-murum/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center justify-center gap-2 bg-white border border-amber-200 text-amber-600 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm hover:bg-amber-50 transition"
        >
          <Mountain size={16} /> Excavation
        </button>
        <button
          onClick={() => navigate(`/pms/murum/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center justify-center gap-2 bg-white border border-orange-200 text-orange-600 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm hover:bg-orange-50 transition"
        >
          <Layers size={16} /> Murum
        </button>
        <button
          onClick={() => navigate(`/pms/actual-details/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center justify-center gap-2 bg-white border border-emerald-200 text-emerald-600 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm hover:bg-emerald-50 transition"
        >
          <ListChecks size={16} /> Actual Details
        </button>
        <button
          onClick={() => navigate(`/pms/auto-comparison/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center justify-center gap-2 bg-white border border-purple-200 text-purple-600 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm hover:bg-purple-50 transition"
        >
          <GitCompare size={16} /> Auto Comparison
        </button>
        <button
          onClick={() => navigate(`/pms/back-filling-report/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center justify-center gap-2 bg-white border border-sky-200 text-sky-600 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm hover:bg-sky-50 transition"
        >
          <CheckSquare size={16} /> Back Filling Report
        </button>
      </div>

      {/* Project Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="flex items-start gap-2 min-w-0">
            <Building2 size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project Name</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.originalProjectName || project.projectName}</p>
            </div>
          </div>
          {project.isMinor && (
            <div className="flex items-start gap-2 min-w-0">
              <Tag size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Minor Name</p>
                <p className="text-base md:text-lg text-indigo-600 font-bold truncate">{project.minorName}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 min-w-0">
            <User size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Contractor</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.contractorName || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Calendar size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Start Date</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.startDate}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Calendar size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Planned End Date</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.plannedEndDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Design Table */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-2 sm:mx-0">
        <DataTable
          headers={tableHeaders}
          data={filteredRows}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="1550px"
          totalRow={totalRow}
        />
      </div>



      {/* Upload Design Modal */}
      <UploadDesign
        isOpen={showUploadDesignModal}
        onClose={() => setShowUploadDesignModal(false)}
        project={project}
        onUploaded={() => { setShowUploadDesignModal(false); setRows(getDesignByProject(project.serialNo)); }}
      />

      {/* Execution Entry Modal */}
      <Execution
        isOpen={!!execRow}
        onClose={() => setExecRow(null)}
        project={project}
        designRow={execRow}
        onSaved={() => { setExecRow(null); setExecutions(getExecutions()); }}
      />

      {/* Actual Measurement Modal */}
      <Actual
        isOpen={!!actualRow}
        onClose={() => setActualRow(null)}
        project={project}
        designRow={actualRow}
        existingEntry={actualRow ? actualByKey.get(rowKey(actualRow)) : undefined}
        executionEntry={actualRow ? executionByKey.get(rowKey(actualRow)) : undefined}
        onSaved={() => { setActualRow(null); setActuals(getAllActuals()); }}
      />
    </div>
  );
}
