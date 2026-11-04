// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Building2, MapPin, Calendar, Tag, Search, User, CreditCard } from 'lucide-react';
import { getProjects, getExecutions, getProjectOrMinor, getRMBills, addRMBill, updateExecution, getDesignByProject } from '@/systems/pms/utils/storageManager';
import { buildChainageDiffMap, allStagesDone, generateId } from '@/systems/pms/utils/helpers';
import DataTable from '@/systems/pms/components/DataTable';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';
import { DESIGN_COLUMNS } from './UploadDesign';
import { generateRMNo } from '@/systems/pms/utils/rmUtils';

// Alignment already has its own column - exclude it from the measurement fields
const MEASURE_COLUMNS = DESIGN_COLUMNS.filter(col => col.key !== 'alignment' && col.key !== 'valve');
// Same fields as Design, labelled with an "Exe-" prefix for this table
const EXEC_COLUMNS = MEASURE_COLUMNS.map(col => ({ key: col.key, label: `Exe-${col.label}` }));

// Show the value as-is (0 included) - only fall back to '-' when it's actually empty
const displayVal = (v) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

// YYYY-MM-DD (from the date input) -> DD/MM/YYYY for display
const formatDate = (d) => {
  if (!d) return '-';
  const [y, m, day] = String(d).split('-');
  return (y && m && day) ? `${day}/${m}/${y}` : d;
};

// Format submission timestamp/date-time for display
const formatSubmissionDateTime = (entry) => {
  if (!entry) return '-';
  const val = entry.submissionDateTime || entry.timestamp || entry.createdAt;
  if (val) {
    if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(val.trim())) {
      return val.trim();
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    }
    return String(val);
  }
  if (entry.submitDate) {
    return formatDate(entry.submitDate);
  }
  return '-';
};

// True/False badge for the three stage checkboxes and the combined Status column
const BoolBadge = ({ value }) => (
  <span className={value ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
    {value ? 'True' : 'False'}
  </span>
);

const getValveNameForEntry = (entry, designs = []) => {
  if (entry.valve === false || entry.isValve === false) return null;

  if (entry.valveName && String(entry.valveName).trim()) {
    const s = String(entry.valveName).trim();
    if (!['false', '0', 'no', '-', 'null', 'undefined'].includes(s.toLowerCase())) return s;
  }

  if (typeof entry.valve === 'string' && entry.valve.trim()) {
    const s = entry.valve.trim();
    if (!['true', 'false', '0', '1', 'no', 'yes', '-', 'null', 'undefined'].includes(s.toLowerCase())) return s;
  }

  const stageVal = entry.execution?.valve;
  if (typeof stageVal === 'string' && stageVal.trim()) {
    const s = stageVal.trim();
    if (!['true', 'false', '0', '1', 'no', 'yes', '-', 'null', 'undefined'].includes(s.toLowerCase())) return s;
  }

  if (typeof entry.design?.valve === 'string' && entry.design.valve.trim()) {
    const s = entry.design.valve.trim();
    if (!['true', 'false', '0', '1', 'no', 'yes', '-', 'null', 'undefined'].includes(s.toLowerCase())) return s;
  }

  if (designs.length > 0 && entry.serialNo) {
    const dRow = designs[Number(entry.serialNo) - 1] || designs.find(d => String(d.serialNo) === String(entry.serialNo));
    if (dRow && typeof dRow.valve === 'string' && dRow.valve.trim()) {
      const s = dRow.valve.trim();
      if (!['true', 'false', '0', '1', 'no', 'yes', '-', 'null', 'undefined'].includes(s.toLowerCase())) return s;
    }
  }

  if (entry.valve || entry.isValve || entry.execution?.valve) {
    return 'Yes';
  }

  return null;
};

export default function ExecutionDetails() {
  const { projectNo } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [alignmentFilter, setAlignmentFilter] = useState('');
  const [pipeDiaFilter, setPipeDiaFilter] = useState('');
  const [rmBills, setRmBills] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const decodedNo = decodeURIComponent(projectNo || '');
    const found = getProjectOrMinor(decodedNo);
    setProject(found || null);
    setEntries(getExecutions().filter(e => e.projectNo === decodedNo));
    setDesigns(getDesignByProject(decodedNo));
    setRmBills(getRMBills());
  }, [projectNo]);

  useEffect(() => {
    const onFocus = () => setRmBills(getRMBills());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Entries already sent for payment (in any RM bill) - can't be selected again
  const billedIds = new Set(
    rmBills.filter(b => b.billType === 'Execution').flatMap(b => b.entries.map(e => e.sourceId))
  );
  const rmNoByEntryId = new Map<string, string>(
    rmBills.filter(b => b.billType === 'Execution').flatMap(b => b.entries.map(e => [e.sourceId, (b.rmNo || '').replace(/^RM-/i, 'RA-')]))
  );
  const billedEntryBySourceId = new Map(
    rmBills.filter(b => b.billType === 'Execution').flatMap(b => (b.entries || []).map(e => [e.sourceId, e.billed || e.original]))
  );

  const toggleSelect = (id) => {
    if (billedIds.has(id)) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSendForPayment = () => {
    const selectedEntries = entries.filter(e => selectedIds.includes(e.id));
    if (selectedEntries.length === 0) return;

    const rmNo = generateRMNo(getRMBills());
    const now = new Date();
    const bill = {
      id: generateId(),
      rmNo,
      createdAt: now.toISOString(),
      projectNo: project.serialNo,
      projectName: project.originalProjectName || project.projectName,
      projectType: project.projectType || '',
      contractorName: project.contractorName || '',
      minorName: project.isMinor ? project.minorName : '',
      billType: 'Execution',
      status: 'pending',
      entries: selectedEntries.map(e => ({
        sourceId: e.id,
        billType: 'Execution',
        serialNo: e.serialNo,
        alignment: e.alignment,
        design: e.design,
        execution: e.execution,
        original: e.execution,
        billed: { ...e.execution }
      })),
      billNo: '',
      billAmount: '',
      billRemarks: '',
      billDate: ''
    };

    addRMBill(bill);
    setSelectedIds([]);
    setRmBills(getRMBills());
    toast.success(`Sent for payment as ${rmNo}`);
    navigate('/pms/billing/department');
  };

  // Unique Pipe Dia values from each entry's Execution snapshot, sorted ascending (small to
  // high) - rendered as extra headers after Exe-Remarks
  const uniquePipeDias = Array.from(new Set(entries.map(e => e.execution?.pipeDia)))
    .filter(v => v !== undefined && v !== null && v !== '')
    .sort((a, b) => Number(a) - Number(b));

  // Value shown under an entry's matching Pipe Dia column: this entry's Execution Chainage
  // minus the upper (previous, by Serial No) entry's Execution Chainage. See
  // buildChainageDiffMap for the 0/missing-Chainage rule.
  const bySerialNo = [...entries].sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));
  const chainageDiffMap = buildChainageDiffMap(bySerialNo, e => e.execution?.chainage, e => e.id);

  const uniqueAlignments = Array.from(new Set(entries.map(e => e.alignment))).filter(Boolean).sort();
  const alignmentOptions = uniqueAlignments.map(a => ({ value: a, label: a }));
  const pipeDiaOptions = uniquePipeDias.map(v => ({ value: v, label: String(v) }));

  const filteredEntries = entries.filter(e => {
    if (alignmentFilter && e.alignment !== alignmentFilter) return false;
    if (pipeDiaFilter && String(e.execution?.pipeDia) !== String(pipeDiaFilter)) return false;
    if (searchQuery && !String(e.alignment).toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));

  const selectableEntries = filteredEntries.filter(e => !billedIds.has(e.id));
  const isAllSelected = selectableEntries.length > 0 && selectableEntries.every(e => selectedIds.includes(e.id));
  const isIndeterminate = selectableEntries.some(e => selectedIds.includes(e.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const selectableSet = new Set(selectableEntries.map(e => e.id));
      setSelectedIds(prev => prev.filter(id => !selectableSet.has(id)));
    } else {
      const selectableIds = selectableEntries.map(e => e.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...selectableIds])));
    }
  };

  const selectHeader = {
    name: 'Select',
    label: (
      <div className="flex items-center justify-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={el => { if (el) el.indeterminate = isIndeterminate; }}
          onChange={toggleSelectAll}
          disabled={selectableEntries.length === 0}
          className="w-3.5 h-3.5 accent-indigo-600 rounded border-gray-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={isAllSelected ? "Deselect all" : "Select all"}
        />
        <span>Select</span>
      </div>
    )
  };

  const tableHeaders = [
    selectHeader, "Serial No", "Submission Date & Time", "Alignment", ...EXEC_COLUMNS.map(col => col.label), "Exe-Date", "Exe-Remarks", "Hard Rock",
    "Excavation", "Pipe Laying", "Back Filling", "Valve", "Status", "Bill Status",
    ...uniquePipeDias.map(String)
  ];

  // Totals row: sum of each Pipe Dia column's values across the currently filtered entries
  const pipeDiaTotals = uniquePipeDias.map(dia =>
    filteredEntries.reduce((sum, entry) => {
      if (String(entry.execution?.pipeDia) !== String(dia)) return sum;
      const diff = chainageDiffMap.get(entry.id);
      return diff !== undefined ? sum + diff : sum;
    }, 0)
  );
  const totalRow = [
    'Total',
    '',
    '',
    '',
    ...EXEC_COLUMNS.map(() => ''),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ...pipeDiaTotals.map(t => t.toFixed(3))
  ];

  const renderRow = (entry) => {
    const isBilled = billedIds.has(entry.id);
    return (
    <tr key={entry.id} className="hover:bg-gray-50/70 transition-colors border-b border-gray-100">
      <td className="px-4 py-2.5 text-center whitespace-nowrap">
        <input
          type="checkbox"
          checked={selectedIds.includes(entry.id)}
          onChange={() => toggleSelect(entry.id)}
          disabled={isBilled}
          className="w-3.5 h-3.5 accent-indigo-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        />
      </td>
      <td className="px-4 py-2.5 text-center text-xs text-indigo-600 font-bold whitespace-nowrap">{entry.serialNo}</td>
      <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap font-medium">{formatSubmissionDateTime(entry)}</td>
      <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{entry.alignment}</td>
      {EXEC_COLUMNS.map(col => {
        const billedObj = billedEntryBySourceId.get(entry.id);
        const editVal = (billedObj && billedObj[col.key] !== undefined && billedObj[col.key] !== null && billedObj[col.key] !== '')
          ? billedObj[col.key]
          : undefined;
        const isEdited = billedObj 
          && editVal !== undefined 
          && String(editVal).trim() !== '' 
          && (
            Number(editVal) !== Number(entry.execution?.[col.key]) || 
            (isNaN(Number(editVal)) && String(editVal).trim() !== String(entry.execution?.[col.key] ?? '').trim())
          );

        return (
          <td key={col.key} className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap">
            <div className="flex flex-col leading-tight">
              {isEdited && (
                <span className="text-red-600 font-semibold text-[9px]">
                  Edit: {displayVal(editVal)}
                </span>
              )}
              <span className="font-semibold text-gray-700">Exe: {displayVal(entry.execution?.[col.key])}</span>
            </div>
          </td>
        );
      })}
      <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{formatDate(entry.submitDate)}</td>
      <td className="px-4 py-2.5 text-left text-[11px] text-gray-600 max-w-[220px] truncate" title={entry.remarks || ''}>
        {entry.remarks || '-'}
      </td>
      <td className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap">
        {entry.isHardRock
          ? <span className="text-amber-700 font-semibold">{entry.hardRockValue || '-'}</span>
          : <span className="text-gray-300">-</span>}
      </td>
      <td className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap"><BoolBadge value={entry.excavation !== false} /></td>
      <td className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap"><BoolBadge value={entry.pipeLaying !== false} /></td>
      <td className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap">
        {entry.backFilling !== false ? (
          <span className="text-emerald-700 font-semibold">
            {entry.backFillingValue ? `True (${entry.backFillingValue})` : 'True'}
          </span>
        ) : (
          <span className="text-red-600 font-semibold">False</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap">
        {(() => {
          const vName = getValveNameForEntry(entry, designs);
          return vName ? <span className="text-indigo-600 font-semibold">{vName}</span> : <span className="text-gray-300">-</span>;
        })()}
      </td>
      <td className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap"><BoolBadge value={allStagesDone(entry)} /></td>
      <td className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap">
        {isBilled
          ? <span className="text-emerald-700 font-semibold">{rmNoByEntryId.get(entry.id)}</span>
          : <span className="text-gray-300">-</span>}
      </td>
      {uniquePipeDias.map(dia => {
        const diff = String(entry.execution?.pipeDia) === String(dia) ? chainageDiffMap.get(entry.id) : undefined;
        return (
          <td key={`dia-${dia}`} className={`px-4 py-2.5 text-center text-[11px] whitespace-nowrap ${diff !== undefined ? 'text-gray-700 font-semibold' : 'text-gray-300'}`}>
            {diff !== undefined ? diff.toFixed(3) : '-'}
          </td>
        );
      })}
    </tr>
    );
  };

  const renderCard = (entry) => {
    const isBilled = billedIds.has(entry.id);
    return (
    <div key={entry.id} className="rounded-lg border border-gray-200 shadow-sm p-3 space-y-1.5 bg-white">
      <div className="flex justify-between items-start border-b border-gray-200 pb-1.5 mb-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedIds.includes(entry.id)}
            onChange={() => toggleSelect(entry.id)}
            disabled={isBilled}
            className="w-3.5 h-3.5 accent-indigo-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="text-[9px] text-indigo-500 uppercase tracking-widest">#{entry.serialNo}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-700 font-medium block">Alignment: {entry.alignment}</span>
          <span className="text-[9px] text-gray-500">Submitted: {formatSubmissionDateTime(entry)}</span>
        </div>
      </div>
      {isBilled && (
        <div className="text-[10px] px-1.5 py-1 bg-emerald-50 rounded text-emerald-700 font-semibold">
          Billed: {rmNoByEntryId.get(entry.id)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        {EXEC_COLUMNS.map(col => {
          const billedObj = billedEntryBySourceId.get(entry.id);
          const editVal = (billedObj && billedObj[col.key] !== undefined && billedObj[col.key] !== null && billedObj[col.key] !== '')
            ? billedObj[col.key]
            : undefined;
          const isEdited = billedObj 
            && editVal !== undefined 
            && String(editVal).trim() !== '' 
            && (
              Number(editVal) !== Number(entry.execution?.[col.key]) || 
              (isNaN(Number(editVal)) && String(editVal).trim() !== String(entry.execution?.[col.key] ?? '').trim())
            );

          return (
            <div key={col.key} className="flex justify-between items-center px-1.5 py-0.5 rounded">
              <span className="text-gray-500">{col.label}:</span>
              <span className="text-gray-800 text-right">
                {isEdited && (
                  <span className="text-red-600 font-semibold text-[9px] block">
                    Edit: {displayVal(editVal)}
                  </span>
                )}
                <span className="font-semibold text-gray-700">Exe: {displayVal(entry.execution?.[col.key])}</span>
              </span>
            </div>
          );
        })}
        <div className="flex justify-between px-1.5 py-0.5 rounded">
          <span className="text-gray-500">Exe-Date:</span>
          <span className="text-gray-800">{formatDate(entry.submitDate)}</span>
        </div>
      </div>
      {entry.remarks && (
        <div className="text-[10px] px-1.5 py-1 bg-gray-50 rounded">
          <span className="text-gray-500">Exe-Remarks: </span>
          <span className="text-gray-800">{entry.remarks}</span>
        </div>
      )}
      {entry.isHardRock && (
        <div className="text-[10px] px-1.5 py-1 bg-amber-50 rounded">
          <span className="text-gray-500">Hard Rock: </span>
          <span className="text-amber-700 font-semibold">{entry.hardRockValue || '-'}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1 text-[10px] pt-1 border-t border-gray-100">
        <div className="flex justify-between px-1.5 py-0.5 rounded">
          <span className="text-gray-500">Excavation:</span>
          <BoolBadge value={entry.excavation !== false} />
        </div>
        <div className="flex justify-between px-1.5 py-0.5 rounded">
          <span className="text-gray-500">Pipe Laying:</span>
          <BoolBadge value={entry.pipeLaying !== false} />
        </div>
        <div className="flex justify-between px-1.5 py-0.5 rounded">
          <span className="text-gray-500">Back Filling:</span>
          <BoolBadge value={entry.backFilling !== false} />
        </div>
        <div className="flex justify-between px-1.5 py-0.5 rounded">
          <span className="text-gray-500">Valve:</span>
          {(() => {
            const vName = getValveNameForEntry(entry, designs);
            return vName ? <span className="text-indigo-600 font-semibold">{vName}</span> : <span className="text-gray-400">-</span>;
          })()}
        </div>
        <div className="flex justify-between px-1.5 py-0.5 rounded">
          <span className="text-gray-500">Status:</span>
          <BoolBadge value={allStagesDone(entry)} />
        </div>
      </div>
      {uniquePipeDias.length > 0 && (
        <div className="grid grid-cols-2 gap-1 text-[10px] pt-1 border-t border-gray-100">
          {uniquePipeDias.map(dia => {
            const diff = String(entry.execution?.pipeDia) === String(dia) ? chainageDiffMap.get(entry.id) : undefined;
            return (
              <div key={dia} className="flex justify-between px-1.5 py-0.5 rounded">
                <span className="text-gray-500">&Oslash;{dia}:</span>
                <span className={diff !== undefined ? 'text-gray-800 font-semibold' : 'text-gray-400'}>
                  {diff !== undefined ? diff.toFixed(3) : '-'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
    );
  };

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => project?.isMinor ? navigate(`/pms/execution-details/${encodeURIComponent(project.parentProjectNo)}`) : navigate('/pms/projects/new')}
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
      {/* Back + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full px-2 sm:px-0">
        <button
          onClick={() => navigate(`/pms/view-design/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold w-fit flex-shrink-0"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex-1 min-w-0 relative max-w-sm">
          <Search className="absolute left-2.5 top-[9px] md:top-[11px] text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search alignment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg md:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
          />
        </div>

        <div className="w-40 md:w-48 flex-shrink-0">
          <SearchableDropdown
            options={alignmentOptions}
            value={alignmentFilter}
            onChange={(val) => setAlignmentFilter(val)}
            placeholder="All Alignments"
            height="h-[32px] md:h-[38px]"
          />
        </div>

        <div className="w-40 md:w-48 flex-shrink-0">
          <SearchableDropdown
            options={pipeDiaOptions}
            value={pipeDiaFilter}
            onChange={(val) => setPipeDiaFilter(val)}
            placeholder="All Pipe Dia"
            height="h-[32px] md:h-[38px]"
          />
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleSendForPayment}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-semibold px-4 py-1.5 rounded-lg h-[32px] md:h-[38px] flex-shrink-0"
          >
            <CreditCard size={14} /> Send for Payment ({selectedIds.length})
          </button>
        )}
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

      {/* Main Content */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-2 sm:mx-0">
        <DataTable
          headers={tableHeaders}
          data={filteredEntries}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="1600px"
          totalRow={totalRow}
        />
      </div>
    </div>
  );
}
