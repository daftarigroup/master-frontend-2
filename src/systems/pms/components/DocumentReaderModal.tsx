// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Edit3,
  Share2
} from 'lucide-react';
import * as docx from 'docx-preview';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { formatDate } from '../utils/helpers';

// Helper to convert base64 data to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function DocumentReaderModal({ doc, onClose, onEdit, onDownload, onShare }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState('');
  const [sheetData, setSheetData] = useState(null); // { sheets: [], activeSheet: '', rows: [] }
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const docxContainerRef = useRef(null);

  const fileName = doc?.fileName || 'document';
  const ext = (doc?.fileType || fileName.split('.').pop() || 'FILE').toUpperCase();

  const isDocx = ext === 'DOCX' || ext === 'DOC' || fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');
  const isPdf = ext === 'PDF' || fileName.toLowerCase().endsWith('.pdf');
  const isExcel = ext === 'XLSX' || ext === 'XLS' || ext === 'CSV' || fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');
  const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG'].includes(ext) || (doc?.fileData && doc.fileData.startsWith('data:image'));

  useEffect(() => {
    let isCancelled = false;

    async function loadDocument() {
      if (!doc) return;
      setLoading(true);
      setError(null);
      setHtmlContent('');
      setSheetData(null);

      try {
        let arrayBuffer = null;

        // 1. Get ArrayBuffer from base64 or URL
        if (doc.fileData && doc.fileData.length > 50) {
          arrayBuffer = base64ToArrayBuffer(doc.fileData);
        } else if (doc.fileUrl) {
          const res = await fetch(doc.fileUrl);
          if (!res.ok) throw new Error(`Could not fetch file: ${res.statusText}`);
          arrayBuffer = await res.arrayBuffer();
        } else if (fileName.toLowerCase().includes('laal nallha')) {
          // Fallback to public folder file
          const res = await fetch('/Negotiation CE Laal Nallha.docx');
          if (res.ok) {
            arrayBuffer = await res.arrayBuffer();
          }
        }

        if (isCancelled) return;

        // 2. Handle DOCX
        if (isDocx) {
          if (!arrayBuffer) {
            throw new Error('File data is not available. Please try downloading or re-uploading the file.');
          }

          // Try docx-preview first for rich formatting
          let docxRendered = false;
          if (docxContainerRef.current) {
            try {
              docxContainerRef.current.innerHTML = '';
              await docx.renderAsync(arrayBuffer, docxContainerRef.current, null, {
                className: 'docx-preview-content',
                inWrapper: false,
                ignoreWidth: false,
                ignoreHeight: false
              });
              docxRendered = true;
            } catch (renderErr) {
              console.warn('docx-preview failed, falling back to mammoth:', renderErr);
            }
          }

          // If docx-preview didn't render or had an issue, fallback to mammoth
          if (!docxRendered) {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            if (isCancelled) return;
            setHtmlContent(result.value || '<p class="text-slate-500 italic">No readable text found in document.</p>');
          }
        }
        // 3. Handle PDF
        else if (isPdf) {
          if (arrayBuffer) {
            const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
          } else if (doc.fileUrl) {
            setPdfBlobUrl(doc.fileUrl);
          } else if (doc.fileData) {
            setPdfBlobUrl(doc.fileData);
          }
        }
        // 4. Handle Excel
        else if (isExcel) {
          if (!arrayBuffer) throw new Error('Spreadsheet data is not available');
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheets = workbook.SheetNames || [];
          if (sheets.length > 0) {
            const firstSheet = workbook.Sheets[sheets[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            setSheetData({
              workbook,
              sheets,
              rows: json
            });
          }
        }
      } catch (err) {
        console.error('Error rendering document:', err);
        if (!isCancelled) {
          setError(err.message || 'Failed to open document');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [doc]);

  // Switch Excel Sheet
  const handleSheetChange = (idx) => {
    if (!sheetData?.workbook) return;
    setActiveSheetIndex(idx);
    const sheetName = sheetData.sheets[idx];
    const sheet = sheetData.workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    setSheetData(prev => ({ ...prev, rows: json }));
  };

  // Zoom handlers
  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 15, 180));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 15, 60));
  const resetZoom = () => setZoomLevel(100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div
        className={`bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[92vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100 truncate max-w-md">
                  {doc.title || doc.fileName}
                </h3>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase">
                  {ext}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate font-mono">
                {doc.fileName} {doc.fileSize ? `(${doc.fileSize})` : ''}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Controls */}
            {(isDocx || isImage || htmlContent) && (
              <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={zoomOut}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="px-2 font-mono text-[11px] text-slate-300 min-w-[42px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            )}

            {/* Toggle Metadata Info */}
            <button
              type="button"
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                showMetadata
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Toggle Details Sidebar"
            >
              <Info size={15} />
              <span className="hidden md:inline">Details</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={() => onDownload(doc)}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download</span>
            </button>

            {/* Share via Email Button */}
            {onShare && (
              <button
                type="button"
                onClick={() => onShare(doc)}
                className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Share Document via Email"
              >
                <Share2 size={14} />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-700/50 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Reader Workspace */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Document Reading Canvas */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-200/80">
            {loading ? (
              <div className="my-auto text-center p-8 space-y-3 bg-white rounded-2xl shadow-sm border border-slate-300 max-w-sm">
                <Loader2 size={36} className="text-indigo-600 animate-spin mx-auto" />
                <p className="font-bold text-sm text-slate-800">Opening document...</p>
                <p className="text-xs text-slate-500">
                  Parsing and formatting {doc.fileName} for full in-browser reading
                </p>
              </div>
            ) : error ? (
              <div className="my-auto text-center p-8 space-y-4 bg-white rounded-2xl shadow-sm border border-rose-200 max-w-md">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={26} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Could not render in-browser preview</h4>
                  <p className="text-xs text-slate-500 mt-1">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDownload(doc)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download size={14} /> Download & Open Locally
                </button>
              </div>
            ) : isDocx ? (
              /* WORD DOCUMENT (.DOCX) READER */
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="transition-transform duration-150 w-full max-w-4xl"
              >
                {/* docx-preview mount container */}
                <div
                  ref={docxContainerRef}
                  className="docx-viewer bg-white shadow-xl rounded-sm p-6 sm:p-12 min-h-[800px] border border-slate-300 text-slate-900 leading-relaxed font-sans"
                />

                {/* Mammoth HTML fallback container */}
                {htmlContent && (
                  <div
                    className="prose prose-slate max-w-none bg-white shadow-xl rounded-sm p-8 sm:p-14 min-h-[800px] border border-slate-300 text-slate-800 leading-relaxed font-sans"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                )}
              </div>
            ) : isPdf ? (
              /* PDF DOCUMENT READER */
              <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-md overflow-hidden border border-slate-300">
                <iframe
                  src={pdfBlobUrl}
                  title={doc.title}
                  className="w-full h-full flex-1 border-0"
                />
              </div>
            ) : isExcel && sheetData ? (
              /* EXCEL SPREADSHEET READER */
              <div className="w-full h-full flex flex-col bg-white rounded-lg shadow-md border border-slate-300 overflow-hidden">
                {/* Sheet Tabs */}
                <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto">
                  {sheetData.sheets.map((s, idx) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSheetChange(idx)}
                      className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap cursor-pointer ${
                        activeSheetIndex === idx
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Table Data */}
                <div className="flex-1 overflow-auto p-2">
                  <table className="min-w-full text-xs border-collapse">
                    <tbody>
                      {sheetData.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={rIdx === 0 ? 'bg-slate-100 font-bold border-b border-slate-300' : 'hover:bg-slate-50 border-b border-slate-200'}
                        >
                          <td className="px-2 py-1 text-slate-400 font-mono text-[10px] text-center border-r border-slate-200 w-8 select-none">
                            {rIdx + 1}
                          </td>
                          {Array.isArray(row) && row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-1.5 border-r border-slate-200 whitespace-nowrap">
                              {cell !== undefined && cell !== null ? String(cell) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : isImage ? (
              /* IMAGE VIEWER */
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                className="my-auto flex items-center justify-center p-4 transition-transform duration-150"
              >
                <img
                  src={doc.fileData || doc.fileUrl}
                  alt={doc.title}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-xl border border-slate-300 bg-white"
                />
              </div>
            ) : (
              /* GENERIC FILE FALLBACK */
              <div className="my-auto text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-200 max-w-sm space-y-3">
                <File size={40} className="text-slate-400 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900">{doc.fileName}</h4>
                <p className="text-xs text-slate-500">
                  This file format ({ext}) is stored safely. Click below to download and read it.
                </p>
                <button
                  type="button"
                  onClick={() => onDownload(doc)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download size={14} /> Download File
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Metadata Drawer */}
          {showMetadata && (
            <div className="w-80 bg-white border-l border-slate-300 p-5 space-y-4 overflow-y-auto animate-in slide-in-from-right duration-200 flex-shrink-0 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={14} className="text-indigo-600" />
                  <span>Document Details</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowMetadata(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Document Title</span>
                  <p className="font-bold text-slate-900 mt-0.5">{doc.title || doc.fileName}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Document Type</span>
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {doc.docType || 'Document'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Project Name</span>
                  <p className="font-medium text-slate-900 mt-0.5">{doc.projectName || 'Not specified'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Agreement Number</span>
                  <p className="font-mono font-medium text-slate-900 mt-0.5">{doc.agreementNo || '-'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Letter / Reference No</span>
                  <p className="font-mono text-slate-900 mt-0.5">{doc.refNo || '-'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Recipient / Authority</span>
                  <p className="text-slate-900 mt-0.5">{doc.recipient || '-'}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Document Date</span>
                  <p className="font-medium text-slate-900 mt-0.5">{formatDate(doc.date)}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">File Information</span>
                  <p className="font-mono text-slate-600 mt-0.5">{doc.fileName} ({doc.fileSize || 'N/A'})</p>
                </div>

                {doc.remarks && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Remarks</span>
                    <p className="text-slate-600 italic mt-0.5">{doc.remarks}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(doc);
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Edit Metadata</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
