// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Building2, MapPin, Calendar, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { getProjects, getStageEntriesForStage, upsertStageEntry, stageEntryId } from '@/systems/pms/utils/storageManager';
import { STAGES, STATUS_STYLES, STATUS_LABELS, STEP_STATUS_OPTIONS, STEP_STATUS_STYLES } from '@/systems/pms/utils/stagesConfig';

export default function StageDetail() {
  const { projectNo, stageNumber } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);

  const decodedNo = decodeURIComponent(projectNo || '');
  const stageNum = Number(stageNumber);

  useEffect(() => {
    const found = getProjects().find(p => p.serialNo === decodedNo);
    setProject(found || null);
    setEntries(getStageEntriesForStage(decodedNo, stageNum));
  }, [projectNo, stageNumber]);

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
  const stage = stages.find(s => s.number === stageNum);

  if (!stage) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate(`/pms/process-flow/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back to Process Flow
        </button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">
          Stage not found.
        </div>
      </div>
    );
  }

  const statusFor = (idx) => entries.find(e => e.id === stageEntryId(project.serialNo, stage.number, idx))?.status || 'Pending';

  const handleStatusChange = (idx, status) => {
    const record = upsertStageEntry({
      id: stageEntryId(project.serialNo, stage.number, idx),
      projectNo: project.serialNo,
      stageNumber: stage.number,
      stepIndex: idx,
      stepText: stage.steps[idx],
      status
    });
    setEntries(prev => [...prev.filter(e => e.id !== record.id), record]);
    toast.success('Step status updated');
  };

  const completedCount = stage.steps.filter((_, idx) => statusFor(idx) === 'Completed').length;
  const pct = stage.steps.length ? Math.round((completedCount / stage.steps.length) * 100) : 0;

  const prevStage = stages.find(s => s.number === stage.number - 1);
  const nextStage = stages.find(s => s.number === stage.number + 1);

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-6 flex flex-col h-full min-h-0 overflow-y-auto">
      {/* Back */}
      <div className="px-2 sm:px-0">
        <button
          onClick={() => navigate(`/pms/process-flow/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold w-fit"
        >
          <ArrowLeft size={16} /> Back to Process Flow
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

      {/* Stage Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base border border-indigo-200">
              {stage.number}
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold text-gray-900">{stage.title}</h2>
              <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${STATUS_STYLES[stage.status]}`}>
                {STATUS_LABELS[stage.status]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">{completedCount}/{stage.steps.length} steps</span>
          </div>
        </div>

        {stage.links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {stage.links.map(link => (
              <button
                key={link.label}
                onClick={() => navigate(link.to)}
                className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
              >
                <link.icon size={12} /> {link.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0 space-y-2">
        {stage.steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center mt-0.5">
              {idx + 1}
            </div>
            <p className="flex-1 text-sm text-gray-700 leading-snug">{step}</p>
            <select
              value={statusFor(idx)}
              onChange={(e) => handleStatusChange(idx, e.target.value)}
              className={`flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded border focus:outline-none cursor-pointer ${STEP_STATUS_STYLES[statusFor(idx)]}`}
            >
              {STEP_STATUS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Prev / Next Stage */}
      <div className="flex items-center justify-between gap-3 mx-2 sm:mx-0 pb-2">
        <button
          onClick={() => prevStage && navigate(`/pms/process-flow/${encodeURIComponent(project.serialNo)}/${prevStage.number}`)}
          disabled={!prevStage}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold border transition-colors ${
            prevStage
              ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          <ChevronLeft size={16} /> {prevStage ? prevStage.title : 'Previous Stage'}
        </button>
        <button
          onClick={() => nextStage && navigate(`/pms/process-flow/${encodeURIComponent(project.serialNo)}/${nextStage.number}`)}
          disabled={!nextStage}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-semibold border transition-colors ${
            nextStage
              ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {nextStage ? nextStage.title : 'Next Stage'} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
