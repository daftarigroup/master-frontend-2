// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  User, Phone, Mail, MapPinned, MapPin, Calendar,
  FileText, Building2, ClipboardList, Droplet, Hash, IndianRupee, CalendarRange, Wrench,
  Landmark, GitBranch, FolderTree, UploadCloud, Check, Percent, Sparkles
} from 'lucide-react';
import { updateProject, deleteProject } from '@/systems/pms/services/pmsApiClient';
import { amountInWords, calculateQuotedAmount, fileToBase64, compressImageToBase64, calculateDuration } from '@/systems/pms/utils/helpers';
import ModalForm from '@/systems/pms/components/ModalForm';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';
import { PROJECT_TYPES } from '@/systems/pms/utils/projectConstants';

/**
 * Edit_Add_Project
 * Pop-up modal that pre-fills all project fields for editing.
 *
 * Props:
 *   isOpen    – boolean
 *   onClose   – fn()
 *   project   – the project object to edit
 *   onUpdated – fn() called after a successful save so parent can refresh
 */
export default function Edit_Add_Project({ isOpen, onClose, project, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    projectType: '',
    projectName: '',
    agreementNumber: '',
    department: '',
    division: '',
    subDivision: '',
    irrigationCapacity: '',
    projectLocation: '',
    village: '',
    district: '',
    state: '',
    contractorName: '',
    contractorPhone: '',
    contractorEmail: '',
    contractorAddress: '',
    startDate: '',
    plannedEndDate: '',
    workOrder: '',
    workOrderDate: '',
    workOrderDocument: '',
    workOrderDocumentName: '',
    tenderId: '',
    tenderAmount: '',
    percentage: '',
    workPeriod: '',
    maintenancePeriod: '',
    projectDescription: ''
  });

  // Populate form whenever the modal opens with a new project
  useEffect(() => {
    if (project) {
      setFormData({
        projectType: project.projectType || '',
        projectName: project.projectName || '',
        agreementNumber: project.agreementNumber || '',
        department: project.department || '',
        division: project.division || '',
        subDivision: project.subDivision || '',
        irrigationCapacity: project.irrigationCapacity || '',
        projectLocation: project.projectLocation || '',
        village: project.village || '',
        district: project.district || '',
        state: project.state || '',
        contractorName: project.contractorName || '',
        contractorPhone: project.contractorPhone || '',
        contractorEmail: project.contractorEmail || '',
        contractorAddress: project.contractorAddress || '',
        startDate: project.startDate || '',
        plannedEndDate: project.plannedEndDate || '',
        workOrder: project.workOrder || '',
        workOrderDate: project.workOrderDate || '',
        workOrderDocument: project.workOrderDocument || '',
        workOrderDocumentName: project.workOrderDocumentName || '',
        tenderId: project.tenderId || '',
        tenderAmount: project.tenderAmount || '',
        percentage: project.percentage ?? '',
        workPeriod: project.workPeriod || '',
        maintenancePeriod: project.maintenancePeriod || '',
        projectDescription: project.projectDescription || ''
      });
    }
  }, [project]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'startDate' || field === 'plannedEndDate') {
        const autoDuration = calculateDuration(next.startDate, next.plannedEndDate);
        if (autoDuration) {
          next.workPeriod = autoDuration;
        }
      }
      return next;
    });
  };

  const handleWorkOrderDocument = async (e) => {
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
        // Images are resized/re-encoded down to ~2MB so large phone photos don't bloat storage
        const { base64, size } = await compressImageToBase64(file, { maxBytes: MAX_STORED });
        setFormData(prev => ({ ...prev, workOrderDocument: base64, workOrderDocumentName: file.name }));
        toast.success(
          size <= MAX_STORED
            ? `Attached (compressed to ${(size / 1024 / 1024).toFixed(2)}MB)`
            : `Attached (${(size / 1024 / 1024).toFixed(2)}MB - could not compress further)`
        );
      } else {
        // PDFs can't be compressed client-side, so they must already be under the stored limit
        if (file.size > MAX_STORED) {
          toast.error('PDF files cannot be auto-compressed - please upload a PDF under 2MB, or use an image instead');
          return;
        }
        const base64 = await fileToBase64(file);
        setFormData(prev => ({ ...prev, workOrderDocument: base64, workOrderDocumentName: file.name }));
        toast.success('Work Order document attached');
      }
    } catch (error) {
      toast.error('Error reading file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.projectType) { toast.error('Project Type is required'); return; }
    if (!formData.projectName.trim()) { toast.error('Project Name is required'); return; }
    if (!formData.contractorName.trim()) { toast.error('Contractor Name is required'); return; }
    if (!formData.contractorPhone.trim()) { toast.error('Contractor Phone No is required'); return; }
    if (formData.contractorPhone.length !== 10) { toast.error('Contractor Phone No must be exactly 10 digits'); return; }
    if (!formData.contractorEmail.trim()) { toast.error('Contractor Gmail is required'); return; }
    if (!formData.contractorAddress.trim()) { toast.error('Contractor Address is required'); return; }
    if (!formData.startDate) { toast.error('Start Date is required'); return; }
    if (!formData.plannedEndDate) { toast.error('Planned End Date is required'); return; }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        tenderAmountWords: amountInWords(formData.tenderAmount),
        quotedAmount: calculateQuotedAmount(formData.tenderAmount, formData.percentage),
        quotedAmountWords: amountInWords(calculateQuotedAmount(formData.tenderAmount, formData.percentage)),
      };

      const projectId = project.id || project.serialNo || project.serial_no;
      const res = await updateProject(projectId, payload);
      const serialNo = res?.serialNo || res?.serial_no || project.serialNo || project.serial_no;

      toast.success(`Project ${serialNo} updated successfully`);
      onUpdated?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Project — ${project.serialNo}`}
      onSubmit={handleSubmit}
      submitText={loading ? 'Saving...' : 'Update'}
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-2 gap-2 md:gap-4">

        <div className="col-span-2 flex items-center justify-between pb-1 border-b border-gray-100">
          <p className="text-[10px] md:text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Project Info</p>
         </div>

        {/* Project Type */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Project Type *</label>
          <SearchableDropdown
            options={PROJECT_TYPES.map(v => ({ value: v, label: v }))}
            value={formData.projectType}
            onChange={(val) => handleChange('projectType', val)}
            placeholder="Select project type"
            height="h-[34px] md:h-[38px]"
          />
        </div>

        {/* Project Name */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Project Name *</label>
          <div className="relative">
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => handleChange('projectName', e.target.value)}
              placeholder="Enter project name"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Agreement Number */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Agreement Number</label>
          <div className="relative">
            <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.agreementNumber}
              onChange={(e) => handleChange('agreementNumber', e.target.value)}
              placeholder="Enter agreement number"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Department */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Department</label>
          <div className="relative">
            <Landmark className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="Enter department"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Division */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Division</label>
          <div className="relative">
            <GitBranch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.division}
              onChange={(e) => handleChange('division', e.target.value)}
              placeholder="Enter division"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Sub-Division */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Sub-Division</label>
          <div className="relative">
            <FolderTree className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.subDivision}
              onChange={(e) => handleChange('subDivision', e.target.value)}
              placeholder="Enter sub-division"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Irrigation Capacity */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Irrigation Capacity</label>
          <div className="relative">
            <Droplet className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.irrigationCapacity}
              onChange={(e) => handleChange('irrigationCapacity', e.target.value)}
              placeholder="e.g. 500 Hectares"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Location Section */}
        <div className="col-span-2 pt-1">
          <p className="text-[10px] md:text-[11px] font-bold text-indigo-500 uppercase tracking-widest border-t border-gray-100 pt-2">Location</p>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Project Location</label>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.projectLocation}
              onChange={(e) => handleChange('projectLocation', e.target.value)}
              placeholder="Enter project location"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Village</label>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.village}
              onChange={(e) => handleChange('village', e.target.value)}
              placeholder="Enter village"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">District</label>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.district}
              onChange={(e) => handleChange('district', e.target.value)}
              placeholder="Enter district"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">State</label>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder="Enter state"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Contractor Details */}
        <div className="col-span-2 pt-1">
          <p className="text-[10px] md:text-[11px] font-bold text-indigo-500 uppercase tracking-widest border-t border-gray-100 pt-2">Contractor Details</p>
        </div>

        {/* Contractor Name */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Contractor Name *</label>
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.contractorName}
              onChange={(e) => handleChange('contractorName', e.target.value)}
              placeholder="Enter contractor name"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Contractor Phone */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Contractor Phone No *</label>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={formData.contractorPhone}
              onChange={(e) => handleChange('contractorPhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Enter 10-digit phone number"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Contractor Gmail */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Contractor Gmail *</label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="email"
              value={formData.contractorEmail}
              onChange={(e) => handleChange('contractorEmail', e.target.value)}
              placeholder="Enter email address"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Contractor Address */}
        <div className="space-y-1 col-span-2">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Contractor Address *</label>
          <div className="relative">
            <MapPinned className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
            <textarea
              value={formData.contractorAddress}
              onChange={(e) => handleChange('contractorAddress', e.target.value)}
              placeholder="Enter contractor address"
              rows={2}
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] resize-none"
            />
          </div>
        </div>

        {/* Documents */}
        <div className="col-span-2 pt-1">
          <p className="text-[10px] md:text-[11px] font-bold text-indigo-500 uppercase tracking-widest border-t border-gray-100 pt-2">Documents</p>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Work Order Number</label>
          <div className="relative">
            <ClipboardList className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.workOrder}
              onChange={(e) => handleChange('workOrder', e.target.value)}
              placeholder="Enter work order number"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Work Order Date</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            <input
              type="date"
              value={formData.workOrderDate}
              onChange={(e) => handleChange('workOrderDate', e.target.value)}
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Upload Work Order Document</label>
          <label className="cursor-pointer block">
            <div className={`flex items-center justify-center gap-2 border border-dashed rounded h-[34px] md:h-[38px] transition-all
              ${formData.workOrderDocumentName ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'}
            `}>
              {formData.workOrderDocumentName ? <Check size={14} /> : <UploadCloud size={14} />}
              <span className="text-[13px] md:text-[15px] truncate max-w-[80%]">
                {formData.workOrderDocumentName || 'Click to browse (Image up to 50MB, auto-compressed to 2MB / PDF up to 2MB)'}
              </span>
            </div>
            <input
              type="file"
              onChange={handleWorkOrderDocument}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </label>
        </div>

        {/* Tender & Financials */}
        <div className="col-span-2 pt-1">
          <p className="text-[10px] md:text-[11px] font-bold text-indigo-500 uppercase tracking-widest border-t border-gray-100 pt-2">Tender &amp; Financials</p>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Tender ID</label>
          <div className="relative">
            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.tenderId}
              onChange={(e) => handleChange('tenderId', e.target.value)}
              placeholder="Enter tender ID"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Tender Amount</label>
          <div className="relative">
            <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.tenderAmount}
              onChange={(e) => handleChange('tenderAmount', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="Enter tender amount"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Tender Amount In Words</label>
          <div className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-1.5 text-[10px] md:text-[12px] text-gray-500 italic min-h-[30px] md:min-h-[34px] flex items-center">
            {amountInWords(formData.tenderAmount) || 'Auto-generated from Tender Amount'}
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Percentage (%)</label>
          <div className="relative">
            <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="number"
              step="0.01"
              value={formData.percentage}
              onChange={(e) => handleChange('percentage', e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="e.g. 5 or -5"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Quoted Amount</label>
          <div className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-1.5 text-[13px] md:text-[15px] text-gray-700 font-medium min-h-[30px] md:min-h-[34px] flex items-center">
            {calculateQuotedAmount(formData.tenderAmount, formData.percentage) || 'Auto-calculated from Tender Amount + Percentage'}
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Quoted Amount In Words</label>
          <div className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-1.5 text-[10px] md:text-[12px] text-gray-500 italic min-h-[30px] md:min-h-[34px] flex items-center">
            {amountInWords(calculateQuotedAmount(formData.tenderAmount, formData.percentage)) || 'Auto-generated from Quoted Amount'}
          </div>
        </div>

        {/* Dates & Duration */}
        <div className="col-span-2 pt-1">
          <p className="text-[10px] md:text-[11px] font-bold text-indigo-500 uppercase tracking-widest border-t border-gray-100 pt-2">Dates &amp; Duration</p>
        </div>

        {/* Start Date */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Start Date *</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Planned End Date */}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Planned End Date *</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            <input
              type="date"
              value={formData.plannedEndDate}
              onChange={(e) => handleChange('plannedEndDate', e.target.value)}
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Work Period</label>
          <div className="relative">
            <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.workPeriod}
              onChange={(e) => handleChange('workPeriod', e.target.value)}
              placeholder="Auto-filled from dates - edit if needed"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Maintenance Period</label>
          <div className="relative">
            <Wrench className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={formData.maintenancePeriod}
              onChange={(e) => handleChange('maintenancePeriod', e.target.value)}
              placeholder="e.g. 24 Months"
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1 col-span-2">
          <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Project Description</label>
          <div className="relative">
            <FileText className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
            <textarea
              value={formData.projectDescription}
              onChange={(e) => handleChange('projectDescription', e.target.value)}
              placeholder="Enter project description"
              rows={3}
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] resize-none"
            />
          </div>
        </div>

      </div>
    </ModalForm>
  );
}
