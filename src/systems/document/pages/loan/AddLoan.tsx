import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Upload } from 'lucide-react';
import { loansApi } from '../../services/document.api';
import { MacModal } from '@/components/ui/mac-modal';
import { uploadFile } from '@/lib/fetchers';

interface AddLoanProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const AddLoan: React.FC<AddLoanProps> = ({ isOpen, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    loanName: '',
    bankName: '',
    amount: '',
    emi: '',
    startDate: '',
    endDate: '',
    providedDocument: '',
    remarks: '',
    file: null as string | null,
    fileContent: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;

    setFormData((prev) => ({ ...prev, file: file.name }));
    setIsUploadingFile(true);
    try {
      // Store the S3 URL rather than inlining the file's bytes as base64.
      const url = await uploadFile({ file, folderId: 'document', subFolder: 'loans' });
      setFormData((prev) => ({ ...prev, fileContent: url }));
    } catch (error) {
      console.error('Loan document upload error:', error);
      setFormData((prev) => ({ ...prev, file: '', fileContent: '' }));
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.loanName || !formData.bankName || !formData.amount || !formData.emi) {
      toast.error('Please fill required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await loansApi.create({
        ...formData,
      });
      toast.success('Loan record added successfully');
      setFormData({
        loanName: '',
        bankName: '',
        amount: '',
        emi: '',
        startDate: '',
        endDate: '',
        providedDocument: '',
        remarks: '',
        file: null,
        fileContent: '',
      });
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error adding loan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MacModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Bank Loan"
      subtitle="Register facility, collateral documents & EMI details"
      maxWidth="lg"
      bodyClassName="p-6 space-y-3.5 overflow-y-auto"
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
            form="add-loan-form"
            disabled={submitting || isUploadingFile}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Save size={14} /> {submitting ? 'Saving...' : isUploadingFile ? 'Uploading File...' : 'Save Loan Record'}
          </button>
        </div>
      }
    >
      <form id="add-loan-form" onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Loan Facility Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.loanName}
              onChange={(e) => setFormData({ ...formData, loanName: e.target.value })}
              placeholder="e.g. Working Capital Term Loan"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Bank / Financial Inst. <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="e.g. HDFC Bank, SBI"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Sanctioned Amount <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="e.g. ₹50,00,000"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">
              Monthly EMI / Repayment <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.emi}
              onChange={(e) => setFormData({ ...formData, emi: e.target.value })}
              placeholder="e.g. ₹85,000"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">Loan Start Date</label>
            <input
              type="date"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">Loan End Date</label>
            <input
              type="date"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">Provided Collateral Document</label>
            <input
              type="text"
              required
              className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
              value={formData.providedDocument}
              onChange={(e) => setFormData({ ...formData, providedDocument: e.target.value })}
              placeholder="e.g. Factory Property Deed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground/80 mb-1">Upload Sanction / Agreement</label>
            <input type="file" id="loan-file" className="hidden" onChange={handleFileChange} />
            <label
              htmlFor="loan-file"
              className="flex items-center justify-center gap-1.5 w-full p-2.5 border border-dashed border-input rounded-xl text-muted-foreground cursor-pointer hover:bg-accent hover:text-foreground transition bg-background"
            >
              <Upload size={13} />
              <span className="text-xs truncate max-w-[140px]">{formData.file || 'Choose Document'}</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground/80 mb-1">Remarks</label>
          <input
            type="text"
            className="w-full p-2.5 text-xs border border-input rounded-xl bg-background focus:ring-2 focus:ring-primary/30 outline-none"
            value={formData.remarks}
            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            placeholder="Optional remarks, sanction ref..."
          />
        </div>
      </form>
    </MacModal>
  );
};

export default AddLoan;
