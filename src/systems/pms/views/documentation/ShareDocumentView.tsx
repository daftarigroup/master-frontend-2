// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Paperclip,
  Send,
  Copy,
  ExternalLink,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Eye,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  Check,
  Building2,
  Calendar,
  Tag,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { emailApi } from '@/lib/apiClient';
import {
  getDocumentationFiles,
  updateDocumentationFile,
  addEmailLog
} from '@/systems/pms/utils/storageManager';
import {
  formatDate,
  fileToBase64,
  getTodayDate
} from '@/systems/pms/utils/helpers';
import DocumentReaderModal from '@/systems/pms/components/DocumentReaderModal';

export default function ShareDocument() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [documents, setDocuments] = useState([]);
  const [attachedDocs, setAttachedDocs] = useState([]);
  const [showAddSavedDropdown, setShowAddSavedDropdown] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [emailForm, setEmailForm] = useState({
    to: '',
    cc: '',
    subject: '',
    body: '',
    templateType: 'standard'
  });

  const attachFileInputRef = useRef(null);

  // Generate Email Template based on attached documents & template preset
  const generateEmailTemplate = (docs = [], type = 'standard') => {
    const docList = Array.isArray(docs) ? docs : [docs];
    if (docList.length === 0) return { to: '', cc: '', subject: '', body: '', templateType: type };

    const firstDoc = docList[0];
    const isMultiple = docList.length > 1;
    const recipientName = firstDoc.recipient || 'Sir / Madam';
    const projName = firstDoc.projectName || 'Pooja Construction Project';

    let subject = '';
    if (isMultiple) {
      subject = `[Pooja Construction] ${docList.length} Official Documents Submission - ${projName}`;
    } else {
      subject = `[Pooja Construction] ${firstDoc.title || firstDoc.fileName} - ${firstDoc.docType || 'Official Document'}`;
    }

    // Format list of attachments for the body
    const docsListText = docList.map((d, i) => {
      const title = d.title || d.fileName || `Document ${i + 1}`;
      const typeStr = d.docType || 'Official Record';
      const sizeStr = d.fileSize ? ` (${d.fileSize})` : '';
      const agrStr = d.agreementNo ? ` [Agr: ${d.agreementNo}]` : '';
      return `• [${i + 1}] ${title} - ${typeStr}${sizeStr}${agrStr}`;
    }).join('\n');

    let body = '';

    if (type === 'approval') {
      subject = isMultiple
        ? `[Approval Request] ${docList.length} Documents for Approval - ${projName}`
        : `[Approval Request] ${firstDoc.title || firstDoc.fileName} - ${projName}`;

      body = `Dear ${recipientName},

Please find attached the official ${isMultiple ? `${docList.length} project documents` : `document "${firstDoc.title || firstDoc.fileName}"`} submitted for your review, verification, and formal approval.

ATTACHED ${isMultiple ? 'DOCUMENTS' : 'DOCUMENT DETAILS'}:
--------------------------------------------------
${docsListText}
• Project Name   : ${projName}
• Submission Date: ${formatDate(firstDoc.date) || getTodayDate()}
--------------------------------------------------

Kindly review the attached ${isMultiple ? 'files' : 'file'} and grant your formal approval or advise if any amendments are required.

We look forward to your favorable response.

Warm regards,
Project Management Team
Pooja Construction
Phone: +91 98765 43210
Email: projects@poojaconstruction.com`;
    } else if (type === 'notice') {
      subject = isMultiple
        ? `[Official Notice / Submission] ${docList.length} Project Records - ${projName}`
        : `[Official Notice / Submission] ${firstDoc.title || firstDoc.fileName} - ${projName}`;

      body = `Dear ${recipientName},

This is an official transmission of the attached ${isMultiple ? `${docList.length} project documents` : `document "${firstDoc.title || firstDoc.fileName}"`} regarding ${projName}.

ATTACHED ${isMultiple ? 'DOCUMENTS' : 'DOCUMENT DETAILS'}:
--------------------------------------------------
${docsListText}
• Project Name   : ${projName}
• Submission Date: ${formatDate(firstDoc.date) || getTodayDate()}
--------------------------------------------------

${isMultiple ? 'These documents are' : 'This document is'} submitted for your official records and necessary executive action.

Thank you.

Sincerely,
Pooja Construction Team
Contracts & Documentation Wing
Email: contact@poojaconstruction.com`;
    } else {
      // standard default
      body = `Dear ${recipientName},

Please find attached the official project ${isMultiple ? `documents (${docList.length} files)` : `document "${firstDoc.title || firstDoc.fileName}"`} for your kind review and records.

ATTACHED ${isMultiple ? 'DOCUMENTS SUMMARY' : 'DOCUMENT SUMMARY'}:
--------------------------------------------------
${docsListText}
• Project Name  : ${projName}
• Date          : ${formatDate(firstDoc.date) || getTodayDate()}
--------------------------------------------------

Please review the attached ${isMultiple ? 'documents' : 'document'} and let us know if any further details, clarification, or signatures are required.

Thank you for your continued cooperation.

Warm regards,
Pooja Construction Team
Project Administration & Quality Control Division
Email: contact@poojaconstruction.com`;
    }

    let toEmail = '';
    for (const d of docList) {
      if (d.recipient && d.recipient.includes('@')) {
        toEmail = d.recipient;
        break;
      }
    }

    return {
      to: toEmail,
      cc: 'management@poojaconstruction.com',
      subject,
      body,
      templateType: type
    };
  };

  // Load initial document(s)
  useEffect(() => {
    const list = getDocumentationFiles();
    setDocuments(list);

    let initial = null;
    if (docId) {
      initial = list.find(d => d.id === docId);
    }
    if (!initial && location.state?.doc) {
      initial = location.state.doc;
    }
    if (!initial && list.length > 0) {
      initial = list[0];
    }

    if (initial) {
      setAttachedDocs([initial]);
      setEmailForm(generateEmailTemplate([initial], 'standard'));
    }
  }, [docId, location.state]);

  // Switch Template Preset
  const handleTemplateChange = (type) => {
    const currentList = attachedDocs.length > 0 ? attachedDocs : [];
    const template = generateEmailTemplate(currentList, type);
    setEmailForm(prev => ({
      ...prev,
      subject: template.subject,
      body: template.body,
      templateType: type
    }));
  };

  // Reset Template to default
  const handleResetTemplate = () => {
    const currentList = attachedDocs.length > 0 ? attachedDocs : [];
    const template = generateEmailTemplate(currentList, emailForm.templateType || 'standard');
    setEmailForm(prev => ({
      ...prev,
      subject: template.subject,
      body: template.body
    }));
    toast.success('Template reset to default');
  };

  // Add existing saved document to attachments
  const handleAddExistingDocToAttach = (docToAdd) => {
    if (attachedDocs.some(d => d.id === docToAdd.id)) {
      toast('Document is already attached');
      return;
    }
    const updated = [...attachedDocs, docToAdd];
    setAttachedDocs(updated);
    const newTemplate = generateEmailTemplate(updated, emailForm.templateType || 'standard');
    setEmailForm(prev => ({
      ...prev,
      subject: newTemplate.subject,
      body: newTemplate.body
    }));
    toast.success(`Attached "${docToAdd.fileName || docToAdd.title}"`);
    setShowAddSavedDropdown(false);
  };

  // Attach local files from computer
  const handleAttachLocalFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newAttachments = [];
    for (const f of files) {
      try {
        const base64 = await fileToBase64(f);
        const sizeStr = f.size > 1024 * 1024
          ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.round(f.size / 1024)} KB`;
        const ext = f.name.split('.').pop()?.toUpperCase() || 'FILE';

        const customDoc = {
          id: `attach_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          fileName: f.name,
          title: f.name,
          docType: 'Additional Attachment',
          fileSize: sizeStr,
          fileType: ext,
          fileData: base64,
          fileUrl: '',
          date: getTodayDate()
        };
        newAttachments.push(customDoc);
      } catch (err) {
        console.error(err);
      }
    }

    if (newAttachments.length > 0) {
      const updated = [...attachedDocs, ...newAttachments];
      setAttachedDocs(updated);
      const newTemplate = generateEmailTemplate(updated, emailForm.templateType || 'standard');
      setEmailForm(prev => ({
        ...prev,
        subject: newTemplate.subject,
        body: newTemplate.body
      }));
      toast.success(`Attached ${newAttachments.length} additional file(s)`);
    }
    if (attachFileInputRef.current) {
      attachFileInputRef.current.value = '';
    }
  };

  // Remove an attachment
  const handleRemoveAttachment = (docIdToRemove) => {
    if (attachedDocs.length <= 1) {
      toast.error('At least one attached document is required to send');
      return;
    }
    const updated = attachedDocs.filter(d => d.id !== docIdToRemove);
    setAttachedDocs(updated);
    const newTemplate = generateEmailTemplate(updated, emailForm.templateType || 'standard');
    setEmailForm(prev => ({
      ...prev,
      subject: newTemplate.subject,
      body: newTemplate.body
    }));
  };

  // Copy Email Draft to Clipboard
  const handleCopyEmailDraft = () => {
    const attachList = attachedDocs.map(d => d.fileName || d.title).join(', ');
    const fullText = `To: ${emailForm.to || '[Recipient]'}\nCC: ${emailForm.cc || 'N/A'}\nSubject: ${emailForm.subject}\n\nAttachments: ${attachList || 'None'}\n\n${emailForm.body}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedDraft(true);
      toast.success('Email draft copied to clipboard!');
      setTimeout(() => setCopiedDraft(false), 2500);
    }).catch(() => {
      toast.error('Failed to copy text');
    });
  };

  // Open in Mail App (mailto link)
  const handleOpenMailto = () => {
    const to = encodeURIComponent(emailForm.to || '');
    const cc = encodeURIComponent(emailForm.cc || '');
    const subject = encodeURIComponent(emailForm.subject || '');
    const body = encodeURIComponent(emailForm.body || '');
    const mailtoUrl = `mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
    toast.success('Opening in your mail client! (File attached in system)');
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

  // Send Email with Attachment(s)
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.to || !emailForm.to.trim()) {
      toast.error('Please enter a recipient email address ("To")');
      return;
    }

    if (!emailForm.subject || !emailForm.subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }

    if (attachedDocs.length === 0) {
      toast.error('Please attach at least one document to send');
      return;
    }

    setIsSendingEmail(true);

    try {
      const splitList = (v: string) => (v || '').split(/[,;\s]+/).filter(x => x.includes('@'));
      const escapeHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const attachments: { filename: string; content?: string; path?: string }[] = [];
      const linkOnly: string[] = [];
      for (const d of attachedDocs) {
        const name = d.fileName || d.title || 'document';
        if (typeof d.fileData === 'string' && d.fileData.includes('base64,')) {
          attachments.push({ filename: name, content: d.fileData.split('base64,')[1] });
        } else if (d.fileUrl && /^https?:\/\//i.test(d.fileUrl)) {
          attachments.push({ filename: name, path: d.fileUrl });
        } else {
          linkOnly.push(name);
        }
      }
      if (attachments.length === 0) {
        throw new Error('None of the selected documents has file content to attach');
      }

      const cc = splitList(emailForm.cc);
      const res: any = await emailApi.sendEmail({
        to: splitList(emailForm.to),
        ...(cc.length ? { cc } : {}),
        subject: emailForm.subject.trim(),
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(emailForm.body.trim())}</div>`,
        attachments,
      });
      if (res && res.success === false) {
        throw new Error(typeof res.error === 'string' ? res.error : res.error?.message || 'Email service rejected the request');
      }
      if (linkOnly.length) toast.warning(`Not attached (no file content): ${linkOnly.join(', ')}`);

      // Record share on all attached documents
      attachedDocs.forEach(attDoc => {
        if (attDoc.id) {
          updateDocumentationFile(attDoc.id, {
            lastSharedAt: new Date().toISOString(),
            lastSharedTo: emailForm.to.trim()
          });
        }
      });

      // Record in Email Logs
      const firstDoc = attachedDocs[0] || {};
      addEmailLog({
        projectNo: firstDoc.projectNo || '',
        projectName: firstDoc.projectName || 'Pooja Construction Project',
        agreementNo: firstDoc.agreementNo || '',
        to: emailForm.to.trim(),
        cc: emailForm.cc.trim(),
        subject: emailForm.subject.trim(),
        body: emailForm.body.trim(),
        attachedDocs: attachedDocs.map(d => ({
          title: d.title || d.fileName,
          fileName: d.fileName,
          docType: d.docType,
          fileSize: d.fileSize
        })),
        sentAt: new Date().toISOString()
      });

      setIsSendingEmail(false);
      const count = attachedDocs.length;
      toast.success(`Email with ${count} attached ${count === 1 ? 'document' : 'documents'} sent to ${emailForm.to}!`);
      navigate('/pms/documentation');
    } catch (err: any) {
      setIsSendingEmail(false);
      toast.error(`Failed to send email: ${err?.response?.data?.error || err?.message || 'unknown error'}`);
    }
  };

  // Available saved documents that can be attached
  const unattachedSavedDocs = documents.filter(
    d => !attachedDocs.some(att => att.id === d.id)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <button
            type="button"
            onClick={() => navigate('/pms/documentation')}
            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer group"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Documentation</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2.5">
            <span>Share Document via Email</span>
          </h1>
        </div>

        {/* Quick Context Pill */}
        {attachedDocs.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 flex items-center gap-3 text-xs shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              {attachedDocs.length}
            </div>
            <div>
              <p className="font-bold text-slate-800 truncate max-w-[200px]">
                {attachedDocs[0]?.title || attachedDocs[0]?.fileName}
              </p>
              <p className="text-[11px] text-slate-500">
                {attachedDocs.length === 1 ? '1 file attached' : `${attachedDocs.length} files attached`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Split View inside Form */}
      <form onSubmit={handleSendEmail}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* LEFT HALF: Presets, To/CC, Subject, Attachments, Action Buttons */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 text-xs flex flex-col justify-between">
            <div className="space-y-4">
              {/* 1. Template Presets Dropdown */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-200">
                <div>
                  <label htmlFor="template-presets" className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Template Presets:
                  </label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Switch tone or format to automatically update subject and body
                  </p>
                </div>
                <div className="relative min-w-[190px] sm:min-w-[220px]">
                  <select
                    id="template-presets"
                    value={emailForm.templateType || 'standard'}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 hover:border-indigo-400 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs transition-colors"
                  >
                    <option value="standard">Standard Submission</option>
                    <option value="approval">Approval Request</option>
                    <option value="notice">Official Notice</option>
                  </select>
                </div>
              </div>

              {/* 2. Recipient & CC Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    To: Recipient Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={emailForm.to}
                      onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                      placeholder="e.g. client@department.gov.in"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-medium transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    CC: (Optional)
                  </label>
                  <input
                    type="text"
                    value={emailForm.cc}
                    onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                    placeholder="e.g. management@poojaconstruction.com"
                    className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-medium transition-colors"
                  />
                </div>
              </div>

              {/* 3. Subject Line */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Email subject..."
                  className="w-full px-3.5 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-bold text-slate-900 transition-colors"
                />
              </div>

              {/* 4. Attached Documents Section (Multiple Attachments Supported) */}
              <div className="space-y-2.5 pt-3 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip size={14} className="text-indigo-600" />
                      <span>
                        Attached Documents ({attachedDocs.length} {attachedDocs.length === 1 ? 'File' : 'Files'})
                      </span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      <span>Ready to Send</span>
                    </span>
                  </div>

                  {/* Actions to Add More Attachments */}
                  <div className="flex items-center gap-1.5">
                    {/* Add from Saved Documents */}
                    {unattachedSavedDocs.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowAddSavedDropdown(!showAddSavedDropdown)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Plus size={12} />
                          <span>Saved Doc ({unattachedSavedDocs.length})</span>
                        </button>

                        {showAddSavedDropdown && (
                          <div className="absolute right-0 bottom-full mb-1 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-30 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95">
                            <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                              Select from saved project documents
                            </p>
                            {unattachedSavedDocs.map(savedDoc => (
                              <button
                                key={savedDoc.id}
                                type="button"
                                onClick={() => handleAddExistingDocToAttach(savedDoc)}
                                className="w-full text-left p-2 hover:bg-indigo-50 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer group"
                              >
                                <div className="truncate">
                                  <p className="font-semibold text-slate-800 group-hover:text-indigo-700 truncate text-[11px]">
                                    {savedDoc.title || savedDoc.fileName}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {savedDoc.docType} • {savedDoc.fileSize}
                                  </p>
                                </div>
                                <Plus size={14} className="text-indigo-600 flex-shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Upload from Computer */}
                    <label className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs">
                      <Plus size={12} />
                      <span>Upload File</span>
                      <input
                        ref={attachFileInputRef}
                        type="file"
                        multiple
                        onChange={handleAttachLocalFiles}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* List of Attached Documents */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                  {attachedDocs.map((attDoc, idx) => (
                    <div
                      key={attDoc.id || idx}
                      className="border border-indigo-200/90 bg-gradient-to-r from-indigo-50/60 via-slate-50 to-indigo-50/30 rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-2xs hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                          {attDoc.fileType === 'PDF' ? (
                            <FileText size={16} className="text-rose-600" />
                          ) : attDoc.fileType === 'XLSX' || attDoc.fileType === 'XLS' ? (
                            <FileSpreadsheet size={16} className="text-emerald-600" />
                          ) : (
                            <FileText size={16} className="text-indigo-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate" title={attDoc.fileName}>
                            {attDoc.fileName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 font-bold text-slate-700">
                              {attDoc.fileType || 'FILE'}
                            </span>
                            {attDoc.fileSize && <span>{attDoc.fileSize}</span>}
                            <span>•</span>
                            <span className="truncate">{attDoc.docType || 'Attachment'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownload(attDoc)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Download"
                        >
                          <Download size={12} />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(attDoc)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title="Preview"
                        >
                          <Eye size={12} />
                          <span className="hidden sm:inline">Preview</span>
                        </button>
                        {attachedDocs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(attDoc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove attachment"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Footer Actions (Left Side) */}
            <div className="pt-3.5 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyEmailDraft}
                    className="px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Copy email text and attachments info"
                  >
                    {copiedDraft ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedDraft ? 'Copied!' : 'Copy Draft'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenMailto}
                    className="px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Open in Outlook, Apple Mail, etc."
                  >
                    <ExternalLink size={14} />
                    <span>Open in Mail App</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/pms/documentation')}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Send Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT HALF: Email Message Body (Editable Template) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 text-xs flex flex-col h-full min-h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Email Message Body (Editable Template)
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You can freely edit every word of this message before sending.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 cursor-pointer transition-colors"
                title="Reset to default template"
              >
                <RotateCcw size={12} />
                <span>Reset Template</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col">
              <textarea
                value={emailForm.body}
                onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                className="w-full flex-1 min-h-[460px] p-4 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800 leading-relaxed font-sans transition-colors resize-y shadow-2xs"
                placeholder="Write your email message..."
              />
              <p className="text-[11px] text-slate-400 mt-2">
                You can freely edit every word of this message before sending.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Document Reader Modal for Previews */}
      {previewDoc && (
        <DocumentReaderModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
          onDownload={(d) => handleDownload(d)}
        />
      )}
    </div>
  );
}
