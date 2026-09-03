import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, Plus, Upload, Trash2 } from 'lucide-react';
import SearchableInput from '../../components/SearchableInput';
import { documentsApi } from '../../services/document.api';
import { mastersApi } from '@/systems/petty-cash/services/pettyCash.api';
import { MacModal } from '@/components/ui/mac-modal';
import { uploadFile } from '@/lib/fetchers';

const DOC_TYPE_MASTER = 'docDocumentType';
const DOC_CATEGORY_MASTER = 'docCategory';

interface DocumentEntry {
  id: string;
  documentName: string;
  documentType: string;
  category: string;
  companyName: string;
  needsRenewal: boolean;
  renewalDate?: string;
  file: File | null;
  fileName: string;
  fileContent?: string;
  uploading?: boolean;
}

interface AddDocumentProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const emptyEntry = (): DocumentEntry => ({
  id: Math.random().toString(),
  documentName: '',
  documentType: '',
  category: '',
  companyName: '',
  needsRenewal: false,
  renewalDate: '',
  file: null,
  fileName: '',
});

export const AddDocument: React.FC<AddDocumentProps> = ({ isOpen, onClose, onSaved }) => {
  const defaultCategories = ['Personal', 'Company', 'Director'];

  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(defaultCategories);
  const [entries, setEntries] = useState<DocumentEntry[]>([emptyEntry()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      mastersApi
        .list(DOC_TYPE_MASTER)
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setTypeOptions(list.map((r: any) => r.value));
        })
        .catch(() => {});

      mastersApi
        .list(DOC_CATEGORY_MASTER)
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setCategoryOptions(Array.from(new Set([...list.map((r: any) => r.value), ...defaultCategories])));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (id: string, field: keyof DocumentEntry, value: any) => {
    setEntries((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleFileChange = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    const patch = (changes: Record<string, unknown>) =>
      setEntries((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));

    patch({ file, fileName: file.name, uploading: true });
    try {
      // Store the S3 URL on the record instead of inlining the file's bytes
      // as base64 in the database column.
      const url = await uploadFile({ file, folderId: 'document', subFolder: 'documents' });
      patch({ fileContent: url, uploading: false });
    } catch (error) {
      console.error('Document upload error:', error);
      patch({ file: null, fileName: '', fileContent: '', uploading: false });
      toast.error('Failed to upload document. Please try again.');
    }
  };

  const addEntry = () => {
    if (entries.length >= 10) {
      toast.error('You can add maximum 10 documents at a time.');
      return;
    }
    setEntries((prev) => [...prev, emptyEntry()]);
  };

  const removeEntry = (id: string) => {
    if (entries.length === 1) {
      toast.error('At least one document is required.');
      return;
    }
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const getNameLabel = (category: string) => {
    const c = category?.toLowerCase() || '';
    if (c.includes('personal')) return 'Person Name';
    if (c.includes('director')) return 'Director Name';
    if (c.includes('company')) return 'Company Name';
    return 'Name';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const entry of entries) {
      if (!entry.documentName || !entry.documentType || !entry.category || !entry.companyName) {
        toast.error('Please fill all required fields.');
        return;
      }
      if (entry.needsRenewal && !entry.renewalDate) {
        toast.error('Please select a renewal date.');
        return;
      }
    }

    setSubmitting(true);
    try {
      for (const entry of entries) {
        if (!typeOptions.some((t) => t.toLowerCase() === entry.documentType.toLowerCase())) {
          await mastersApi.create({ type: DOC_TYPE_MASTER, value: entry.documentType }).catch(() => {});
        }
        if (!categoryOptions.some((c) => c.toLowerCase() === entry.category.toLowerCase())) {
          await mastersApi.create({ type: DOC_CATEGORY_MASTER, value: entry.category }).catch(() => {});
        }

        await documentsApi.create({
          documentName: entry.documentName,
          companyName: entry.companyName,
          documentType: entry.documentType,
          category: entry.category,
          needsRenewal: entry.needsRenewal,
          renewalDate: entry.needsRenewal ? entry.renewalDate : undefined,
          file: entry.fileName || undefined,
          fileContent: entry.fileContent,
          date: new Date().toISOString().split('T')[0],
        });
      }

      toast.success(`${entries.length} Document(s) added successfully`);
      onSaved();
      onClose();
      setEntries([emptyEntry()]);
    } catch (err: any) {
      toast.error(err.message || 'Error adding document(s)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MacModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Document Entry"
      subtitle="Register documents into the compliance vault (Max 10)"
      maxWidth="3xl"
      bodyClassName="max-h-[72vh] overflow-y-auto space-y-3.5 p-6"
      footer={
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-xl border border-input text-foreground text-xs font-semibold hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-doc-form"
            disabled={submitting}
            className="flex-[2] flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Save size={14} /> {submitting ? 'Saving Records...' : 'Save Documents'}
          </button>
        </div>
      }
    >
      <form id="add-doc-form" onSubmit={handleSubmit} className="space-y-3.5">
        {entries.map((entry, index) => (
          <div key={entry.id} className="bg-muted/20 border border-border/70 rounded-xl p-4 space-y-3 relative shadow-xs">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Document #{index + 1}
              </h3>
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="text-destructive hover:text-destructive/80 p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">
                  Document Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={entry.documentName}
                  onChange={(e) => handleChange(entry.id, 'documentName', e.target.value)}
                  placeholder="e.g. GST Registration Certificate"
                />
              </div>

              <div>
                <SearchableInput
                  compact
                  label="Document Type"
                  value={entry.documentType}
                  onChange={(val) => handleChange(entry.id, 'documentType', val)}
                  options={typeOptions}
                  placeholder="Select Type..."
                  required
                />
              </div>

              <div>
                <SearchableInput
                  compact
                  label="Category"
                  value={entry.category}
                  onChange={(val) => handleChange(entry.id, 'category', val)}
                  options={categoryOptions}
                  placeholder="Select Category..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">
                  {getNameLabel(entry.category)} <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                  value={entry.companyName}
                  onChange={(e) => handleChange(entry.id, 'companyName', e.target.value)}
                  placeholder={`Enter ${getNameLabel(entry.category)}...`}
                />
              </div>

              <div className="flex items-center gap-2.5 bg-muted/40 p-2.5 rounded-xl border border-border/60">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-primary rounded border-input"
                    checked={entry.needsRenewal}
                    onChange={(e) => handleChange(entry.id, 'needsRenewal', e.target.checked)}
                  />
                  <span className="text-xs font-medium text-foreground">Needs Renewal</span>
                </label>

                {entry.needsRenewal && (
                  <div className="flex-1">
                    <input
                      type="date"
                      className="w-full p-1.5 text-xs border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                      value={entry.renewalDate || ''}
                      onChange={(e) => handleChange(entry.id, 'renewalDate', e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">Upload Document File</label>
                <input
                  type="file"
                  id={`file-${entry.id}`}
                  className="hidden"
                  onChange={(e) => handleFileChange(entry.id, e)}
                />
                <label
                  htmlFor={`file-${entry.id}`}
                  className="flex items-center justify-center gap-1.5 w-full p-2.5 border border-dashed border-input rounded-xl text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground transition bg-background"
                >
                  <Upload size={13} />
                  <span className="text-xs truncate max-w-[180px]">
                    {entry.fileName || 'Choose Attachment'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/10 transition bg-background shadow-2xs"
          >
            <Plus size={14} /> Add Another Document ({entries.length}/10)
          </button>
        </div>
      </form>
    </MacModal>
  );
};

export default AddDocument;
