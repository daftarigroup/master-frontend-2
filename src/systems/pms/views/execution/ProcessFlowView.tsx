// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, Calendar, Tag, ChevronRight } from 'lucide-react';
import { getProjects, getStageEntries } from '@/systems/pms/utils/storageManager';
import { STAGES, STATUS_STYLES, STATUS_LABELS } from '@/systems/pms/utils/stagesConfig';

export default function ProcessFlow() {
  const { projectNo } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const decodedNo = decodeURIComponent(projectNo || '');
    const found = getProjects().find(p => p.serialNo === decodedNo);
    setProject(found || null);
    setEntries(getStageEntries().filter(e => e.projectNo === decodedNo));
  }, [projectNo]);

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate('/pms/projects')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back to Projects
        </button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">
          Project not found.
        </div>
      </div>
    );
  }

  const stages = STAGES(project.serialNo);

  const progressFor = (stage) => {
    const done = entries.filter(e => e.stageNumber === stage.number && e.status === 'Completed').length;
    return { done, total: stage.steps.length };
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-6 flex flex-col h-full min-h-0 overflow-y-auto">
      {/* Back */}
      <div className="px-2 sm:px-0">
        <button
          onClick={() => navigate(`/pms/view-design/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold w-fit"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Project Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <Tag size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Agreement No</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.agreementNumber || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 min-w-0">
            <MapPin size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Location</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate" title={[project.projectLocation, project.village, project.district, project.state].filter(Boolean).join(', ')}>
                {[project.projectLocation, project.village, project.district, project.state].filter(Boolean).join(', ') || '-'}
              </p>
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

      {/* Stage List */}
      <div className="flex-1 min-h-0 space-y-3 mx-2 sm:mx-0 pb-2">
        {stages.map(stage => {
          const { done, total } = progressFor(stage);
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div
              key={stage.number}
              onClick={() => navigate(`/pms/process-flow/${encodeURIComponent(project.serialNo)}/${stage.number}`)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-200">
                    {stage.number}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-base font-bold text-gray-900 truncate">{stage.title}</h3>
                    <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${STATUS_STYLES[stage.status]}`}>
                      {STATUS_LABELS[stage.status]}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 flex-shrink-0 mt-2" />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">{done}/{total} steps</span>
              </div>

              {stage.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {stage.links.map(link => (
                    <button
                      key={link.label}
                      onClick={(e) => { e.stopPropagation(); navigate(link.to); }}
                      className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                    >
                      <link.icon size={12} /> {link.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
