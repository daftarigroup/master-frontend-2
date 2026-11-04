// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, FileText, Mail, ArrowRight, Eye, Building2, Tag, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { getProjects, getDocumentationFiles, getEmailLogs } from '@/systems/pms/utils/storageManager';
import DataTable from '@/systems/pms/components/DataTable';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';

export interface ProjectsDocumentationTableProps {
  onSelectProject?: (project: any) => void;
  mode?: string;
  onUploadDocument?: (project: any) => void;
  [key: string]: any;
}

export default function ProjectsDocumentationTable({
  onSelectProject,
  mode = 'documentation',
  onUploadDocument
}: ProjectsDocumentationTableProps) {
  const [projects, setProjects] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [allEmailLogs, setAllEmailLogs] = useState([]);

  const initialFilters = {
    searchQuery: '',
    projectName: '',
    contractorName: ''
  };
  const [filters, setFilters] = useState({ ...initialFilters });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const loadData = () => {
    try {
      const p = getProjects() || [];
      setProjects(p);
      const docs = getDocumentationFiles() || [];
      setAllDocs(docs);
      const elogs = getEmailLogs() || [];
      setAllEmailLogs(elogs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearFilters = () => {
    setFilters({ ...initialFilters });
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  // Filter projects
  const filteredProjects = projects.filter(p => {
    if (filters.projectName && p.projectName !== filters.projectName) return false;
    if (filters.contractorName && p.contractorName !== filters.contractorName) return false;

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      return (
        (p.serialNo || '').toLowerCase().includes(q) ||
        (p.projectName || '').toLowerCase().includes(q) ||
        (p.projectType || '').toLowerCase().includes(q) ||
        (p.agreementNumber || '').toLowerCase().includes(q) ||
        (p.department || '').toLowerCase().includes(q) ||
        (p.division || '').toLowerCase().includes(q) ||
        (p.contractorName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Helper count badges
  const getDocCount = (proj) => {
    if (!proj) return 0;
    const sNo = (proj.serialNo || '').toLowerCase();
    const pName = (proj.projectName || '').toLowerCase();
    return allDocs.filter(d => {
      const dProj = (d.projectName || '').toLowerCase();
      const dAgr = (d.agreementNo || '').toLowerCase();
      return (
        dProj === pName ||
        (proj.agreementNumber && dAgr === (proj.agreementNumber || '').toLowerCase()) ||
        dProj.includes(sNo)
      );
    }).length;
  };

  const getEmailCount = (proj) => {
    if (!proj) return 0;
    const sNo = (proj.serialNo || '').toLowerCase();
    const pName = (proj.projectName || '').toLowerCase();
    return allEmailLogs.filter(l => {
      const lProj = (l.projectName || '').toLowerCase();
      const lNo = (l.projectNo || '').toLowerCase();
      return lProj === pName || lNo === sNo;
    }).length;
  };

  const isDocMode = mode === 'documentation';

  const tableHeaders = [
    "PROJECT NO",
    "PROJECT TYPE",
    "PROJECT NAME",
    "AGREEMENT NUMBER",
    "DEPARTMENT",
    "DIVISION",
    isDocMode ? "DOCUMENTS" : "SHARE LOGS",
    "ACTION"
  ];

  const renderRow = (item) => {
    const docCount = getDocCount(item);
    const emailCount = getEmailCount(item);

    return (
      <tr
        key={item.serialNo || item.id}
        onClick={() => onSelectProject(item)}
        className="group hover:bg-indigo-50/40 transition-colors border-b border-gray-100 cursor-pointer"
        title={`Click anywhere to open ${isDocMode ? 'documentation' : 'share logs'} for ${item.projectName}`}
      >
        {/* Project No */}
        <td
          className="px-4 py-3.5 text-center text-xs font-bold whitespace-nowrap bg-white group-hover:bg-indigo-50/50 transition-colors"
          style={{ position: 'sticky', left: 0, zIndex: 10, boxShadow: '2px 0 4px rgba(0,0,0,0.06)' }}
        >
          <span className="inline-block px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs tracking-wide">
            {item.serialNo || '-'}
          </span>
        </td>

        {/* Project Type */}
        <td className="px-4 py-3.5 text-center text-xs text-gray-700 whitespace-nowrap">
          {item.projectType || '-'}
        </td>

        {/* Project Name */}
        <td className="px-4 py-3.5 text-center text-xs text-gray-900 font-semibold whitespace-nowrap max-w-[320px] truncate" title={item.projectName}>
          {item.projectName}
        </td>

        {/* Agreement Number */}
        <td className="px-4 py-3.5 text-center text-xs text-gray-600 whitespace-nowrap font-mono">
          {item.agreementNumber || '-'}
        </td>

        {/* Department */}
        <td className="px-4 py-3.5 text-center text-xs text-gray-600 whitespace-nowrap max-w-[220px] truncate" title={item.department}>
          {item.department || '-'}
        </td>

        {/* Division */}
        <td className="px-4 py-3.5 text-center text-xs text-gray-600 whitespace-nowrap">
          {item.division || '-'}
        </td>

        {/* Documents / Shares count column */}
        <td className="px-4 py-3.5 text-center whitespace-nowrap">
          {isDocMode ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                docCount > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              <FileText size={12} className={docCount > 0 ? 'text-emerald-600' : 'text-slate-400'} />
              <span>{docCount} {docCount === 1 ? 'Doc' : 'Docs'}</span>
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                emailCount > 0
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              <Mail size={12} className={emailCount > 0 ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{emailCount} {emailCount === 1 ? 'Share' : 'Shares'}</span>
            </span>
          )}
        </td>

        {/* Action column */}
        <td
          className="px-3 py-3.5 text-center whitespace-nowrap bg-white group-hover:bg-indigo-50/50 transition-colors"
          style={{ position: 'sticky', right: 0, zIndex: 10, boxShadow: '-2px 0 4px rgba(0,0,0,0.06)' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectProject(item);
          }}
        >
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600"
          >
            <span>{isDocMode ? 'Open Docs' : 'View Shares'}</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </td>
      </tr>
    );
  };

  const renderCard = (item) => {
    const docCount = getDocCount(item);
    const emailCount = getEmailCount(item);

    return (
      <div
        key={item.serialNo || item.id}
        onClick={() => onSelectProject(item)}
        className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 space-y-2.5 hover:border-indigo-300 transition-colors cursor-pointer"
      >
        <div className="flex justify-between items-start gap-2 border-b border-gray-100 pb-2">
          <div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
              {item.serialNo}
            </span>
            <h4 className="text-xs font-bold text-gray-900 mt-1.5 line-clamp-2">{item.projectName}</h4>
          </div>
          {item.projectType && (
            <span className="text-[10px] text-slate-600 bg-slate-100 rounded px-2 py-0.5 flex-shrink-0 font-medium">
              {item.projectType}
            </span>
          )}
        </div>

        <div className="text-[11px] space-y-1 text-slate-600">
          {item.agreementNumber && (
            <div className="flex justify-between">
              <span className="text-slate-400">Agreement:</span>
              <span className="font-mono text-slate-800 font-semibold">{item.agreementNumber}</span>
            </div>
          )}
          {item.department && (
            <div className="flex justify-between">
              <span className="text-slate-400">Dept:</span>
              <span className="text-slate-800 truncate max-w-[200px]">{item.department}</span>
            </div>
          )}
          {item.division && (
            <div className="flex justify-between">
              <span className="text-slate-400">Division:</span>
              <span className="text-slate-800">{item.division}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">
            {isDocMode ? `${docCount} Documents` : `${emailCount} Shares`}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"
          >
            <span>{isDocMode ? 'View Docs' : 'View Shares'}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 md:space-y-3 flex flex-col flex-1 h-full min-h-0">
      {/* Top Filter Bar (matching Add_Project screenshot style) */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 w-full flex-shrink-0">
        {/* Search */}
        <div className="flex-1 min-w-0 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search projects.."
            value={filters.searchQuery}
            onChange={(e) => {
              setFilters({ ...filters, searchQuery: e.target.value });
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-indigo-500 text-xs h-[38px] transition-colors"
          />
        </div>

        {/* All Project Name */}
        <div className="flex-1 min-w-0">
          <SearchableDropdown
            options={Array.from(new Set(projects.map(p => p.projectName))).filter(Boolean).sort().map(v => ({ value: v, label: v }))}
            value={filters.projectName}
            onChange={(val) => {
              setFilters({ ...filters, projectName: val });
              setCurrentPage(1);
            }}
            placeholder="All Project Name"
            height="h-[38px]"
          />
        </div>

        {/* All Contractor Name */}
        <div className="flex-1 min-w-0">
          <SearchableDropdown
            options={Array.from(new Set(projects.map(p => p.contractorName))).filter(Boolean).sort().map(v => ({ value: v, label: v }))}
            value={filters.contractorName}
            onChange={(val) => {
              setFilters({ ...filters, contractorName: val });
              setCurrentPage(1);
            }}
            placeholder="All Contractor Name"
            height="h-[38px]"
          />
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={handleClearFilters}
          className="flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded-lg w-[38px] h-[38px] hover:bg-gray-100 transition-colors shadow-2xs flex-shrink-0 cursor-pointer active:scale-95"
          title="Clear Filters"
        >
          <RotateCcw size={15} />
        </button>

        {mode === 'documentation' && onUploadDocument && (
          <button
            type="button"
            onClick={onUploadDocument}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs px-4 h-[38px] rounded-lg shadow-2xs transition-colors flex-shrink-0 cursor-pointer"
          >
            <FileText size={15} />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Main Table Container - Fills remaining vertical height so pagination row sits at bottom */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <DataTable
          headers={tableHeaders}
          data={paginatedProjects}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="1200px"
          stickyFirstColumn
          stickyLastColumn
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          totalResults={filteredProjects.length}
        />
      </div>
    </div>
  );
}
