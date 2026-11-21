// @ts-nocheck
import { scopeProjects, scopeByProjectNo } from '@/systems/pms/utils/activeProject';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Tag,
  TrendingUp,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  MapPin,
  UserCheck
} from 'lucide-react';
import { getProjects, getProjectOrMinor } from '@/systems/pms/utils/storageManager';
import RAPlanningView from './RAPlanning/RAPlanningView';
import ProjectAbstractView from './ProjectAbstract/ProjectAbstractView';

export default function RAPlanningAbstractPage() {
  const { projectNo: paramProjectNo } = useParams();
  const navigate = useNavigate();
  
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [selectedProjectNo, setSelectedProjectNo] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ra2' | 'abstract'>('ra2');

  useEffect(() => {
    const list = scopeProjects(getProjects());
    setAllProjects(list);
    
    if (paramProjectNo) {
      setSelectedProjectNo(decodeURIComponent(paramProjectNo));
    } else if (list.length > 0) {
      setSelectedProjectNo(list[0].serialNo);
    }
  }, [paramProjectNo]);

  const currentProject = React.useMemo(() => {
    if (!selectedProjectNo) return null;
    return getProjectOrMinor(selectedProjectNo) || allProjects.find(p => p.serialNo === selectedProjectNo) || null;
  }, [selectedProjectNo, allProjects]);

  const effectiveProjectNo = currentProject?.isMinor
    ? (currentProject.parentProjectNo || selectedProjectNo)
    : (selectedProjectNo || 'PN-002');

  const effectiveProjectName = currentProject?.isMinor
    ? (currentProject.originalProjectName || currentProject.projectName)
    : (currentProject?.projectName || 'Irrigation Project');

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newNo = e.target.value;
    setSelectedProjectNo(newNo);
    navigate(`/ra2-planning-abstract/${encodeURIComponent(newNo)}`, { replace: true });
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 space-y-4 md:space-y-5 flex flex-col h-full min-h-0 overflow-y-auto pb-16 bg-slate-50/50">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/pms/execution')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            title="Return to Execution & Actual Report"
          >
            <ArrowLeft size={15} /> Back to Projects
          </button>

          <div className="h-5 w-px bg-gray-200 hidden sm:block" />

          <div>
            <h1 className="text-sm md:text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-indigo-600" />
              RA2 Planning & Abstract
            </h1>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              Planned vs Executed reconciliation and project quantity comparative abstract
            </p>
          </div>
        </div>

        {/* Project Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="project-picker" className="text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">
            Project:
          </label>
          <div className="relative min-w-[200px] sm:min-w-[260px]">
            <select
              id="project-picker"
              value={selectedProjectNo}
              onChange={handleProjectChange}
              className="w-full appearance-none bg-indigo-50/70 border border-indigo-200 text-indigo-900 font-bold text-xs rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {allProjects.map((p) => (
                <option key={p.serialNo} value={p.serialNo}>
                  {p.serialNo} — {p.projectName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-600 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Project Details Banner */}
      {currentProject && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-3.5 md:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-left">
            <div className="flex items-start gap-2">
              <Tag size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Project No</p>
                <p className="text-xs text-indigo-700 font-black truncate">{effectiveProjectNo}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 col-span-2 sm:col-span-1 lg:col-span-2">
              <Building2 size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Project Name</p>
                <p className="text-xs text-gray-900 font-bold truncate" title={effectiveProjectName}>
                  {effectiveProjectName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <UserCheck size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Contractor</p>
                <p className="text-xs text-gray-800 font-semibold truncate" title={currentProject.contractorName}>
                  {currentProject.contractorName || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Work Period</p>
                <p className="text-xs text-gray-800 font-semibold truncate">
                  {currentProject.startDate || '-'} → {currentProject.plannedEndDate || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Location</p>
                <p className="text-xs text-gray-800 font-semibold truncate" title={currentProject.projectLocation}>
                  {currentProject.projectLocation || '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Mode Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('ra2')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'ra2'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <TrendingUp size={15} />
          <span>RA2 Planning (Planned vs Executed)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('abstract')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'abstract'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <FileSpreadsheet size={15} />
          <span>Project Abstract</span>
        </button>
      </div>

      {/* Active Tab View */}
      <div className="min-h-0 flex-1">
        {activeTab === 'ra2' ? (
          <RAPlanningView
            projectNo={effectiveProjectNo}
            projectName={effectiveProjectName}
          />
        ) : (
          <ProjectAbstractView
            projectNo={effectiveProjectNo}
            projectName={effectiveProjectName}
          />
        )}
      </div>
    </div>
  );
}
