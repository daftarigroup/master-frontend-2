import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload, Plus, Trash2, CheckCircle2, Circle,
  Layers, DollarSign, MapPin, Shield, Wrench, FileText,
  Cpu, ArrowRight, ArrowLeft, Save, Mic,
  ChevronDown, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MacModal } from '@/components/ui/mac-modal';
import { assetApi } from '../services/asset.api';
import { AssetInputField } from './AssetInputField';
import { SearchableInput } from './SearchableInput';
import type { AssetDocumentRef, AssetProduct, AssetSpec, MachinePart, NewAssetProduct } from '../types';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: AssetProduct | null;
  defaultSection?: number;
}

type AssetFormData = Omit<AssetProduct, 'id' | 'specs' | 'documents' | 'partNames'> & {
  specs: AssetSpec[];
  documents: (File | AssetDocumentRef)[];
  partNames?: string[];
};

const emptyFormData = (): AssetFormData => ({
  sn: '',
  productName: '', category: 'Machinery', type: 'Asset', brand: '', model: '', serialNo: '', sku: '', mfgDate: '', origin: '', status: 'Active',
  location: '', department: '', division: '', machineArea: '', assignedTo: '', usageType: 'Internal', storageLoc: '', responsiblePerson: '',
  assetDate: '', invoiceNo: '', assetValue: '', quantity: '1', supplierName: '', supplierPhone: '', supplierEmail: '', paymentMode: '',
  depMethod: 'Straight Line', depRate: '', assetLife: '', residualValue: '',
  warrantyAvailable: 'No', warrantyProvider: '', warrantyStart: '', warrantyEnd: '', amc: 'No', amcProvider: '', amcStart: '', amcEnd: '', serviceContact: '',
  runningHours: 0, installationDate: '', operationalStatus: 'Running',
  maintenanceRequired: 'No', maintenanceType: 'Preventive', frequency: 'Monthly', nextService: '', priority: 'Medium', technician: '', maintenanceNotes: '',
  specs: [],
  internalNotes: '', usageRemarks: '', condition: 'Good',
  documents: [],
});

export const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onSaved, product = null, defaultSection = 0 }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<{ id: number | string; user_name: string; unit?: string }[]>([]);
  const [machinePartsList, setMachinePartsList] = useState<MachinePart[]>([]);

  const [activeSection, setActiveSection] = useState(defaultSection);
  const [isMobileSectionOpen, setIsMobileSectionOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [listeningField, setListeningField] = useState<string | null>(null);

  const [formData, setFormData] = useState<AssetFormData>(emptyFormData());

  const userOptions = useMemo(() => Array.from(new Set(users.map((u) => u.user_name).filter(Boolean))), [users]);

  const dynamicDepartments = useMemo(() => {
    const set = new Set<string>();
    machinePartsList.forEach((m) => {
      if (m.machine_department?.trim()) set.add(m.machine_department.trim());
    });
    if (formData.department?.trim()) set.add(formData.department.trim());
    const arr = Array.from(set).sort();
    return arr.length > 0 ? arr : ['Mechanical', 'Electrical', 'Operation', 'Washery', 'CCM', 'Dispatch', 'Account', 'Auto Mobile'];
  }, [machinePartsList, formData.department]);

  const dynamicDivisions = useMemo(() => {
    const set = new Set<string>();
    machinePartsList.forEach((m) => {
      if (m.machine_division?.trim()) set.add(m.machine_division.trim());
    });
    if (formData.division?.trim()) set.add(formData.division.trim());
    const arr = Array.from(set).sort();
    return arr.length > 0 ? arr : ['SID', 'SMS', 'CPP', 'Rolling Mill', 'RM', 'Admin'];
  }, [machinePartsList, formData.division]);

  const dynamicLocations = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.unit?.trim()) set.add(u.unit.trim());
    });
    if (formData.location?.trim()) set.add(formData.location.trim());
    const arr = Array.from(set).sort();
    return arr.length > 0 ? arr : ['Plant 1', 'Plant 2', 'Warehouse', 'Head Office', 'Site A'];
  }, [users, formData.location]);

  useEffect(() => {
    if (!isOpen) return;
    assetApi.getAssetUsers().then(setUsers).catch(() => {});
    assetApi.getMachinePartsList().then(setMachinePartsList).catch(() => {});

    setActiveSection(defaultSection || 0);
    setIsMobileSectionOpen(false);
    setListeningField(null);
    setSelectedMachineId('');

    if (product) {
      setFormData({
        ...emptyFormData(),
        ...product,
        specs: Array.isArray(product.specs) ? product.specs : [],
        documents: product.documents || [],
      });
    } else {
      setFormData(emptyFormData());
    }
  }, [isOpen, product, defaultSection]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectExistingMachine = (machineId: string) => {
    setSelectedMachineId(machineId);
    if (!machineId) return;

    const found = machinePartsList.find((m) => String(m.id) === String(machineId));
    if (found) {
      const partSpecs: AssetSpec[] = Array.isArray(found.part_name)
        ? found.part_name.filter(Boolean).map((p) => ({ name: p }))
        : found.part_name
        ? [{ name: found.part_name }]
        : [];

      setFormData((prev) => ({
        ...prev,
        productName: found.machine_name || prev.productName,
        category: 'Machinery',
        machineId: found.id,
        initialEntryDate: found.created_at || prev.initialEntryDate || new Date().toISOString(),
        division: found.machine_division ? found.machine_division.trim() : prev.division,
        department: found.machine_department ? found.machine_department.trim() : prev.department,
        machineArea: found.machine_area ? found.machine_area.trim() : prev.machineArea,
        specs: prev.specs.length > 0 ? prev.specs : partSpecs,
      }));
      toast.success(`Imported details for ${found.machine_name} (${found.machine_department || ''} - ${found.machine_division || ''})`);
    }
  };

  const handleSpecChange = (index: number, value: string) => {
    const newSpecs = [...formData.specs];
    newSpecs[index] = { name: value };
    setFormData((prev) => ({ ...prev, specs: newSpecs }));
  };

  const addSpec = () => setFormData((prev) => ({ ...prev, specs: [...prev.specs, { name: '' }] }));
  const removeSpec = (index: number) => setFormData((prev) => ({ ...prev, specs: prev.specs.filter((_, i) => i !== index) }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData((prev) => ({ ...prev, documents: [...(prev.documents || []), ...files] }));
  };

  const removeFile = (index: number) => {
    setFormData((prev) => ({ ...prev, documents: prev.documents.filter((_, i) => i !== index) }));
  };

  const handleVoiceDictate = (fieldName: string) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation is not supported in this browser.');
      return;
    }
    if (listeningField === fieldName) {
      setListeningField(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => {
        setListeningField(fieldName);
        toast('🎙️ Listening for field...', { duration: 2500 });
      };

      recognition.onresult = (event: any) => {
        let text = event.results[0][0].transcript as string;
        if (['assetValue', 'quantity', 'depRate', 'assetLife', 'residualValue', 'runningHours'].includes(fieldName)) {
          const numMatch = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
          if (numMatch) text = numMatch[0];
        }

        setFormData((prev) => {
          const isLongText = ['internalNotes', 'usageRemarks', 'maintenanceNotes'].includes(fieldName);
          const prevValue = (prev as any)[fieldName];
          return {
            ...prev,
            [fieldName]: isLongText && prevValue ? `${prevValue} ${text}` : text,
          };
        });
        setListeningField(null);
        toast.success('Captured!');
      };

      recognition.onerror = () => setListeningField(null);
      recognition.onend = () => setListeningField(null);

      recognition.start();
    } catch {
      setListeningField(null);
    }
  };

  const handleVoiceSpec = (index: number) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice dictation not supported.');
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onstart = () => toast('🎙️ Listening for part / spec...', { duration: 2000 });
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript as string;
        handleSpecChange(index, text);
        toast.success('Part / spec captured!');
      };
      recognition.start();
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.productName.trim()) {
      toast.error('Asset Name is required');
      setActiveSection(0);
      return;
    }

    setIsSaving(true);
    try {
      const { documents, ...rest } = formData;
      const payload = { ...rest, documents: (documents || []).map((d) => (d instanceof File ? { name: d.name, size: d.size } : d)) };

      if (product && product.id) {
        await assetApi.updateProduct(product.id, payload as Partial<AssetProduct>);
        toast.success('Asset updated successfully!');
      } else {
        await assetApi.addProduct(payload as NewAssetProduct);
        toast.success('Asset created successfully!');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save asset', err);
      toast.error('Error saving asset details');
    } finally {
      setIsSaving(false);
    }
  };

  const isBasicComplete = Boolean(formData.productName && formData.category);
  const isLocationComplete = Boolean(formData.department || formData.location || formData.assignedTo);
  const isFinanceComplete = Boolean(formData.assetValue || formData.invoiceNo || formData.supplierName);
  const isWarrantyComplete = formData.warrantyAvailable === 'No' || Boolean(formData.warrantyProvider && formData.warrantyEnd);
  const isMaintenanceComplete = Boolean(Number(formData.runningHours) > 0 || formData.maintenanceRequired === 'No' || formData.technician);
  const isSpecsComplete = formData.specs.length > 0;
  const isDocsComplete = (formData.documents && formData.documents.length > 0) || Boolean(formData.internalNotes);

  const sections = [
    { id: 0, title: 'Basic Information', icon: Layers, isComplete: isBasicComplete, desc: 'Name, Category, Brand, Serial' },
    { id: 1, title: 'Location & Custody', icon: MapPin, isComplete: isLocationComplete, desc: 'Dept, Division, Assigned Staff' },
    { id: 2, title: 'Financial & Purchase', icon: DollarSign, isComplete: isFinanceComplete, desc: 'Invoice, Cost, Depreciation' },
    { id: 3, title: 'Warranty & Service', icon: Shield, isComplete: isWarrantyComplete, desc: 'Warranty, AMC Contracts' },
    { id: 4, title: 'Maintenance & Operations', icon: Wrench, isComplete: isMaintenanceComplete, desc: 'Running Hours, Status, Schedule' },
    { id: 5, title: 'Technical Specs', icon: Cpu, isComplete: isSpecsComplete, desc: 'Hardware & Machine Specs' },
    { id: 6, title: 'Documents & Notes', icon: FileText, isComplete: isDocsComplete, desc: 'Uploads, Remarks & Notes' },
  ];

  const completedCount = sections.filter((s) => s.isComplete).length;
  const currentSectionObj = sections[activeSection] || sections[0];
  const CurrentSectionIcon = currentSectionObj.icon;

  return (
    <MacModal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? `Edit Asset: ${product.productName || product.sn}` : 'Add New Asset & Equipment'}
      subtitle={`${completedCount} of 7 sections complete`}
      icon={<CurrentSectionIcon size={18} />}
      maxWidth="5xl"
      className="h-full md:h-[92vh] md:max-h-[850px]"
      bodyClassName="p-0 overflow-hidden flex flex-col"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <div>
            {activeSection > 0 && (
              <button
                type="button"
                onClick={() => setActiveSection((prev) => Math.max(0, prev - 1))}
                className="px-3 sm:px-4 py-2.5 rounded-xl border border-input text-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={15} /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeSection < sections.length - 1 && (
              <button
                type="button"
                onClick={() => setActiveSection((prev) => Math.min(sections.length - 1, prev + 1))}
                className="px-3 sm:px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
              >
                Next <ArrowRight size={15} />
              </button>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSubmit()}
              className="px-4 sm:px-6 py-2.5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary/90 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : product ? 'Update' : 'Save'}</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Mobile Section Selector */}
      <div className="md:hidden bg-muted/40 border-b border-border px-3.5 py-2.5 flex items-center justify-between relative shrink-0">
        <button
          type="button"
          onClick={() => setIsMobileSectionOpen(!isMobileSectionOpen)}
          className="flex-1 flex items-center justify-between p-1.5 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-primary shrink-0"></div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Section {activeSection + 1} of 7:</span>
            <span className="text-xs font-bold text-foreground truncate">{currentSectionObj.title}</span>
          </div>
          <div className="flex items-center gap-1 text-primary shrink-0 ml-2">
            <span className="text-[11px] font-semibold">Change</span>
            <ChevronDown size={15} className={`transition-transform duration-200 ${isMobileSectionOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isMobileSectionOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setIsMobileSectionOpen(false)} />
            <div className="absolute top-full left-0 right-0 z-50 bg-popover border-b border-border shadow-xl p-3 space-y-1.5 max-h-[65vh] overflow-y-auto">
              <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Jump to Section</div>
              {sections.map((sec) => {
                const SecIcon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(sec.id);
                      setIsMobileSectionOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SecIcon size={16} className={isActive ? 'text-primary-foreground' : 'text-muted-foreground'} />
                      <span className="text-xs font-medium">
                        {sec.id + 1}. {sec.title}
                      </span>
                    </div>
                    {sec.isComplete ? (
                      <CheckCircle2 size={15} className={isActive ? 'text-emerald-300' : 'text-emerald-600'} />
                    ) : (
                      <Circle size={14} className={isActive ? 'text-primary-foreground/60' : 'text-muted-foreground/50'} />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Section Nav */}
        <div className="hidden md:block w-64 bg-muted/30 border-r border-border p-3 overflow-y-auto space-y-1.5 shrink-0">
          <div className="px-3 py-1.5 mb-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sections</span>
          </div>
          {sections.map((sec) => {
            const IconComponent = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive ? 'bg-primary text-primary-foreground shadow-xs font-semibold' : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconComponent size={17} className={isActive ? 'text-primary-foreground shrink-0' : 'text-muted-foreground shrink-0'} />
                  <div className="min-w-0">
                    <p className={`text-xs truncate ${isActive ? 'font-bold text-primary-foreground' : 'font-semibold text-foreground'}`}>{sec.title}</p>
                    <p className={`text-[10px] truncate ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{sec.desc}</p>
                  </div>
                </div>
                {sec.isComplete ? (
                  <CheckCircle2 size={15} className={isActive ? 'text-emerald-300 shrink-0' : 'text-emerald-600 shrink-0'} />
                ) : (
                  <Circle size={14} className={isActive ? 'text-primary-foreground/60 shrink-0' : 'text-muted-foreground/40 shrink-0'} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Form Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          <form id="asset-full-form" onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {/* SECTION 0: Basic Information */}
            {activeSection === 0 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="border-b border-border pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                      <Layers className="text-primary" size={18} /> Basic Information
                    </h3>
                    <p className="text-xs text-muted-foreground">Core asset identification details</p>
                  </div>

                  {!product && machinePartsList.length > 0 && (
                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl shadow-xs">
                      <Sparkles size={14} className="text-primary shrink-0" />
                      <label className="text-[11px] font-bold text-primary whitespace-nowrap">Copy from Machine:</label>
                      <select
                        value={selectedMachineId}
                        onChange={(e) => handleSelectExistingMachine(e.target.value)}
                        className="text-xs bg-background border border-primary/20 text-foreground rounded-lg px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="">-- Choose Machine --</option>
                        {machinePartsList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.machine_name} {m.machine_division ? `(${m.machine_division})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  <AssetInputField label="Asset / Equipment Name" name="productName" value={formData.productName} onChange={handleChange} required placeholder="e.g. Hydraulic Press" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'productName'} />
                  <AssetInputField label="Category" name="category" type="select" options={['Machinery', 'IT', 'Electronics', 'Furniture', 'Tools', 'Vehicles']} value={formData.category} onChange={handleChange} required />
                  <AssetInputField label="Type" name="type" type="select" options={['Asset', 'Non-Consumable', 'Consumable']} value={formData.type} onChange={handleChange} />
                  <AssetInputField label="Brand / Manufacturer" name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. Caterpillar, Dell" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'brand'} />
                  <AssetInputField label="Model Number" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. CAT 320D" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'model'} />
                  <AssetInputField label="Serial Number" name="serialNo" value={formData.serialNo} onChange={handleChange} placeholder="Manufacturer serial plate" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'serialNo'} />
                  <AssetInputField label="SKU / Asset Code" name="sku" value={formData.sku} onChange={handleChange} placeholder="e.g. AST-001" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'sku'} />
                  <AssetInputField label="Manufacturing Date" name="mfgDate" type="month" value={formData.mfgDate} onChange={handleChange} />
                  <AssetInputField label="Country of Origin" name="origin" value={formData.origin} onChange={handleChange} placeholder="e.g. India, Japan" onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'origin'} />
                  <AssetInputField label="Lifecycle Status" name="status" type="select" options={['Active', 'Inactive', 'Disposed']} value={formData.status} onChange={handleChange} />
                </div>
              </div>
            )}

            {/* SECTION 1: Location & Custody */}
            {activeSection === 1 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="border-b border-border pb-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <MapPin className="text-primary" size={18} /> Location & Custody Assignment
                  </h3>
                  <p className="text-xs text-muted-foreground">Track physical placement and responsible custodians</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  <AssetInputField label="Location / Plant" name="location" type="select" options={dynamicLocations} value={formData.location} onChange={handleChange} />
                  <AssetInputField label="Department" name="department" type="select" options={dynamicDepartments} value={formData.department} onChange={handleChange} />
                  <AssetInputField label="Division" name="division" type="select" options={dynamicDivisions} value={formData.division} onChange={handleChange} />
                  <AssetInputField label="Machine Area / Bay" name="machineArea" placeholder="e.g. Bay 4, Line 2" value={formData.machineArea} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'machineArea'} />
                  <SearchableInput label="Assigned Custodian" options={userOptions} value={formData.assignedTo ?? ''} onChange={(val) => setFormData((prev) => ({ ...prev, assignedTo: val }))} placeholder="Select assigned staff" />
                  <SearchableInput label="Responsible Supervisor" options={userOptions} value={formData.responsiblePerson ?? ''} onChange={(val) => setFormData((prev) => ({ ...prev, responsiblePerson: val }))} placeholder="Select supervisor" />
                  <AssetInputField label="Storage Location / Shelf" name="storageLoc" placeholder="e.g. Rack B-12" value={formData.storageLoc} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'storageLoc'} />
                  <AssetInputField label="Usage Type" name="usageType" type="select" options={['Internal', 'External / Client']} value={formData.usageType} onChange={handleChange} />
                </div>
              </div>
            )}

            {/* SECTION 2: Financial & Purchase */}
            {activeSection === 2 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="border-b border-border pb-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <DollarSign className="text-primary" size={18} /> Financial & Procurement Details
                  </h3>
                  <p className="text-xs text-muted-foreground">Invoice, supplier, cost and depreciation parameters</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                  <AssetInputField label="Purchase / Asset Date" name="assetDate" type="date" value={formData.assetDate} onChange={handleChange} />
                  <AssetInputField label="Invoice Number" name="invoiceNo" placeholder="e.g. INV-2024-001" value={formData.invoiceNo} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'invoiceNo'} />
                  <AssetInputField label="Asset Cost (₹)" name="assetValue" type="number" placeholder="e.g. 500000" value={formData.assetValue} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'assetValue'} />
                  <AssetInputField label="Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'quantity'} />
                  <AssetInputField label="Supplier / Vendor" name="supplierName" placeholder="e.g. ABC Industrial Supplies" value={formData.supplierName} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'supplierName'} />
                  <AssetInputField label="Supplier Phone" name="supplierPhone" placeholder="+91..." value={formData.supplierPhone} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'supplierPhone'} />
                  <AssetInputField label="Supplier Email" name="supplierEmail" type="email" placeholder="vendor@example.com" value={formData.supplierEmail} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'supplierEmail'} />
                  <AssetInputField label="Payment Mode" name="paymentMode" type="select" options={['Credit / PO', 'Online', 'Cash']} value={formData.paymentMode} onChange={handleChange} />
                </div>

                <div className="border-t border-border pt-3.5 mt-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">Depreciation Configuration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                    <AssetInputField label="Depreciation Method" name="depMethod" type="select" options={['Straight Line', 'Written Down Value (WDV)']} value={formData.depMethod} onChange={handleChange} />
                    <AssetInputField label="Rate (%)" name="depRate" type="number" placeholder="e.g. 15" value={formData.depRate} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'depRate'} />
                    <AssetInputField label="Asset Life (Years)" name="assetLife" type="number" placeholder="e.g. 10" value={formData.assetLife} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'assetLife'} />
                    <AssetInputField label="Residual Value (₹)" name="residualValue" type="number" placeholder="Scrap value" value={formData.residualValue} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'residualValue'} />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: Warranty & AMC */}
            {activeSection === 3 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="border-b border-border pb-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <Shield className="text-primary" size={18} /> Warranty & AMC Contracts
                  </h3>
                  <p className="text-xs text-muted-foreground">Service coverage and contract dates</p>
                </div>

                <div className="p-3.5 sm:p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                  <AssetInputField label="Is Warranty Available?" name="warrantyAvailable" type="select" options={['Yes', 'No']} value={formData.warrantyAvailable} onChange={handleChange} />
                  {formData.warrantyAvailable === 'Yes' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-1">
                      <AssetInputField label="Warranty Provider" name="warrantyProvider" placeholder="OEM / Dealer Name" value={formData.warrantyProvider} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'warrantyProvider'} />
                      <AssetInputField label="Start Date" name="warrantyStart" type="date" value={formData.warrantyStart} onChange={handleChange} />
                      <AssetInputField label="End Date" name="warrantyEnd" type="date" value={formData.warrantyEnd} onChange={handleChange} />
                    </div>
                  )}
                </div>

                <div className="p-3.5 sm:p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                  <AssetInputField label="Is under AMC Contract?" name="amc" type="select" options={['Yes', 'No']} value={formData.amc} onChange={handleChange} />
                  {formData.amc === 'Yes' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-1">
                      <AssetInputField label="AMC Provider" name="amcProvider" placeholder="Service company" value={formData.amcProvider} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'amcProvider'} />
                      <AssetInputField label="AMC Start Date" name="amcStart" type="date" value={formData.amcStart} onChange={handleChange} />
                      <AssetInputField label="AMC End Date" name="amcEnd" type="date" value={formData.amcEnd} onChange={handleChange} />
                    </div>
                  )}
                </div>

                <AssetInputField label="Service Helpline / Contact" name="serviceContact" placeholder="Contact number or email" value={formData.serviceContact} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'serviceContact'} />
              </div>
            )}

            {/* SECTION 4: Maintenance & Operations */}
            {activeSection === 4 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="border-b border-border pb-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <Wrench className="text-primary" size={18} /> Maintenance & Operational Status
                  </h3>
                  <p className="text-xs text-muted-foreground">Shop-floor running hours, machine health, and maintenance configuration</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                  <AssetInputField label="Running Hours" name="runningHours" type="number" placeholder="e.g. 2500" value={formData.runningHours} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'runningHours'} />
                  <AssetInputField label="Installation Date" name="installationDate" type="date" value={formData.installationDate} onChange={handleChange} />
                  <AssetInputField label="Machine Status" name="operationalStatus" type="select" options={['Running', 'Under Repair', 'Breakdown', 'Maintenance Due', 'Inactive']} value={formData.operationalStatus} onChange={handleChange} />
                </div>

                <div className="p-3.5 sm:p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                  <AssetInputField label="Schedule Preventive Maintenance?" name="maintenanceRequired" type="select" options={['Yes', 'No']} value={formData.maintenanceRequired} onChange={handleChange} />
                  {formData.maintenanceRequired === 'Yes' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-1">
                      <AssetInputField label="Maintenance Type" name="maintenanceType" type="select" options={['Preventive', 'Breakdown']} value={formData.maintenanceType} onChange={handleChange} />
                      <AssetInputField label="Frequency" name="frequency" type="select" options={['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']} value={formData.frequency} onChange={handleChange} />
                      <AssetInputField label="Next Due Date" name="nextService" type="date" value={formData.nextService} onChange={handleChange} />
                      <AssetInputField label="Priority" name="priority" type="select" options={['Low', 'Medium', 'High']} value={formData.priority} onChange={handleChange} />
                      <div className="col-span-1 sm:col-span-2">
                        <AssetInputField label="Assigned Technician" name="technician" placeholder="Technician name" value={formData.technician} onChange={handleChange} onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'technician'} />
                      </div>
                    </div>
                  )}
                </div>

                <AssetInputField label="Maintenance Notes" name="maintenanceNotes" type="textarea" value={formData.maintenanceNotes} onChange={handleChange} placeholder="Special servicing guidelines, oil types, lubrication schedules..." onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'maintenanceNotes'} />
              </div>
            )}

            {/* SECTION 5: Technical Specs */}
            {activeSection === 5 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="border-b border-border pb-2.5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                      <Cpu className="text-primary" size={18} /> Parts & Technical Specifications
                    </h3>
                    <p className="text-xs text-muted-foreground">Individual machine parts, components, and technical specs for {formData.category || 'Asset'}</p>
                  </div>
                  <button type="button" onClick={addSpec} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-primary/20 shadow-xs">
                    <Plus size={14} /> Add Part / Spec
                  </button>
                </div>

                {formData.specs.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center bg-muted/30 rounded-xl border border-dashed border-border">
                    <Cpu size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground font-medium">No individual parts or technical specifications added yet.</p>
                    <button type="button" onClick={addSpec} className="mt-2 text-xs text-primary font-bold hover:underline cursor-pointer">
                      + Add First Part (e.g. Power Pack, Main Drive, ABC Fan)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.specs.map((spec, index) => (
                      <div key={index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 bg-muted/30 hover:bg-primary/5 rounded-xl border border-border transition-colors">
                        <span className="w-7 h-7 rounded-lg bg-background border border-border text-muted-foreground text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {index + 1}
                        </span>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={spec?.name ?? ''}
                            onChange={(e) => handleSpecChange(index, e.target.value)}
                            placeholder="Enter part or specification (e.g. Power Pack, Sealing air fan, Main Drive, 415V)"
                            className="w-full pl-3.5 pr-10 py-2.5 bg-background border border-input focus:border-primary rounded-xl text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs min-h-[42px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleVoiceSpec(index)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                            title="Dictate part name"
                          >
                            <Mic size={15} />
                          </button>
                        </div>
                        <button type="button" onClick={() => removeSpec(index)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer shrink-0" title="Delete Part">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 6: Documents & Remarks */}
            {activeSection === 6 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="border-b border-border pb-2.5">
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <FileText className="text-primary" size={18} /> Documents, Photos & Remarks
                  </h3>
                  <p className="text-xs text-muted-foreground">Supporting documentation, inspection sheets, and observation notes</p>
                </div>

                <div className="p-4 sm:p-5 border-2 border-dashed border-border rounded-xl bg-muted/20 text-center">
                  <Upload className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50 mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">Upload Invoices, Manuals, Warranty Cards, Photos</p>
                  <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2.5 px-4 py-2 bg-background border border-input rounded-xl text-xs font-bold text-foreground hover:bg-muted shadow-xs cursor-pointer min-h-[40px]"
                  >
                    Select Files to Attach
                  </button>

                  {formData.documents && formData.documents.length > 0 && (
                    <div className="mt-4 text-left">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Attached Files ({formData.documents.length}):</p>
                      <div className="space-y-1.5">
                        {formData.documents.map((file, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-background p-2.5 rounded-lg border border-border">
                            <span className="truncate font-medium text-foreground">{file.name}</span>
                            <button type="button" onClick={() => removeFile(i)} className="text-destructive hover:text-destructive/80 ml-2 p-1 cursor-pointer">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <AssetInputField label="Internal Notes" name="internalNotes" type="textarea" value={formData.internalNotes} onChange={handleChange} placeholder="Internal procurement or asset observations..." onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'internalNotes'} />
                  <AssetInputField label="Usage & Condition Remarks" name="usageRemarks" type="textarea" value={formData.usageRemarks} onChange={handleChange} placeholder="Operating condition, physical status..." onVoiceInput={handleVoiceDictate} isListeningField={listeningField === 'usageRemarks'} />
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </MacModal>
  );
};

export default AddAssetModal;
