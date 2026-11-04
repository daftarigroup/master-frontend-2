// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, Tag, Search, User, RotateCcw } from 'lucide-react';
import { getExecutions, getProjectOrMinor } from '@/systems/pms/utils/storageManager';
import DataTable from '@/systems/pms/components/DataTable';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';

// Default Murum bedding thickness in m
const MURUM_THICKNESS = 0.3;

// Blank/non-numeric values are treated as 0 in calculations
const num = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

// Round to 2 decimal places
const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;

// MROUND(val, multiple) - round to nearest multiple (e.g. 0.005)
const mround = (val, multiple = 0.005) => {
  const n = num(val);
  if (!multiple) return n;
  return Number((Math.round(n / multiple) * multiple).toFixed(3));
};

// Show the value as-is (0 included) - only fall back to '-' when it's actually empty
const displayVal = (v, digits = 3) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : v;
};

const TABLE_HEADERS = [
  "Serial No",
  "Component",
  "Chainage As Per Site",
  "Pipe Dia",
  "Length As Per Site",
  "GL (Ground Level)",
  "Design Ex",
  "Executed Ex",
  "Depth of Ex",
  "Soft Rock",
  "Width of Ex",
  "Area",
  "Mean Area",
  "Mrurum filling (D)",
  "Shrinkage D",
  "Shrinkage RL Required",
  "Width of Ex",
  "Area",
  "Mean Area",
  "Length",
  "QTY"
];

export default function MurumDetails() {
  const { projectNo } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [alignmentFilter, setAlignmentFilter] = useState('');
  const [pipeDiaFilter, setPipeDiaFilter] = useState('');

  useEffect(() => {
    const decodedNo = decodeURIComponent(projectNo || '');
    const found = getProjectOrMinor(decodedNo);
    setProject(found || null);
    setEntries(getExecutions().filter(e => e.projectNo === decodedNo));
  }, [projectNo]);

  // Group entries by component (alignment), ordered by Serial No
  const rawRows = useMemo(() => {
    const sorted = [...entries].sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));
    const result = [];
    let lastComponent = null;

    sorted.forEach((entry, i) => {
      const comp = entry.alignment || '-';
      // Insert blank separator row between two different components
      if (lastComponent !== null && lastComponent !== comp) {
        result.push({ isSeparator: true, id: `sep-${i}` });
      }
      lastComponent = comp;

      result.push({
        isSeparator: false,
        id: entry.id,
        entry,
        serialNo: entry.serialNo,
        component: comp,
        chainage: entry.execution?.chainage ?? entry.design?.chainage ?? 0,
        pipeDia: entry.execution?.pipeDia ?? entry.design?.pipeDia ?? 0,
        gl: entry.execution?.elevation ?? entry.design?.elevation ?? 0,
        designBottom: entry.design?.cuttingLevel ?? entry.execution?.cuttingLevel ?? 0,
        countLength: true,
        isHardRock: entry.isHardRock,
        hardRockValue: entry.hardRockValue,
      });
    });

    return result;
  }, [entries]);

  // Run the full calculations strictly adhering to the specified formulas
  const calculatedRows = useMemo(() => {
    let prevRow = null;

    return rawRows.map((row, idx) => {
      if (row.isSeparator) {
        prevRow = null; // Next component will see prevRow as null / 0
        return { isSeparator: true, id: row.id || `sep-${idx}` };
      }

      const chainage_r = num(row.chainage);
      const chainage_prev = prevRow ? num(prevRow.chainage) : 0;
      // length = ROUND(countLength ? (chainage_r - chainage_prev) : 0, 2)
      const length = round2(row.countLength !== false ? Math.max(0, chainage_r - chainage_prev) : 0);

      const gl = num(row.gl);
      const designBottom = num(row.designBottom);
      const executedBottom = mround(designBottom, 0.005);
      const depthOfEx = gl - designBottom;
      const pipeDia = num(row.pipeDia);
      const widthOfEx = round2(1.5 * (pipeDia / 1000) + 0.3);

      const hardRock = row.isHardRock ? num(row.hardRockValue) : 0;
      const softRock = Math.max(0, depthOfEx - hardRock);

      const area = round2(softRock * widthOfEx);
      const prevArea = prevRow ? num(prevRow.area) : 0;
      const meanArea = (prevArea + area) / 2;

      // Murum Bedding calculations
      const fillingU = MURUM_THICKNESS;
      const shrinkageD = fillingU * 1.1; // 10% shrinkage allowance
      const shrinkageRL = shrinkageD + executedBottom;
      const murumWidth = widthOfEx;
      const murumArea = murumWidth * shrinkageD;
      const prevMurumArea = prevRow ? num(prevRow.murumArea) : 0;
      const murumMeanArea = (prevMurumArea + murumArea) / 2;
      const murumLength = length;
      const murumQty = murumLength * murumMeanArea;

      const calculated = {
        ...row,
        chainage: chainage_r,
        pipeDia,
        lengthAsPerSite: length,
        gl,
        designBottom,
        executedBottom,
        depthOfEx,
        softRock,
        widthOfEx,
        area,
        meanArea,
        murumFilling: fillingU,
        shrinkageD,
        shrinkageRL,
        murumWidth,
        murumArea,
        murumMeanArea,
        murumLength,
        murumQty
      };

      prevRow = calculated;
      return calculated;
    });
  }, [rawRows]);

  // Unique alignments and pipe diameters for filters
  const uniqueAlignments = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.alignment))).filter(Boolean).sort();
  }, [entries]);

  const uniquePipeDias = useMemo(() => {
    return Array.from(new Set(entries.map(e => e.execution?.pipeDia ?? e.design?.pipeDia)))
      .filter(v => v !== undefined && v !== null && v !== '')
      .sort((a, b) => Number(a) - Number(b));
  }, [entries]);

  const alignmentOptions = uniqueAlignments.map(a => ({ value: a, label: a }));
  const pipeDiaOptions = uniquePipeDias.map(v => ({ value: v, label: String(v) }));

  // Filtering applies to display
  const displayedRows = useMemo(() => {
    return calculatedRows.filter(row => {
      if (row.isSeparator) {
        // Hide separator row if filters are active
        return !(alignmentFilter || pipeDiaFilter || searchQuery);
      }
      if (alignmentFilter && row.component !== alignmentFilter) return false;
      if (pipeDiaFilter && String(row.pipeDia) !== String(pipeDiaFilter)) return false;
      if (searchQuery && !String(row.component).toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [calculatedRows, alignmentFilter, pipeDiaFilter, searchQuery]);

  // Summary Totals
  const totalLength = useMemo(() => {
    return displayedRows.reduce((sum, r) => (!r.isSeparator ? sum + (r.lengthAsPerSite || 0) : sum), 0);
  }, [displayedRows]);

  const murumGrossQty = useMemo(() => {
    return displayedRows.reduce((sum, r) => (!r.isSeparator ? sum + (r.murumQty || 0) : sum), 0);
  }, [displayedRows]);

  // Bottom Totals Row matching ExecutionDetails layout exactly
  const totalRow = [
    'Total',
    '',
    '',
    '',
    totalLength.toFixed(2),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalLength.toFixed(2),
    murumGrossQty.toFixed(3)
  ];

  const renderRow = (row, index) => {
    if (row.isSeparator) {
      return (
        <tr key={`sep-${index}`} className="bg-gray-100/80 border-y border-dashed border-gray-300">
          <td colSpan={TABLE_HEADERS.length} className="py-1 px-4 text-center text-[10px] uppercase tracking-widest font-semibold text-gray-400">
            &mdash; Component Separator &mdash;
          </td>
        </tr>
      );
    }

    return (
      <tr key={row.id || index} className="hover:bg-gray-50/70 transition-colors border-b border-gray-100">
        <td className="px-4 py-2.5 text-center text-xs text-indigo-600 font-bold whitespace-nowrap">
          {row.serialNo}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {row.component}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.chainage, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.pipeDia, 0)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-700 whitespace-nowrap">
          {displayVal(row.lengthAsPerSite, 2)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.gl, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.designBottom, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.executedBottom, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.depthOfEx, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.softRock, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.widthOfEx, 2)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.area, 2)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.meanArea, 3)}
        </td>

        {/* Murum Bedding Columns */}
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.murumFilling, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.shrinkageD, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.shrinkageRL, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.murumWidth, 2)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.murumArea, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">
          {displayVal(row.murumMeanArea, 3)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-700 whitespace-nowrap">
          {displayVal(row.murumLength, 2)}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] font-bold text-gray-800 whitespace-nowrap">
          {displayVal(row.murumQty, 3)}
        </td>
      </tr>
    );
  };

  const renderCard = (row) => {
    if (row.isSeparator) {
      return (
        <div key={row.id} className="py-2 text-center text-[10px] uppercase font-bold text-gray-400 bg-gray-100 rounded-lg">
          &mdash; Component Separator &mdash;
        </div>
      );
    }
    return (
      <div key={row.id} className="rounded-lg border border-gray-200 shadow-sm p-3 space-y-1.5 bg-white">
        <div className="flex justify-between items-start border-b border-gray-200 pb-1.5 mb-1">
          <span className="text-[9px] text-indigo-500 uppercase tracking-widest">#{row.serialNo}</span>
          <span className="text-[10px] text-gray-700 font-medium">Component: {row.component}</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Chainage:</span>
            <span className="text-gray-800">{displayVal(row.chainage, 3)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Pipe Dia:</span>
            <span className="text-gray-800">{displayVal(row.pipeDia, 0)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Length:</span>
            <span className="text-gray-800 font-semibold">{displayVal(row.lengthAsPerSite, 2)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">GL:</span>
            <span className="text-gray-800">{displayVal(row.gl, 3)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Design Ex:</span>
            <span className="text-gray-800">{displayVal(row.designBottom, 3)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Executed Ex:</span>
            <span className="text-gray-800">{displayVal(row.executedBottom, 3)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Depth of Ex:</span>
            <span className="text-gray-800">{displayVal(row.depthOfEx, 3)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Soft Rock:</span>
            <span className="text-gray-800">{displayVal(row.softRock, 3)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Width of Ex:</span>
            <span className="text-gray-800">{displayVal(row.widthOfEx, 2)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Area:</span>
            <span className="text-gray-800">{displayVal(row.area, 2)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Mean Area:</span>
            <span className="text-gray-800">{displayVal(row.meanArea, 3)}</span>
          </div>
          <div className="flex justify-between px-1.5 py-0.5 rounded">
            <span className="text-gray-500">Murum QTY:</span>
            <span className="text-indigo-600 font-bold">{displayVal(row.murumQty, 3)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => project?.isMinor ? navigate(`/pms/murum/${encodeURIComponent(project.parentProjectNo)}`) : navigate('/pms/execution')}
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
      {/* Top Filter Bar */}
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
            placeholder="Search component / alignment..."
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

        <div className="w-36 md:w-44 flex-shrink-0">
          <SearchableDropdown
            options={pipeDiaOptions}
            value={pipeDiaFilter}
            onChange={(val) => setPipeDiaFilter(val)}
            placeholder="All Pipe Dia"
            height="h-[32px] md:h-[38px]"
          />
        </div>

        {(alignmentFilter || pipeDiaFilter || searchQuery) && (
          <button
            onClick={() => {
              setAlignmentFilter('');
              setPipeDiaFilter('');
              setSearchQuery('');
            }}
            className="flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded-lg md:rounded w-[32px] h-[32px] md:w-[38px] md:h-[38px] hover:bg-gray-100 transition shadow-sm"
            title="Clear Filters"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* Project Header Info Card */}
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

      {/* Main Content - DataTable matching ExecutionDetails exactly */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-2 sm:mx-0">
        <DataTable
          headers={TABLE_HEADERS}
          data={displayedRows}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="2000px"
          totalRow={totalRow}
        />
      </div>
    </div>
  );
}
