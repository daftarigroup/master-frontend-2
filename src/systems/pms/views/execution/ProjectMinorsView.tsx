// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Building2, FileText, Calendar, Tag, FileUp, Search, Activity, CalendarClock } from 'lucide-react';
import { getMinors, getProjectOrMinor, deleteMinor, getDesignByProject, getExecutions, syncProjectsCache } from '@/systems/pms/utils/storageManager';
import ModalAlert from '@/systems/pms/components/ModalAlert';
import AddMinorModal from './AddMinorModal';
import MinorCard from './MinorCard';
import MinorsDPRTable from './MinorsDPRTable';

export default function ProjectMinors() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [minors, setMinors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddMinorModal, setShowAddMinorModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const refreshMinors = (decodedNo) => {
    setMinors(getMinors().filter(m => m.projectNo === decodedNo));
  };

  useEffect(() => {
    const decodedNo = decodeURIComponent(projectNo || '');
    const found = getProjectOrMinor(decodedNo);
    setProject(found || null);
    refreshMinors(decodedNo);
    // Projects live in the backend; localStorage may not have them
    if (!found) {
      syncProjectsCache()
        .then(() => setProject(getProjectOrMinor(decodedNo) || null))
        .catch(() => {});
    }
  }, [projectNo]);

  const confirmDeleteMinor = () => {
    if (!deleteTarget) return;
    deleteMinor(deleteTarget.id);
    setDeleteTarget(null);
    refreshMinors(project.serialNo);
    toast.success(`"${deleteTarget.minorName}" deleted`);
  };

  // Calculate aggregate overall execution progress across all minors
  const allExecs = getExecutions();
  let totalMinorsDesignRows = 0;
  let totalMinorsExecutedRows = 0;
  let completedMinorsCount = 0;

  minors.forEach(m => {
    const dRows = getDesignByProject(m.id).length || (m.serialNo ? getDesignByProject(m.serialNo).length : 0);
    const eRows = allExecs.filter(e => e.projectNo === m.id || (m.serialNo && e.projectNo === m.serialNo)).length;
    totalMinorsDesignRows += dRows;
    totalMinorsExecutedRows += eRows;
    if (dRows > 0 && eRows >= dRows) {
      completedMinorsCount += 1;
    }
  });

  const overallPercentage = totalMinorsDesignRows > 0
    ? Math.min(100, Math.round((totalMinorsExecutedRows / totalMinorsDesignRows) * 100))
    : (totalMinorsExecutedRows > 0 ? 100 : 0);

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate('/pms/execution?list=1')}
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

  const filteredMinors = minors.filter(m =>
    m.minorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-6 flex flex-col h-full min-h-0 overflow-y-auto pb-16">
      {/* Row 1: Back + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full px-2 sm:px-0">
        <div className="flex-1 flex items-center min-w-0 relative">
          <Search className="absolute left-2.5 top-[9px] md:top-[11px] text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search miners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md bg-white border border-gray-300 rounded-lg md:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
          />
        </div>

        <button
          onClick={() => navigate(`/pms/schedule-report/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm hover:bg-rose-50 transition flex-shrink-0"
        >
          <CalendarClock size={16} /> Schedule Report
        </button>
      </div>

      {/* Project Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="flex items-start gap-2 min-w-0">
            <Tag size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project No</p>
              <p className="text-base md:text-lg text-indigo-600 font-bold truncate">{project.serialNo}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <Building2 size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project Name</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.projectName}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <FileText size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project Description</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate" title={project.projectDescription}>{project.projectDescription || '-'}</p>
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

        {/* Overall Minors Execution Progress Bar */}
        <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 uppercase tracking-tight flex items-center gap-1.5 text-xs">
                <Activity size={15} className={overallPercentage === 100 ? 'text-emerald-500' : 'text-indigo-600'} />
                Overall Minors Execution Progress
              </span>
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {minors.length} Minor{minors.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-base font-extrabold ${overallPercentage === 100
                  ? 'text-emerald-600'
                  : overallPercentage > 0
                    ? 'text-indigo-600'
                    : 'text-gray-500'
                }`}>
                {overallPercentage}%
              </span>
            </div>
          </div>

          {/* Long Overall Progress Bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${overallPercentage === 100
                  ? 'bg-emerald-500'
                  : overallPercentage > 0
                    ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500'
                    : 'bg-transparent'
                }`}
              style={{ width: `${overallPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium">
            <span>Overall execution across all miners</span>
            <span>
              {completedMinorsCount} of {minors.length} minor{minors.length !== 1 ? 's' : ''} completed
            </span>
          </div>
        </div>
      </div>

      {/* Minors Grid */}
      <div className="mx-2 sm:mx-0 flex-1">
        {filteredMinors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMinors.map(minor => (
              <MinorCard key={minor.id} minor={minor} onDelete={setDeleteTarget} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 border-dashed shadow-sm p-12 text-center text-gray-500">
            <FileUp size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-base font-semibold text-gray-600 mb-1">No Minors Added Yet</p>
            <p className="text-sm">No minors have been configured for this project.</p>
          </div>
        )}
      </div>

      {/* DPR Spreadsheet Table (below minors red border cards) */}
      {minors.length > 0 && (
        <div className="mx-2 sm:mx-0">
          <MinorsDPRTable
            project={project}
            minors={minors}
            onDataUpdated={() => refreshMinors(project.serialNo)}
          />
        </div>
      )}

      {/* Add Minor Modal */}
      <AddMinorModal
        isOpen={showAddMinorModal}
        onClose={() => setShowAddMinorModal(false)}
        project={project}
        onSaved={() => {
          setShowAddMinorModal(false);
          refreshMinors(project.serialNo);
        }}
      />

      {/* Delete Minor Confirmation */}
      <ModalAlert
        isOpen={!!deleteTarget}
        type="confirm"
        title="Delete this minor?"
        message={deleteTarget ? `"${deleteTarget.minorName}" and all its design/execution/actual data will be permanently removed.` : ''}
        onConfirm={confirmDeleteMinor}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
