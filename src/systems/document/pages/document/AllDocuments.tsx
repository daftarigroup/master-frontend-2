import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, FileText, Eye, Edit, Trash2, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { documentsApi } from '../../services/document.api';
import AddDocument from './AddDocument';
import EditDocument from './EditDocument';
import ShareModal from './ShareModal';
import { formatDate } from '../../utils/dateFormatter';
import { previewFileInNewTab } from '../../utils/filePreview';
import { TablePagination } from '../../components/TablePagination';

export const AllDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const loadData = () => {
    setLoading(true);
    documentsApi
      .list()
      .then((res: any) => setDocuments(Array.isArray(res) ? res : res?.data || []))
      .catch((err: any) => toast.error(err.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return documents.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (item.documentName || '').toLowerCase().includes(q) ||
        (item.companyName || '').toLowerCase().includes(q) ||
        (item.sn || '').toLowerCase().includes(q);

      const matchesCategory = filterCategory ? item.category === filterCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, filterCategory]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((d) => d.id)));
    }
  };

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareType, setShareType] = useState<'email' | 'whatsapp' | 'both' | null>(null);
  const [shareDoc, setShareDoc] = useState<{ id: string; name: string } | null>(null);

  const handleEdit = (id: string) => {
    setEditingDocId(id);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await documentsApi.remove(id);
        if (selectedIds.has(id)) {
          const newSelected = new Set(selectedIds);
          newSelected.delete(id);
          setSelectedIds(newSelected);
        }
        toast.success('Document deleted successfully');
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete document');
      }
    }
  };

  const openShare = (type: 'email' | 'whatsapp' | 'both', doc: { id: string; name: string }) => {
    setShareType(type);
    setShareDoc(doc);
    setIsShareModalOpen(true);
  };

  const handlePreview = async (item: any) => {
    try {
      if (item.fileContent) {
        previewFileInNewTab(item.fileContent, item.file);
        return;
      }
      // On-demand fetch file content for fast lightweight listing
      const toastId = toast.loading('Loading document attachment...');
      try {
        const fullDoc: any = await documentsApi.getOne(item.id);
        const data = fullDoc?.data || fullDoc;
        toast.dismiss(toastId);
        if (data?.fileContent) {
          previewFileInNewTab(data.fileContent, data.file || item.file);
        } else {
          toast.error('File attachment is not available for preview.');
        }
      } catch (e: any) {
        toast.dismiss(toastId);
        toast.error(e.message || 'Failed to load file preview.');
      }
    } catch (err: any) {
      toast.error(err.message || 'File attachment not available.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-4 rounded-lg shadow-xs border">
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                {selectedIds.size} Selected
              </span>
              <button
                onClick={() => openShare('email', { id: 'batch', name: `${selectedIds.size} Documents` })}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 rounded-md border border-blue-200 hover:bg-blue-100 transition shadow-xs"
              >
                <Mail size={13} /> Share via Email
              </button>
            </div>
          ) : (
            <div>
              <h1 className="text-sm font-bold text-foreground">Document Vault</h1>
              <p className="text-xs text-muted-foreground">Manage compliance contracts, licenses &amp; certificates</p>
            </div>
          )}
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

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary h-8"
          >
            <option value="">All Categories</option>
            {Array.from(new Set(documents.map((d) => d.category)))
              .filter(Boolean)
              .sort()
              .map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
          </select>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-1.5 px-3 rounded-md transition text-xs shadow-xs h-8"
          >
            <Plus size={14} /> Add Document
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="bg-card rounded-lg shadow-xs border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 w-8 text-center">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 text-primary rounded border-input"
                    checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-3 py-2 w-10 text-center">Share</th>
                <th className="px-3 py-2 w-16 text-center">Action</th>
                <th className="px-3 py-2 whitespace-nowrap">Serial No</th>
                <th className="px-3 py-2 whitespace-nowrap">Document Name</th>
                <th className="px-3 py-2 whitespace-nowrap">Document Type</th>
                <th className="px-3 py-2 whitespace-nowrap">Category</th>
                <th className="px-3 py-2 whitespace-nowrap">Name</th>
                <th className="px-3 py-2 whitespace-nowrap text-center">Renewal</th>
                <th className="px-3 py-2 whitespace-nowrap">Renewal Date</th>
                <th className="px-3 py-2 whitespace-nowrap">File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedData.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-accent/40 transition-colors ${
                    selectedIds.has(item.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 text-primary rounded border-input"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => openShare('email', { id: item.id, name: item.documentName })}
                      className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors inline-flex items-center justify-center"
                      title="Share via Email"
                    >
                      <Mail size={14} />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleEdit(item.id)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-foreground text-[11px]">{item.sn}</td>
                  <td className="px-3 py-2 text-foreground font-medium">
                    <div className="flex items-center gap-1.5">
                      <FileText size={14} className="text-muted-foreground" />
                      <span className="truncate max-w-[200px]" title={item.documentName}>
                        {item.documentName}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{item.documentType}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-semibold">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-bold uppercase tracking-tight text-foreground">{item.companyName}</td>
                  <td className="px-3 py-2 text-center">
                    {item.needsRenewal ? (
                      <span className="inline-flex px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[10px] font-bold">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-medium">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(item.renewalDate)}</td>
                  <td className="px-3 py-2">
                    {item.file ? (
                      <button
                        onClick={() => handlePreview(item)}
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
        {filteredData.length === 0 && (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            {loading ? 'Loading documents...' : 'No documents found matching criteria.'}
          </div>
        )}

        {/* Reusable Pagination */}
        {filteredData.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
            itemName="documents"
          />
        )}
      </div>

      <AddDocument isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSaved={loadData} />
      <EditDocument
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        documentId={editingDocId}
        onSaved={loadData}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        type={shareType}
        documentId={shareDoc?.id || ''}
        documentIds={shareDoc?.id === 'batch' ? Array.from(selectedIds) : undefined}
        documentName={shareDoc?.name || ''}
        onSaved={loadData}
      />
    </div>
  );
};

export default AllDocuments;

