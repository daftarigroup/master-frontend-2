// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Tag,
  Search,
  User,
  RotateCcw,
  Layers,
  CheckSquare
} from 'lucide-react';
import {
  getExecutions,
  getProjectOrMinor,
  getDesignByProject
} from '@/systems/pms/utils/storageManager';
import DataTable from '@/systems/pms/components/DataTable';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';

// Format numeric values with 3 decimals, or return string as-is
const displayVal = (v) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

export default function BackFillingReport() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [designs, setDesigns] = useState([]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [backFillingFilter, setBackFillingFilter] = useState('ALL_BACK_FILLING'); // 'ALL_BACK_FILLING' | 'ALL_RECORDS' | specific value

  useEffect(() => {
    const decodedNo = decodeURIComponent(projectNo || '');
    const found = getProjectOrMinor(decodedNo);
    setProject(found || null);

    const execs = getExecutions().filter(e => e.projectNo === decodedNo);
    const des = getDesignByProject(decodedNo);

    setEntries(execs);
    setDesigns(des);
  }, [projectNo]);

  // Data in Back Filling Report comes ONLY from Execution Details
  const allRows = useMemo(() => {
    return entries.map((entry, idx) => {
      const isBf = entry.backFilling !== false;
      const bfVal = entry.backFillingValue || (isBf ? 'True' : '-');
      return {
        id: entry.id || `exec-${idx}`,
        serialNo: entry.serialNo ?? (idx + 1),
        alignment: entry.alignment || '-',
        chainage: entry.execution?.chainage ?? entry.design?.chainage ?? '',
        pipeDia: entry.execution?.pipeDia ?? entry.design?.pipeDia ?? '',
        backFillingValue: bfVal,
        hasBackFilling: isBf
      };
    });
  }, [entries]);

  // Extract distinct back filling values available in data for the filter dropdown
  const uniqueBackFillingValues = useMemo(() => {
    const values = new Set();
    allRows.forEach(r => {
      if (r.hasBackFilling && r.backFillingValue && r.backFillingValue !== 'True' && r.backFillingValue !== '-') {
        values.add(r.backFillingValue);
      }
    });
    return Array.from(values).sort();
  }, [allRows]);

  // Dropdown options for Back Filling filter
  const backFillingOptions = useMemo(() => {
    const opts = [
      { value: 'ALL_BACK_FILLING', label: 'All Back Filling (Filled Only)' },
      { value: 'ALL_RECORDS', label: 'All Records (incl. Non-Backfilled)' }
    ];
    uniqueBackFillingValues.forEach(val => {
      opts.push({ value: val, label: `Value: ${val}` });
    });
    return opts;
  }, [uniqueBackFillingValues]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setBackFillingFilter('ALL_BACK_FILLING');
    toast.success('Filters reset');
  };

  // Filter the rows
  const filteredRows = useMemo(() => {
    let result = allRows.filter(row => {
      // 1. Back Filling filter
      if (backFillingFilter === 'ALL_BACK_FILLING') {
        if (!row.hasBackFilling) return false;
      } else if (backFillingFilter === 'ALL_RECORDS') {
        // show all
      } else if (backFillingFilter) {
        if (String(row.backFillingValue || '').toLowerCase() !== String(backFillingFilter).toLowerCase()) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSerial = String(row.serialNo).toLowerCase().includes(q);
        const matchesAlignment = String(row.alignment).toLowerCase().includes(q);
        const matchesChainage = String(row.chainage).toLowerCase().includes(q);
        const matchesPipeDia = String(row.pipeDia).toLowerCase().includes(q);
        const matchesBf = String(row.backFillingValue || '').toLowerCase().includes(q);
        if (!matchesSerial && !matchesAlignment && !matchesChainage && !matchesPipeDia && !matchesBf) {
          return false;
        }
      }

      return true;
    });

    // Default natural order by Serial No ascending
    result.sort((a, b) => (Number(a.serialNo) || 0) - (Number(b.serialNo) || 0));

    return result;
  }, [allRows, backFillingFilter, searchQuery]);

  const backFillingCount = useMemo(() => {
    return filteredRows.filter(r => r.hasBackFilling).length;
  }, [filteredRows]);

  // 5 Columns: Serial Number, Alignment, Chainage, Pipe Dia, Back Filling Value
  const tableHeaders = [
    "Serial Number",
    "Alignment",
    "Chainage",
    "Pipe Dia",
    "Back Filling Value"
  ];

  const totalRow = [
    `Total: ${filteredRows.length} rows`,
    '',
    '',
    '',
    `${backFillingCount} Backfilled`
  ];

  const renderRow = (row, idx) => (
    <tr
      key={row.id || idx}
      className="hover:bg-sky-50/40 transition-colors border-b border-gray-100"
    >
      {/* 1. Serial Number */}
      <td className="px-4 py-3 text-center text-xs text-indigo-600 font-bold whitespace-nowrap">
        {row.serialNo}
      </td>

      {/* 2. Alignment */}
      <td className="px-4 py-3 text-center text-xs font-medium text-gray-800 whitespace-nowrap">
        {row.alignment}
      </td>

      {/* 3. Chainage */}
      <td className="px-4 py-3 text-center text-xs text-gray-700 whitespace-nowrap">
        {displayVal(row.chainage)}
      </td>

      {/* 4. Pipe Dia */}
      <td className="px-4 py-3 text-center text-xs text-gray-700 whitespace-nowrap">
        {displayVal(row.pipeDia)}
      </td>

      {/* 5. Back Filling Value */}
      <td className="px-4 py-3 text-center text-xs font-semibold whitespace-nowrap">
        {row.hasBackFilling ? (
          <span className="text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
            {row.backFillingValue}
          </span>
        ) : (
          <span className="text-red-500 font-normal">False</span>
        )}
      </td>
    </tr>
  );

  const renderCard = (row, idx) => (
    <div
      key={row.id || idx}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-xs space-y-2 text-xs"
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
        <span className="font-bold text-indigo-600 text-sm">#{row.serialNo}</span>
        <span className="font-medium text-sky-700 text-xs">
          {row.backFillingValue}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-gray-600">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Alignment</span>
          <span className="font-medium text-gray-800">{row.alignment}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Pipe Dia</span>
          <span className="font-medium text-gray-800">{displayVal(row.pipeDia)}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Chainage</span>
          <span className="font-medium text-gray-800">{displayVal(row.chainage)}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 block">Back Filling</span>
          <span className="font-medium text-sky-700">{row.backFillingValue}</span>
        </div>
      </div>
    </div>
  );

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate('/pms/execution')}
          className="flex items-center gap-2 text-sky-600 hover:text-sky-800 text-sm font-semibold"
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
      {/* Top Bar: Back Button + Search + Back Filling Filter + Clear */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 lg:gap-3 w-full px-2 sm:px-0">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <button
            onClick={() => navigate(`/pms/view-design/${encodeURIComponent(project.serialNo)}`)}
            className="flex items-center gap-2 text-sky-700 hover:text-sky-900 text-sm font-semibold w-fit flex-shrink-0 mr-1"
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* Search alignment, chainage, pipe dia, back filling value */}
          <div className="flex-1 min-w-[200px] max-w-sm relative">
            <Search className="absolute left-2.5 top-[9px] md:top-[11px] text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search alignment, back filling value, chainage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg md:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px] shadow-xs"
            />
          </div>

          {/* Back Filling Filter Dropdown */}
          <div className="w-56 md:w-64 flex-shrink-0">
            <SearchableDropdown
              options={backFillingOptions}
              value={backFillingFilter}
              onChange={(val) => setBackFillingFilter(val || 'ALL_BACK_FILLING')}
              placeholder="Filter by Back Filling"
              height="h-[32px] md:h-[38px]"
            />
          </div>

          {/* Reset Filters */}
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded-lg md:rounded w-[32px] h-[32px] md:w-[38px] md:h-[38px] hover:bg-gray-100 transition-colors shadow-xs flex-shrink-0"
            title="Reset All Filters"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Quick count badge */}
        <div className="hidden sm:flex items-center gap-2 self-end lg:self-auto text-xs text-gray-500">
          <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-md font-medium">
            Showing {filteredRows.length} rows ({backFillingCount} Backfilled)
          </span>
        </div>
      </div>

      {/* Project Header Banner */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="flex items-start gap-2 min-w-0">
            <Building2 size={20} className="text-sky-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project Name</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">
                {project.originalProjectName || project.projectName}
              </p>
            </div>
          </div>

          {project.isMinor && (
            <div className="flex items-start gap-2 min-w-0">
              <Tag size={20} className="text-sky-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Minor Name</p>
                <p className="text-base md:text-lg text-sky-700 font-bold truncate">{project.minorName}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 min-w-0">
            <User size={20} className="text-sky-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Contractor</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.contractorName || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <Calendar size={20} className="text-sky-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Start Date</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.startDate || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <Calendar size={20} className="text-sky-600 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Planned End Date</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.plannedEndDate || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-2 sm:mx-0">
        {allRows.length === 0 ? (
          <div className="text-center py-16 bg-white p-8 flex-1 flex flex-col items-center justify-center">
            <Layers size={48} className="text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-700 mb-1">No execution entries found</h3>
            <p className="text-xs text-gray-500 max-w-md mb-4">
              No execution entries have been added for this project yet. Go to View Design and click &quot;Execution&quot; on any row to add execution details.
            </p>
            <button
              onClick={() => navigate(`/pms/view-design/${encodeURIComponent(project.serialNo)}`)}
              className="inline-flex items-center gap-2 bg-sky-600 text-white font-medium px-4 py-2 rounded-lg text-xs hover:bg-sky-700 transition"
            >
              <ArrowLeft size={14} /> Return to View Design
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16 bg-white p-8 flex-1 flex flex-col items-center justify-center">
            <Layers size={44} className="text-gray-300 mb-3" />
            <h3 className="text-base font-bold text-gray-700 mb-1">No matching back filling records found</h3>
            <p className="text-xs text-gray-500 max-w-md mb-4">
              {backFillingFilter === 'ALL_BACK_FILLING'
                ? 'No executed entries in this project have back filling checked/added. You can switch the filter to "All Records (incl. Non-Backfilled)" to inspect all executed rows.'
                : 'No executed entries match your current search or back filling filter criteria.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setBackFillingFilter('ALL_RECORDS')}
                className="inline-flex items-center gap-1.5 bg-sky-600 text-white font-medium px-3.5 py-1.5 rounded-lg text-xs hover:bg-sky-700 transition"
              >
                Show All Records
              </button>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 font-medium px-3.5 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <DataTable
            headers={tableHeaders}
            data={filteredRows}
            renderRow={renderRow}
            renderCard={renderCard}
            minWidth="750px"
            totalRow={totalRow}
          />
        )}
      </div>
    </div>
  );
}
