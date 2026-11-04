// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  Check,
  Eye,
  Search,
  RotateCcw,
  ArrowLeft,
  Edit3,
  Trash2,
  Download,
  Plus,
  X,
  Save,
  CheckCircle2,
  Calendar,
  Building2,
  Tag,
  User,
  FileSpreadsheet,
  File,
  Layers,
  FolderArchive,
  Share2,
  Mail,
  Paperclip,
  Send,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getDocumentationFiles,
  saveDocumentationFiles,
  addDocumentationFile,
  updateDocumentationFile,
  deleteDocumentationFile,
  getProjects
} from '@/systems/pms/utils/storageManager';
import {
  formatDate,
  fileToBase64,
  getTodayDate
} from '@/systems/pms/utils/helpers';
import DocumentReaderModal from '@/systems/pms/components/DocumentReaderModal';
import ProjectsDocumentationTable from './ProjectsDocumentationTable';

const DOC_TYPES = [
  'Negotiation Letter',
  'Agreement Copy',
  'Work Order Copy',
  'PDN Design & Drawing Approval',
  'Technical Sanction',
  'Site Handover Memo',
  'Inspection / Quality Report',
  'Completion Certificate',
  'Material Test Certificate',
  'Department Billing Bill',
  'Other Document'
];

export default function Documentation() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProject, setSelectedProject] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'date-desc', 'title-asc'

  // Modals & Panels
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' | 'batch'
  const [editingDoc, setEditingDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Single Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState('Agreement Copy');
  const [uploadProject, setUploadProject] = useState('');
  const [uploadAgreementNo, setUploadAgreementNo] = useState('');
  const [uploadRecipient, setUploadRecipient] = useState('');
  const [uploadRefNo, setUploadRefNo] = useState('');
  const [uploadDate, setUploadDate] = useState(getTodayDate());
  const [uploadRemarks, setUploadRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedSessionCount, setUploadedSessionCount] = useState(0);

  // Batch Upload State
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchProject, setBatchProject] = useState('');
  const [batchType, setBatchType] = useState('Agreement Copy');

  // Edit Modal State
  const [editFormData, setEditFormData] = useState({
    title: '',
    docType: '',
    projectName: '',
    agreementNo: '',
    recipient: '',
    refNo: '',
    date: '',
    remarks: ''
  });

  const fileInputRef = useRef(null);
  const batchInputRef = useRef(null);

  // Load documents & projects
  const loadDocs = () => {
    const list = getDocumentationFiles();
    setDocuments(list);
  };

  useEffect(() => {
    loadDocs();
    try {
      const projs = getProjects() || [];
      if (Array.isArray(projs)) {
        setProjectsList(projs);
        const projParam = searchParams.get('project');
        if (projParam) {
          const found = projs.find(p =>
            (p.serialNo && p.serialNo.toLowerCase() === projParam.toLowerCase()) ||
            (p.projectName && p.projectName.toLowerCase() === projParam.toLowerCase())
          );
          if (found) {
            setSelectedProject(found);
            setProjectFilter(found.projectName || '');
            setUploadProject(found.projectName || '');
            setUploadAgreementNo(found.agreementNumber || '');
          }
        }
      }
    } catch {
      // ignore
    }
  }, [searchParams]);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSearchParams({ project: project.serialNo || project.projectName });
    setProjectFilter(project.projectName || '');
    setUploadProject(project.projectName || '');
    setUploadAgreementNo(project.agreementNumber || '');
  };

  const handleBackToProjectsTable = () => {
    setSelectedProject(null);
    setSearchParams({});
    setProjectFilter('');
    setSearchQuery('');
    setTypeFilter('');
  };

  // Filtered & Sorted documents
  const filteredDocuments = useMemo(() => {
    let result = documents.filter(doc => {
      // If a project is selected, scope docs to that project
      if (selectedProject) {
        const sNo = (selectedProject.serialNo || '').toLowerCase();
        const pName = (selectedProject.projectName || '').toLowerCase();
        const agrNo = (selectedProject.agreementNumber || '').toLowerCase();
        const docProj = (doc.projectName || '').toLowerCase();
        const docAgr = (doc.agreementNo || '').toLowerCase();
        const docTitle = (doc.title || '').toLowerCase();

        const matchesProject =
          (pName && (docProj === pName || docProj.includes(pName) || pName.includes(docProj))) ||
          (agrNo && docAgr === agrNo) ||
          (sNo && (docProj.includes(sNo) || docTitle.includes(sNo)));

        if (!matchesProject && projectFilter && doc.projectName !== projectFilter) {
          return false;
        }
      } else if (projectFilter && doc.projectName !== projectFilter) {
        return false;
      }

      if (typeFilter && doc.docType !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (doc.fileName || '').toLowerCase().includes(q) ||
          (doc.title || '').toLowerCase().includes(q) ||
          (doc.docType || '').toLowerCase().includes(q) ||
          (doc.projectName || '').toLowerCase().includes(q) ||
          (doc.agreementNo || '').toLowerCase().includes(q) ||
          (doc.recipient || '').toLowerCase().includes(q) ||
          (doc.refNo || '').toLowerCase().includes(q) ||
          (doc.remarks || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.uploadedAt || b.date || 0) - new Date(a.uploadedAt || a.date || 0);
      }
      if (sortBy === 'date-desc') {
        return new Date(b.date || 0) - new Date(a.date || 0);
      }
      if (sortBy === 'title-asc') {
        return (a.title || a.fileName || '').localeCompare(b.title || b.fileName || '');
      }
      return 0;
    });
  }, [documents, selectedProject, typeFilter, projectFilter, searchQuery, sortBy]);

  // Handle single file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 35 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File exceeds 35MB limit.');
      return;
    }

    setUploadFile(file);
    if (!uploadTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setUploadTitle(cleanName);
    }

    // Auto-detect docType if matched
    const lower = file.name.toLowerCase();
    if (lower.includes('agreement')) setUploadType('Agreement Copy');
    else if (lower.includes('negotiation')) setUploadType('Negotiation Letter');
    else if (lower.includes('work order') || lower.includes('wo')) setUploadType('Work Order Copy');
    else if (lower.includes('sanction')) setUploadType('Technical Sanction');
    else if (lower.includes('inspection') || lower.includes('test')) setUploadType('Inspection / Quality Report');
  };

  // Handle single upload submit
  const handleSingleUpload = async (e, addAnother = false) => {
    if (e) e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsSubmitting(true);
    try {
      let fileData = '';
      try {
        fileData = await fileToBase64(uploadFile);
      } catch (err) {
        console.warn('Could not read base64, storing file reference', err);
      }

      const sizeStr = uploadFile.size > 1024 * 1024
        ? `${(uploadFile.size / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(uploadFile.size / 1024)} KB`;

      const ext = uploadFile.name.split('.').pop()?.toUpperCase() || 'FILE';

      addDocumentationFile({
        fileName: uploadFile.name,
        title: uploadTitle.trim() || uploadFile.name,
        docType: uploadType,
        projectName: uploadProject.trim(),
        agreementNo: uploadAgreementNo.trim(),
        recipient: uploadRecipient.trim(),
        refNo: uploadRefNo.trim(),
        date: uploadDate,
        fileSize: sizeStr,
        fileType: ext,
        fileData: fileData,
        fileUrl: '',
        remarks: uploadRemarks.trim()
      });

      toast.success(`Document "${uploadFile.name}" added successfully!`);
      loadDocs();
      setUploadedSessionCount(prev => prev + 1);

      if (addAnother) {
        // Reset file and title so user can immediately upload the next document
        setUploadFile(null);
        setUploadTitle('');
        setUploadRemarks('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.focus();
        }
      } else {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadRemarks('');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle batch files selection
  const handleBatchFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBatchFiles(files);
  };

  // Submit batch files one after another
  const handleBatchUploadSubmit = async (e) => {
    e.preventDefault();
    if (!batchFiles.length) {
      toast.error('Please select one or more files');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;

    for (const file of batchFiles) {
      try {
        let fileData = '';
        try {
          fileData = await fileToBase64(file);
        } catch {
          // ignore
        }

        const sizeStr = file.size > 1024 * 1024
          ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;

        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';

        addDocumentationFile({
          fileName: file.name,
          title: cleanName,
          docType: batchType,
          projectName: batchProject.trim(),
          agreementNo: '',
          recipient: '',
          refNo: '',
          date: getTodayDate(),
          fileSize: sizeStr,
          fileType: ext,
          fileData: fileData,
          fileUrl: '',
          remarks: ''
        });
        successCount++;
      } catch (err) {
        console.error('Failed uploading', file.name, err);
      }
    }

    setIsSubmitting(false);
    toast.success(`Successfully uploaded ${successCount} documents!`);
    loadDocs();
    setBatchFiles([]);
    setIsUploadModalOpen(false);
  };


  // Open Edit Modal
  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setEditFormData({
      title: doc.title || '',
      docType: doc.docType || 'Agreement Copy',
      projectName: doc.projectName || '',
      agreementNo: doc.agreementNo || '',
      recipient: doc.recipient || '',
      refNo: doc.refNo || '',
      date: doc.date || '',
      remarks: doc.remarks || ''
    });
  };

  // Save changes from Edit Modal
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingDoc) return;

    updateDocumentationFile(editingDoc.id, editFormData);
    toast.success('Document details updated!');
    setEditingDoc(null);
    loadDocs();
  };

  // Delete document
  const handleDeleteDoc = (id, fileName) => {
    if (window.confirm(`Are you sure you want to remove "${fileName}"?`)) {
      deleteDocumentationFile(id);
      toast.success('Document removed');
      loadDocs();
    }
  };

  // Download document
  const handleDownload = (doc) => {
    if (!doc) return;
    if (doc.fileUrl) {
      const a = document.createElement('a');
      a.href = doc.fileUrl;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    if (doc.fileData) {
      const a = document.createElement('a');
      a.href = doc.fileData;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    if (doc.fileName && doc.fileName.toLowerCase().includes('laal nallha')) {
      const a = document.createElement('a');
      a.href = '/Negotiation CE Laal Nallha.docx';
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    toast.error('File data not available for direct download.');
  };

  // Navigate to dedicated Share page
  const handleOpenShare = (doc) => {
    navigate(`/pms/documentation/share/${doc.id}`, { state: { doc } });
  };

  // Render document thumbnail preview
  const renderDocumentThumbnail = (doc) => {
    const isImage =
      (doc.fileData && doc.fileData.startsWith('data:image')) ||
      ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'].includes((doc.fileType || '').toUpperCase());

    if (isImage && (doc.fileData || doc.fileUrl)) {
      return (
        <div className="w-full h-full flex items-center justify-center p-2 bg-white rounded-md">
          <img
            src={doc.fileData || doc.fileUrl}
            alt={doc.title}
            className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </div>
      );
    }

    const typeUpper = (doc.fileType || 'DOCX').toUpperCase();
    const isDocx = typeUpper === 'DOCX' || typeUpper === 'DOC';
    const isPdf = typeUpper === 'PDF';
    const isXlsx = typeUpper === 'XLSX' || typeUpper === 'XLS';

    let bannerColor = 'bg-indigo-600';
    let icon = <FileText size={26} className="text-indigo-600" />;

    if (isPdf) {
      bannerColor = 'bg-rose-600';
      icon = <FileText size={26} className="text-rose-600" />;
    } else if (isXlsx) {
      bannerColor = 'bg-emerald-600';
      icon = <FileSpreadsheet size={26} className="text-emerald-600" />;
    } else if (isDocx) {
      bannerColor = 'bg-blue-600';
      icon = <FileText size={26} className="text-blue-600" />;
    }

    return (
      <div className="w-full h-full flex items-center justify-center p-3 relative bg-slate-50/70 rounded-md">
        {/* Document Paper Sheet */}
        <div className="relative w-36 h-40 bg-white rounded border border-slate-200 shadow-2xs flex flex-col justify-between overflow-hidden transition-all duration-200 group-hover:shadow group-hover:-translate-y-0.5">
          {/* Top header bar */}
          <div className={`${bannerColor} text-white px-2 py-1 flex items-center justify-between text-[9px] font-bold tracking-wider`}>
            <span>{typeUpper}</span>
            <span className="text-[8px] opacity-90 font-mono">{doc.fileSize || 'FILE'}</span>
          </div>

          {/* Document Content Skeleton */}
          <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              {icon}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">
                  {doc.title || doc.fileName}
                </p>
                <p className="text-[8px] text-slate-400 truncate">{doc.docType}</p>
              </div>
            </div>

            {/* Simulated text lines */}
            <div className="space-y-1 pt-1 opacity-50">
              <div className="h-1 bg-slate-300 rounded-full w-full" />
              <div className="h-1 bg-slate-200 rounded-full w-5/6" />
              <div className="h-1 bg-slate-200 rounded-full w-4/6" />
            </div>

            {/* Bottom info */}
            <div className="mt-auto pt-1 flex items-center justify-between border-t border-slate-100 text-[8px] text-slate-400">
              <span className="font-mono text-slate-500">{formatDate(doc.date)}</span>
              <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                <CheckCircle2 size={9} /> Verified
              </span>
            </div>
          </div>
        </div>

        {/* Hover Quick Preview Button */}
        <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-white text-indigo-700 text-[11px] font-bold py-1 px-3 rounded-full shadow border border-slate-200 flex items-center gap-1">
            <Eye size={12} className="text-indigo-600" /> Preview
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-0 sm:p-2 md:p-6 flex flex-col h-full min-h-0 ${selectedProject ? 'space-y-3 overflow-y-auto' : 'space-y-2 md:space-y-4'}`}>
      {!selectedProject ? (
        <ProjectsDocumentationTable
          mode="documentation"
          onSelectProject={handleSelectProject}
          onUploadDocument={() => {
            setUploadProject('');
            setUploadAgreementNo('');
            setUploadMode('single');
            setIsUploadModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* Breadcrumb & Project Details Bar */}
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
                onClick={() => {
                  setUploadProject(selectedProject.projectName);
                  setUploadAgreementNo(selectedProject.agreementNumber || '');
                  setUploadMode('single');
                  setIsUploadModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus size={14} />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          {/* 1. Header & Controls in a Single Line */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            {/* Left: Heading */}
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-shrink-0">
              <FileText className="text-indigo-600" size={18} />
              <span>Project Documents ({filteredDocuments.length})</span>
            </h2>

            {/* Right: Controls aligned together in the same line */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
              {/* Search Input */}
              <div className="relative min-w-[200px] sm:min-w-[260px] flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, agreement no, project..."
                  className="w-full pl-8 pr-7 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* All Document Types Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white border border-slate-300 hover:border-slate-400 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer shadow-2xs"
              >
                <option value="">All Document Types</option>
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* All Projects Filter */}
              <select
                value={projectFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectFilter(val);
                  if (val) {
                    const found = projectsList.find(p => p.projectName === val);
                    if (found) {
                      setSelectedProject(found);
                      setSearchParams({ project: found.serialNo || found.projectName });
                    }
                  }
                }}
                className="bg-white border border-slate-300 hover:border-slate-400 rounded-lg px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-medium max-w-[170px] truncate cursor-pointer shadow-2xs"
              >
                <option value="">All Projects</option>
                {projectsList.map(p => (
                  <option key={p.projectNo || p.id} value={p.projectName}>
                    {p.projectName}
                  </option>
                ))}
              </select>

              {/* Upload Document Button */}
              <button
                type="button"
                onClick={() => {
                  setUploadProject(selectedProject?.projectName || '');
                  setUploadAgreementNo(selectedProject?.agreementNumber || '');
                  setUploadMode('single');
                  setIsUploadModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors flex-shrink-0"
              >
                <Plus size={15} />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          {/* 4. Documents Grid (NO TABLES - ONLY CARDS) */}
          <div className="flex-1">
            {filteredDocuments.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8 space-y-4 shadow-2xs">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                  <UploadCloud size={28} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">No documents found for this project</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload official project documents one after another to organize them in this card view.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadProject(selectedProject?.projectName || '');
                    setUploadAgreementNo(selectedProject?.agreementNumber || '');
                    setUploadMode('single');
                    setIsUploadModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-2xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Plus size={15} />
                  <span>Upload Document</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredDocuments.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all p-3.5 flex flex-col justify-between group"
              >
                {/* Card Top: Badges & Format */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[130px]">
                    {doc.docType || 'Document'}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {doc.fileType || 'DOCX'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenShare(doc);
                      }}
                      className="p-1 rounded hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Share via Email"
                    >
                      <Share2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Card Thumbnail / Preview */}
                <div
                  onClick={() => setPreviewDoc(doc)}
                  className="w-full h-44 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center p-2 relative overflow-hidden mb-3 cursor-pointer group-hover:bg-slate-50/80 transition-colors"
                >
                  {renderDocumentThumbnail(doc)}
                </div>

                {/* Card Info */}
                <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                  {/* Document Title */}
                  <h3
                    onClick={() => setPreviewDoc(doc)}
                    title={doc.title || doc.fileName}
                    className="text-xs font-bold text-slate-900 hover:text-indigo-600 cursor-pointer line-clamp-2 leading-snug transition-colors"
                  >
                    {doc.title || doc.fileName}
                  </h3>

                  {/* Project Name */}
                  {doc.projectName && (
                    <div className="text-[11px] text-slate-600 truncate" title={doc.projectName}>
                      <span className="text-slate-400">Project: </span>
                      <span className="font-semibold text-slate-800">{doc.projectName}</span>
                    </div>
                  )}

                  {/* Agreement Number */}
                  {doc.agreementNo && (
                    <div className="text-[11px] text-slate-600 truncate" title={doc.agreementNo}>
                      <span className="text-slate-400">Agreement: </span>
                      <span className="font-bold text-slate-900">{doc.agreementNo}</span>
                    </div>
                  )}

                  {/* Letter / Ref No */}
                  {doc.refNo && (
                    <div className="text-[11px] text-slate-500 truncate" title={doc.refNo}>
                      <span className="text-slate-400">Ref: </span>
                      <span className="font-medium text-slate-700">{doc.refNo}</span>
                    </div>
                  )}

                  {/* Recipient / Authority */}
                  {doc.recipient && (
                    <div className="text-[11px] text-slate-500 truncate" title={doc.recipient}>
                      <span className="text-slate-400">To: </span>
                      <span>{doc.recipient}</span>
                    </div>
                  )}

                  {/* Share Status Badge (if previously shared) */}
                  {doc.lastSharedTo && (
                    <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 truncate" title={`Shared with ${doc.lastSharedTo}`}>
                      <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
                      <span className="truncate">Shared: {doc.lastSharedTo}</span>
                    </div>
                  )}

                  {/* Date & File Size */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>{formatDate(doc.date)}</span>
                    <span className="font-mono text-slate-600">{doc.fileSize || 'FILE'}</span>
                  </div>
                </div>

                {/* Bottom Action Area */}
                <div className="pt-3 mt-2 border-t border-slate-100 space-y-2">
                  {/* Primary Actions: Download + Share */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer truncate"
                      title="Download File"
                    >
                      <Download size={13} />
                      <span className="truncate">Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenShare(doc)}
                      className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer truncate"
                      title="Share Document via Email"
                    >
                      <Share2 size={13} />
                      <span className="truncate">Share</span>
                    </button>
                  </div>

                  {/* Action Icons: View, Delete */}
                  <div className="flex items-center justify-between px-1 text-slate-500 text-[11px] pt-0.5">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
                      title="View details & full preview"
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc.id, doc.fileName)}
                      className="hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Delete document"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )}

      {/* 5. Upload Modal (Enables Uploading ONE AFTER ANOTHER seamlessly) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud size={22} className="text-indigo-200" />
                <div>
                  <h3 className="font-bold text-base">Upload Document</h3>
                  <p className="text-[11px] text-indigo-100">
                    Upload documents one after another to store them in your catalog
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-indigo-100 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                type="button"
                onClick={() => setUploadMode('single')}
                className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
                  uploadMode === 'single'
                    ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Single Document (One after another)
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('batch')}
                className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
                  uploadMode === 'batch'
                    ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Batch Upload (Multiple Files)
              </button>
            </div>

            {/* Session Upload Counter Pill */}
            {uploadedSessionCount > 0 && (
              <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between text-xs text-indigo-800 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  {uploadedSessionCount} {uploadedSessionCount === 1 ? 'document' : 'documents'} uploaded in this session
                </span>
                <span className="text-[11px] text-indigo-600 font-normal">Ready for your next file</span>
              </div>
            )}

            {/* SINGLE UPLOAD FORM */}
            {uploadMode === 'single' ? (
              <form onSubmit={(e) => handleSingleUpload(e, false)} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* File picker drop box */}
                <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-xl p-5 text-center transition-colors">
                  <UploadCloud size={32} className="text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    Select a document (.docx, .pdf, .xlsx, images)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Maximum file size: 35 MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="docUploadInput"
                    onChange={handleFileSelect}
                    accept=".docx,.doc,.pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                    className="mt-3 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                  {uploadFile && (
                    <div className="mt-3 p-2 bg-white rounded-lg border border-indigo-200 text-xs font-semibold text-slate-800 flex items-center justify-center gap-2">
                      <Check size={14} className="text-emerald-600" />
                      <span>{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Document Title *
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Agreement Copy B-1/01/DL"
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Document Type
                    </label>
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                    >
                      {DOC_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Project Name
                    </label>
                    {projectsList.length > 0 ? (
                      <div className="space-y-1">
                        <select
                          value={uploadProject}
                          onChange={(e) => setUploadProject(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs"
                        >
                          <option value="">Select or type project below</option>
                          {projectsList.map(p => (
                            <option key={p.projectNo || p.id} value={p.projectName}>
                              {p.projectName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={uploadProject}
                          onChange={(e) => setUploadProject(e.target.value)}
                          placeholder="Or type custom project name..."
                          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 text-xs mt-1"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={uploadProject}
                        onChange={(e) => setUploadProject(e.target.value)}
                        placeholder="Enter project name..."
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Agreement Number
                    </label>
                    <input
                      type="text"
                      value={uploadAgreementNo}
                      onChange={(e) => setUploadAgreementNo(e.target.value)}
                      placeholder="e.g. B-1/01/DL/2026-2027"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Recipient / Authority
                    </label>
                    <input
                      type="text"
                      value={uploadRecipient}
                      onChange={(e) => setUploadRecipient(e.target.value)}
                      placeholder="e.g. Chief Engineer, VIDC Nagpur"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Letter / Reference No
                    </label>
                    <input
                      type="text"
                      value={uploadRefNo}
                      onChange={(e) => setUploadRefNo(e.target.value)}
                      placeholder="e.g. CE/VIDC/2026/742"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Document Date
                    </label>
                    <input
                      type="date"
                      value={uploadDate}
                      onChange={(e) => setUploadDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Remarks / Notes
                    </label>
                    <input
                      type="text"
                      value={uploadRemarks}
                      onChange={(e) => setUploadRemarks(e.target.value)}
                      placeholder="Optional remarks..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>

                {/* Action Buttons: "Upload & Add Next" + "Upload & Finish" */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Upload & Add Next (Stores doc and allows next upload immediately) */}
                    <button
                      type="button"
                      disabled={isSubmitting || !uploadFile}
                      onClick={() => handleSingleUpload(null, true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 disabled:opacity-50 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      title="Saves this document and prepares form for the next file"
                    >
                      <Plus size={14} />
                      <span>Upload & Add Next</span>
                    </button>

                    {/* Upload & Finish */}
                    <button
                      type="submit"
                      disabled={isSubmitting || !uploadFile}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                    >
                      <Check size={14} />
                      <span>Upload & Finish</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* BATCH UPLOAD FORM */
              <form onSubmit={handleBatchUploadSubmit} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-xl p-5 text-center">
                  <FolderArchive size={34} className="text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    Select multiple files at once
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Hold Ctrl / Shift to pick multiple documents</p>
                  <input
                    ref={batchInputRef}
                    type="file"
                    multiple
                    onChange={handleBatchFileSelect}
                    accept=".docx,.doc,.pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                    className="mt-3 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                </div>

                {batchFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-800">
                      Selected Files ({batchFiles.length}):
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      {batchFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded border border-slate-200">
                          <span className="font-semibold text-slate-800 truncate max-w-[320px]">{f.name}</span>
                          <span className="text-slate-400 font-mono">{(f.size / 1024).toFixed(0)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Document Type for all
                    </label>
                    <select
                      value={batchType}
                      onChange={(e) => setBatchType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    >
                      {DOC_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={batchProject}
                      onChange={(e) => setBatchProject(e.target.value)}
                      placeholder="Optional project name..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !batchFiles.length}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <UploadCloud size={14} />
                    <span>Upload All {batchFiles.length} Documents</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. Edit Details Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-200" />
                <div>
                  <h3 className="font-bold text-base">Edit Document Details</h3>
                  <p className="text-[11px] text-indigo-100 truncate max-w-[300px]">{editingDoc.fileName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-indigo-100 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Document Type
                </label>
                <select
                  value={editFormData.docType}
                  onChange={(e) => setEditFormData({ ...editFormData, docType: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                >
                  {DOC_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editFormData.projectName}
                  onChange={(e) => setEditFormData({ ...editFormData, projectName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Agreement Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.agreementNo}
                    onChange={(e) => setEditFormData({ ...editFormData, agreementNo: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Letter / Ref Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.refNo}
                    onChange={(e) => setEditFormData({ ...editFormData, refNo: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Recipient / Authority
                  </label>
                  <input
                    type="text"
                    value={editFormData.recipient}
                    onChange={(e) => setEditFormData({ ...editFormData, recipient: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Document Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Full-Featured Document Reader Modal */}
      {previewDoc && (
        <DocumentReaderModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onEdit={(docToEdit) => openEditModal(docToEdit)}
          onDownload={(docToDl) => handleDownload(docToDl)}
          onShare={(docToShare) => {
            setPreviewDoc(null);
            handleOpenShare(docToShare);
          }}
        />
      )}
    </div>
  );
}
