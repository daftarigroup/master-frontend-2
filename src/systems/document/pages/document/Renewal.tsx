import React, { useState, useEffect } from 'react';
import { documentsApi } from '../../services/document.api';
import { Search, Check, X, Calendar, Upload, Eye, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../utils/dateFormatter';
import { openStoredFile } from '../../utils/filePreview';
import { uploadFile } from '@/lib/fetchers';
import { MacModal } from '@/components/ui/mac-modal';
import { TablePagination } from '../../components/TablePagination';

export const DocumentRenewal: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [renewalHistory, setRenewalHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal State
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // Form State
  const [againRenewal, setAgainRenewal] = useState(true);
  const [nextRenewalDate, setNextRenewalDate] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState<string>('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([documentsApi.list(), documentsApi.listRenewals()])
      .then(([docsRes, renewalsRes]: any) => {
        setDocuments(Array.isArray(docsRes) ? docsRes : docsRes?.data || []);
        setRenewalHistory(Array.isArray(renewalsRes) ? renewalsRes : renewalsRes?.data || []);
      })
      .catch((err: any) => toast.error(err.message || 'Failed to load renewal data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setPendingPage(1);
    setHistoryPage(1);
  }, [searchTerm, activeTab]);

  const pendingDocuments = documents
    .filter((doc) => {
      if (!doc.needsRenewal) return false;
      if (!doc.renewalDate) return true;
      const renDate = new Date(doc.renewalDate);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + 30);
      return renDate <= threshold;
    })
    .filter((doc) => {
      const q = searchTerm.toLowerCase();
      return (
        (doc.documentName || '').toLowerCase().includes(q) ||
        (doc.companyName || '').toLowerCase().includes(q) ||
        (doc.sn || '').toLowerCase().includes(q)
      );
    });

  const filteredHistory = renewalHistory.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      (item.documentName || '').toLowerCase().includes(q) ||
      (item.companyName || '').toLowerCase().includes(q) ||
      (item.sn || '').toLowerCase().includes(q)
    );
  });

  const totalPendingPages = Math.ceil(pendingDocuments.length / pageSize) || 1;
  const paginatedPending = pendingDocuments.slice((pendingPage - 1) * pageSize, pendingPage * pageSize);

  const totalHistoryPages = Math.ceil(filteredHistory.length / pageSize) || 1;
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * pageSize, historyPage * pageSize);

  const handleOpenRenewal = (doc: any) => {
    setSelectedDoc(doc);
    setAgainRenewal(true);
    setNextRenewalDate('');
    setNewFileName('');
    setNewFileContent('');
    setIsRenewalModalOpen(true);
  };

  const handleCloseRenewal = () => {
    setIsRenewalModalOpen(false);
    setSelectedDoc(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    setNewFileName(file.name);
    setIsUploadingFile(true);
    try {
      // Store the S3 URL rather than inlining the file's bytes as base64.
      const url = await uploadFile({ file, folderId: 'document', subFolder: 'renewals' });
      setNewFileContent(url);
    } catch (error) {
      console.error('Renewal document upload error:', error);
      setNewFileName('');
      setNewFileContent('');
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handlePreview = async (fileContent: string | undefined, fileName: string | null, docId?: string) => {
    try {
      if (fileContent) {
        openStoredFile(fileContent, fileName);
        return;
      }
      if (docId) {
        const toastId = toast.loading('Loading document attachment...');
        try {
          const fullDoc: any = await documentsApi.getOne(docId);
          const data = fullDoc?.data || fullDoc;
          toast.dismiss(toastId);
          if (data?.fileContent) {
            openStoredFile(data.fileContent, data.file || fileName);
          } else {
            toast.error('File attachment is not available for preview.');
          }
        } catch (e: any) {
          toast.dismiss(toastId);
          toast.error(e.message || 'Failed to load file preview.');
        }
        return;
      }
      openStoredFile(fileContent, fileName);
    } catch (err: any) {
      toast.error(err.message || 'File attachment not available.');
    }
  };

  const handleSaveRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;

    if (againRenewal && !nextRenewalDate) {
      toast.error('Please select Next Renewal Date');
      return;
    }

    setSubmitting(true);
    try {
      await documentsApi.recordRenewal(selectedDoc.id, {
        renewalStatus: againRenewal ? 'Yes' : 'No',
        nextRenewalDate: againRenewal ? nextRenewalDate : null,
        newFile: newFileName || undefined,
        newFileContent: newFileContent || undefined,
      });

      toast.success('Renewal processed successfully');
      handleCloseRenewal();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to process renewal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-lg shadow-xs border">
        <div>
          <h1 className="text-sm font-bold text-foreground">Document Renewals</h1>
          <p className="text-xs text-muted-foreground">Manage upcoming and historical document renewals</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search documents..."
              className="pl-8 pr-3 py-1.5 w-full border border-input rounded-md text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary h-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex bg-muted p-0.5 rounded-md">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                activeTab === 'pending'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending ({pendingDocuments.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                activeTab === 'history'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              History ({filteredHistory.length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow-xs border overflow-hidden">
        {activeTab === 'pending' ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-center">Action</th>
                    <th className="p-3 whitespace-nowrap">Serial No</th>
                    <th className="p-3 whitespace-nowrap">Document Name</th>
                    <th className="p-3 whitespace-nowrap">Document Type</th>
                    <th className="p-3 whitespace-nowrap">Category</th>
                    <th className="p-3 whitespace-nowrap">Name</th>
                    <th className="p-3 whitespace-nowrap">Entry Date</th>
                    <th className="p-3 whitespace-nowrap">Renewal</th>
                    <th className="p-3 whitespace-nowrap">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedPending.map((doc) => (
                    <tr key={doc.id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleOpenRenewal(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition shadow-xs"
                        >
                          <RotateCcw size={12} /> Renewal
                        </button>
                      </td>
                      <td className="p-3 font-mono text-foreground text-[11px]">{doc.sn}</td>
                      <td className="p-3 font-medium text-foreground">{doc.documentName}</td>
                      <td className="p-3 text-muted-foreground">{doc.documentType}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                          {doc.category}
                        </span>
                      </td>
                      <td className="p-3 font-bold uppercase tracking-tight text-foreground">{doc.companyName}</td>
                      <td className="p-3 text-muted-foreground whitespace-nowrap">{formatDate(doc.date)}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[10px] font-bold">
                          {doc.renewalDate ? formatDate(doc.renewalDate) : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3">
                        {doc.file ? (
                          <button
                            onClick={() => handlePreview(doc.fileContent, doc.file, doc.id)}
                            className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium hover:underline text-xs"
                            title="Preview document in new tab"
                          >
                            <Eye size={13} /> View
                          </button>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pendingDocuments.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                {loading ? 'Loading renewals...' : 'No pending renewals in the next 30 days.'}
              </div>
            )}
            {pendingDocuments.length > 0 && (
              <TablePagination
                currentPage={pendingPage}
                totalPages={totalPendingPages}
                totalItems={pendingDocuments.length}
                pageSize={pageSize}
                onPageChange={setPendingPage}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setPendingPage(1);
                }}
                itemName="pending renewals"
              />
            )}
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="p-3 whitespace-nowrap">Serial No</th>
                    <th className="p-3 whitespace-nowrap">Document Name</th>
                    <th className="p-3 whitespace-nowrap">Document Type</th>
                    <th className="p-3 whitespace-nowrap">Category</th>
                    <th className="p-3 whitespace-nowrap">Name</th>
                    <th className="p-3 whitespace-nowrap">Old Renewal</th>
                    <th className="p-3 whitespace-nowrap text-center">Status</th>
                    <th className="p-3 whitespace-nowrap">Next Renewal</th>
                    <th className="p-3 whitespace-nowrap">New File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/40 transition-colors">
                      <td className="p-3 font-mono text-foreground text-[11px]">{item.sn}</td>
                      <td className="p-3 font-medium text-foreground">{item.documentName}</td>
                      <td className="p-3 text-muted-foreground">{item.documentType}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-3 font-bold uppercase tracking-tight text-foreground">{item.companyName}</td>
                      <td className="p-3 text-muted-foreground line-through whitespace-nowrap">
                        {formatDate(item.oldRenewalDate)}
                      </td>
                      <td className="p-3 text-center">
                        {item.renewalStatus === 'Yes' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Check size={10} /> Renewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-medium">
                            <X size={10} /> Expired
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-primary whitespace-nowrap">
                        {formatDate(item.nextRenewalDate)}
                      </td>
                      <td className="p-3">
                        {item.newFile ? (
                          <button
                            onClick={() => handlePreview(item.newFileContent, item.newFile, item.documentId)}
                            className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium hover:underline text-xs"
                            title="Preview document in new tab"
                          >
                            <Eye size={13} /> View
                          </button>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredHistory.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground italic">
                {loading ? 'Loading history...' : 'No renewal history records found.'}
              </div>
            )}
            {filteredHistory.length > 0 && (
              <TablePagination
                currentPage={historyPage}
                totalPages={totalHistoryPages}
                totalItems={filteredHistory.length}
                pageSize={pageSize}
                onPageChange={setHistoryPage}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setHistoryPage(1);
                }}
                itemName="renewal logs"
              />
            )}
          </div>
        )}
      </div>

      {/* Renewal Modal */}
      <MacModal
        isOpen={isRenewalModalOpen && Boolean(selectedDoc)}
        onClose={handleCloseRenewal}
        title="Process Document Renewal"
        subtitle="Extend lifecycle and attach revised agreement"
        maxWidth="md"
        bodyClassName="p-6 space-y-4"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={handleCloseRenewal}
              className="flex-1 py-2 px-4 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="renewal-doc-form"
              disabled={submitting}
              className="flex-1 py-2 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Save Renewal'}
            </button>
          </div>
        }
      >
        {selectedDoc && (
          <form id="renewal-doc-form" onSubmit={handleSaveRenewal} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60">
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Document</label>
                <div className="font-semibold text-foreground text-xs mt-0.5">{selectedDoc.documentName}</div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Serial No</label>
                <div className="font-mono text-foreground mt-0.5">{selectedDoc.sn}</div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Name</label>
                <div className="text-foreground mt-0.5">{selectedDoc.companyName}</div>
              </div>
            </div>

            <div className="space-y-3.5">
              <div
                className="flex items-center justify-between p-3 border border-border/60 rounded-xl cursor-pointer bg-card hover:bg-accent/40 transition-colors"
                onClick={() => setAgainRenewal(!againRenewal)}
              >
                <div>
                  <span className="font-semibold text-xs text-foreground block">Renew Next Period?</span>
                  <span className="text-[10px] text-muted-foreground">Keep tracking future expiry date</span>
                </div>
                <div
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                    againRenewal ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-xs transform transition-transform ${
                      againRenewal ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              {againRenewal && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">Next Renewal Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <input
                        type="date"
                        required
                        className="w-full pl-9 p-2.5 border border-input rounded-xl text-xs bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                        value={nextRenewalDate}
                        onChange={(e) => setNextRenewalDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">New Document File</label>
                    <input type="file" id="renewal-file" className="hidden" onChange={handleFileChange} />
                    <label
                      htmlFor="renewal-file"
                      className="flex items-center justify-center gap-2 w-full p-2.5 border border-dashed border-input rounded-xl text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground transition bg-background"
                    >
                      <Upload size={14} />
                      <span className="text-xs truncate max-w-[180px]">{newFileName || 'Upload New Document Version'}</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </MacModal>
    </div>
  );
};

export default DocumentRenewal;
