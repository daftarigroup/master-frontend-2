// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, FileText, Tag } from 'lucide-react';
import { getProjectOrMinor } from '@/systems/pms/utils/storageManager';
import ProjectAbstractView from './ProjectAbstract/ProjectAbstractView';

export default function ProjectAbstractPage() {
  const { projectNo } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    const decodedNo = decodeURIComponent(projectNo || '');
    const found = getProjectOrMinor(decodedNo);
    setProject(found || null);
  }, [projectNo]);

  const decodedNo = decodeURIComponent(projectNo || 'PN-002');
  const effectiveProjectNo = project?.isMinor ? (project.parentProjectNo || decodedNo) : decodedNo;
  const effectiveProjectName = project?.isMinor ? (project.originalProjectName || project.projectName) : (project?.projectName || 'Irrigation Minors Project');

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-4 md:space-y-6 flex flex-col h-full min-h-0 overflow-y-auto pb-16">
      {/* Back Button */}
      <div className="flex items-center gap-2 px-2 sm:px-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Project Details Banner */}
      {project && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mx-2 sm:mx-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <Tag size={18} className="text-indigo-500 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Project No</p>
                <p className="text-sm text-indigo-600 font-bold">{effectiveProjectNo}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 size={18} className="text-indigo-500 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Project Name</p>
                <p className="text-sm text-gray-900 font-bold truncate">{effectiveProjectName}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={18} className="text-indigo-500 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Start Date</p>
                <p className="text-sm text-gray-900 font-bold">{project.startDate || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar size={18} className="text-indigo-500 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Planned End Date</p>
                <p className="text-sm text-gray-900 font-bold">{project.plannedEndDate || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Abstract View Component */}
      <div className="mx-2 sm:mx-0">
        <ProjectAbstractView
          projectNo={effectiveProjectNo}
          projectName={effectiveProjectName}
        />
      </div>
    </div>
  );
}
