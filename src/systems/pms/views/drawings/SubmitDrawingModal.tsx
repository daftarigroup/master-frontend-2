// @ts-nocheck
import React, { useState } from 'react';
import { toast } from 'sonner';
import { FileUp, Plus, Trash2, Image as ImageIcon, FileText, Eye } from 'lucide-react';
import { getDrawingsForProject, addDrawingMinors } from '@/systems/pms/utils/storageManager';
import { generateId, fileToBase64, amountInWords } from '@/systems/pms/utils/helpers';
import ModalForm from '@/systems/pms/components/ModalForm';

// Keeps localStorage from silently blowing its quota on large scans/PDFs
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB

const blankRow = () => ({ key: generateId(), date: '', fileName: '', fileType: '', fileData: '' });

// Format YYYY-MM-DD -> DD/MM/YYYY for display
const formatDate = (val) => {
  if (!val) return '-';
  const parts = val.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
};

/**
 * SubmitDrawingModal
 * Pop-up for adding one or more drawings (Date + Drawing File) to a project.
 * Same isOpen/onClose/project/onUploaded shape as UploadDesign.jsx so it can be
 * dropped into any page the way the New Project "Upload" modal already is.
 *
 * Props:
 *   isOpen     – boolean
 *   onClose    – fn()
 *   project    – the project to submit drawings for
 *   onUploaded – fn() called after a successful save so parent can refresh
 */
export default function SubmitDrawingModal({ isOpen, onClose, project, onUploaded }) {
  const [rows, setRows] = useState([blankRow()]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !project) return null;

  const existingDrawings = getDrawingsForProject(project.serialNo);

  const resetState = () => setRows([blankRow()]);
  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleRowChange = (key, field, value) => {
    setRows(prev => prev.map(r => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const handleFileSelect = async (key, file) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large - please upload a drawing under 3 MB');
      return;
    }
    try {
      const fileData = await fileToBase64(file);
      setRows(prev => prev.map(r => (r.key === key ? { ...r, fileName: file.name, fileType: file.type, fileData } : r)));
    } catch {
      toast.error('Could not read the selected file');
    }
  };

  const addRow = () => setRows(prev => [...prev, blankRow()]);
  const removeRow = (key) => setRows(prev => (prev.length > 1 ? prev.filter(r => r.key !== key) : prev));

  const handleSubmit = (e) => {
    e.preventDefault();

    const incomplete = rows.some(r => !r.date);
    if (incomplete) {
      toast.error('Each row needs a Date - fill it or remove the row');
      return;
    }

    const completeRows = rows.filter(r => r.date);
    if (completeRows.length === 0) {
      toast.error('Add at least one row with a date');
      return;
    }

    setLoading(true);
    const now = new Date().toISOString();
    addDrawingMinors(project.serialNo, completeRows.map(r => ({
      id: generateId(),
      date: r.date,
      fileName: r.fileName,
      fileType: r.fileType,
      fileData: r.fileData,
      uploadedAt: now
    })));
    setLoading(false);
    toast.success(`${completeRows.length} drawing${completeRows.length > 1 ? 's' : ''} submitted for ${project.serialNo}`);
    resetState();
    onUploaded && onUploaded();
    onClose();
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title={`Submit Drawing — ${project.serialNo}`}
      onSubmit={handleSubmit}
      submitText={loading ? 'Submitting...' : 'Save'}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-3">
        {/* Project Info (read-only, pre-filled from the selected project) */}
        <div className="bg-slate-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <p className="text-[13px] font-semibold text-gray-900 truncate">{project.projectName}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Project Type</p>
              <p className="text-gray-700 truncate">{project.projectType || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Contractor</p>
              <p className="text-gray-700 truncate">{project.contractorName || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Contractor Phone</p>
              <p className="text-gray-700 truncate">{project.contractorPhone || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Contractor Gmail</p>
              <p className="text-gray-700 truncate">{project.contractorEmail || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Project Location</p>
              <p className="text-gray-700 truncate">{project.projectLocation || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Start Date</p>
              <p className="text-gray-700 truncate">{formatDate(project.startDate)}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Planned End Date</p>
              <p className="text-gray-700 truncate">{formatDate(project.plannedEndDate)}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Work Order</p>
              <p className="text-gray-700 truncate">{project.workOrder || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Work Order Date</p>
              <p className="text-gray-700 truncate">{formatDate(project.workOrderDate)}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Irrigation Capacity</p>
              <p className="text-gray-700 truncate">{project.irrigationCapacity || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Tender ID</p>
              <p className="text-gray-700 truncate">{project.tenderId || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Tender Amount</p>
              <p className="text-gray-700 truncate">{project.tenderAmount || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Accepted Amount</p>
              <p className="text-gray-700 truncate">{project.acceptedAmount || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Work Period</p>
              <p className="text-gray-700 truncate">{project.workPeriod || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Maintenance Period</p>
              <p className="text-gray-700 truncate">{project.maintenancePeriod || '-'}</p>
            </div>
          </div>
          {(amountInWords(project.tenderAmount) || amountInWords(project.acceptedAmount)) && (
            <div className="text-[10px] text-gray-500 italic space-y-0.5 pt-2 border-t border-gray-200">
              {amountInWords(project.tenderAmount) && <p>Tender: {amountInWords(project.tenderAmount)}</p>}
              {amountInWords(project.acceptedAmount) && <p>Accepted: {amountInWords(project.acceptedAmount)}</p>}
            </div>
          )}
        </div>

        {/* Already submitted drawings */}
        {existingDrawings.length > 0 && (
          <div className="bg-slate-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Already Submitted</p>
            {existingDrawings.map(d => (
              <div key={d.id} className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 text-[11px] text-gray-700 truncate">
                  {d.fileType?.startsWith('image/') ? <ImageIcon size={13} className="text-gray-400 flex-shrink-0" /> : <FileText size={13} className="text-gray-400 flex-shrink-0" />}
                  <span className="font-medium">{formatDate(d.date)}</span>
                  <span className="text-gray-400 truncate">— {d.fileName}</span>
                </span>
                <a
                  href={d.fileData}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-indigo-600 hover:text-indigo-800 flex-shrink-0"
                >
                  <Eye size={12} /> View
                </a>
              </div>
            ))}
          </div>
        )}

        {/* New rows */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Add Drawing{rows.length > 1 ? 's' : ''}</p>
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-12 gap-2 items-start border border-gray-200 rounded-lg p-2.5">
              <div className="col-span-12 sm:col-span-4 space-y-1">
                <label className="block text-[10px] text-gray-500 uppercase tracking-tight">Date</label>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e) => handleRowChange(row.key, 'date', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[12px] h-[32px]"
                />
              </div>
              <div className="col-span-10 sm:col-span-7 space-y-1">
                <label className="block text-[10px] text-gray-500 uppercase tracking-tight">Drawing File</label>
                <label className="cursor-pointer block">
                  <div className={`flex items-center gap-2 border border-dashed rounded px-2.5 h-[32px] transition-all ${
                    row.fileName ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}>
                    <FileUp size={13} className="flex-shrink-0" />
                    <span className="text-[11px] truncate">{row.fileName || 'Click to browse (PDF/Image, max 3MB)'}</span>
                  </div>
                  <input
                    type="file"
                    onChange={(e) => handleFileSelect(row.key, e.target.files?.[0])}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                </label>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-end justify-center h-full pt-4">
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  className="inline-flex items-center justify-center w-[30px] h-[30px] rounded border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Remove row"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold uppercase tracking-wide"
          >
            <Plus size={14} /> Add Another Drawing
          </button>
        </div>
      </div>
    </ModalForm>
  );
}
