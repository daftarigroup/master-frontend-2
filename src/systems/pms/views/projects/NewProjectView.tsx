// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Sparkles,
  Save,
  Building2,
  MapPin,
  User,
  FileText,
  IndianRupee,
  Calendar,
  Phone,
  Mail,
  MapPinned,
  X,
  Search,
  Check,
  UploadCloud,
  Eye,
  Trash2,
  CalendarRange,
  Wrench,
  Loader2,
  Users
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

import { apiClient } from '@/lib/apiClient';
import { createProject } from '@/systems/pms/services/pmsApiClient';
import { PROJECT_TYPES } from '@/systems/pms/utils/projectConstants';
import {
  amountInWords,
  calculateQuotedAmount,
  fileToBase64,
  compressImageToBase64,
  calculateDuration,
} from '@/systems/pms/utils/helpers';

export default function NewProjectView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Contractor Master Picker Modal State
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [contractors, setContractors] = useState<any[]>([]);
  const [contractorSearch, setContractorSearch] = useState('');
  const [loadingContractors, setLoadingContractors] = useState(false);

  const initialFormData = {
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
    contractorName: 'Pooja Construction',
    contractorPhone: '8275149683',
    contractorEmail: 'daftarigroup@gmail.com',
    contractorAddress:
      '104, 1ST FLOOR, BEHIND DAFTARI ARCADE, DHUNIWALE CHOWK, DAFTARI BUILDING, NAGPUR ROAD, WARDHA',
    subContractors: [] as Array<{ name: string; phone: string; email: string; address: string; higher_type: string }>,
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
    projectDescription: '',
  };

  const [formData, setFormData] = useState({ ...initialFormData });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
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

  const addSubContractor = () =>
    setFormData((prev) => ({
      ...prev,
      subContractors: [
        ...prev.subContractors,
        { name: '', phone: '', email: '', address: '', higher_type: 'Sub Contractor' },
      ],
    }));

  const updateSubContractor = (idx: number, field: string, value: string) =>
    setFormData((prev) => ({
      ...prev,
      subContractors: prev.subContractors.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    }));

  const removeSubContractor = (idx: number) =>
    setFormData((prev) => ({ ...prev, subContractors: prev.subContractors.filter((_, i) => i !== idx) }));

  const handleWorkOrderDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_UPLOAD = 50 * 1024 * 1024; // 50MB
    const MAX_STORED = 2 * 1024 * 1024; // 2MB

    if (file.size > MAX_UPLOAD) {
      toast.error('File size must be less than 50MB');
      return;
    }

    try {
      if (file.type.startsWith('image/')) {
        const { base64, size } = await compressImageToBase64(file, { maxBytes: MAX_STORED });
        setFormData((prev) => ({
          ...prev,
          workOrderDocument: base64,
          workOrderDocumentName: file.name,
        }));
        toast.success(
          size <= MAX_STORED
            ? `Attached (compressed to ${(size / 1024 / 1024).toFixed(2)}MB)`
            : `Attached (${(size / 1024 / 1024).toFixed(2)}MB - could not compress further)`
        );
      } else {
        if (file.size > MAX_STORED) {
          toast.error(
            'PDF files cannot be auto-compressed - please upload a PDF under 2MB, or use an image instead'
          );
          return;
        }
        const base64 = await fileToBase64(file);
        setFormData((prev) => ({
          ...prev,
          workOrderDocument: base64,
          workOrderDocumentName: file.name,
        }));
        toast.success('Work Order document attached');
      }
    } catch {
      toast.error('Error reading file');
    }
  };

  // Fetch contractors from Master Store entity contractor_details
  const handleOpenContractorPicker = async () => {
    setShowContractorModal(true);
    if (contractors.length === 0) {
      setLoadingContractors(true);
      try {
        const res: any = await apiClient.get('/store/entity/contractor_details');
        const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        setContractors(list);
      } catch (err) {
        toast.error('Could not load contractors');
      } finally {
        setLoadingContractors(false);
      }
    }
  };

  const handleSelectContractor = (c: any) => {
    setFormData((prev) => ({
      ...prev,
      contractorName: c.contractor_name || '',
      contractorPhone: c.phone || '',
      contractorEmail: c.contractor_email || '',
      contractorAddress: c.contractor_address || '',
    }));
    setShowContractorModal(false);
    toast.success(`Selected contractor: ${c.contractor_name}`);
  };

  const filteredContractors = contractors.filter((c) => {
    if (!contractorSearch.trim()) return true;
    const q = contractorSearch.toLowerCase();
    return (
      (c.contractor_name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.contractor_email || '').toLowerCase().includes(q) ||
      (c.contractor_address || '').toLowerCase().includes(q)
    );
  });

  const calculatedQuoted = calculateQuotedAmount(formData.tenderAmount, formData.percentage);
  const tenderWords = amountInWords(formData.tenderAmount);
  const quotedWords = amountInWords(calculatedQuoted);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectType) {
      toast.error('Project Type is required');
      return;
    }
    if (!formData.projectName.trim()) {
      toast.error('Project Name is required');
      return;
    }
    if (!formData.contractorName.trim()) {
      toast.error('Contractor Name is required');
      return;
    }
    if (!formData.contractorPhone.trim()) {
      toast.error('Contractor Phone No is required');
      return;
    }
    if (formData.contractorPhone.length !== 10) {
      toast.error('Contractor Phone No must be exactly 10 digits');
      return;
    }
    if (!formData.contractorEmail.trim()) {
      toast.error('Contractor Email is required');
      return;
    }
    if (!formData.contractorAddress.trim()) {
      toast.error('Contractor Address is required');
      return;
    }
    for (const c of formData.subContractors || []) {
      if (!c.name.trim()) {
        toast.error('Sub Contractor Name is required');
        return;
      }
      if (c.phone.length !== 10) {
        toast.error('Sub Contractor Number must be exactly 10 digits');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        tenderAmountWords: tenderWords,
        quotedAmount: calculatedQuoted,
        quotedAmountWords: quotedWords,
      };

      const newProject = await createProject(payload);
      const serialNo = newProject?.serialNo || newProject?.serial_no || 'Created';

      toast.success(`Project ${serialNo} created`);
      navigate('/pms/projects');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Back Link */}
          <Link
            to="/pms/projects"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Projects</span>
          </Link>

          {/* Center: Title */}
          <h1 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-wider text-center">
            Add New Project
          </h1>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
             <Button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{loading ? 'Saving...' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-4xl mx-auto mt-6 px-4">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-8">
            {/* 1. PROJECT INFO (Emerald) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-emerald-100 pb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <Building2 size={14} /> Project Info
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project Type */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Project Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(val) => handleChange('projectType', val)}
                  >
                    <SelectTrigger className="w-full h-10 bg-white">
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project Name */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Enter project name"
                    value={formData.projectName}
                    onChange={(e) => handleChange('projectName', e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Agreement Number */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Agreement No
                  </label>
                  <Input
                    placeholder="Enter agreement number"
                    value={formData.agreementNumber}
                    onChange={(e) => handleChange('agreementNumber', e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Department
                  </label>
                  <Input
                    placeholder="e.g. Water Resources Department"
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Division */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Division
                  </label>
                  <Input
                    placeholder="Enter division"
                    value={formData.division}
                    onChange={(e) => handleChange('division', e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Sub-Division */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Sub-Division
                  </label>
                  <Input
                    placeholder="Enter sub-division"
                    value={formData.subDivision}
                    onChange={(e) => handleChange('subDivision', e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Irrigation Capacity */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Irrigation Capacity
                  </label>
                  <Input
                    placeholder="e.g. 5000 Hectares / 250 Cu.m"
                    value={formData.irrigationCapacity}
                    onChange={(e) => handleChange('irrigationCapacity', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* 2. LOCATION (Blue) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-100 pb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  <MapPin size={14} /> Location
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Project Location
                  </label>
                  <Input
                    placeholder="e.g. Wardha Site Sector 4"
                    value={formData.projectLocation}
                    onChange={(e) => handleChange('projectLocation', e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Village
                  </label>
                  <Input
                    placeholder="Enter village"
                    value={formData.village}
                    onChange={(e) => handleChange('village', e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    District
                  </label>
                  <Input
                    placeholder="Enter district"
                    value={formData.district}
                    onChange={(e) => handleChange('district', e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    State
                  </label>
                  <Input
                    placeholder="Enter state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* 3. CONTRACTOR DETAILS (Amber) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  <User size={14} /> Contractor Details
                </span>
                <button
                  type="button"
                  onClick={handleOpenContractorPicker}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                >
                  <Users size={13} /> Pick from Master
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Contractor Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Enter contractor name"
                    value={formData.contractorName}
                    onChange={(e) => handleChange('contractorName', e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Phone (10 Digits) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="10 digit phone number"
                    maxLength={10}
                    value={formData.contractorPhone}
                    onChange={(e) =>
                      handleChange('contractorPhone', e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="contractor@email.com"
                    value={formData.contractorEmail}
                    onChange={(e) => handleChange('contractorEmail', e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Enter full contractor office address"
                    value={formData.contractorAddress}
                    onChange={(e) => handleChange('contractorAddress', e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* 3b. SUB CONTRACTOR DETAILS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                  <Users size={14} /> Sub Contractor Details
                </span>
                <button
                  type="button"
                  onClick={addSubContractor}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
                >
                  + Add Sub Contractor
                </button>
              </div>

              {formData.subContractors.map((c, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50/50 relative">
                  <button
                    type="button"
                    onClick={() => removeSubContractor(idx)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    aria-label="Remove sub contractor"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter sub contractor name"
                      value={c.name}
                      onChange={(e) => updateSubContractor(idx, 'name', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                      Number <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="10-digit number"
                      maxLength={10}
                      value={c.phone}
                      onChange={(e) => updateSubContractor(idx, 'phone', e.target.value.replace(/\D/g, ''))}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">Email</label>
                    <Input
                      type="email"
                      placeholder="subcontractor@email.com"
                      value={c.email}
                      onChange={(e) => updateSubContractor(idx, 'email', e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">Address</label>
                    <Input
                      placeholder="Office address"
                      value={c.address}
                      onChange={(e) => updateSubContractor(idx, 'address', e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 4. DOCUMENTS (Purple) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-purple-100 pb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                  <FileText size={14} /> Documents
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Work Order No
                  </label>
                  <Input
                    placeholder="Enter work order number"
                    value={formData.workOrder}
                    onChange={(e) => handleChange('workOrder', e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Work Order Date
                  </label>
                  <Input
                    type="date"
                    value={formData.workOrderDate}
                    onChange={(e) => handleChange('workOrderDate', e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">
                    Upload Work Order Document
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs">
                      <UploadCloud size={16} /> Choose File
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleWorkOrderDocument}
                        className="hidden"
                      />
                    </label>

                    {formData.workOrderDocument ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200">
                        <Check size={14} />
                        <span className="truncate max-w-[200px]">
                          {formData.workOrderDocumentName || 'Document Attached'}
                        </span>
                        <a
                          href={formData.workOrderDocument}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 ml-1 font-bold underline flex items-center gap-0.5"
                        >
                          <Eye size={12} /> View
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              workOrderDocument: '',
                              workOrderDocumentName: '',
                            }))
                          }
                          className="text-red-500 hover:text-red-700 ml-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">PDF or Image (max 2MB)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/pms/projects')}
                className="text-xs uppercase tracking-wider font-semibold"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-3">
 
                <Button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{loading ? 'Saving Project...' : 'Save Project'}</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Contractor Master Picker Modal */}
      {showContractorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                  Pick Contractor from Master
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowContractorModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-gray-100 bg-white">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search contractor name, phone, email, address..."
                  value={contractorSearch}
                  onChange={(e) => setContractorSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingContractors ? (
                <div className="flex items-center justify-center py-10 gap-2 text-xs text-gray-500">
                  <Loader2 size={18} className="animate-spin text-indigo-600" />
                  <span>Loading contractors from database...</span>
                </div>
              ) : filteredContractors.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-400">
                  No contractors found in database.
                </div>
              ) : (
                filteredContractors.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    onClick={() => handleSelectContractor(c)}
                    className="p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">
                        {c.contractor_name}
                      </span>
                      {c.phone && (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Phone size={10} /> {c.phone}
                        </span>
                      )}
                    </div>
                    {c.contractor_email && (
                      <p className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Mail size={10} /> {c.contractor_email}
                      </p>
                    )}
                    {c.contractor_address && (
                      <p className="text-[11px] text-gray-600 truncate flex items-center gap-1">
                        <MapPinned size={10} /> {c.contractor_address}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 border-t border-gray-100 bg-slate-50 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowContractorModal(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
