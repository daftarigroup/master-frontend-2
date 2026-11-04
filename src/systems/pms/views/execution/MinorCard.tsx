// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, Calendar, ChevronRight, Trash2, Hash, Users, Activity } from 'lucide-react';
import { getDesignByProject, getExecutions } from '@/systems/pms/utils/storageManager';

export default function MinorCard({ minor, onDelete }) {
  const navigate = useNavigate();

  // Calculate execution progress based on execution entries vs total design rows
  const totalRows = getDesignByProject(minor.id).length || (minor.serialNo ? getDesignByProject(minor.serialNo).length : 0);
  const allExecs = getExecutions();
  const execs = allExecs.filter(e => e.projectNo === minor.id || (minor.serialNo && e.projectNo === minor.serialNo));
  const executedCount = execs.length;
  const percentage = totalRows > 0 ? Math.min(100, Math.round((executedCount / totalRows) * 100)) : (executedCount > 0 ? 100 : 0);

  return (
    <div
      onClick={() => navigate(`/pms/view-design/${encodeURIComponent(minor.id)}`)}
      className="bg-white rounded-xl border border-rose-100 shadow-sm p-4 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-rose-50 p-2 rounded-lg text-rose-600 flex-shrink-0">
              <FileUp size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-800 group-hover:text-rose-600 transition-colors truncate">
                {minor.minorName}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-gray-500">
                {minor.poNumber && (
                  <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                    <Hash size={10} /> {minor.poNumber}
                  </span>
                )}
                {minor.contractorName && (
                  <span className="inline-flex items-center gap-1 font-medium text-gray-700 bg-slate-100 border border-gray-200 px-1.5 py-0.2 rounded">
                    <Users size={10} /> {minor.contractorName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date(minor.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete && onDelete(minor); }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete minor"
            >
              <Trash2 size={16} />
            </button>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-rose-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Execution Progress Bar */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
            <Activity size={13} className={percentage === 100 ? 'text-emerald-500' : 'text-indigo-600'} />
            Execution Progress
          </span>
          <span className={`font-bold text-xs ${
            percentage === 100
              ? 'text-emerald-600'
              : percentage > 0
              ? 'text-indigo-600'
              : 'text-gray-400'
          }`}>
            {percentage}%
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentage === 100
                ? 'bg-emerald-500'
                : percentage > 0
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                : 'bg-transparent'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
          <span>{executedCount} executed</span>
          <span>{totalRows > 0 ? `${totalRows} design rows` : 'No design rows'}</span>
        </div>
      </div>
    </div>
  );
}
