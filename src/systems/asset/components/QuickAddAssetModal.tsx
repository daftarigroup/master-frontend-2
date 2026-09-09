import React, { useEffect, useMemo, useState } from 'react';
import { Zap, Mic, MicOff, Check, AlertCircle, Search, ChevronDown, Cpu, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { MacModal } from '@/components/ui/mac-modal';
import { assetApi } from '../services/asset.api';
import type { AssetProduct, MachinePart, NewAssetProduct } from '../types';

interface QuickAddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onOpenFullDetails: (product: AssetProduct) => void;
}

interface QuickFormData {
  productName: string;
  category: string;
  brand: string;
  model: string;
  serialNo: string;
  status: 'Active' | 'Inactive';
  machineId: number | string | null;
  machineArea: string;
  division: string;
  department: string;
  specs: { name: string; value?: string }[];
  initialEntryDate?: string;
}

const emptyForm = (): QuickFormData => ({
  productName: '',
  category: 'Machinery',
  brand: '',
  model: '',
  serialNo: '',
  status: 'Active',
  machineId: null,
  machineArea: '',
  division: '',
  department: '',
  specs: [],
});

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export const QuickAddAssetModal: React.FC<QuickAddAssetModalProps> = ({ isOpen, onClose, onSaved, onOpenFullDetails }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<AssetProduct[]>([]);
  const [machinePartsList, setMachinePartsList] = useState<MachinePart[]>([]);
  const [isLoadingMachines, setIsLoadingMachines] = useState(false);

  const [formData, setFormData] = useState<QuickFormData>(emptyForm());
  const [selectedMachine, setSelectedMachine] = useState<MachinePart | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [machineSearchQuery, setMachineSearchQuery] = useState('');
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [pendingMachineToSelect, setPendingMachineToSelect] = useState<MachinePart | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(emptyForm());
    setSelectedMachine(null);
    setHasUserEdited(false);

    assetApi.getProducts().then(setAllProducts).catch(() => {});
    setIsLoadingMachines(true);
    assetApi
      .getMachinePartsList()
      .then(setMachinePartsList)
      .catch(() => {})
      .finally(() => setIsLoadingMachines(false));
  }, [isOpen]);

  const machineToAssetMap = useMemo(() => {
    const map = new Map<string, AssetProduct>();
    for (const p of allProducts) {
      if (p.machineId) map.set(String(p.machineId), p);
    }
    return map;
  }, [allProducts]);

  const filteredMachines = useMemo(() => {
    if (!machineSearchQuery.trim()) return machinePartsList;
    const q = machineSearchQuery.toLowerCase();
    return machinePartsList.filter(
      (m) =>
        m.machine_name?.toLowerCase().includes(q) ||
        m.machine_area?.toLowerCase().includes(q) ||
        m.machine_division?.toLowerCase().includes(q) ||
        m.machine_department?.toLowerCase().includes(q)
    );
  }, [machinePartsList, machineSearchQuery]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasUserEdited(true);
  };

  const applyMachineSelection = (machine: MachinePart) => {
    setSelectedMachine(machine);
    setIsDropdownOpen(false);
    setMachineSearchQuery('');

    const partSpecs = Array.isArray(machine.part_name)
      ? machine.part_name.filter(Boolean).map((p) => ({ name: p }))
      : machine.part_name
      ? [{ name: machine.part_name }]
      : [];

    setFormData((prev) => ({
      ...prev,
      productName: machine.machine_name || prev.productName,
      category: 'Machinery',
      machineId: machine.id,
      initialEntryDate: machine.created_at || prev.initialEntryDate || new Date().toISOString(),
      machineArea: machine.machine_area || '',
      division: machine.machine_division || '',
      department: machine.machine_department || '',
      specs: partSpecs,
    }));
    setHasUserEdited(false);
    toast.success(`Imported data from ${machine.machine_name}`);
  };

  const handleSelectMachineClick = (machine: MachinePart) => {
    if (hasUserEdited) {
      setPendingMachineToSelect(machine);
      setShowOverwriteConfirm(true);
    } else {
      applyMachineSelection(machine);
    }
  };

  const confirmMachineOverwrite = () => {
    if (pendingMachineToSelect) applyMachineSelection(pendingMachineToSelect);
    setShowOverwriteConfirm(false);
    setPendingMachineToSelect(null);
  };

  const handleClearMachine = () => {
    setSelectedMachine(null);
    setFormData((prev) => ({ ...prev, machineId: null, machineArea: '', division: '', department: '', specs: [] }));
    setHasUserEdited(false);
  };

  const handleToggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast('🎙️ Listening... Say asset name, category, brand, and serial number', { duration: 4000 });
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript as string;
        parseSpokenAsset(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => {
        setIsListening(false);
        toast.error('Could not capture audio clearly. Please try again.');
      };
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const parseSpokenAsset = (text: string) => {
    let extractedCategory = 'Machinery';
    if (/laptop|computer|printer|server|monitor|it/i.test(text)) extractedCategory = 'IT';
    else if (/chair|table|desk|cabinet|furniture/i.test(text)) extractedCategory = 'Furniture';
    else if (/drill|wrench|welder|tool/i.test(text)) extractedCategory = 'Tools';
    else if (/pump|motor|excavator|dumper|generator|compressor|machine/i.test(text)) extractedCategory = 'Machinery';

    let extractedSerial = '';
    const snMatch = text.match(/serial(?:\s+number)?\s+([a-zA-Z0-9_-]+)/i);
    if (snMatch) extractedSerial = snMatch[1];

    let extractedBrand = '';
    const brandList = ['CAT', 'Caterpillar', 'Tata', 'Komatsu', 'Dell', 'HP', 'Lenovo', 'Bosch', 'Siemens', 'Toyota'];
    for (const b of brandList) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(text)) {
        extractedBrand = b;
        break;
      }
    }

    setFormData((prev) => ({
      ...prev,
      productName: text.replace(/serial(?:\s+number)?\s+[a-zA-Z0-9_-]+/i, '').trim() || prev.productName,
      category: extractedCategory,
      brand: extractedBrand || prev.brand,
      serialNo: extractedSerial || prev.serialNo,
    }));
    setHasUserEdited(true);
    toast.success('Voice details applied!');
  };

  const handleSubmit = async (e: React.FormEvent, fillMoreDetails = false) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      toast.error('Asset Name is required');
      return;
    }

    setIsLoading(true);
    try {
      const payload: NewAssetProduct = {
        ...formData,
        type: 'Asset',
      } as NewAssetProduct;
      const res = await assetApi.addProduct(payload);
      toast.success('Asset created successfully!');
      onSaved();
      onClose();
      if (fillMoreDetails) onOpenFullDetails(res);
    } catch (err) {
      console.error('Failed to create asset:', err);
      toast.error('Failed to create asset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const existingLinkedAsset = selectedMachine ? machineToAssetMap.get(String(selectedMachine.id)) : null;

  return (
    <MacModal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Add Asset"
      subtitle="Create in seconds • Fill details anytime"
      icon={<Zap size={18} className="fill-current" />}
      maxWidth="lg"
      bodyClassName="space-y-4"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-input text-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => handleSubmit(e, true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            >
              Save & Fill More
            </button>
            <button
              type="submit"
              form="quick-add-asset-form"
              disabled={isLoading}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check size={16} />
              <span>{isLoading ? 'Saving...' : 'Save Asset'}</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="flex justify-end -mt-1 -mb-2">
        <button
          type="button"
          onClick={handleToggleVoice}
          className={`p-2 rounded-xl border transition-all cursor-pointer ${
            isListening ? 'bg-destructive text-destructive-foreground border-destructive animate-pulse' : 'bg-muted hover:bg-muted/70 text-foreground border-border'
          }`}
          title="Voice Dictate Asset"
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>

      {showOverwriteConfirm && (
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-900 dark:text-amber-300 text-xs flex flex-col gap-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
            <span>Replace manually edited fields?</span>
          </div>
          <p>Selecting "{pendingMachineToSelect?.machine_name}" will replace your current edits with this machine's details.</p>
          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => {
                setShowOverwriteConfirm(false);
                setPendingMachineToSelect(null);
              }}
              className="px-3 py-1 bg-background border border-amber-300 dark:border-amber-500/30 rounded-lg font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmMachineOverwrite}
              className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700"
            >
              Replace
            </button>
          </div>
        </div>
      )}

      {/* Create From Existing Machine */}
      <div className="space-y-1.5 p-3.5 bg-muted/40 border border-border rounded-xl">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu size={14} className="text-primary" />
            <span>Create From Existing Machine</span>
          </label>
          {selectedMachine && (
            <button
              type="button"
              onClick={handleClearMachine}
              className="text-[11px] text-destructive hover:text-destructive/80 font-semibold flex items-center gap-0.5 cursor-pointer"
            >
              Clear Machine
            </button>
          )}
        </div>

        {selectedMachine ? (
          <div className="p-2.5 bg-background border border-primary/20 rounded-lg shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                {selectedMachine.machine_name}
              </span>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-semibold">ID #{selectedMachine.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground pt-1 border-t border-border">
              <div>
                <span className="text-muted-foreground/70">Area:</span> {selectedMachine.machine_area || '—'}
              </div>
              <div>
                <span className="text-muted-foreground/70">Div:</span> {selectedMachine.machine_division || '—'}
              </div>
              <div>
                <span className="text-muted-foreground/70">Dept:</span> {selectedMachine.machine_department || '—'}
              </div>
            </div>

            {existingLinkedAsset && (
              <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-md text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Already linked to Asset: {existingLinkedAsset.sn}</p>
                  <p>An asset record ({existingLinkedAsset.productName}) already references this machine.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-xs font-semibold text-foreground flex items-center justify-between hover:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <span className="text-muted-foreground flex items-center gap-2">
                <Search size={14} /> Search & select existing machine...
              </span>
              <ChevronDown size={15} className={`text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-popover border border-border rounded-xl shadow-xl p-2 space-y-1.5 max-h-60 overflow-y-auto">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={machineSearchQuery}
                    onChange={(e) => setMachineSearchQuery(e.target.value)}
                    placeholder="Filter by name, area, department..."
                    className="w-full pl-8 pr-3 py-1.5 bg-muted/40 border border-input rounded-lg text-xs outline-none focus:bg-background focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>

                <div className="divide-y divide-border">
                  {filteredMachines.length > 0 ? (
                    filteredMachines.map((m) => {
                      const isAlreadyLinked = machineToAssetMap.has(String(m.id));
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectMachineClick(m)}
                          className="w-full text-left p-2 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold text-foreground group-hover:text-primary truncate">{m.machine_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {[m.machine_area, m.machine_department, m.machine_division].filter(Boolean).join(' • ') || 'No location details'}
                            </p>
                          </div>
                          {isAlreadyLinked && (
                            <span className="text-[9px] bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold whitespace-nowrap shrink-0">
                              Linked
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      {isLoadingMachines ? 'Loading machines...' : 'No matching machines found.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {selectedMachine ? 'Asset Details (Auto-Populated)' : 'Or Enter Manually'}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form id="quick-add-asset-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center justify-between">
            <span>
              Asset / Equipment Name <span className="text-destructive">*</span>
            </span>
            {selectedMachine && <span className="text-[10px] text-primary font-semibold lowercase">from machine</span>}
          </label>
          <input
            type="text"
            name="productName"
            value={formData.productName}
            onChange={handleChange}
            placeholder="e.g. CAT 320D Excavator, Dell Laptop"
            required
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
              Category <span className="text-destructive">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
            >
              <option value="Machinery">Machinery</option>
              <option value="IT">IT</option>
              <option value="Electronics">Electronics</option>
              <option value="Furniture">Furniture</option>
              <option value="Tools">Tools</option>
              <option value="Vehicles">Vehicles</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-semibold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Brand / Make</label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g. Caterpillar, Dell"
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Model Number</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="e.g. 320D, Latitude 5420"
              className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Manufacturer Serial Number</label>
          <input
            type="text"
            name="serialNo"
            value={formData.serialNo}
            onChange={handleChange}
            placeholder="e.g. SN-89481249"
            className="w-full px-3.5 py-2.5 bg-background border border-input rounded-xl text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
          <p className="text-[11px] text-muted-foreground">System Asset ID will be auto-generated sequentially.</p>
        </div>
      </form>
    </MacModal>
  );
};

export default QuickAddAssetModal;
