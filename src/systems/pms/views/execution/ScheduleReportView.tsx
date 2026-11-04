// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Tag, User, Search, UploadCloud,
  Download, ExternalLink, FileText, Table as TableIcon,
  Columns2, RotateCcw, AlertCircle, Layers
} from 'lucide-react';
import {
  getProjectOrMinor,
  getScheduleForMinor,
  saveScheduleForMinor,
  getMinors,
  getDrawingUploadForProject
} from '@/systems/pms/utils/storageManager';
import {
  getFileFromIndexedDB,
  getMemoryFile,
  saveFileToIndexedDB,
  setMemoryFile
} from '@/systems/pms/utils/fileStorage';
import { parsePdfTableFile } from '@/systems/pms/utils/pdfTableParser';

export default function ScheduleReport() {
  const { projectNo } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [uploading, setUploading] = useState(false);

  // View modes: 'table' | 'split' | 'pdf'
  const [viewMode, setViewMode] = useState('table');
  const [searchQuery, setSearchQuery] = useState('');

  // Load project & schedule
  useEffect(() => {
    if (!projectNo) return;
    const decoded = decodeURIComponent(projectNo);
    const proj = getProjectOrMinor(decoded) || getProjectOrMinor(projectNo);
    setProject(proj || { serialNo: decoded, projectName: 'Project', minorName: 'Minor' });

    loadSchedule(proj || { serialNo: decoded });
  }, [projectNo]);

  const resolvePdfBlob = async (fileUrlOrId, fileIdFallback): Promise<Blob | null> => {
    if (!fileUrlOrId && !fileIdFallback) return null;

    const id = typeof fileUrlOrId === 'string' && fileUrlOrId.startsWith('idb:')
      ? fileUrlOrId.replace('idb:', '')
      : (fileIdFallback || fileUrlOrId);

    if (id) {
      try {
        const data: any = await getFileFromIndexedDB(id);
        if (data instanceof Blob) return data;
        if (typeof data === 'string' && /^(data:|blob:|https?:)/.test(data)) {
          const res = await fetch(data);
          return await res.blob();
        }
      } catch (e) {
        console.warn('IDB fetch blob error:', e);
      }
    }

    if (typeof fileUrlOrId === 'string' && /^(data:|blob:|https?:)/.test(fileUrlOrId)) {
      try {
        const res = await fetch(fileUrlOrId);
        return await res.blob();
      } catch {}
    }

    return null;
  };

  const resolvePdfUrl = async (fileUrlOrId, fileIdFallback) => {
    if (!fileUrlOrId && !fileIdFallback) return '';

    const toBlobUrl = (dataUri) => {
      try {
        const base64Data = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
        const binary = atob(base64Data);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
      } catch {
        return dataUri;
      }
    };

    if (typeof fileUrlOrId === 'string') {
      if (fileUrlOrId.startsWith('blob:') || fileUrlOrId.startsWith('http')) {
        return fileUrlOrId;
      }
      if (fileUrlOrId.startsWith('data:application/pdf') || fileUrlOrId.startsWith('data:')) {
        return toBlobUrl(fileUrlOrId);
      }
    }

    const id = typeof fileUrlOrId === 'string' && fileUrlOrId.startsWith('idb:')
      ? fileUrlOrId.replace('idb:', '')
      : (fileIdFallback || fileUrlOrId);

    if (id) {
      const mem = getMemoryFile(id);
      if (mem) {
        if (typeof mem === 'string' && mem.startsWith('data:')) {
          return toBlobUrl(mem);
        }
        return mem;
      }

      try {
        const data: any = await getFileFromIndexedDB(id);
        if (data) {
          if (typeof Blob !== 'undefined' && data instanceof Blob) {
            return URL.createObjectURL(data);
          }
          if (typeof data === 'string' && data.startsWith('data:')) {
            return toBlobUrl(data);
          }
          return data;
        }
      } catch (e) {
        console.warn('Failed to load schedule from IndexedDB:', e);
      }
    }

    return '';
  };

  const loadSchedule = async (proj) => {
    if (!proj) return;
    setLoadingPdf(true);

    let sched = getScheduleForMinor(proj.serialNo);

    // One Schedule B per project: when opened from the project, use the schedule attached to any of its minors
    if (!sched) {
      const minorWithSchedule = getMinors()
        .filter(m => m.projectNo === proj.serialNo)
        .find(m => getScheduleForMinor(m.id)?.rows?.length || m.scheduleFile || m.scheduleFileId);
      if (minorWithSchedule) sched = getScheduleForMinor(minorWithSchedule.id);
    }

    if (!sched && (proj.scheduleFile || proj.scheduleFileId || (proj.scheduleRows && proj.scheduleRows.length > 0))) {
      sched = {
        minorId: proj.serialNo,
        fileName: proj.scheduleFileName || 'Schedule_Document.pdf',
        fileUrl: proj.scheduleFile || '',
        fileId: proj.scheduleFileId || '',
        rows: proj.scheduleRows || [],
        headers: proj.scheduleHeaders || []
      };
    }

    if (!sched && proj.parentProjectNo) {
      sched = getScheduleForMinor(proj.parentProjectNo);
    }

    if (!sched) {
      const drawRecord = getDrawingUploadForProject(proj.serialNo) || (proj.parentProjectNo ? getDrawingUploadForProject(proj.parentProjectNo) : null);
      if (drawRecord?.drawingFile || drawRecord?.drawingFileName) {
        sched = {
          minorId: proj.serialNo,
          fileName: drawRecord.drawingFileName || 'Drawing_Schedule.pdf',
          fileUrl: drawRecord.drawingFile || '',
          fileId: drawRecord.drawingFileId || '',
          rows: [],
          headers: []
        };
      }
    }

    if (!sched) {
      const allMinors = getMinors();
      const m = allMinors.find(min => min.id === proj.serialNo || (proj.minorName && min.minorName === proj.minorName));
      if (m && (m.scheduleFile || m.scheduleFileId || m.scheduleFileName)) {
        sched = {
          minorId: m.id,
          fileName: m.scheduleFileName || 'Schedule_Document.pdf',
          fileUrl: m.scheduleFile || '',
          fileId: m.scheduleFileId || '',
          rows: m.scheduleRows || [],
          headers: m.scheduleHeaders || []
        };
      }
    }

    const isGarbled = (data: any) => {
      if (data?.rows?.length === 1 && String(data.rows[0]?.Description || '').startsWith('Schedule document uploaded:')) return true;
      // Stored rows from the old parser: stamp text in the rate cell, or Qty x Rate != Amount
      if (data?.rows?.some((r: any) => {
        const q = parseFloat(String(r.Quantity || '').replace(/,/g, ''));
        const a = parseFloat(String(r.Amount || '').replace(/,/g, ''));
        const rt = parseFloat(String(r['Rate (Figures)'] || '').replace(/,/g, ''));
        return /\bAE\d*\b/.test(String(r['Rate (Figures)'] || '')) ||
          (q > 0 && a > 0 && !(Math.abs(q * rt - a) / a <= 0.02));
      })) return true;
      if (!data?.headers || data.headers.length === 0) return false;
      return data.headers.some((h: string) => /[\u0000-\u001F\u007F-\u009F]/.test(h) || h.startsWith('xœ') || h.includes('xœ') || h.length > 50);
    };

    if (sched && (sched.fileUrl || sched.fileId)) {
      const url = await resolvePdfUrl(sched.fileUrl, sched.fileId);
      setResolvedPdfUrl(url);

      if (isGarbled(sched)) {
        try {
          const blob = await resolvePdfBlob(sched.fileUrl, sched.fileId);
          if (blob) {
            const file = new File([blob], sched.fileName || 'schedule.pdf', { type: 'application/pdf' });
            const parsed = await parsePdfTableFile(file);
            if (parsed.rows && parsed.rows.length > 0) {
              sched = {
                ...sched,
                rows: parsed.rows,
                headers: parsed.headers,
                rawText: parsed.rawText,
                totalAmount: parsed.totalAmount || ''
              };
              saveScheduleForMinor(proj.serialNo, sched);
            }
          }
        } catch (e) {
          console.warn('Auto re-parse failed:', e);
        }
      }
    } else {
      setResolvedPdfUrl('');
    }

    setScheduleData(sched || null);
    setLoadingPdf(false);
  };

  const handleReparseCurrentPdf = async () => {
    if (!scheduleData || (!scheduleData.fileUrl && !scheduleData.fileId)) {
      toast.error('No PDF schedule document attached');
      return;
    }
    const toastId = toast.loading('Re-parsing PDF text & tables...');
    try {
      const blob = await resolvePdfBlob(scheduleData.fileUrl, scheduleData.fileId);
      if (!blob) {
        toast.error('Could not access PDF file content', { id: toastId });
        return;
      }
      const file = new File([blob], scheduleData.fileName || 'schedule.pdf', { type: 'application/pdf' });
      const parsed = await parsePdfTableFile(file);
      const updated = {
        ...scheduleData,
        rows: parsed.rows || [],
        headers: parsed.headers || [],
        rawText: parsed.rawText || '',
        totalAmount: parsed.totalAmount || ''
      };
      saveScheduleForMinor(project.serialNo, updated);
      setScheduleData(updated);
      toast.success(`Successfully parsed ${parsed.rows.length} rows!`, { id: toastId });
    } catch (err) {
      toast.error('Failed to re-parse PDF', { id: toastId });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Please upload a valid PDF schedule file');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Reading & parsing PDF schedule...');

    try {
      const fileId = `sched_${project.serialNo}_${Date.now()}`;
      const blobUrl = URL.createObjectURL(file);
      setMemoryFile(fileId, blobUrl);

      try {
        await saveFileToIndexedDB(fileId, file);
      } catch (err) {
        console.warn('IDB save fallback:', err);
      }

      let parsedRows = [];
      let parsedHeaders = [];
      let rawText = '';
      let totalAmount = '';
      try {
        const parsed = await parsePdfTableFile(file);
        parsedRows = parsed.rows || [];
        parsedHeaders = parsed.headers || [];
        rawText = parsed.rawText || '';
        totalAmount = parsed.totalAmount || '';
      } catch (err) {
        console.warn('PDF table parser warning:', err);
      }

      const schedulePayload = {
        minorId: project.serialNo,
        fileName: file.name,
        fileUrl: `idb:${fileId}`,
        fileId,
        rows: parsedRows,
        headers: parsedHeaders,
        rawText,
        totalAmount
      };

      saveScheduleForMinor(project.serialNo, schedulePayload);
      setScheduleData(schedulePayload);
      setResolvedPdfUrl(blobUrl);
      toast.success(
        parsedRows.length > 0
          ? `Parsed schedule with ${parsedRows.length} rows!`
          : 'Schedule PDF attached successfully!',
        { id: toastId }
      );
    } catch (err) {
      toast.error('Failed to parse PDF schedule', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!resolvedPdfUrl) return;
    const a = document.createElement('a');
    a.href = resolvedPdfUrl;
    a.download = scheduleData?.fileName || `${project?.minorName || project?.projectName || 'Schedule'}_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCsv = () => {
    if (!scheduleData?.rows || scheduleData.rows.length === 0) {
      toast.error('No table rows to export');
      return;
    }

    const headers = scheduleData.headers || Object.keys(scheduleData.rows[0]);
    const csvRows = [];
    csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

    for (const r of scheduleData.rows) {
      const values = headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`);
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${scheduleData.fileName ? scheduleData.fileName.replace(/\.pdf$/i, '') : 'Schedule_Report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };

  // Filtered rows based on search
  const filteredRows = useMemo(() => {
    if (!scheduleData?.rows) return [];
    if (!searchQuery.trim()) return scheduleData.rows;
    const q = searchQuery.toLowerCase();
    return scheduleData.rows.filter(r =>
      Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }, [scheduleData, searchQuery]);

  // Total sum calculation for Amount column
  const totalAmountSum = useMemo(() => {
    if (!scheduleData?.rows || scheduleData.rows.length === 0) return 0;
    return scheduleData.rows.reduce((sum, r) => {
      const val = r['Amount'] || r['Total Amount'] || r['Total'] || '';
      const num = parseFloat(String(val).replace(/,/g, '').trim());
      return !isNaN(num) ? sum + num : sum;
    }, 0);
  }, [scheduleData]);

  if (!project) {
    return (
      <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-6 flex flex-col h-full min-h-0 bg-white">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold w-fit"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">
          Project not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-4 flex flex-col h-full min-h-0 bg-white">
      {/* Top Controls Row: Back + Search + View Controls + Secondary Actions + Primary Download */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full px-2 sm:px-0">
        {/* Back button */}
        <button
          onClick={() => navigate(`/pms/view-design/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold w-fit flex-shrink-0"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Search */}
        <div className="flex-1 min-w-0 relative max-w-sm">
          <Search className="absolute left-2.5 top-[9px] md:top-[11px] text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search items, descriptions, rates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
          />
        </div>

        {/* View Mode Switcher (Segmented Control) */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 h-[32px] md:h-[38px] flex-shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all h-full ${
              viewMode === 'table'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TableIcon size={14} />
            <span className="hidden sm:inline">Table</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all h-full ${
              viewMode === 'split'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Columns2 size={14} />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('pdf')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all h-full ${
              viewMode === 'pdf'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={14} />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>

        {/* Actions: Replace PDF, Re-Parse, Export CSV, Open in Tab */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto">
          <label className="flex items-center justify-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-2xs cursor-pointer transition">
            <UploadCloud size={14} className="text-indigo-600" />
            <span className="hidden md:inline">{scheduleData?.fileUrl ? 'Replace PDF' : 'Upload PDF'}</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={handleFileUpload}
            />
          </label>

          {resolvedPdfUrl && (
            <button
              type="button"
              onClick={handleReparseCurrentPdf}
              className="flex items-center justify-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-2xs transition"
              title="Re-parse PDF"
            >
              <RotateCcw size={14} className="text-indigo-600" />
              <span className="hidden md:inline">Re-Parse</span>
            </button>
          )}

          {scheduleData?.rows?.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center justify-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-2xs transition"
              title="Export CSV"
            >
              <Download size={14} className="text-indigo-600" />
              <span className="hidden md:inline">Export CSV</span>
            </button>
          )}

          {resolvedPdfUrl && (
            <>
              <button
                type="button"
                onClick={() => window.open(resolvedPdfUrl, '_blank')}
                className="flex items-center justify-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg px-3 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-2xs transition"
                title="Open PDF in new tab"
              >
                <ExternalLink size={14} />
                <span className="hidden lg:inline">Open in Tab</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 h-[32px] md:h-[38px] text-xs md:text-sm font-semibold shadow-sm transition flex-shrink-0"
              >
                <Download size={14} /> Download
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Card (4 Columns matching Execution Details structure) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0 flex-shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-2 min-w-0">
            <Building2 size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project Name</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">
                {project.originalProjectName || project.projectName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <Tag size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Minor Name</p>
              <p className="text-base md:text-lg text-indigo-600 font-bold truncate">
                {project.minorName || 'Main Project'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <User size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Contractor</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">
                {project.contractorName || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <FileText size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Document / Items</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">
                {scheduleData?.rows?.length ? `${scheduleData.rows.length} Items` : (scheduleData?.fileName || 'Schedule PDF')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col mx-2 sm:mx-0 overflow-hidden">
        {/* VIEW 1: TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {/* Toolbar row on top */}
            <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center justify-between gap-3 text-xs text-gray-600 flex-shrink-0">
              <div className="font-semibold text-gray-700">
                Showing {filteredRows.length} of {scheduleData?.rows?.length || 0} items
              </div>
              <div className="text-[11px] text-gray-500">
                Document: <span className="font-medium text-gray-800">{scheduleData?.fileName || 'Schedule.pdf'}</span>
              </div>
            </div>

            {/* Table */}
            {scheduleData?.rows && scheduleData.rows.length > 0 ? (
              <div className="flex-1 overflow-auto">
                <table className="table-fixed w-full text-xs text-left border-collapse">
                  <thead className="bg-white sticky top-0 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px] tracking-wider z-10 shadow-2xs">
                    <tr>
                      <th className="px-3 py-2.5 border-r border-gray-100 w-[80px] text-center bg-white">Item No</th>
                      <th className="px-3 py-2.5 border-r border-gray-100 w-[110px] text-center bg-white">Quantity</th>
                      <th className="px-4 py-2.5 border-r border-gray-100 min-w-[468px] text-left bg-white">Description</th>
                      <th className="px-2.5 py-2.5 border-r border-gray-100 w-[70px] text-center bg-white">Unit</th>
                      <th className="px-3 py-2.5 border-r border-gray-100 w-[110px] text-center bg-white">Rate (Figures)</th>
                      <th className="px-3 py-2.5 border-r border-gray-100 w-[220px] text-left bg-white">Rate (Words)</th>
                      <th className="px-4 py-2.5 w-[130px] text-right bg-white">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.map((row, rIdx) => {
                      const itemNo = row['Item No'] ?? '';
                      const qty = row['Quantity'] ?? '';
                      const desc = row['Description'] ?? row['Content / Description'] ?? '';
                      const unit = row['Unit'] ?? '';
                      const rateFig = row['Rate (Figures)'] ?? row['Rate'] ?? '';
                      const rateWords = row['Rate (Words)'] ?? '';
                      const amount = row['Amount'] ?? '';

                      return (
                        <tr key={rIdx} className="hover:bg-gray-50/70 transition-colors border-b border-gray-100">
                          <td className="px-3 py-2.5 border-r border-gray-100 text-center text-indigo-600 font-bold whitespace-nowrap align-top">
                            {itemNo || '-'}
                          </td>
                          <td className="px-3 py-2.5 border-r border-gray-100 text-center text-gray-700 whitespace-nowrap align-top font-medium">
                            {qty || '-'}
                          </td>
                          <td className="px-4 py-2.5 border-r border-gray-100 text-left align-top">
                            <div className="whitespace-normal break-words leading-relaxed text-gray-800 text-xs max-h-32 overflow-y-auto pr-1">
                              {desc || '-'}
                            </div>
                          </td>
                          <td className="px-2.5 py-2.5 border-r border-gray-100 text-center text-gray-700 whitespace-nowrap align-top">
                            {unit || '-'}
                          </td>
                          <td className="px-3 py-2.5 border-r border-gray-100 text-center text-gray-700 whitespace-nowrap align-top font-medium">
                            {rateFig || '-'}
                          </td>
                          <td className="px-3 py-2.5 border-r border-gray-100 text-left text-gray-600 text-[11px] leading-tight align-top break-words">
                            {rateWords || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-900 font-semibold whitespace-nowrap align-top">
                            {amount || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Sticky Footer Total Row */}
                  <tfoot className="bg-gray-50 sticky bottom-0 border-t-2 border-gray-200 text-xs font-semibold text-gray-900 z-10">
                    <tr>
                      <td className="px-3 py-3 text-center border-r border-gray-200 text-indigo-700">{filteredRows.length} items</td>
                      <td className="px-3 py-3 border-r border-gray-200"></td>
                      <td className="px-4 py-3 border-r border-gray-200 text-left text-gray-600">
                        {scheduleData?.totalAmount ? (
                          <span>
                            Total (as per PDF): <strong className="text-gray-900">₹{scheduleData.totalAmount}</strong>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2.5 py-3 border-r border-gray-200"></td>
                      <td className="px-3 py-3 border-r border-gray-200"></td>
                      <td className="px-3 py-3 border-r border-gray-200 text-right text-gray-600 font-normal">Sum:</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-bold text-sm">
                        {totalAmountSum > 0 ? `₹${totalAmountSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-3 border border-indigo-100">
                  <TableIcon size={28} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">No Structured Schedule Data Found</h3>
                <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4">
                  {resolvedPdfUrl
                    ? 'The PDF document is loaded. Click "Re-Parse" to extract the 7-column table.'
                    : 'Upload a PDF schedule file to parse and view structured table rows.'}
                </p>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition">
                    <UploadCloud size={14} /> Upload Schedule PDF
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                  {resolvedPdfUrl && (
                    <button
                      type="button"
                      onClick={handleReparseCurrentPdf}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition"
                    >
                      <RotateCcw size={14} className="text-indigo-600" /> Re-Parse PDF
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SPLIT VIEW (Table on Left, PDF on Right) */}
        {viewMode === 'split' && (
          <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 overflow-hidden">
            {/* Left: Compact Table */}
            <div className="w-full md:w-1/2 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-0">
              <div className="px-3 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-700">
                <span className="font-semibold">Schedule Items ({filteredRows.length})</span>
                <span className="text-[11px] text-gray-500">Total: {totalAmountSum > 0 ? `₹${totalAmountSum.toFixed(2)}` : '-'}</span>
              </div>
              <div className="flex-1 overflow-auto">
                {filteredRows.length > 0 ? (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white sticky top-0 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="px-2 py-2 border-r border-gray-100 w-16 text-center">Item</th>
                        <th className="px-3 py-2 border-r border-gray-100">Description</th>
                        <th className="px-2 py-2 border-r border-gray-100 w-14 text-center">Unit</th>
                        <th className="px-3 py-2 text-right w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-2 py-2 border-r border-gray-100 text-center text-indigo-600 font-bold text-[11px] align-top">{r['Item No'] || '-'}</td>
                          <td className="px-3 py-2 border-r border-gray-100 text-gray-800 text-[11px] align-top">{r['Description'] || r['Content / Description'] || '-'}</td>
                          <td className="px-2 py-2 border-r border-gray-100 text-center text-gray-600 text-[10px] align-top">{r['Unit'] || '-'}</td>
                          <td className="px-3 py-2 text-right text-gray-900 font-semibold text-[11px] align-top">{r['Amount'] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400 text-xs">No items to display</div>
                )}
              </div>
            </div>

            {/* Right: PDF Viewer */}
            <div className="w-full md:w-1/2 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-0">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-700">
                <div className="flex items-center gap-2 truncate">
                  <FileText size={14} className="text-indigo-600 flex-shrink-0" />
                  <span className="truncate font-medium">{scheduleData?.fileName || 'Schedule PDF'}</span>
                </div>
                {resolvedPdfUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(resolvedPdfUrl, '_blank')}
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold"
                  >
                    Open Tab
                  </button>
                )}
              </div>
              <div className="flex-1 bg-white relative">
                {resolvedPdfUrl ? (
                  <iframe
                    src={resolvedPdfUrl}
                    title="Schedule PDF Document"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-500 bg-white">
                    <FileText size={28} className="text-gray-300 mb-2" />
                    <p className="text-xs">No PDF file attached</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: FULL PDF VIEWER */}
        {viewMode === 'pdf' && (
          <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-700 flex-shrink-0">
              <div className="flex items-center gap-2 truncate">
                <FileText size={16} className="text-indigo-600" />
                <span className="font-semibold text-gray-800 truncate">{scheduleData?.fileName || 'Schedule Document.pdf'}</span>
              </div>
              <div className="flex items-center gap-3">
                {resolvedPdfUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => window.open(resolvedPdfUrl, '_blank')}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Open in Tab
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                    >
                      <Download size={12} /> Download
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 bg-white relative">
              {resolvedPdfUrl ? (
                <iframe
                  src={resolvedPdfUrl}
                  title="Schedule Report PDF Full Document"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
                  <FileText size={32} className="text-gray-300 mb-3" />
                  <h3 className="text-sm font-bold text-gray-900 mb-1">No Schedule PDF Document</h3>
                  <p className="text-xs text-gray-500 max-w-md mb-4">
                    Attach the PDF schedule document here to view the document.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition">
                    <UploadCloud size={14} /> Upload Schedule PDF
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
