// @ts-nocheck
import { scopeProjects, scopeByProjectNo } from '@/systems/pms/utils/activeProject';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Share2,
  Mail,
  ArrowLeft,
  Search,
  RotateCcw,
  Calendar,
  Paperclip,
  CheckCircle2,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Clock,
  Send,
  Building2,
  Tag,
  Eye,
  Info,
  ChevronRight,
  X,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { getProjects, getEmailLogsForProject } from '@/systems/pms/utils/storageManager';
import { formatDate } from '@/systems/pms/utils/helpers';
import ProjectsDocumentationTable from './documentation/ProjectsDocumentationTable';

export default function ShareLogs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectLogs, setProjectLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLogModal, setActiveLogModal] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  // Load projects & check URL query params
  useEffect(() => {
    try {
      const projs = scopeProjects(getProjects() || []);
      setProjectsList(projs);

      const projParam = searchParams.get('project');
      if (projParam) {
        const found = projs.find(p =>
          (p.serialNo && p.serialNo.toLowerCase() === projParam.toLowerCase()) ||
          (p.projectName && p.projectName.toLowerCase() === projParam.toLowerCase())
        );
        if (found) {
          setSelectedProject(found);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [searchParams]);

  // Load share logs when selectedProject changes
  const loadProjectShareLogs = () => {
    if (!selectedProject) {
      setProjectLogs([]);
      return;
    }
    const logs = getEmailLogsForProject(
      selectedProject.projectName,
      selectedProject.serialNo,
      selectedProject.agreementNumber
    );
    setProjectLogs(logs || []);
  };

  useEffect(() => {
    loadProjectShareLogs();
  }, [selectedProject]);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSearchParams({ project: project.serialNo || project.projectName });
  };

  const handleBackToProjectsTable = () => {
    setSelectedProject(null);
    setSearchParams({});
    setSearchQuery('');
  };

  // Filter project logs by search
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return projectLogs;
    const q = searchQuery.toLowerCase().trim();
    return projectLogs.filter(log =>
      (log.subject || '').toLowerCase().includes(q) ||
      (log.to || '').toLowerCase().includes(q) ||
      (log.cc || '').toLowerCase().includes(q) ||
      (log.body || '').toLowerCase().includes(q) ||
      (log.attachedDocs || []).some(d => (d.title || d.fileName || '').toLowerCase().includes(q))
    );
  }, [projectLogs, searchQuery]);

  const handleCopyBody = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast.success('Share content copied to clipboard');
    setTimeout(() => setCopiedText(false), 2000);
  };

  // LEVEL 1: Projects Table View (When no project is selected)
  if (!selectedProject) {
    return (
      <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-4 flex flex-col h-full min-h-0">
        {/* Projects Table with Share Logs Mode */}
        <ProjectsDocumentationTable
          mode="share-logs"
          onSelectProject={handleSelectProject}
        />
      </div>
    );
  }

  // LEVEL 2: Project Share History View (When a project row has been clicked)
  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 flex flex-col h-full min-h-0 overflow-y-auto">
      {/* Top Header Bar with Back Button & Project Metadata */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleBackToProjectsTable}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            title="Return to Projects Table"
          >
            <ArrowLeft size={14} />
            <span>Back to Projects Table</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs tracking-wide">
              {selectedProject.serialNo}
            </span>
            <span className="font-bold text-slate-900 text-sm md:text-base">
              {selectedProject.projectName}
            </span>
            {selectedProject.agreementNumber && (
              <span className="text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-medium">
                Agr: {selectedProject.agreementNumber}
              </span>
            )}
            {selectedProject.department && (
              <span className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded hidden lg:inline-block">
                {selectedProject.department}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/pms/documentation?project=${selectedProject.serialNo}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <FileText size={14} />
            <span>View Project Documents</span>
          </button>
        </div>
      </div>

      {/* Search Bar for Shares (if logs exist) */}
      {projectLogs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-2xs flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by recipient, subject, attachment or message..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Showing {filteredLogs.length} of {projectLogs.length} share records
          </div>
        </div>
      )}

      {/* Main Share Logs List or Empty State */}
      <div className="flex-1">
        {projectLogs.length === 0 ? (
          /* Empty State for Dummy App */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-6 shadow-2xs space-y-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 shadow-2xs">
              <Share2 size={32} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                No Share History Yet
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                No document share history has been recorded for <span className="font-semibold text-slate-700">{selectedProject.projectName}</span>.
              </p>
            </div>

            {/* Dummy App Explanatory Notice */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                <Info size={14} className="text-indigo-600" />
                <span>Dummy App Notice</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                This is a dummy application without an active SMTP server connection. When you share documents via email in the <span className="font-semibold text-slate-700">Documentation</span> section, simulated share records with subject, recipients, and attachments will automatically be tracked here.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate(`/pms/documentation?project=${selectedProject.serialNo}`)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <FileText size={15} />
                <span>Go to Documentation</span>
              </button>

              <button
                type="button"
                onClick={handleBackToProjectsTable}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>View All Projects</span>
              </button>
            </div>
          </div>
        ) : (
          /* List of Sent Share Records */
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setActiveLogModal(log)}
                className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all p-4 space-y-3 cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      <span>{log.status || 'Shared (Simulated)'}</span>
                    </span>

                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock size={12} />
                      {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Recent'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {(log.attachedDocs || []).length} {((log.attachedDocs || []).length === 1 ? 'file' : 'files')} attached
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveLogModal(log);
                      }}
                      className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>View Full Share Details</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Recipient Details & Subject */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-bold text-slate-500 w-16 shrink-0">To:</span>
                    <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {log.to || 'recipient@domain.gov.in'}
                    </span>
                    {log.cc && (
                      <>
                        <span className="font-bold text-slate-400 ml-2">CC:</span>
                        <span className="text-slate-600 font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {log.cc}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-start sm:items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500 w-16 shrink-0">Subject:</span>
                    <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors break-words">
                      {log.subject || 'Project Document Submission'}
                    </span>
                  </div>
                </div>

                {/* Attached Document Tags */}
                {Array.isArray(log.attachedDocs) && log.attachedDocs.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Paperclip size={12} />
                      <span>Attachments:</span>
                    </span>
                    {log.attachedDocs.map((doc, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium"
                      >
                        <FileText size={11} className="text-indigo-600" />
                        <span className="truncate max-w-[200px]">{doc.title || doc.fileName}</span>
                        {doc.fileSize && (
                          <span className="text-[10px] text-slate-400 font-mono">({doc.fileSize})</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Snippet of Body */}
                {log.body && (
                  <div className="text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 font-mono line-clamp-2">
                    {log.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Share Log Modal */}
      {activeLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 size={20} className="text-indigo-200" />
                <div>
                  <h3 className="font-bold text-base">Document Share Details</h3>
                  <p className="text-[11px] text-indigo-100 font-mono">
                    {activeLogModal.sentAt ? new Date(activeLogModal.sentAt).toLocaleString() : 'Share Record'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogModal(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-indigo-100 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Share Meta Info */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-[11px] pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={12} />
                    {activeLogModal.status || 'Shared (Simulated)'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold text-slate-500 w-16">To:</span>
                  <span className="font-semibold text-slate-900">{activeLogModal.to}</span>
                </div>

                {activeLogModal.cc && (
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 w-16">CC:</span>
                    <span className="text-slate-700 font-mono">{activeLogModal.cc}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <span className="font-bold text-slate-500 w-16">Subject:</span>
                  <span className="font-bold text-slate-900">{activeLogModal.subject}</span>
                </div>

                <div className="flex gap-2">
                  <span className="font-bold text-slate-500 w-16">Project:</span>
                  <span className="text-slate-800 font-semibold">{selectedProject.projectName}</span>
                </div>
              </div>

              {/* Attachments Section */}
              {Array.isArray(activeLogModal.attachedDocs) && activeLogModal.attachedDocs.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-700 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Paperclip size={13} className="text-indigo-600" />
                    <span>Attached Documents ({activeLogModal.attachedDocs.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {activeLogModal.attachedDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-indigo-600" />
                          <div>
                            <p className="font-bold text-slate-800">{doc.title || doc.fileName}</p>
                            <p className="text-[10px] text-slate-400">{doc.docType || 'Official Document'}</p>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {doc.fileSize || 'FILE'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 uppercase text-[11px] tracking-wider">
                    Share Message Content
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopyBody(activeLogModal.body)}
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-bold hover:underline"
                  >
                    <Copy size={12} />
                    <span>{copiedText ? 'Copied!' : 'Copy Content'}</span>
                  </button>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {activeLogModal.body || '(No body text)'}
                </div>
              </div>

              {/* Footer Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  This record is stored locally in your browser storage for audit and history tracking during prototype demonstrations.
                </span>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveLogModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
