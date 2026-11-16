// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  FileUp, Calendar, UploadCloud, Check, Eye, Clock, History as HistoryIcon, Search, RotateCcw,
  Plus, Trash2, Users, FileSpreadsheet, ExternalLink, Tag, Layers, Hash, Sparkles, ChevronDown, Activity,
  FileText, CalendarClock, X
} from 'lucide-react';
import {
  fetchFinalApprovals,
  getDrawingUploads,
  upsertDrawingUpload,
  isDrawingUploadComplete,
  getFinalApprovals,
  isFinalApprovalComplete,
  getMinors,
  saveMinor,
  deleteMinor,
  getDesignByProject,
  saveDesignForProject,
  getExternalPurchaseOrders,
  getExecutions,
  saveScheduleForMinor,
  getSubContractorsForProject as getProjectSubContractors
} from '@/systems/pms/utils/storageManager';
import { fetchProjects } from '@/systems/pms/services/pmsApiClient';
import { parsePdfTableFile } from '@/systems/pms/utils/pdfTableParser';
import { saveFileToIndexedDB, getFileFromIndexedDB, setMemoryFile, getMemoryFile } from '@/systems/pms/utils/fileStorage';
import { parseDesignFile, DESIGN_COLUMNS } from '../execution/UploadDesign';
import { amountInWords, fileToBase64, compressImageToBase64, generateId, getTodayDate } from '@/systems/pms/utils/helpers';
import DataTable from '@/systems/pms/components/DataTable';
import ModalForm from '@/systems/pms/components/ModalForm';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';

// Format YYYY-MM-DD -> DD/MM/YYYY for display
const formatDate = (val) => {
  if (!val) return '-';
  const parts = val.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
};

// Formats numeric preview values nicely
const displayVal = (v) => {
  if (v === undefined || v === null || v === '') return '-';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(3) : v;
};

const getSubContractorsForProject = (projectNo, contractorName = '') => {
  const list = getProjectSubContractors(projectNo).map(c => c.name.trim());
  if (contractorName && contractorName.trim()) {
    list.push(contractorName.trim());
  }
  return Array.from(new Set(list));
};

const getAvailablePOsForProject = (projectNo) => {
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

const initialFormData = {
  drawingDate: '',
  drawingFile: '',
  drawingFileName: '',
  remarks: ''
};

const initialFilters = { searchQuery: '', projectName: '', contractorName: '', projectLocation: '' };

export default function DrawingUpload() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [records, setRecords] = useState([]);
  const [minors, setMinors] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [formProject, setFormProject] = useState(null);
  const [formData, setFormData] = useState({ ...initialFormData });
  const [loading, setLoading] = useState(false);
  // History tab: drawing is already uploaded, so the modal only lets the user add new minors
  const isEditMode = activeTab === 'history';
  const [filters, setFilters] = useState({ ...initialFilters });

  // Minor sub-form state inside modal
  const [projectMinors, setProjectMinors] = useState([]);
  const [subContractorOptions, setSubContractorOptions] = useState([]);
  const [availablePOs, setAvailablePOs] = useState([]);
  const [selectedMinorPoInfo, setSelectedMinorPoInfo] = useState(null);
  const [newMinorName, setNewMinorName] = useState('');
  const [newMinorSubContractor, setNewMinorSubContractor] = useState('');
  const [newMinorFileName, setNewMinorFileName] = useState('');
  const [newMinorRows, setNewMinorRows] = useState([]);
  const [newMinorScheduleFile, setNewMinorScheduleFile] = useState('');
  const [newMinorScheduleFileName, setNewMinorScheduleFileName] = useState('');
  const [newMinorScheduleRows, setNewMinorScheduleRows] = useState([]);
  const [newMinorScheduleHeaders, setNewMinorScheduleHeaders] = useState([]);
  const [newMinorScheduleFileId, setNewMinorScheduleFileId] = useState('');
  const [parsingSchedule, setParsingSchedule] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Projects whose Final Approval has been signed off (or that already have Drawing/Minors)
  // are eligible for Drawing Upload.
  const refresh = async () => {
    const drawings = getDrawingUploads();
    const allMinors = getMinors();
    let eligibleProjects = [];
    try {
      const allProjects = await fetchProjects();
      const approvals = await fetchFinalApprovals(allProjects);
      eligibleProjects = allProjects.filter(p => {
        const fa = approvals.find(a => a.projectNo === p.serialNo);
        const rec = drawings.find(d => d.projectNo === p.serialNo);
        return isFinalApprovalComplete(fa) || isDrawingUploadComplete(rec);
      });
    } catch (e) {
      console.warn('Drawing Upload: could not load projects', e);
    }
    setProjects(eligibleProjects);
    setRecords(drawings);
    setMinors(allMinors);
  };

  useEffect(() => { refresh(); }, []);

  const recordFor = (projectNo) => records.find(r => r.projectNo === projectNo) || null;

  const pendingProjects = projects.filter(p => !isDrawingUploadComplete(recordFor(p.serialNo))).reverse();
  const historyProjects = projects.filter(p => isDrawingUploadComplete(recordFor(p.serialNo))).reverse();

  const list = activeTab === 'pending' ? pendingProjects : historyProjects;

  const filteredList = list.filter(p => {
    if (filters.projectName && p.projectName !== filters.projectName) return false;
    if (filters.contractorName && p.contractorName !== filters.contractorName) return false;
    if (filters.projectLocation && p.projectLocation !== filters.projectLocation) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      return (
        p.serialNo.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.contractorName.toLowerCase().includes(q) ||
        (p.contractorPhone || '').toLowerCase().includes(q) ||
        (p.contractorEmail || '').toLowerCase().includes(q) ||
        p.projectLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginated = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleClearFilters = () => {
    setFilters({ ...initialFilters });
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  const openForm = (project) => {
    const rec = recordFor(project.serialNo);
    setFormData(rec ? {
      drawingDate: rec.drawingDate || getTodayDate(),
      drawingFile: rec.drawingFile || '',
      drawingFileName: rec.drawingFileName || '',
      remarks: rec.remarks || ''
    } : { ...initialFormData, drawingDate: getTodayDate() });

    // Load project's minors and registered sub-contractors
    const pMinors = getMinors().filter(m => m.projectNo === project.serialNo);
    setProjectMinors(pMinors);

    const subContractors = getSubContractorsForProject(project.serialNo, project.contractorName);
    setSubContractorOptions(subContractors);

    const pos = getAvailablePOsForProject(project.serialNo);
    setAvailablePOs(pos);

    const defaultSub = subContractors[0] || project.contractorName || '';
    setNewMinorSubContractor(defaultSub);

    // Auto-match PO details for the default contractor from the PO page
    const matchedPo = defaultSub ? pos.find(p => p.name?.trim().toLowerCase() === defaultSub.trim().toLowerCase()) : null;
    setSelectedMinorPoInfo(matchedPo || null);

    setNewMinorName(defaultSub ? `Minor — ${defaultSub}` : '');
    setNewMinorFileName('');
    setNewMinorRows([]);
    setNewMinorScheduleFile('');
    setNewMinorScheduleFileId('');
    setNewMinorScheduleFileName('');
    setNewMinorScheduleRows([]);
    setNewMinorScheduleHeaders([]);

    setFormProject(project);
  };

  const handleSubContractorChange = (contractorName) => {
    setNewMinorSubContractor(contractorName);
    const matchedPo = availablePOs.find(p => p.name?.trim().toLowerCase() === contractorName.trim().toLowerCase()) || null;
    setSelectedMinorPoInfo(matchedPo);
    if (!newMinorName.trim() || newMinorName.startsWith('Minor —') || newMinorName.startsWith('Minor -')) {
      setNewMinorName(contractorName ? `Minor — ${contractorName}` : '');
    }
    if (matchedPo) {
      toast.success(`Loaded PO details for ${contractorName}!`);
    }
  };

  const handleMinorDesignFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const mappedRows = await parseDesignFile(file);
      if (mappedRows.length === 0) {
        toast.error('No valid rows found in the file');
        return;
      }
      setNewMinorFileName(file.name);
      setNewMinorRows(mappedRows);
      toast.success(`${mappedRows.length} design rows loaded`);
    } catch {
      toast.error('Could not read file. Please upload a valid Excel/CSV file.');
    }
  };

  const handleMinorScheduleFile = async (e) => {
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
      setNewMinorScheduleFile(blobUrl);
      setNewMinorScheduleFileId(fileId);
      setNewMinorScheduleFileName(parsed.fileName);
      setNewMinorScheduleRows(parsed.rows || []);
      setNewMinorScheduleHeaders(parsed.headers || []);

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

        setNewMinorScheduleFile(blobUrl);
        setNewMinorScheduleFileId(fileId);
        setNewMinorScheduleFileName(file.name);
        setNewMinorScheduleRows([]);
        setNewMinorScheduleHeaders([]);
        toast.success('Schedule PDF attached as reference document', { id: toastId });
      } catch {
        toast.error('Could not read PDF file', { id: toastId });
      }
    } finally {
      setParsingSchedule(false);
    }
  };

  const handleRemoveSchedule = () => {
    setNewMinorScheduleFile('');
    setNewMinorScheduleFileId('');
    setNewMinorScheduleFileName('');
    setNewMinorScheduleRows([]);
    setNewMinorScheduleHeaders([]);
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

  const handleAddMinor = () => {
    if (!newMinorName.trim()) {
      toast.error('Minor Name is required');
      return;
    }
    const fileId = newMinorScheduleFileId || `sched_${Date.now()}`;
    const minor = {
      id: generateId(),
      projectNo: formProject.serialNo,
      minorName: newMinorName.trim(),
      contractorName: newMinorSubContractor || '',
      poNumber: selectedMinorPoInfo?.poNumber || '',
      poAmount: selectedMinorPoInfo?.poAmount || '',
      workingUnit: selectedMinorPoInfo?.workingUnit || '',
      scheduleFileId: fileId,
      scheduleFile: newMinorScheduleFile && newMinorScheduleFile.length > 5000 ? `idb:${fileId}` : (newMinorScheduleFile || ''),
      scheduleFileName: newMinorScheduleFileName || '',
      scheduleRows: newMinorScheduleRows || [],
      scheduleHeaders: newMinorScheduleHeaders || [],
      createdAt: new Date().toISOString()
    };
    try {
      saveMinor(minor);
      if (newMinorRows.length > 0) {
        saveDesignForProject(minor.id, newMinorRows);
      }
      if (newMinorScheduleRows.length > 0 || newMinorScheduleFile) {
        saveScheduleForMinor(minor.id, {
          fileId,
          fileName: newMinorScheduleFileName,
          fileUrl: newMinorScheduleFile,
          rows: newMinorScheduleRows,
          headers: newMinorScheduleHeaders,
          projectNo: formProject.serialNo,
          minorName: minor.minorName
        });
      }
      // Also ensure Drawing Upload record exists so the project is recognized as having completed this stage
      const existingRec = recordFor(formProject.serialNo);
      if (!existingRec) {
        upsertDrawingUpload({
          projectNo: formProject.serialNo,
          drawingDate: formData.drawingDate || getTodayDate(),
          drawingFile: formData.drawingFile || '',
          drawingFileName: formData.drawingFileName || '',
          remarks: formData.remarks || ''
        });
      }
      const updatedMinors = getMinors().filter(m => m.projectNo === formProject.serialNo);
      setProjectMinors(updatedMinors);
      setMinors(getMinors());
      setNewMinorName('');
      setSelectedMinorPoInfo(null);
      setNewMinorFileName('');
      setNewMinorRows([]);
      setNewMinorScheduleFile('');
      setNewMinorScheduleFileId('');
      setNewMinorScheduleFileName('');
      setNewMinorScheduleRows([]);
      setNewMinorScheduleHeaders([]);
      refresh();
      toast.success(`Minor "${minor.minorName}" added successfully`);
    } catch {
      toast.error('Failed to save minor');
    }
  };

  const handleDeleteMinor = (minorId, minorName) => {
    deleteMinor(minorId);
    const updatedMinors = getMinors().filter(m => m.projectNo === formProject.serialNo);
    setProjectMinors(updatedMinors);
    setMinors(getMinors());
    refresh();
    toast.success(`Minor "${minorName}" deleted`);
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleDrawingFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_UPLOAD = 50 * 1024 * 1024; // 50MB - accepted at selection time
    const MAX_STORED = 2 * 1024 * 1024;  // 2MB - what actually gets saved

    if (file.size > MAX_UPLOAD) {
      toast.error('File size must be less than 50MB');
      return;
    }

    try {
      if (file.type.startsWith('image/')) {
        const { base64, size } = await compressImageToBase64(file, { maxBytes: MAX_STORED });
        setFormData(prev => ({ ...prev, drawingFile: base64, drawingFileName: file.name }));
        toast.success(
          size <= MAX_STORED
            ? `Attached (compressed to ${(size / 1024 / 1024).toFixed(2)}MB)`
            : `Attached (${(size / 1024 / 1024).toFixed(2)}MB - could not compress further)`
        );
      } else {
        if (file.size > MAX_STORED) {
          toast.error('PDF files cannot be auto-compressed - please upload a PDF under 2MB, or use an image instead');
          return;
        }
        const base64 = await fileToBase64(file);
        setFormData(prev => ({ ...prev, drawingFile: base64, drawingFileName: file.name }));
        toast.success('Drawing file attached');
      }
    } catch (error) {
      toast.error('Error reading file');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isEditMode) {
      if (!newMinorName.trim()) {
        toast.error('Minor Name is required');
        return;
      }
      handleAddMinor();
      setFormProject(null);
      return;
    }

    const dDate = formData.drawingDate || getTodayDate();

    setLoading(true);
    upsertDrawingUpload({
      projectNo: formProject.serialNo,
      ...formData,
      drawingDate: dDate
    });

    // Automatically save minor if Minor Name was entered in the form
    let minorAdded = false;
    let addedMinorName = '';
    if (newMinorName && newMinorName.trim()) {
      const fileId = newMinorScheduleFileId || `sched_${Date.now()}`;
      const minor = {
        id: generateId(),
        projectNo: formProject.serialNo,
        minorName: newMinorName.trim(),
        contractorName: newMinorSubContractor || '',
        poNumber: selectedMinorPoInfo?.poNumber || '',
        poAmount: selectedMinorPoInfo?.poAmount || '',
        workingUnit: selectedMinorPoInfo?.workingUnit || '',
        scheduleFileId: fileId,
        scheduleFile: newMinorScheduleFile && newMinorScheduleFile.length > 5000 ? `idb:${fileId}` : (newMinorScheduleFile || ''),
        scheduleFileName: newMinorScheduleFileName || '',
        scheduleRows: newMinorScheduleRows || [],
        scheduleHeaders: newMinorScheduleHeaders || [],
        createdAt: new Date().toISOString()
      };
      try {
        saveMinor(minor);
        if (newMinorRows.length > 0) {
          saveDesignForProject(minor.id, newMinorRows);
        }
        if (newMinorScheduleRows.length > 0 || newMinorScheduleFile) {
          saveScheduleForMinor(minor.id, {
            fileId,
            fileName: newMinorScheduleFileName,
            fileUrl: newMinorScheduleFile,
            rows: newMinorScheduleRows,
            headers: newMinorScheduleHeaders,
            projectNo: formProject.serialNo,
            minorName: minor.minorName
          });
        }
        minorAdded = true;
        addedMinorName = minor.minorName;
      } catch (err) {
        console.error('Failed to save minor on form submit', err);
      }
    }

    setLoading(false);
    setFormProject(null);
    refresh();

    if (minorAdded) {
      toast.success(`${formProject.serialNo} drawings & Minor "${addedMinorName}" saved — moved to Upload Design`);
    } else {
      toast.success(`${formProject.serialNo} drawings saved — moved to Upload Design`);
    }
  };

  const tableHeaders = [
    "Action", "Project No", "Project Name", "Contractor Name", "Project Location",
    "Sub Contractor(s)", "Drawing Status", "Minors & Design"
  ];

  const renderRow = (item) => {
    const rec = recordFor(item.serialNo);
    const pMinors = minors.filter(m => m.projectNo === item.serialNo);
    const totalDesignRows = pMinors.reduce((sum, m) => sum + getDesignByProject(m.id).length, 0) + getDesignByProject(item.serialNo).length;
    const subContractors = getSubContractorsForProject(item.serialNo);

    return (
      <tr
        key={item.serialNo}
        onClick={() => openForm(item)}
        className="hover:bg-indigo-50/40 transition-colors border-b border-gray-100 cursor-pointer group"
      >
        <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openForm(item)}
            className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide hover:bg-indigo-100 transition-colors"
          >
            <FileUp size={12} /> {activeTab === 'history' ? 'Edit / Add Minors' : 'Upload & Minors'}
          </button>
        </td>
        <td className="px-4 py-3 text-center text-[13px] text-indigo-600 font-bold whitespace-nowrap">
          {item.serialNo}
        </td>
        <td className="px-4 py-3 text-center text-[13px] text-gray-900 font-medium">{item.projectName}</td>
        <td className="px-4 py-3 text-center text-[13px] text-gray-700 whitespace-nowrap">{item.contractorName || '-'}</td>
        <td className="px-4 py-3 text-center text-[13px] text-gray-600 whitespace-nowrap">{item.projectLocation || '-'}</td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          {subContractors.length > 0 ? (
            <div className="flex flex-wrap gap-1 justify-center max-w-[200px] mx-auto">
              {subContractors.map((sub, idx) => (
                <span key={idx} className="inline-block text-[10px] font-medium px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 truncate max-w-[180px]">
                  {sub}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-gray-400 italic">None</span>
          )}
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {rec && isDrawingUploadComplete(rec) ? (
            <div className="space-y-0.5">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-emerald-100 text-emerald-700 border-emerald-200">Uploaded</span>
              <div className="text-[10px] text-gray-500">{formatDate(rec.drawingDate)}</div>
              {rec.drawingFile && (
                <a
                  href={rec.drawingFile}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:underline"
                >
                  <Eye size={10} /> View Drawing
                </a>
              )}
            </div>
          ) : (
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-gray-100 text-gray-500 border-gray-200">Pending</span>
          )}
        </td>
        <td className="px-4 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          {pMinors.length > 0 ? (
            <button
              onClick={() => openForm(item)}
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 transition-colors"
              title="Click to view/manage minors"
            >
              <Check size={11} /> {pMinors.length} Minor{pMinors.length > 1 ? 's' : ''} ({totalDesignRows} rows)
            </button>
          ) : totalDesignRows > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-emerald-100 text-emerald-700 border-emerald-200">
              <Check size={11} /> {totalDesignRows} rows
            </span>
          ) : (
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-gray-100 text-gray-500 border-gray-200">No Minors</span>
          )}
        </td>
      </tr>
    );
  };

  const renderCard = (item) => {
    const rec = recordFor(item.serialNo);
    const pMinors = minors.filter(m => m.projectNo === item.serialNo);
    const totalDesignRows = pMinors.reduce((sum, m) => sum + getDesignByProject(m.id).length, 0) + getDesignByProject(item.serialNo).length;
    const subContractors = getSubContractorsForProject(item.serialNo);

    return (
      <div
        key={item.serialNo}
        onClick={() => openForm(item)}
        className="bg-white rounded-lg border border-indigo-50 shadow-sm p-3 space-y-2 cursor-pointer active:bg-indigo-50/40 hover:border-indigo-300 transition-all group"
      >
        <div className="flex justify-between items-start border-b border-gray-100 pb-2">
          <div>
            <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest block mb-1 text-left">
              {item.serialNo}
            </span>
            <h4 className="text-sm text-gray-900 leading-tight">{item.projectName}</h4>
          </div>
          {item.projectType && (
            <span className="text-[8px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 uppercase tracking-tight whitespace-nowrap flex-shrink-0">
              {item.projectType}
            </span>
          )}
        </div>

        <div className="bg-slate-50 rounded p-2 text-[10px] space-y-1">
          {item.agreementNumber && (
            <div className="flex justify-between">
              <span className="text-gray-500">Agreement No:</span>
              <span className="text-gray-700">{item.agreementNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Contractor:</span>
            <span className="text-gray-700">{item.contractorName}</span>
          </div>
          {subContractors.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Sub Contractor:</span>
              <span className="text-indigo-600 font-medium truncate max-w-[150px]">{subContractors.join(', ')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Location:</span>
            <span className="text-gray-700">{item.projectLocation || '-'}</span>
          </div>
          {(item.village || item.district || item.state) && (
            <div className="flex justify-between">
              <span className="text-gray-500">Village/Dist/State:</span>
              <span className="text-gray-700 text-right">{[item.village, item.district, item.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Start / End:</span>
            <span className="text-gray-700">{formatDate(item.startDate)} - {formatDate(item.plannedEndDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Minors &amp; Design:</span>
            <span className={pMinors.length > 0 || totalDesignRows > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-500 font-semibold'}>
              {pMinors.length > 0 ? `${pMinors.length} Minor(s) • ${totalDesignRows} rows` : (totalDesignRows > 0 ? `${totalDesignRows} rows` : 'Pending')}
            </span>
          </div>
        </div>

        <div className="text-[10px]">
          <p className="text-gray-400 uppercase tracking-tighter text-[8px] mb-0.5">Drawing Status</p>
          {rec && isDrawingUploadComplete(rec) ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-block text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border bg-emerald-100 text-emerald-700 border-emerald-200">Uploaded</span>
                <span className="text-gray-500 ml-1.5">{formatDate(rec.drawingDate)}</span>
              </div>
              {rec.drawingFile && (
                <a
                  href={rec.drawingFile}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[9px] text-indigo-600 hover:underline"
                >
                  <Eye size={10} /> View
                </a>
              )}
            </div>
          ) : (
            <span className="inline-block text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border bg-gray-100 text-gray-500 border-gray-200">Pending</span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            openForm(item);
          }}
          className="w-full bg-indigo-50 text-indigo-600 border border-indigo-200 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-colors"
        >
          <FileUp size={12} /> {activeTab === 'history' ? 'Edit / Add Minors' : 'Upload & Minors'}
        </button>
      </div>
    );
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Tabs + Filters */}
      <div className="space-y-3 flex-shrink-0 px-2 sm:px-0">
        <div className="flex items-center justify-between border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
              className={`pb-2 text-xs md:text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'pending' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock size={14} /> Pending ({pendingProjects.length})
              {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
            </button>
            <button
              onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
              className={`pb-2 text-xs md:text-sm font-semibold transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'history' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <HistoryIcon size={14} /> History ({historyProjects.length})
              {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full">
          <div className="flex-1 flex flex-wrap items-center gap-2 md:gap-3 min-w-0">
            <div className="flex-1 min-w-[160px] relative">
              <Search className="absolute left-2.5 top-[9px] md:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search projects..."
                value={filters.searchQuery}
                onChange={(e) => { setFilters(prev => ({ ...prev, searchQuery: e.target.value })); setCurrentPage(1); }}
                className="w-full bg-white border border-gray-300 rounded-lg md:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
              />
            </div>

            <div className="w-[140px] md:w-[170px]">
              <SearchableDropdown
                options={Array.from(new Set(projects.map(p => p.projectName).filter(Boolean)))}
                value={filters.projectName}
                onChange={(val) => { setFilters(prev => ({ ...prev, projectName: val })); setCurrentPage(1); }}
                placeholder="Project Name"
              />
            </div>

            <div className="w-[140px] md:w-[170px]">
              <SearchableDropdown
                options={Array.from(new Set(projects.map(p => p.contractorName).filter(Boolean)))}
                value={filters.contractorName}
                onChange={(val) => { setFilters(prev => ({ ...prev, contractorName: val })); setCurrentPage(1); }}
                placeholder="Contractor"
              />
            </div>

            <div className="w-[140px] md:w-[170px]">
              <SearchableDropdown
                options={Array.from(new Set(projects.map(p => p.projectLocation).filter(Boolean)))}
                value={filters.projectLocation}
                onChange={(val) => { setFilters(prev => ({ ...prev, projectLocation: val })); setCurrentPage(1); }}
                placeholder="Location"
              />
            </div>
          </div>

          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center gap-1 border border-gray-300 rounded-lg md:rounded hover:bg-gray-100 text-gray-600 transition h-[32px] md:h-[38px] px-3 flex-shrink-0"
            title="Clear filters"
          >
            <RotateCcw size={14} />
            <span className="sm:hidden text-xs font-semibold">Clear Filters</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-2 sm:mx-0">
        <DataTable
          headers={tableHeaders}
          data={paginated}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="1000px"
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          totalResults={filteredList.length}
        />
      </div>

      {/* Drawing Upload & Minors Modal */}
      <ModalForm
        isOpen={!!formProject}
        onClose={() => setFormProject(null)}
        title={formProject ? `${isEditMode ? 'Add Minors' : 'Drawing Upload & Minors'} — ${formProject.serialNo}` : ''}
        onSubmit={handleSubmit}
        submitText={loading ? 'Saving...' : isEditMode ? 'Save New Minor' : (newMinorName.trim() ? 'Save Drawing & Minor' : 'Save Drawing Details')}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Project Info Header */}
          {formProject && (
            <div className="bg-slate-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Project Name</p>
                  <p className="text-gray-700 truncate font-medium">{formProject.projectName || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Agreement Number</p>
                  <p className="text-gray-700 truncate">{formProject.agreementNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Contractor</p>
                  <p className="text-gray-700 truncate">{formProject.contractorName || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Project Location</p>
                  <p className="text-gray-700 truncate">{formProject.projectLocation || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Registered Sub Contractors</p>
                  <p className="text-indigo-600 truncate font-semibold">
                    {subContractorOptions.length > 0 ? subContractorOptions.join(', ') : 'None registered'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Department / Division</p>
                  <p className="text-gray-700 truncate">{[formProject.department, formProject.division].filter(Boolean).join(' • ') || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Project Type</p>
                  <p className="text-gray-700 truncate">{formProject.projectType || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Contractor Phone / Email</p>
                  <p className="text-gray-700 truncate">{[formProject.contractorPhone, formProject.contractorEmail].filter(Boolean).join(' • ') || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Village / District / State</p>
                  <p className="text-gray-700 truncate">{[formProject.village, formProject.district, formProject.state].filter(Boolean).join(', ') || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Work Order</p>
                  <p className="text-gray-700 truncate">{[formProject.workOrder, formProject.workOrderDate ? formatDate(formProject.workOrderDate) : ''].filter(Boolean).join(' • ') || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Drawing Details */}
          {!isEditMode && (
          <div className="border border-gray-200 rounded-lg p-3.5 space-y-3 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <FileUp size={16} className="text-indigo-600" />
              <span className="text-[13px] md:text-[14px] font-bold text-gray-800 tracking-tight">1. Drawing Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[12px] md:text-[13px] font-semibold text-gray-700 uppercase tracking-tight">
                  Drawing Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                  <input
                    type="date"
                    value={formData.drawingDate}
                    onChange={(e) => handleChange('drawingDate', e.target.value)}
                    className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] h-[34px] md:h-[38px] bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[12px] md:text-[13px] font-semibold text-gray-700 uppercase tracking-tight">
                  Upload Drawing File
                </label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer block flex-1">
                    <div className={`flex items-center gap-2 border border-dashed rounded px-2.5 h-[34px] md:h-[38px] transition-all ${
                      formData.drawingFileName ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}>
                      {formData.drawingFileName ? <Check size={14} className="flex-shrink-0" /> : <UploadCloud size={14} className="flex-shrink-0" />}
                      <span className="text-[12px] truncate">
                        {formData.drawingFileName || 'Browse PDF / Image (up to 50MB, compressed to 2MB)'}
                      </span>
                    </div>
                    <input
                      type="file"
                      onChange={handleDrawingFile}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                  {formData.drawingFile && (
                    <a
                      href={formData.drawingFile}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex-shrink-0"
                    >
                      <Eye size={12} /> View
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[12px] md:text-[13px] font-semibold text-gray-700 uppercase tracking-tight">Drawing Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => handleChange('remarks', e.target.value)}
                  placeholder="Add any drawing remarks (optional)"
                  rows={2}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] resize-none bg-white"
                />
              </div>
            </div>
          </div>
          )}

          {/* Section 2: Add Minor & Sub Contractor */}
          <div className="border border-gray-200 rounded-lg p-3.5 space-y-3 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-indigo-600" />
                <span className="text-[13px] md:text-[14px] font-bold text-gray-800 tracking-tight">
                  2. Add Minor &amp; Sub Contractor
                </span>
                {projectMinors.length > 0 && (
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {projectMinors.length} minor{projectMinors.length > 1 ? 's' : ''} added
                  </span>
                )}
              </div>
              {formProject && (
                <button
                  type="button"
                  onClick={() => {
                    setFormProject(null);
                    navigate(`/pms/minors/${encodeURIComponent(formProject.serialNo)}`);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] md:text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  title="Open dedicated project minors page"
                >
                  Manage Minors Page <ExternalLink size={12} />
                </button>
              )}
            </div>

            {/* Direct Minor Input Fields */}
            <div className="bg-slate-50 border border-indigo-100 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Tag size={13} /> Minor Details &amp; Sub Contractor Assignment
                </p>
                <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1">
                  <Sparkles size={10} className="text-amber-500" /> Sub Contractor from PO Page
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Sub Contractor (from PO Page) */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-tight">
                    Sub Contractor (from PO Page) *
                  </label>
                  {subContractorOptions.length > 0 ? (
                    <select
                      value={newMinorSubContractor}
                      onChange={(e) => handleSubContractorChange(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-800 cursor-pointer"
                    >
                      <option value="">Select Sub Contractor</option>
                      {subContractorOptions.map((sub, idx) => (
                        <option key={idx} value={sub}>{sub}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter sub contractor name"
                      value={newMinorSubContractor}
                      onChange={(e) => handleSubContractorChange(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-800"
                    />
                  )}
                </div>

                {/* 2. Minor Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-tight">
                    Minor Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Minor 1, Distributary A, Pipeline-North"
                    value={newMinorName}
                    onChange={(e) => setNewMinorName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-medium text-gray-800"
                  />
                </div>

                {/* Auto-filled PO Details Card (from PO Page) */}
                {selectedMinorPoInfo && (
                  <div className="sm:col-span-2 bg-indigo-50/70 border border-indigo-200 rounded p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-indigo-900 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-500" /> Details from PO Page: {selectedMinorPoInfo.name}
                      </span>
                      {selectedMinorPoInfo.poAmount && (
                        <span className="text-emerald-700 font-bold">₹{Number(selectedMinorPoInfo.poAmount).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600 pt-1">
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">PO Number</span>
                        <span className="font-semibold text-indigo-600">{selectedMinorPoInfo.poNumber || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">Phone</span>
                        <span className="font-medium text-gray-800">{selectedMinorPoInfo.number || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">Working Unit</span>
                        <span className="font-medium text-gray-800">{selectedMinorPoInfo.workingUnit || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">PO Date</span>
                        <span className="font-medium text-gray-800">{formatDate(selectedMinorPoInfo.poDate)}</span>
                      </div>
                    </div>
                    {selectedMinorPoInfo.remarks && (
                      <p className="text-[10px] text-gray-500 italic pt-1 border-t border-indigo-100">
                        Scope: {selectedMinorPoInfo.remarks}
                      </p>
                    )}
                  </div>
                )}

                {/* 4. Minor Design Spreadsheet */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-tight flex items-center gap-1.5">
                    <FileSpreadsheet size={13} className="text-emerald-600" />
                    <span>Minor Design Spreadsheet (Optional Excel/CSV)</span>
                  </label>
                  <label className="cursor-pointer block">
                    <div className={`flex items-center gap-2 border border-dashed rounded px-2.5 py-1.5 text-xs transition-all ${
                      newMinorFileName ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-300 text-gray-500 hover:border-indigo-300'
                    }`}>
                      <FileSpreadsheet size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        {newMinorFileName ? `${newMinorFileName} (${newMinorRows.length} rows parsed)` : 'Click to select spreadsheet (.xlsx, .csv)'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleMinorDesignFile}
                      className="hidden"
                    />
                  </label>
                </div>

              </div>

              {/* Parsed Design Preview */}
              {newMinorRows.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                    <FileSpreadsheet size={12} className="text-emerald-600" />
                    <span>Parsed Design Preview (first 5 rows)</span>
                  </div>
                  <div className="overflow-x-auto border border-gray-200 rounded max-h-36 overflow-y-auto">
                    <table className="w-full text-[10px]">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          {DESIGN_COLUMNS.map(col => (
                            <th key={col.key} className="px-2 py-1 text-center font-semibold text-gray-700 whitespace-nowrap">{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {newMinorRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {DESIGN_COLUMNS.map(col => (
                              <td key={col.key} className="px-2 py-1 text-center text-gray-600 whitespace-nowrap">{displayVal(row[col.key])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Parsed Schedule Preview */}
              {newMinorScheduleRows.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                    <div className="flex items-center gap-1.5">
                      <CalendarClock size={12} className="text-indigo-600" />
                      <span>Parsed Schedule Preview (Showing {Math.min(5, newMinorScheduleRows.length)} of {newMinorScheduleRows.length} rows)</span>
                    </div>
                    <span className="text-[9px] text-indigo-600 font-medium">
                      {newMinorScheduleHeaders.length} Columns Detected
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-indigo-200 rounded max-h-36 overflow-y-auto bg-white shadow-sm">
                    <table className="w-full text-[10px]">
                      <thead className="bg-indigo-50/80 sticky top-0 border-b border-indigo-100">
                        <tr>
                          <th className="px-2 py-1 text-center font-bold text-indigo-900 w-8">#</th>
                          {newMinorScheduleHeaders.map((head, idx) => (
                            <th key={idx} className="px-2 py-1 text-left font-semibold text-indigo-900 whitespace-nowrap">
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {newMinorScheduleRows.slice(0, 5).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-indigo-50/40">
                            <td className="px-2 py-1 text-center text-gray-400 font-mono text-[9px]">{rIdx + 1}</td>
                            {newMinorScheduleHeaders.map((head, cIdx) => (
                              <td key={cIdx} className="px-2 py-1 text-left text-gray-600 whitespace-nowrap">
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

              {newMinorName.trim() && (
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-100">
                  <button
                    type="button"
                    onClick={handleAddMinor}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                  >
                    <Plus size={13} /> Save Minor &amp; Add Another
                  </button>
                </div>
              )}
            </div>

            {/* Existing Minors List */}
            {projectMinors.length > 0 ? (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                  Saved Minors for this Project ({projectMinors.length})
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {projectMinors.map(m => {
                    const mRows = getDesignByProject(m.id).length;
                    const mExecs = getExecutions().filter(e => e.projectNo === m.id || (m.serialNo && e.projectNo === m.serialNo)).length;
                    const mPct = mRows > 0 ? Math.min(100, Math.round((mExecs / mRows) * 100)) : (mExecs > 0 ? 100 : 0);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <Tag size={14} className="text-indigo-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{m.minorName}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                              {m.poNumber && (
                                <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                                  <Hash size={10} /> {m.poNumber}
                                </span>
                              )}
                              {m.contractorName ? (
                                <span className="inline-flex items-center gap-1 font-medium text-gray-700 bg-white border border-gray-200 px-1.5 py-0.2 rounded">
                                  <Users size={10} /> {m.contractorName}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">No sub contractor assigned</span>
                              )}
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600 font-medium">
                                {mRows > 0 ? `${mRows} design rows` : 'No design rows'}
                              </span>
                              {((m.scheduleRows && m.scheduleRows.length > 0) || m.scheduleFile || m.scheduleFileId) && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded text-[10px]">
                                    <CalendarClock size={10} /> Schedule: {m.scheduleRows?.length ? `${m.scheduleRows.length} rows` : (m.scheduleFileName || 'PDF attached')}
                                  </span>
                                </>
                              )}
                              <span className="text-gray-400">•</span>
                              <span className={`inline-flex items-center gap-1 font-semibold ${
                                mPct === 100 ? 'text-emerald-600' : mPct > 0 ? 'text-indigo-600' : 'text-gray-400'
                              }`}>
                                <Activity size={10} /> Execution: {mPct}% ({mExecs}/{mRows})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {((m.scheduleFile && m.scheduleFile !== '') || m.scheduleFileId || (m.scheduleRows && m.scheduleRows.length > 0)) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormProject(null);
                                navigate(`/pms/schedule-report/${encodeURIComponent(m.id)}`);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded hover:bg-rose-100 transition-colors"
                              title="View full-size schedule report & contents"
                            >
                              <FileText size={11} /> Schedule Report
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFormProject(null);
                              navigate(`/pms/view-design/${encodeURIComponent(m.id)}`);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-indigo-600 bg-white border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                          >
                            <FileSpreadsheet size={11} /> View Design
                          </button>
                          {!isEditMode && <button
                            type="button"
                            onClick={() => handleDeleteMinor(m.id, m.minorName)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete minor"
                          >
                            <Trash2 size={13} />
                          </button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-2.5 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-xs text-gray-500 font-medium">No minors added yet for this project.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Fill in the minor fields above to add one, or save drawings.</p>
              </div>
            )}
          </div>

          {/* Section 3: Add Schedule */}
          <div className="border border-gray-200 rounded-lg p-3.5 space-y-3 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <CalendarClock size={16} className="text-indigo-600" />
              <span className="text-[13px] md:text-[14px] font-bold text-gray-800 tracking-tight">
                3. Add Schedule
              </span>
              <span className="text-[10px] text-gray-400">Saved with the minor being added above</span>
            </div>
            {projectMinors.some(m => m.scheduleFileId || m.scheduleFile || m.scheduleRows?.length) && (
              <div className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-1">
                Already-uploaded schedules: {projectMinors.filter(m => m.scheduleFileId || m.scheduleFile || m.scheduleRows?.length).length} of {projectMinors.length} minors have one (see the Schedule badge / Schedule Report button on each saved minor above). This box is only for a schedule of the NEW minor.
              </div>
            )}
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-gray-700 uppercase tracking-tight flex items-center gap-1.5">
                  <CalendarClock size={13} className="text-indigo-600" />
                  <span>Add Schedule (Upload PDF with Table Data)</span>
                </label>
                {newMinorScheduleFileName && (
                  <div className="flex items-center gap-2">
                    {newMinorScheduleFile && (
                      <button
                        type="button"
                        onClick={(e) => handleViewSchedulePdf(newMinorScheduleFile || newMinorScheduleFileId, newMinorScheduleFileName, e)}
                        className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                        title="View uploaded schedule PDF"
                      >
                        <Eye size={11} /> View PDF
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveSchedule}
                      className="inline-flex items-center gap-0.5 text-[10px] text-rose-500 hover:text-rose-700 font-semibold"
                      title="Remove schedule"
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                )}
              </div>
              <label className="cursor-pointer block">
                <div className={`flex items-center justify-between border border-dashed rounded px-2.5 py-1.5 text-xs transition-all ${
                  newMinorScheduleFileName 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800' 
                    : 'bg-white border-gray-300 text-gray-500 hover:border-indigo-300'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className={newMinorScheduleFileName ? 'text-indigo-600 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                    <span className="truncate">
                      {parsingSchedule
                        ? 'Parsing PDF table data...'
                        : newMinorScheduleFileName
                          ? `${newMinorScheduleFileName} (${newMinorScheduleRows.length} rows parsed)`
                          : 'Click to upload PDF schedule with table data'}
                    </span>
                  </div>
                  {newMinorScheduleFileName && !parsingSchedule && (
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded flex-shrink-0 ml-1">
                      {newMinorScheduleRows.length} Rows
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleMinorScheduleFile}
                  className="hidden"
                  disabled={parsingSchedule}
                />
              </label>
            </div>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
