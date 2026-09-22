'use client';

import {
  CalendarPlus,
  ChevronLeft,
  Factory,
  FileText,
  Loader2,
  Minus,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useIsMobile } from '@/hooks/useIsMobile';
import { mockRepairStore } from '@/lib/mockRepairStore';
import { api } from '@/lib/axios';
import { useCreateMachine } from '../server/tanstackQuery/useMachinesQueries';
import type { CreateMachinePayload, MachineCategory } from '../types/types';

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  bg: 'var(--background)',
  muted: 'var(--muted)',
  fg: 'var(--foreground)',
  card: 'var(--card)',
  mutedFg: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryFg: 'var(--primary-foreground, #fff)' as string,
  success: 'var(--success)',
  danger: 'var(--danger)',
  dangerBg: 'color-mix(in oklch, var(--danger) 12%, transparent)',
  font: "'DM Sans', system-ui, sans-serif" as string,
};

interface Department {
  id: string;
  name: string;
  code: string | null;
}

// ── Shared input style ─────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: T.muted,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13,
  color: T.fg,
  outline: 'none',
  fontFamily: T.font,
  boxSizing: 'border-box',
  transition: 'border-color .15s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: T.mutedFg,
  marginBottom: 5,
  letterSpacing: '.02em',
  textTransform: 'uppercase',
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: T.fg,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  paddingBottom: 10,
  borderBottom: `1px solid ${T.border}`,
  marginBottom: 18,
};

export default function AddMachineForm() {
  const navigate = useNavigate();
  const router = { push: (p: string) => navigate(p) };
  const createMachineMutation = useCreateMachine();
  const isMobile = useIsMobile();

  const [machineImage, setMachineImage] = useState<string | null>(null);
  const [machineImagePreview, setMachineImagePreview] = useState<string | null>(null);
  const [specifications, setSpecifications] = useState([{ name: '', value: '' }]);
  const [maintenanceParts, setMaintenanceParts] = useState<
    Array<{
      name: string;
      partNumber: string;
      description: string;
      imageUrl: string;
      previewUrl: string;
    }>
  >([]);

  const [formData, setFormData] = useState({
    name: '',
    serialNumber: '',
    model: '',
    manufacturer: '',
    firmId: '',
    departmentId: '',
    location: '',
    purchaseDate: '',
    purchasePrice: '',
    vendor: '',
    hasWarranty: false,
    warrantyExpiry: '',
    maintenanceSchedule: [] as string[],
    initialSchedule: '',
    notes: '',
    userManualUrl: '',
    specificationsSheetUrl: '',
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [firms, setFirms] = useState<{ id: string; name: string }[]>([]);
  const [loadingFirms, setLoadingFirms] = useState(false);
  const vendors = mockRepairStore.getVendors();
  const loadingVendors = false;
  const [uploadedFileNames, setUploadedFileNames] = useState<{ manual: string; specs: string }>({
    manual: '',
    specs: '',
  });

  const { uploadImage: uploadMachineImage, isUploading: isUploadingImg } = useImageUpload({
    bucket: 'mis-docs',
    pathPrefix: 'maintenance/machines/images',
  });
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const { uploadImage: uploadPartImage } = useImageUpload({
    bucket: 'mis-docs',
    pathPrefix: 'maintenance/parts/new-machine',
  });
  const { uploadImage: uploadManual, isUploading: isUploadingManual } = useImageUpload({
    bucket: 'mis-docs',
    pathPrefix: 'maintenance/machines/manuals',
    maxSizeMB: 10,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ],
  });
  const { uploadImage: uploadSpecs, isUploading: isUploadingSpecs } = useImageUpload({
    bucket: 'mis-docs',
    pathPrefix: 'maintenance/machines/specs',
    maxSizeMB: 10,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ],
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const response = await api.get('/maintenance/departments');
        setDepartments(response.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      } finally {
        setLoadingDepartments(false);
      }
    };
    const fetchFirms = async () => {
      try {
        setLoadingFirms(true);
        const response = await api.get('/maintenance/firms');
        setFirms(response.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch firms:', err);
      } finally {
        setLoadingFirms(false);
      }
    };
    fetchDepartments();
    fetchFirms();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value, type } = e.target;
    if (type === 'checkbox' && id === 'hasWarranty') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        hasWarranty: checked,
        warrantyExpiry: checked ? prev.warrantyExpiry : '',
      }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => {
        const schedule = [...prev.maintenanceSchedule];
        if (checked) {
          schedule.push(id);
        } else {
          const index = schedule.indexOf(id);
          if (index > -1) schedule.splice(index, 1);
        }
        return { ...prev, maintenanceSchedule: schedule };
      });
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload a valid image file (PNG or JPG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be under 5MB');
        return;
      }
      const blobUrl = URL.createObjectURL(file);
      setMachineImagePreview(blobUrl);
      try {
        const result = await uploadMachineImage(file);
        setMachineImage(result.url);
      } catch (_err) {
        setMachineImagePreview(null);
        toast.error('Failed to upload image');
      }
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'manual' | 'specs'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = type === 'manual' ? await uploadManual(file) : await uploadSpecs(file);
        setFormData((prev) => ({
          ...prev,
          [type === 'manual' ? 'userManualUrl' : 'specificationsSheetUrl']: result.url,
        }));
        setUploadedFileNames((prev) => ({
          ...prev,
          [type === 'manual' ? 'manual' : 'specs']: file.name,
        }));
        toast.success(`${type === 'manual' ? 'Manual' : 'Specs'} uploaded`);
      } catch (_err) {
        toast.error('Failed to upload file');
      }
    }
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { name: '', value: '' }]);
  };

  const removeSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const addMaintenancePart = () => {
    if (maintenanceParts.length < 5) {
      setMaintenanceParts([
        ...maintenanceParts,
        { name: '', partNumber: '', description: '', imageUrl: '', previewUrl: '' },
      ]);
    } else {
      toast.error('Maximum 5 maintenance parts allowed');
    }
  };

  const removeMaintenancePart = (index: number) => {
    setMaintenanceParts(maintenanceParts.filter((_, i) => i !== index));
  };

  const updateMaintenancePart = (index: number, key: string, value: string) => {
    setMaintenanceParts((prev) => {
      const newParts = [...prev];
      newParts[index] = { ...newParts[index], [key]: value };
      return newParts;
    });
  };

  const handlePartImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload a valid image file (PNG or JPG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be under 5MB');
        return;
      }
      const blobUrl = URL.createObjectURL(file);
      updateMaintenancePart(index, 'previewUrl', blobUrl);
      try {
        setUploadingIndex(index);
        const result = await uploadPartImage(file);
        updateMaintenancePart(index, 'imageUrl', result.url);
        toast.success('Part image uploaded successfully');
      } catch (_err) {
        updateMaintenancePart(index, 'previewUrl', '');
        toast.error('Failed to upload image');
      } finally {
        setUploadingIndex(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateMachinePayload = {
      name: formData.name,
      assetCode: formData.serialNumber,
      serialNumber: formData.serialNumber,
      category: 'PRODUCTION' as MachineCategory,
      firmId: formData.firmId || undefined,
      departmentId: formData.departmentId || undefined,
      modelNumber: formData.model || undefined,
      manufacturer: formData.manufacturer || undefined,
      location: formData.location || undefined,
      purchaseDate: formData.purchaseDate || undefined,
      purchasePrice: parseFloat(formData.purchasePrice) || undefined,
      vendor: formData.vendor || undefined,
      warrantyExpiry: formData.warrantyExpiry || undefined,
      maintenanceSchedule: formData.maintenanceSchedule,
      parts: maintenanceParts
        .filter((part) => part.name?.trim())
        .map((part) => ({
          name: part.name.trim(),
          partNumber: part.partNumber?.trim() || undefined,
          description: part.description?.trim() || undefined,
          imageUrl: part.imageUrl || undefined,
        })),
      initialMaintenanceDate: formData.initialSchedule || undefined,
      imageUrl: machineImage || undefined,
      userManualUrl: formData.userManualUrl || undefined,
      specificationsSheetUrl: formData.specificationsSheetUrl || undefined,
      additionalSpecifications: specifications.filter((s) => s.name && s.value),
      notes: formData.notes || undefined,
    };
    try {
      await createMachineMutation.mutateAsync(payload);
      toast.success('Machine successfully added to inventory');
      router.push('/maintenance/machines');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create machine');
    }
  };

  const isPending = createMachineMutation.isPending;

  return (
    <div
      style={{
        fontFamily: T.font,
        width: '100%',
        background: T.bg,
        color: T.fg,
        padding: isMobile ? '16px' : '24px 32px',
        borderRadius: 16,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/maintenance/machines"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            color: T.primary,
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          <ChevronLeft size={18} />
          Back to Machines
        </Link>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: T.fg,
            margin: 0,
          }}
        >
          Add New Machine
        </h1>
      </div>

      {/* Form Card */}
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: isMobile ? '16px' : '28px 32px',
          boxShadow: 'var(--shadow-lg)',
          boxSizing: 'border-box',
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Two-column grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? 24 : 40,
              marginBottom: 32,
            }}
          >
            {/* Left Column */}
            <div>
              <h2 style={sectionHeadStyle}>
                <Factory size={16} color={T.primary} />
                Machine Information
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  {
                    id: 'name',
                    label: 'Machine Name',
                    placeholder: 'e.g., Hydraulic Press HP-102',
                    required: true,
                  },
                  {
                    id: 'serialNumber',
                    label: 'Serial Number',
                    placeholder: 'e.g., HP102-2021-XYZ',
                    required: true,
                  },
                  { id: 'model', label: 'Model', placeholder: 'e.g., HP-2000 Series' },
                  {
                    id: 'manufacturer',
                    label: 'Manufacturer',
                    placeholder: 'e.g., Industrial Dynamics Ltd.',
                  },
                  { id: 'location', label: 'Location', placeholder: 'e.g., Building A, Floor 2' },
                ].map(({ id, label, placeholder, required }) => (
                  <div key={id}>
                    <label htmlFor={id} style={labelStyle}>
                      {label}
                      {required && <span style={{ color: T.danger }}> *</span>}
                    </label>
                    <input
                      type="text"
                      id={id}
                      value={(formData as unknown as Record<string, string>)[id]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      required={required}
                      disabled={isPending}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = T.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = T.border;
                      }}
                    />
                  </div>
                ))}

                {/* Department */}
                <div>
                  <label htmlFor="departmentId" style={labelStyle}>
                    Department <span style={{ color: T.danger }}>*</span>
                  </label>
                  <select
                    id="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    required
                    disabled={isPending || loadingDepartments}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = T.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = T.border;
                    }}
                  >
                    <option value="">
                      {loadingDepartments ? 'Loading departments…' : 'Select Department'}
                    </option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Project (Firm) */}
                <div>
                  <label htmlFor="firmId" style={labelStyle}>
                    Project (Firm)
                  </label>
                  <select
                    id="firmId"
                    value={formData.firmId}
                    onChange={handleChange}
                    disabled={isPending || loadingFirms}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = T.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = T.border;
                    }}
                  >
                    <option value="">
                      {loadingFirms ? 'Loading projects…' : 'Select Project (Firm)'}
                    </option>
                    {firms.map((firm) => (
                      <option key={firm.id} value={firm.id}>
                        {firm.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h2 style={sectionHeadStyle}>
                <CalendarPlus size={16} color={T.primary} />
                Purchase & Maintenance Details
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Purchase Date + Price */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <div>
                    <label htmlFor="purchaseDate" style={labelStyle}>
                      Purchase Date <span style={{ color: T.danger }}>*</span>
                    </label>
                    <input
                      type="date"
                      id="purchaseDate"
                      value={formData.purchaseDate}
                      onChange={handleChange}
                      required
                      disabled={isPending}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = T.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = T.border;
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="purchasePrice" style={labelStyle}>
                      Purchase Price <span style={{ color: T.danger }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: 11,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 13,
                          color: T.mutedFg,
                          pointerEvents: 'none',
                        }}
                      >
                        ₹
                      </span>
                      <input
                        type="number"
                        id="purchasePrice"
                        value={formData.purchasePrice}
                        onChange={handleChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                        disabled={isPending}
                        style={{ ...inputStyle, paddingLeft: 24 }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = T.primary;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = T.border;
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Vendor */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <label htmlFor="vendor" style={labelStyle}>
                      Vendor
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate('/repair/vendors')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: T.primary,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        marginBottom: 7,
                      }}
                    >
                      + Add Vendor
                    </button>
                  </div>
                  <select
                    id="vendor"
                    value={formData.vendor}
                    onChange={handleChange}
                    disabled={isPending || loadingVendors}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = T.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = T.border;
                    }}
                  >
                    <option value="">
                      {loadingVendors ? 'Loading vendors…' : 'Select Vendor'}
                    </option>
                    {vendors.map((v: any) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Warranty */}
                <div>
                  <label
                    htmlFor="hasWarranty"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: T.fg,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      id="hasWarranty"
                      checked={formData.hasWarranty}
                      onChange={handleChange}
                      disabled={isPending}
                      style={{ accentColor: T.primary, cursor: 'pointer' }}
                    />
                    Does Warranty Exist?
                  </label>
                </div>

                {formData.hasWarranty && (
                  <div>
                    <label htmlFor="warrantyExpiry" style={labelStyle}>
                      Warranty Expiration
                    </label>
                    <input
                      type="date"
                      id="warrantyExpiry"
                      value={formData.warrantyExpiry}
                      onChange={handleChange}
                      disabled={isPending}
                      style={inputStyle}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = T.primary;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = T.border;
                      }}
                    />
                  </div>
                )}

                {/* Maintenance Schedule */}
                <div>
                  <span style={labelStyle}>Maintenance Schedule</span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    {['Monthly', 'Quarterly', 'Bi-annual', 'Annual'].map((period) => (
                      <label
                        key={period}
                        htmlFor={period}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 13,
                          color: T.fg,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          id={period}
                          checked={formData.maintenanceSchedule.includes(period)}
                          onChange={handleChange}
                          style={{ accentColor: T.primary, cursor: 'pointer' }}
                        />
                        {period}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Maintenance Parts */}
                <div>
                  <span style={labelStyle}>Maintenance Parts ({maintenanceParts.length}/5)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                    {maintenanceParts.map((part, index) => (
                      <div
                        key={index}
                        style={{
                          border: `1px solid ${T.border}`,
                          borderRadius: 10,
                          padding: 16,
                          background: T.muted,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.primary }}>
                            Part #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeMaintenancePart(index)}
                            style={{
                              marginLeft: 'auto',
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: 'none',
                              background: T.dangerBg,
                              color: T.danger,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                            gap: 16,
                          }}
                        >
                          {/* Part fields */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                              <label
                                htmlFor={`part-name-${index}`}
                                style={{ ...labelStyle, fontSize: 10 }}
                              >
                                Part Name <span style={{ color: T.danger }}>*</span>
                              </label>
                              <input
                                type="text"
                                id={`part-name-${index}`}
                                placeholder="e.g., Hydraulic Pump"
                                value={part.name}
                                onChange={(e) =>
                                  updateMaintenancePart(index, 'name', e.target.value)
                                }
                                disabled={isPending}
                                style={inputStyle}
                                required
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`part-number-${index}`}
                                style={{ ...labelStyle, fontSize: 10 }}
                              >
                                Part / Model Number
                              </label>
                              <input
                                type="text"
                                id={`part-number-${index}`}
                                placeholder="e.g., PMP-X100"
                                value={part.partNumber}
                                onChange={(e) =>
                                  updateMaintenancePart(index, 'partNumber', e.target.value)
                                }
                                disabled={isPending}
                                style={inputStyle}
                              />
                            </div>
                            <div>
                              <label
                                htmlFor={`part-desc-${index}`}
                                style={{ ...labelStyle, fontSize: 10 }}
                              >
                                Description
                              </label>
                              <textarea
                                id={`part-desc-${index}`}
                                placeholder="Technical specifications..."
                                value={part.description}
                                onChange={(e) =>
                                  updateMaintenancePart(index, 'description', e.target.value)
                                }
                                disabled={isPending}
                                style={{ ...inputStyle, height: 60, resize: 'none' }}
                              />
                            </div>
                          </div>

                          {/* Image upload */}
                          <div>
                            <label style={{ ...labelStyle, fontSize: 10 }}>Part Image</label>
                            <div
                              style={{
                                border: `2px dashed ${T.border}`,
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.01)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 12,
                                height: 218,
                                boxSizing: 'border-box',
                                position: 'relative',
                                textAlign: 'center',
                              }}
                            >
                              {part.previewUrl || part.imageUrl ? (
                                <>
                                  <img
                                    src={part.previewUrl || part.imageUrl}
                                    alt="Part"
                                    style={{
                                      position: 'absolute',
                                      inset: 0,
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      borderRadius: 6,
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateMaintenancePart(index, 'imageUrl', '');
                                      updateMaintenancePart(index, 'previewUrl', '');
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: 6,
                                      right: 6,
                                      width: 20,
                                      height: 20,
                                      borderRadius: '50%',
                                      background: T.danger,
                                      color: '#fff',
                                      border: 'none',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      zIndex: 1,
                                    }}
                                  >
                                    <X size={10} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <Upload size={20} color={T.mutedFg} style={{ marginBottom: 6 }} />
                                  <label
                                    htmlFor={`part-image-upload-${index}`}
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: T.primary,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {uploadingIndex === index ? 'Uploading…' : 'Upload Image'}
                                    <input
                                      id={`part-image-upload-${index}`}
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handlePartImageUpload(e, index)}
                                      style={{ display: 'none' }}
                                      disabled={uploadingIndex !== null || isPending}
                                    />
                                  </label>
                                  <span style={{ fontSize: 9, color: T.mutedFg, marginTop: 2 }}>
                                    PNG, JPG up to 5MB
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {maintenanceParts.length < 5 && (
                      <button
                        type="button"
                        onClick={addMaintenancePart}
                        disabled={isPending}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          color: T.primary,
                          background: `color-mix(in oklch, ${T.primary} 10%, transparent)`,
                          border: `1px solid ${T.primary}`,
                          borderRadius: 7,
                          padding: '6px 12px',
                          cursor: 'pointer',
                          alignSelf: 'flex-start',
                          fontFamily: T.font,
                        }}
                      >
                        <Plus size={13} /> Add Part
                      </button>
                    )}
                  </div>
                </div>

                {/* Initial Maintenance Date */}
                <div>
                  <label htmlFor="initialSchedule" style={labelStyle}>
                    Initial Maintenance Date <span style={{ color: T.danger }}>*</span>
                  </label>
                  <input
                    type="date"
                    id="initialSchedule"
                    value={formData.initialSchedule}
                    onChange={handleChange}
                    required
                    disabled={isPending}
                    style={inputStyle}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = T.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = T.border;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Documentation */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 28, marginBottom: 28 }}>
            <h2
              style={{
                ...sectionHeadStyle,
                borderBottom: 'none',
                paddingBottom: 0,
                marginBottom: 20,
              }}
            >
              <FileText size={16} color={T.primary} />
              Documentation
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: 20,
              }}
            >
              {[
                {
                  label: 'Machine Image',
                  id: 'machine-image',
                  accept: 'image/*',
                  uploading: isUploadingImg,
                  uploaded: !!machineImage,
                  uploadLabel: isUploadingImg ? 'Uploading…' : 'Upload Image',
                  hint: 'PNG, JPG up to 5MB',
                  onChange: handleImageUpload,
                  preview:
                    machineImagePreview || machineImage
                      ? {
                          type: 'image' as const,
                          src: machineImagePreview ?? machineImage!,
                          onRemove: () => {
                            setMachineImage(null);
                            setMachineImagePreview(null);
                          },
                        }
                      : null,
                },
                {
                  label: 'User Manual',
                  id: 'manual-upload',
                  accept: undefined,
                  uploading: isUploadingManual,
                  uploaded: !!formData.userManualUrl,
                  uploadLabel: isUploadingManual ? 'Uploading…' : 'Upload a file',
                  hint: 'PDF, DOC up to 10MB',
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    handleFileUpload(e, 'manual'),
                  preview: formData.userManualUrl
                    ? {
                        type: 'file' as const,
                        name: uploadedFileNames.manual,
                        onRemove: () => {
                          setFormData((p) => ({ ...p, userManualUrl: '' }));
                          setUploadedFileNames((p) => ({ ...p, manual: '' }));
                        },
                      }
                    : null,
                },
                {
                  label: 'Specifications Sheet',
                  id: 'specs-upload',
                  accept: undefined,
                  uploading: isUploadingSpecs,
                  uploaded: !!formData.specificationsSheetUrl,
                  uploadLabel: isUploadingSpecs ? 'Uploading…' : 'Upload a file',
                  hint: 'PDF, DOC, XLS up to 10MB',
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                    handleFileUpload(e, 'specs'),
                  preview: formData.specificationsSheetUrl
                    ? {
                        type: 'file' as const,
                        name: uploadedFileNames.specs,
                        onRemove: () => {
                          setFormData((p) => ({ ...p, specificationsSheetUrl: '' }));
                          setUploadedFileNames((p) => ({ ...p, specs: '' }));
                        },
                      }
                    : null,
                },
              ].map((item) => (
                <div key={item.id}>
                  <span style={labelStyle}>{item.label}</span>
                  <div
                    style={{
                      border: `2px dashed ${T.border}`,
                      borderRadius: 10,
                      background: T.muted,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px 16px',
                      minHeight: 130,
                      textAlign: 'center',
                    }}
                  >
                    {item.preview?.type === 'image' && item.preview.src ? (
                      <div style={{ position: 'relative', width: '100%' }}>
                        <img
                          src={item.preview.src}
                          alt="Preview"
                          style={{
                            width: '100%',
                            aspectRatio: '1',
                            objectFit: 'cover',
                            borderRadius: 8,
                          }}
                        />
                        <button
                          type="button"
                          onClick={item.preview.onRemove}
                          style={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: T.danger,
                            color: '#fff',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : item.preview?.type === 'file' ? (
                      <>
                        <FileText size={32} color={T.primary} />
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: T.fg,
                            margin: '8px 0 2px',
                          }}
                        >
                          Uploaded
                        </p>
                        {item.preview.name ? (
                          <p
                            style={{
                              fontSize: 10,
                              color: T.mutedFg,
                              margin: '0 0 4px',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.preview.name}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={item.preview.onRemove}
                          style={{
                            fontSize: 11,
                            color: T.danger,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: T.font,
                          }}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <Upload size={28} color={T.mutedFg} style={{ marginBottom: 8 }} />
                        <label
                          htmlFor={item.id}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: T.primary,
                            cursor: 'pointer',
                          }}
                        >
                          {item.uploadLabel}
                          <input
                            id={item.id}
                            name={item.id}
                            type="file"
                            accept={item.accept}
                            onChange={item.onChange}
                            style={{ display: 'none' }}
                            disabled={item.uploading || isPending}
                          />
                        </label>
                        <p style={{ fontSize: 10, color: T.mutedFg, marginTop: 4 }}>{item.hint}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Specifications */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 28, marginBottom: 28 }}>
            <h2
              style={{
                ...sectionHeadStyle,
                borderBottom: 'none',
                paddingBottom: 0,
                marginBottom: 16,
              }}
            >
              <Plus size={16} color={T.primary} />
              Additional Specifications
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {specifications.map((spec, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: 10,
                  }}
                >
                  <input
                    type="text"
                    placeholder="Specification Name"
                    value={spec.name}
                    onChange={(e) => {
                      const newSpecs = [...specifications];
                      newSpecs[index].name = e.target.value;
                      setSpecifications(newSpecs);
                    }}
                    disabled={isPending}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = T.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = T.border;
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={spec.value}
                    onChange={(e) => {
                      const newSpecs = [...specifications];
                      newSpecs[index].value = e.target.value;
                      setSpecifications(newSpecs);
                    }}
                    disabled={isPending}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = T.primary;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = T.border;
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecification(index)}
                    disabled={isPending}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      border: `1px solid ${T.border}`,
                      background: T.dangerBg,
                      color: T.danger,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      alignSelf: isMobile ? 'flex-end' : 'center',
                    }}
                  >
                    <Minus size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSpecification}
                disabled={isPending}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: T.primary,
                  background: `color-mix(in oklch, ${T.primary} 10%, transparent)`,
                  border: `1px solid ${T.primary}`,
                  borderRadius: 7,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontFamily: T.font,
                }}
              >
                <Plus size={13} /> Add Specification
              </button>
            </div>
          </div>

          {/* Notes */}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 28, marginBottom: 28 }}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: T.fg,
                marginBottom: 12,
              }}
            >
              Notes
            </h2>
            <textarea
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes about this machine…"
              disabled={isPending}
              style={{
                ...inputStyle,
                resize: 'none',
                lineHeight: 1.6,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = T.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = T.border;
              }}
            />
          </div>

          {/* Action Buttons */}
          <div
            style={{
              borderTop: `1px solid ${T.border}`,
              paddingTop: 24,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'flex-end',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={() => router.push('/maintenance/machines')}
              disabled={isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 20px',
                borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.muted,
                color: T.fg,
                fontSize: 13,
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1,
                fontFamily: T.font,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 24px',
                borderRadius: 8,
                border: 'none',
                background: T.primary,
                color: T.primaryFg,
                fontSize: 13,
                fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.7 : 1,
                fontFamily: T.font,
              }}
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Machine'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
