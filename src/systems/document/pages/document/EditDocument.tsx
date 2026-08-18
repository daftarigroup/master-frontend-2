import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, Upload } from 'lucide-react';
import SearchableInput from '../../components/SearchableInput';
import { documentsApi } from '../../services/document.api';
import { mastersApi } from '@/systems/petty-cash/services/pettyCash.api';
import { MacModal } from '@/components/ui/mac-modal';

const DOC_TYPE_MASTER = 'docDocumentType';
const DOC_CATEGORY_MASTER = 'docCategory';

interface EditDocumentProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string | null;
  onSaved: () => void;
}

export const EditDocument: React.FC<EditDocumentProps> = ({ isOpen, onClose, documentId, onSaved }) => {
  const [formData, setFormData] = useState<any>({});
  const [fileName, setFileName] = useState('');
  const [docTypeOptions, setDocTypeOptions] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['Personal', 'Company', 'Director']);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      mastersApi
        .list(DOC_TYPE_MASTER)
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setDocTypeOptions(list.map((r: any) => r.value));
        })
        .catch(() => {});

      mastersApi
        .list(DOC_CATEGORY_MASTER)
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          setCategoryOptions(Array.from(new Set([...list.map((r: any) => r.value), 'Personal', 'Company', 'Director'])));
        })
        .catch(() => {});

      documentsApi
        .getOne(documentId)
        .then((res: any) => {
          const doc = res?.data || res;
          setFormData({
            ...doc,
            renewalDate: doc.renewalDate ? String(doc.renewalDate).split('T')[0] : '',
          });
          setFileName(doc.file || '');
        })
        .catch((err: any) => toast.error(err.message || 'Failed to load document'));
    }
  }, [isOpen, documentId]);

  if (!isOpen || !documentId) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('file', file.name);
        handleChange('fileContent', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getNameLabel = (category?: string) => {
    const c = category?.toLowerCase() || '';
    if (c.includes('personal')) return 'Person Name';
    if (c.includes('director')) return 'Director Name';
    if (c.includes('company')) return 'Company Name';
    return 'Name';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.documentType || !formData.category || !formData.documentName) {
      toast.error('Please fill all required fields.');
      return;
    }

    if (formData.needsRenewal && !formData.renewalDate) {
      toast.error('Please select a renewal date.');
      return;
    }

    setSubmitting(true);
    try {
      if (!docTypeOptions.some((t) => t.toLowerCase() === formData.documentType?.toLowerCase())) {
        await mastersApi.create({ type: DOC_TYPE_MASTER, value: formData.documentType }).catch(() => {});
      }
      if (!categoryOptions.some((c) => c.toLowerCase() === formData.category?.toLowerCase())) {
        await mastersApi.create({ type: DOC_CATEGORY_MASTER, value: formData.category }).catch(() => {});
      }

      await documentsApi.update(documentId, {
        documentName: formData.documentName,
        companyName: formData.companyName,
        documentType: formData.documentType,
        category: formData.category,
        needsRenewal: formData.needsRenewal,
        renewalDate: formData.needsRenewal ? formData.renewalDate : null,
        file: formData.file,
        fileContent: formData.fileContent,
      });
      toast.success('Document updated successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update document');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MacModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Document Record"
      subtitle={formData.sn ? `Identifier: ${formData.sn}` : 'Update compliance details & attachment'}
      maxWidth="2xl"
      bodyClassName="max-h-[72vh] overflow-y-auto p-6"
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
            form="edit-doc-form"
            disabled={submitting}
            className="flex-[2] flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Save size={14} /> {submitting ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id="edit-doc-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-muted/20 p-4 rounded-xl border border-border/70 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">
                Document Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                value={formData.documentName || ''}
                onChange={(e) => handleChange('documentName', e.target.value)}
              />
            </div>

            <div>
              <SearchableInput
                compact
                label="Document Type"
                value={formData.documentType || ''}
                onChange={(val) => handleChange('documentType', val)}
                options={docTypeOptions}
                placeholder="Select Type..."
                required
              />
            </div>

            <div>
              <SearchableInput
                compact
                label="Category"
                value={formData.category || ''}
                onChange={(val) => handleChange('category', val)}
                options={categoryOptions}
                placeholder="Select Category..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">
                {getNameLabel(formData.category)} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                value={formData.companyName || ''}
                onChange={(e) => handleChange('companyName', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2.5 bg-muted/40 p-2.5 rounded-xl border border-border/60">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary rounded border-input"
                  checked={formData.needsRenewal || false}
                  onChange={(e) => handleChange('needsRenewal', e.target.checked)}
                />
                <span className="text-xs font-medium text-foreground">Needs Renewal</span>
              </label>
              {formData.needsRenewal && (
                <div className="flex-1">
                  <input
                    type="date"
                    className="w-full p-1.5 text-xs border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/30 outline-none"
                    value={formData.renewalDate || ''}
                    onChange={(e) => handleChange('renewalDate', e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1">Upload File</label>
              <input type="file" id="edit-file-upload" className="hidden" onChange={handleFileChange} />
              <label
                htmlFor="edit-file-upload"
                className="flex items-center justify-center gap-1.5 w-full p-2.5 border border-dashed border-input rounded-xl text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground transition bg-background"
              >
                <Upload size={13} />
                <span className="text-xs truncate max-w-[180px]">{fileName || 'Change Attachment'}</span>
              </label>
            </div>
          </div>
        </div>
      </form>
    </MacModal>
  );
};

export default EditDocument;
