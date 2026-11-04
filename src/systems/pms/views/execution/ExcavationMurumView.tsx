// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Calendar, Tag, Search, User } from 'lucide-react';
import { getProjects, getExecutions, getProjectOrMinor } from '@/systems/pms/utils/storageManager';
import { buildChainageDiffMap } from '@/systems/pms/utils/helpers';
import DataTable from '@/systems/pms/components/DataTable';

// Show the value as-is (0 included) - only fall back to '-' when it's actually empty.
// Numeric values are shown with 3 digits after the decimal point; non-numeric text is untouched.
const displayVal = (v) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

// Blank/non-numeric values are treated as 0 in calculations (spreadsheet-style arithmetic)
const num = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

const TABLE_HEADERS = [
  'Serial No', 'Component', 'Chainage As Per Site', 'Pipe Dia', 'Length As Per Site',
  'GL (Ground Level)', 'Design Ex', 'Executed Ex', 'Depth of Ex', 'Soft Rock',
  'Width of Ex', 'Area', 'Mean Area', 'Soft Strata Qty', 'Hard Rock', 'Area 2',
  'Mean Area 2', 'Hard Strata Qty 2'
];

export default function ExcavationMurum() {
  const { projectNo } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const decodedNo = decodeURIComponent(projectNo || '');
    const found = getProjectOrMinor(decodedNo);
    setProject(found || null);
    setEntries(getExecutions().filter(e => e.projectNo === decodedNo));
  }, [projectNo]);

  // One row per Execution entry (this page only shows entries once the Execution form has been
  // filled), ordered by Serial No - Mean Area / Mean Area 2 / Hard Strata Qty 2 all reference the
  // row immediately above in this order, so everything is computed against the full (unfiltered)
  // list first and the search box only narrows what's displayed afterwards.
  const bySerialNo = [...entries].sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0));

  // Length As Per Site = this entry's Execution Chainage minus the previous entry's Execution
  // Chainage - the same "B - A" rule ExecutionDetails.jsx uses for its Pipe Dia columns.
  const chainageDiffMap = buildChainageDiffMap(bySerialNo, e => e.execution?.chainage, e => e.id);

  // Pass 1: everything that only needs this row's own values.
  const pass1 = bySerialNo.map(entry => {
    const pipeDia = entry.execution?.pipeDia;
    const lengthAsPerSite = chainageDiffMap.get(entry.id) ?? 0;

    const gl = num(entry.execution?.elevation);           // Ground Level = Execution's Elevation
    const designEx = num(entry.design?.cuttingLevel);      // Design's Cutting Level (Design snapshot)
    const executedEx = num(entry.execution?.cuttingLevel); // Execution's Cutting Level
    const depthOfEx = gl - designEx;

    const hardRock = entry.isHardRock ? num(entry.hardRockValue) : 0;
    const softRock = depthOfEx - hardRock;

    const widthOfEx = round2(1.5 * (num(pipeDia) / 1000) + 0.3);
    const area = round2(softRock * widthOfEx);
    const area2 = round2(hardRock * widthOfEx);

    return { entry, pipeDia, lengthAsPerSite, gl, designEx, executedEx, depthOfEx, hardRock, softRock, widthOfEx, area, area2 };
  });

  // Pass 2: Mean Area / Mean Area 2 = (this row's Area/Area 2 + the previous row's Area/Area 2) / 2
  // The first row has no previous row, so the previous Area/Area 2 is treated as 0.
  // Soft Strata Qty & Hard Strata Qty 2 follow from this row's own Mean Area and Length As Per Site.
  const pass2 = pass1.map((row, i) => {
    const prevArea = i > 0 ? pass1[i - 1].area : 0;
    const prevArea2 = i > 0 ? pass1[i - 1].area2 : 0;
    const meanArea = (row.area + prevArea) / 2;
    const meanArea2 = (row.area2 + prevArea2) / 2;
    const softStrataQty = round2(meanArea * row.lengthAsPerSite);
    const hardStrataQty2 = round2(meanArea2 * row.lengthAsPerSite);
    return { ...row, meanArea, meanArea2, softStrataQty, hardStrataQty2 };
  });

  const rows = pass2;

  const filteredRows = rows.filter(row => {
    if (!searchQuery) return true;
    return String(row.entry.alignment).toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderRow = (row) => {
    const { entry } = row;
    return (
      <tr key={entry.id} className="hover:bg-gray-50/70 transition-colors border-b border-gray-100">
        <td className="px-4 py-2.5 text-center text-xs text-indigo-600 font-bold whitespace-nowrap">{entry.serialNo}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{entry.alignment}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{displayVal(entry.execution?.chainage)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{displayVal(row.pipeDia)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 font-semibold whitespace-nowrap">{row.lengthAsPerSite.toFixed(3)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{displayVal(entry.execution?.elevation)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{displayVal(entry.design?.cuttingLevel)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{displayVal(entry.execution?.cuttingLevel)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{row.depthOfEx.toFixed(3)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{row.softRock.toFixed(3)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{row.widthOfEx.toFixed(3)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{row.area.toFixed(3)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{row.meanArea.toFixed(3)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-indigo-700 font-semibold whitespace-nowrap">{row.softStrataQty.toFixed(3)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] whitespace-nowrap">
          {entry.isHardRock
            ? <span className="text-amber-700 font-semibold">{entry.hardRockValue || '-'}</span>
            : <span className="text-gray-300">-</span>}
        </td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{row.area2.toFixed(3)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-gray-700 whitespace-nowrap">{row.meanArea2.toFixed(3)}</td>
        <td className="px-4 py-2.5 text-center text-[11px] text-amber-700 font-semibold whitespace-nowrap">{row.hardStrataQty2.toFixed(3)}</td>
      </tr>
    );
  };

  const renderCard = (row) => {
    const { entry } = row;
    const fields = [
      ['Chainage As Per Site', displayVal(entry.execution?.chainage)],
      ['Pipe Dia', displayVal(row.pipeDia)],
      ['Length As Per Site', row.lengthAsPerSite.toFixed(3)],
      ['GL (Ground Level)', displayVal(entry.execution?.elevation)],
      ['Design Ex', displayVal(entry.design?.cuttingLevel)],
      ['Executed Ex', displayVal(entry.execution?.cuttingLevel)],
      ['Depth of Ex', row.depthOfEx.toFixed(3)],
      ['Soft Rock', row.softRock.toFixed(3)],
      ['Width of Ex', row.widthOfEx.toFixed(3)],
      ['Area', row.area.toFixed(3)],
      ['Mean Area', row.meanArea.toFixed(3)],
      ['Soft Strata Qty', row.softStrataQty.toFixed(3)],
      ['Area 2', row.area2.toFixed(3)],
      ['Mean Area 2', row.meanArea2.toFixed(3)],
      ['Hard Strata Qty 2', row.hardStrataQty2.toFixed(3)],
    ];
    return (
      <div key={entry.id} className="rounded-lg border border-gray-200 shadow-sm p-3 space-y-1.5 bg-white">
        <div className="flex justify-between items-start border-b border-gray-200 pb-1.5 mb-1">
          <span className="text-[9px] text-indigo-500 uppercase tracking-widest">#{entry.serialNo}</span>
          <span className="text-[10px] text-gray-700 font-medium">Component: {entry.alignment}</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          {fields.map(([label, val]) => (
            <div key={label} className="flex justify-between px-1.5 py-0.5 rounded">
              <span className="text-gray-500">{label}:</span>
              <span className="text-gray-800">{val}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between px-1.5 py-0.5 rounded text-[10px]">
          <span className="text-gray-500">Hard Rock:</span>
          {entry.isHardRock
            ? <span className="text-amber-700 font-semibold">{entry.hardRockValue || '-'}</span>
            : <span className="text-gray-400">-</span>}
        </div>
      </div>
    );
  };

  // Totals footer: grand total of the three quantity-style columns
  const totalRow = [
    'Total', '', '', '',
    filteredRows.reduce((s, r) => s + r.lengthAsPerSite, 0).toFixed(3),
    '', '', '', '', '', '', '', '',
    filteredRows.reduce((s, r) => s + r.softStrataQty, 0).toFixed(3),
    '', '', '',
    filteredRows.reduce((s, r) => s + r.hardStrataQty2, 0).toFixed(3)
  ];

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => project?.isMinor ? navigate(`/pms/excavation-murum/${encodeURIComponent(project.parentProjectNo)}`) : navigate('/pms/projects/new')}
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
            placeholder="Search component..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg md:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
          />
        </div>
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
          headers={TABLE_HEADERS}
          data={filteredRows}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="2200px"
          totalRow={totalRow}
        />
      </div>
    </div>
  );
}
