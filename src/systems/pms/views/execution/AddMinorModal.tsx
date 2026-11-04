// @ts-nocheck
import React, { useState } from 'react';
import { toast } from 'sonner';
import { UploadCloud, Check, FileSpreadsheet, Sparkles, FileText, CalendarClock, Eye, X } from 'lucide-react';
import { generateId, formatDate, fileToBase64 } from '@/systems/pms/utils/helpers';
import { saveMinor, saveDesignForProject, getExternalPurchaseOrders, saveScheduleForMinor, getSubContractorsForProject as getProjectSubContractors } from '@/systems/pms/utils/storageManager';
import { parsePdfTableFile } from '@/systems/pms/utils/pdfTableParser';
import { saveFileToIndexedDB, getFileFromIndexedDB, setMemoryFile, getMemoryFile } from '@/systems/pms/utils/fileStorage';
import ModalForm from '@/systems/pms/components/ModalForm';
import { DESIGN_COLUMNS, parseDesignFile } from './UploadDesign';

// Show the value as-is (0 included) - only fall back to '-' when it's actually empty.
const displayVal = (v) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

/**
 * AddMinorModal
 * Creates a Minor under a project: a name plus an optional design file (parsed the same way
 * as UploadDesign.jsx). The new minor then behaves like its own project everywhere downstream
 * (Execution Details, Actual Details, Excavation & Murum, Auto Comparison) via getProjectOrMinor.
 */
export default function AddMinorModal({ isOpen, onClose, project, onSaved }) {
  const [selectedPoInfo, setSelectedPoInfo] = useState(null);
  const [minorName, setMinorName] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [scheduleFile, setScheduleFile] = useState('');
  const [scheduleFileName, setScheduleFileName] = useState('');
  const [scheduleRows, setScheduleRows] = useState([]);
  const [scheduleHeaders, setScheduleHeaders] = useState([]);
  const [scheduleFileId, setScheduleFileId] = useState('');
  const [parsingSchedule, setParsingSchedule] = useState(false);
  const [loading, setLoading] = useState(false);

  const getSubContractors = () => {
    if (!project) return [];
    const list = getProjectSubContractors(project.serialNo).map(c => c.name.trim());
    if (project.contractorName?.trim()) {
      list.push(project.contractorName.trim());
    }
    return Array.from(new Set(list));
  };

  const getAvailablePOs = () => {
    if (!project) return [];
    const externalPOs = getExternalPurchaseOrders();
    const projectPOs = [];
    const addPo = (c) => {
      if (c?.poNumber?.trim() && !projectPOs.some(p => p.poNumber === c.poNumber)) {
        projectPOs.push({
          poNumber: c.poNumber,
          name: c.name || '',
          number: c.number || '',
          workingUnit: c.workingUnit || '',
          poAmount: c.poAmount || '',
          poDate: c.poDate || '',
          remarks: c.remarks || '',
          isProjectPo: true
        });
      }
    };

    const combined = [...projectPOs];
    externalPOs.forEach(ext => {
      if (!combined.some(p => p.poNumber === ext.poNumber)) {
        combined.push({ ...ext, isProjectPo: false });
      }
    });
    return combined;
  };

  const contractorOptions = getSubContractors();
  const availablePOs = getAvailablePOs();

  // Initialize contractor and auto-fill minor info from PO page when modal opens
  React.useEffect(() => {
    if (isOpen && project) {
      const defaultContractor = contractorOptions[0] || project.contractorName || '';
      setContractorName(defaultContractor);
      const matchedPo = availablePOs.find(p => p.name?.trim().toLowerCase() === defaultContractor.trim().toLowerCase()) || null;
      setSelectedPoInfo(matchedPo);
      setMinorName(defaultContractor ? `Minor — ${defaultContractor}` : '');
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const resetState = () => {
    setSelectedPoInfo(null);
    setMinorName('');
    setContractorName('');
    setFileName('');
    setRows([]);
    setScheduleFile('');
    setScheduleFileId('');
    setScheduleFileName('');
    setScheduleRows([]);
    setScheduleHeaders([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleContractorChange = (val) => {
    setContractorName(val);
    const matchedPo = availablePOs.find(p => p.name?.trim().toLowerCase() === val.trim().toLowerCase()) || null;
    setSelectedPoInfo(matchedPo);
    if (!minorName.trim() || minorName.startsWith('Minor —') || minorName.startsWith('Minor -')) {
      setMinorName(val ? `Minor — ${val}` : '');
    }
    if (matchedPo) {
      toast.success(`Loaded PO details for ${val}!`);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const mappedRows = await parseDesignFile(file);
      if (mappedRows.length === 0) {
        toast.error('No valid rows found in the file');
        return;
      }
      setFileName(file.name);
      setRows(mappedRows);
      toast.success(`${mappedRows.length} rows loaded`);
    } catch {
      toast.error('Could not read file. Please upload a valid Excel/CSV file.');
    }
  };

  const handleScheduleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file containing schedule table data');
      return;
    }

    setParsingSchedule(true);
    const toastId = toast.loading('Reading & parsing PDF schedule table data...');

    try {
      const fileId = `sched_${Date.now()}`;
      const blobUrl = URL.createObjectURL(file);
      setMemoryFile(fileId, blobUrl);
      saveFileToIndexedDB(fileId, file);

      const parsed = await parsePdfTableFile(file);
      setScheduleFile(blobUrl);
      setScheduleFileId(fileId);
      setScheduleFileName(parsed.fileName);
      setScheduleRows(parsed.rows || []);
      setScheduleHeaders(parsed.headers || []);

      if (parsed.rows && parsed.rows.length > 0) {
        toast.success(`Parsed schedule with ${parsed.rows.length} rows & ${parsed.headers.length} columns!`, { id: toastId });
      } else {
        toast.success('Schedule PDF attached successfully!', { id: toastId });
      }
    } catch (err) {
      console.error('Failed to parse PDF schedule:', err);
      try {
        const fileId = `sched_${Date.now()}`;
        const blobUrl = URL.createObjectURL(file);
        setMemoryFile(fileId, blobUrl);
        saveFileToIndexedDB(fileId, file);

        setScheduleFile(blobUrl);
        setScheduleFileId(fileId);
        setScheduleFileName(file.name);
        setScheduleRows([]);
        setScheduleHeaders([]);
        toast.success('Schedule PDF attached as reference document', { id: toastId });
      } catch {
        toast.error('Could not read PDF file', { id: toastId });
      }
    } finally {
      setParsingSchedule(false);
    }
  };

  const handleRemoveSchedule = () => {
    setScheduleFile('');
    setScheduleFileId('');
    setScheduleFileName('');
    setScheduleRows([]);
    setScheduleHeaders([]);
    toast.success('Schedule removed');
  };

  const handleViewSchedulePdf = async (fileUrlOrId, fileName, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!fileUrlOrId) return;

    if (fileUrlOrId.startsWith('blob:') || fileUrlOrId.startsWith('data:')) {
      window.open(fileUrlOrId, '_blank');
      return;
    }

    const id = fileUrlOrId.startsWith('idb:') ? fileUrlOrId.replace('idb:', '') : fileUrlOrId;
    const mem = getMemoryFile(id);
    if (mem) {
      window.open(mem, '_blank');
      return;
    }

    const toastId = toast.loading('Opening schedule document...');
    try {
      const data = await getFileFromIndexedDB(id);
      if (data) {
        toast.dismiss(toastId);
        window.open(data, '_blank');
      } else {
        toast.error('Schedule document not found', { id: toastId });
      }
    } catch {
      toast.error('Could not load document', { id: toastId });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!minorName.trim()) {
      toast.error('Minor Name is required');
      return;
    }
    
    if (!contractorName) {
      toast.error('Contractor Name is required');
      return;
    }

    setLoading(true);

    const fileId = scheduleFileId || `sched_${Date.now()}`;
    const minor = {
      id: generateId(),
      projectNo: project.serialNo,
      minorName: minorName.trim(),
      contractorName: contractorName,
      poNumber: selectedPoInfo?.poNumber || '',
      poAmount: selectedPoInfo?.poAmount || '',
      workingUnit: selectedPoInfo?.workingUnit || '',
      scheduleFileId: fileId,
      scheduleFile: scheduleFile && scheduleFile.length > 5000 ? `idb:${fileId}` : (scheduleFile || ''),
      scheduleFileName: scheduleFileName || '',
      scheduleRows: scheduleRows || [],
      scheduleHeaders: scheduleHeaders || [],
      createdAt: new Date().toISOString()
    };

    try {
      saveMinor(minor);
      if (rows.length > 0) {
        saveDesignForProject(minor.id, rows);
      }
      if (scheduleRows.length > 0 || scheduleFile) {
        saveScheduleForMinor(minor.id, {
          fileId,
          fileName: scheduleFileName,
          fileUrl: scheduleFile,
          rows: scheduleRows,
          headers: scheduleHeaders,
          projectNo: project.serialNo,
          minorName: minor.minorName
        });
      }
    } catch {
      setLoading(false);
      return;
    }

    toast.success(`Minor "${minor.minorName}" added`);
    setLoading(false);
    resetState();
    onSaved && onSaved(minor);
    onClose();
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title={`Add Minor — ${project.serialNo}`}
      onSubmit={handleSubmit}
      submitText={loading ? 'Saving...' : 'Save'}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-3 md:space-y-4">
        {/* 1. Contractor Name (from PO Page) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight font-medium">
              Contractor Name *
            </label>
            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1">
              <Sparkles size={10} className="text-amber-500" /> From PO Page
            </span>
          </div>
          {contractorOptions.length > 0 ? (
            <select
              value={contractorName}
              onChange={(e) => handleContractorChange(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px] bg-white font-medium text-gray-800 cursor-pointer"
            >
              <option value="">Select Contractor</option>
              {contractorOptions.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={contractorName}
              onChange={(e) => handleContractorChange(e.target.value)}
              placeholder="Enter contractor name"
              className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px] bg-white font-medium text-gray-800"
            />
          )}
        </div>

        {/* 2. Minor Name */}
        <div className="space-y-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Minor Name *</label>
          <input
            type="text"
            value={minorName}
            onChange={(e) => setMinorName(e.target.value)}
            placeholder="Enter minor name (e.g. Minor 1, Distributary A)"
            className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px] bg-white font-medium text-gray-800"
          />
        </div>

        {/* PO Details Preview Banner */}
        {selectedPoInfo && (
          <div className="bg-indigo-50/70 border border-indigo-200 rounded p-2.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-indigo-900 font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" /> Details from PO Page: {selectedPoInfo.name}
              </span>
              {selectedPoInfo.poAmount && (
                <span className="text-emerald-700 font-bold">₹{Number(selectedPoInfo.poAmount).toLocaleString('en-IN')}</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600 pt-1">
              <div>
                <span className="text-gray-400 block text-[9px] uppercase">PO Number</span>
                <span className="font-semibold text-indigo-600 truncate block">{selectedPoInfo.poNumber || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px] uppercase">Phone</span>
                <span className="font-medium text-gray-800">{selectedPoInfo.number || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px] uppercase">Working Unit</span>
                <span className="font-medium text-gray-800">{selectedPoInfo.workingUnit || '-'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px] uppercase">PO Date</span>
                <span className="font-medium text-gray-800">{formatDate(selectedPoInfo.poDate)}</span>
              </div>
            </div>
            {selectedPoInfo.remarks && (
              <p className="text-[10px] text-gray-500 italic pt-1 border-t border-indigo-100">
                Scope: {selectedPoInfo.remarks}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">
            Upload The Design (Alignment / Chainage / Elevation / Pipe Top / Pipe Bottom / Cutting Level / Invert Level / Pipe Dia)
          </label>
          <label className="cursor-pointer block">
            <div className={`flex items-center justify-center gap-2 border border-dashed rounded-lg h-[70px] transition-all
              ${fileName ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600'}
            `}>
              {fileName ? <Check size={18} /> : <UploadCloud size={18} />}
              <span className="text-xs md:text-sm font-medium">
                {fileName ? `${fileName} - ${rows.length} rows` : 'Click to browse Excel / CSV file (optional)'}
              </span>
            </div>
            <input
              type="file"
              onChange={handleFile}
              className="hidden"
              accept=".xlsx,.xls,.csv"
            />
          </label>
        </div>

        {rows.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 uppercase tracking-widest">
              <FileSpreadsheet size={14} />
              <span>Preview (first 5 rows)</span>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-[10px] md:text-[11px]">
                <thead className="bg-gray-50">
                  <tr>
                    {DESIGN_COLUMNS.map(col => (
                      <th key={col.key} className="px-2 py-1.5 text-center font-semibold text-gray-700 whitespace-nowrap">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {DESIGN_COLUMNS.map(col => (
                        <td key={col.key} className="px-2 py-1.5 text-center text-gray-600 whitespace-nowrap">{displayVal(row[col.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Schedule (PDF with Tabular Data) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight flex items-center gap-1.5 font-medium">
              <CalendarClock size={16} className="text-indigo-600" />
              <span>Add Schedule (Upload PDF with Table Data)</span>
            </label>
            {scheduleFileName && (
              <div className="flex items-center gap-2">
                {scheduleFile && (
                  <button
                    type="button"
                    onClick={(e) => handleViewSchedulePdf(scheduleFile || scheduleFileId, scheduleFileName, e)}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                    title="View uploaded schedule PDF"
                  >
                    <Eye size={12} /> View PDF
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRemoveSchedule}
                  className="inline-flex items-center gap-0.5 text-xs text-rose-500 hover:text-rose-700 font-semibold"
                  title="Remove schedule"
                >
                  <X size={12} /> Remove
                </button>
              </div>
            )}
          </div>
          <label className="cursor-pointer block">
            <div className={`flex items-center justify-between border border-dashed rounded-lg px-4 py-3 text-xs md:text-sm transition-all ${
              scheduleFileName 
                ? 'bg-indigo-50 border-indigo-300 text-indigo-800' 
                : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={18} className={scheduleFileName ? 'text-indigo-600 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                <span className="truncate font-medium">
                  {parsingSchedule
                    ? 'Reading and parsing PDF schedule table data...'
                    : scheduleFileName
                      ? `${scheduleFileName} (${scheduleRows.length} rows parsed)`
                      : 'Click to upload PDF schedule with table data'}
                </span>
              </div>
              {scheduleFileName && !parsingSchedule && (
                <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded flex-shrink-0 ml-2">
                  {scheduleRows.length} Rows
                </span>
              )}
            </div>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleScheduleFile}
              className="hidden"
              disabled={parsingSchedule}
            />
          </label>
        </div>

        {scheduleRows.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-semibold">
              <div className="flex items-center gap-1.5">
                <CalendarClock size={13} className="text-indigo-600" />
                <span>Parsed Schedule Preview (Showing {Math.min(5, scheduleRows.length)} of {scheduleRows.length} rows)</span>
              </div>
              <span className="text-[10px] text-indigo-600 font-medium">
                {scheduleHeaders.length} Columns Detected
              </span>
            </div>
            <div className="overflow-x-auto border border-indigo-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm">
              <table className="w-full text-[10px] md:text-[11px]">
                <thead className="bg-indigo-50/80 sticky top-0 border-b border-indigo-100">
                  <tr>
                    <th className="px-2 py-1.5 text-center font-bold text-indigo-900 w-8">#</th>
                    {scheduleHeaders.map((head, idx) => (
                      <th key={idx} className="px-2 py-1.5 text-left font-semibold text-indigo-900 whitespace-nowrap">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {scheduleRows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-indigo-50/40">
                      <td className="px-2 py-1 text-center text-gray-400 font-mono text-[9px]">{rIdx + 1}</td>
                      {scheduleHeaders.map((head, cIdx) => (
                        <td key={cIdx} className="px-2 py-1 text-left text-gray-700 whitespace-nowrap">
                          {row[head] !== undefined && row[head] !== '' ? String(row[head]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ModalForm>
  );
}
