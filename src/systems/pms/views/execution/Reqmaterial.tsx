// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Trash2, Check, Paperclip, PackagePlus, Building2, Calendar, History, ChevronDown, ChevronUp
} from 'lucide-react';
import { getReqMaterials, saveReqMaterial } from '@/systems/pms/utils/storageManager';
import { generateId, fileToBase64, getTodayDate } from '@/systems/pms/utils/helpers';
import ModalForm from '@/systems/pms/components/ModalForm';
import ModalAlert from '@/systems/pms/components/ModalAlert';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';

// Fixed Group Head list
export const GROUP_HEADS = [
  'Aggregates', 'Cement', 'Consultancy Services', 'Diesel', 'Hdpe Pipes',
  'Murum', 'Ready Mix Concrete', 'Sand', 'Site Consumables', 'Specials',
  'Structural Steel', 'TMT'
];

// Dummy product catalogue, grouped by Group Head, each with its UOM
export const PRODUCTS_BY_GROUP_HEAD = {
  'Aggregates': [
    { name: '10mm Aggregate', uom: 'MT' },
    { name: '20mm Aggregate', uom: 'MT' },
    { name: '40mm Aggregate', uom: 'MT' },
  ],
  'Cement': [
    { name: 'OPC 53 Grade Cement', uom: 'Bags' },
    { name: 'PPC Cement', uom: 'Bags' },
  ],
  'Consultancy Services': [
    { name: 'Structural Design Consultancy', uom: 'Nos' },
    { name: 'Soil Testing Consultancy', uom: 'Nos' },
  ],
  'Diesel': [
    { name: 'Diesel (HSD)', uom: 'Liters' },
  ],
  'Hdpe Pipes': [
    { name: 'HDPE Pipe 110mm', uom: 'Meters' },
    { name: 'HDPE Pipe 160mm', uom: 'Meters' },
  ],
  'Murum': [
    { name: 'Murum Filling Material', uom: 'Cum' },
  ],
  'Ready Mix Concrete': [
    { name: 'M25 Grade RMC', uom: 'Cum' },
    { name: 'M30 Grade RMC', uom: 'Cum' },
  ],
  'Sand': [
    { name: 'River Sand', uom: 'Cum' },
    { name: 'M-Sand', uom: 'Cum' },
  ],
  'Site Consumables': [
    { name: 'Binding Wire', uom: 'Kg' },
    { name: 'Safety Helmet', uom: 'Nos' },
  ],
  'Specials': [
    { name: 'Waterproofing Chemical', uom: 'Liters' },
  ],
  'Structural Steel': [
    { name: 'ISMB 200', uom: 'MT' },
    { name: 'Angle Steel 50x50x6', uom: 'MT' },
  ],
  'TMT': [
    { name: 'TMT Fe 500 12mm', uom: 'MT' },
    { name: 'TMT Fe 500 16mm', uom: 'MT' },
    { name: 'TMT Fe 550 20mm', uom: 'MT' },
  ],
};

export default function Reqmaterial({ isOpen, onClose, project, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false, type: 'success', title: '', message: ''
  });

  const initialItem = () => ({
    groupHead: '',
    areaOfUse: project?.projectLocation || '',
    productName: '',
    qty: '',
    uom: '',
    expectedRequirement: '',
    attachment: '',
    specification: ''
  });

  const [formData, setFormData] = useState({
    indentDate: getTodayDate(),
    indenterName: '',
    indentStatus: 'Select',
    items: [initialItem()]
  });

  // Reset the form whenever the modal is opened for a project
  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        indentDate: getTodayDate(),
        indenterName: '',
        indentStatus: 'Select',
        items: [initialItem()]
      });
      setShowHistory(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  // Past requirements already submitted for this project - newest first
  const history = getReqMaterials().filter(r => r.projectNo === project.serialNo).reverse();

  const handleAddItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, initialItem()] }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) {
      toast.error('At least one product is required');
      return;
    }
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'groupHead') {
      // Group head changed - product/UOM no longer valid, reset them
      newItems[index].productName = '';
      newItems[index].uom = '';
    }

    if (field === 'productName') {
      const catalogue = PRODUCTS_BY_GROUP_HEAD[newItems[index].groupHead] || [];
      const match = catalogue.find(p => p.name === value);
      newItems[index].uom = match ? match.uom : '';
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleFileChange = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      handleItemChange(index, 'attachment', base64);
      toast.success('Attachment added');
    } catch (error) {
      toast.error('Error reading file');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.indentDate) {
      toast.error('Indent Date is required');
      return;
    }
    if (!formData.indenterName.trim()) {
      toast.error('Indenter Name is required');
      return;
    }
    if (formData.indentStatus === 'Select' || !formData.indentStatus) {
      toast.error('Please select Indent Status');
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.groupHead || !item.productName || !item.qty || !item.areaOfUse) {
        toast.error(`Please fill all required fields for product ${i + 1}`);
        return;
      }
    }

    setLoading(true);

    const allReqs = getReqMaterials();
    const nextSn = allReqs.length + 1;
    const indentNo = `SI-${String(nextSn).padStart(4, '0')}`;
    const now = new Date();
    const timestamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newIndent = {
      id: generateId(),
      indentNo,
      timestamp,
      indentDate: formData.indentDate,
      projectNo: project.serialNo,
      projectName: project.projectName,
      indenterName: formData.indenterName,
      indentStatus: formData.indentStatus,
      items: formData.items.map((item, idx) => ({ ...item, itemCount: idx + 1 }))
    };

    saveReqMaterial(newIndent);

    setAlertConfig({
      isOpen: true,
      type: 'success',
      title: 'Requirement Added!',
      message: `Indent ${indentNo} has been successfully created with ${formData.items.length} product(s).`
    });

    setLoading(false);
    onSaved && onSaved();
    onClose();
  };

  return (
    <>
      <ModalForm
        isOpen={isOpen}
        onClose={onClose}
        title="Add Material Requirement"
        onSubmit={handleSubmit}
        submitText={loading ? 'Saving...' : 'Save'}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3 md:space-y-5">
          {/* Requirement History for this project - always visible, even when empty */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-[11px] md:text-xs font-bold text-gray-600 uppercase tracking-wide">
                <History size={14} className="text-indigo-500" /> Requirement History ({history.length})
              </span>
              {showHistory ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {showHistory && (
              history.length > 0 ? (
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {history.map(h => (
                    <div key={h.id} className="p-2.5 text-[11px] space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-indigo-600">{h.indentNo}</span>
                        <span className="text-gray-400">{h.indentDate}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          h.indentStatus === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {h.indentStatus}
                        </span>
                        <span className="text-gray-500">{h.indenterName}</span>
                      </div>
                      <p className="text-gray-600 truncate">
                        {h.items.map(it => `${it.productName} (${it.qty || '-'} ${it.uom || ''})`).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-[11px] text-gray-400 text-center italic">
                  No requirements submitted yet for this project.
                </div>
              )
            )}
          </div>

          {/* Common Indent Fields */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 pb-3 md:pb-4 border-b border-gray-100">
            <div className="space-y-1">
              <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Indent Date *</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                <input
                  type="date"
                  value={formData.indentDate}
                  onChange={(e) => setFormData({ ...formData, indentDate: e.target.value })}
                  className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Project Name</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 h-[34px] md:h-[38px]">
                <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-[13px] md:text-[15px] text-gray-800 truncate">{project.projectName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Indenter Name *</label>
              <input
                type="text"
                value={formData.indenterName}
                onChange={(e) => setFormData({ ...formData, indenterName: e.target.value })}
                placeholder="Enter name"
                className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Indent Status *</label>
              <SearchableDropdown
                options={[
                  { value: 'Critical', label: 'Critical' },
                  { value: 'Non-Critical', label: 'Non-Critical' }
                ]}
                value={formData.indentStatus === 'Select' ? '' : formData.indentStatus}
                onChange={(val) => setFormData({ ...formData, indentStatus: val })}
                placeholder="Select Status"
              />
            </div>
          </div>

          <div className="pt-1 hidden md:block">
            <h3 className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mb-1">Products</h3>
          </div>

          {/* Product Items */}
          <div className="space-y-3 md:space-y-6">
            {formData.items.map((item, index) => (
              <div key={index} className="relative p-2.5 md:p-5 bg-gray-50/50 rounded-xl border border-gray-200 space-y-2.5 md:space-y-4 transition-all hover:bg-white hover:shadow-md">
                <div className="flex justify-between items-center border-b border-gray-200/50 pb-2 mb-1">
                  <span className="text-[9px] md:text-xs text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full">Product #{index + 1}</span>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-gray-300 hover:text-red-500 transition-all hover:scale-110 active:scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-2 md:gap-x-4 md:gap-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Group Head *</label>
                    <SearchableDropdown
                      options={GROUP_HEADS.map(g => ({ value: g, label: g }))}
                      value={item.groupHead}
                      onChange={(val) => handleItemChange(index, 'groupHead', val)}
                      placeholder="Select Group Head"
                    />
                  </div>

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Product Name *</label>
                    <SearchableDropdown
                      options={(PRODUCTS_BY_GROUP_HEAD[item.groupHead] || []).map(p => ({ value: p.name, label: p.name }))}
                      value={item.productName}
                      onChange={(val) => handleItemChange(index, 'productName', val)}
                      placeholder={item.groupHead ? 'Select Product' : 'Select Group Head first'}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Area Of Use *</label>
                    <input
                      type="text"
                      value={item.areaOfUse}
                      onChange={(e) => handleItemChange(index, 'areaOfUse', e.target.value)}
                      placeholder="e.g. Site Office"
                      className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Qty *</label>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                      className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">UOM</label>
                    <input
                      type="text"
                      value={item.uom}
                      readOnly
                      placeholder="Auto"
                      className="w-full border border-gray-200 bg-gray-100 text-gray-600 rounded px-2 py-1 focus:outline-none text-[13px] md:text-[15px] h-[34px] md:h-[38px] cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Expected Requirement</label>
                    <input
                      type="date"
                      value={item.expectedRequirement}
                      onChange={(e) => handleItemChange(index, 'expectedRequirement', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Specification</label>
                    <input
                      type="text"
                      value={item.specification}
                      onChange={(e) => handleItemChange(index, 'specification', e.target.value)}
                      placeholder="Details..."
                      className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] h-[34px] md:h-[38px]"
                    />
                  </div>

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="block text-[10px] md:text-[12px] text-gray-500 uppercase tracking-tighter">Attachment</label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 cursor-pointer group">
                        <div className={`flex items-center justify-center gap-2 border border-dashed rounded h-[34px] md:h-[38px] transition-all
                          ${item.attachment ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600'}
                        `}>
                          {item.attachment ? <Check size={14} /> : <Paperclip size={14} />}
                          <span className="text-[13px] md:text-[15px] uppercase tracking-wider">
                            {item.attachment ? 'Attached' : 'Browse'}
                          </span>
                        </div>
                        <input
                          type="file"
                          onChange={(e) => handleFileChange(index, e)}
                          className="hidden"
                          accept="image/*"
                        />
                      </label>
                      {item.attachment && (
                        <button
                          type="button"
                          onClick={() => handleItemChange(index, 'attachment', '')}
                          className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] flex items-center justify-center text-gray-300 hover:text-red-500 bg-gray-50 rounded border border-gray-200 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Product Action Button */}
          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 transition-all active:scale-[0.98] text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm"
            >
              <PackagePlus size={16} />
              <span>Add Product</span>
            </button>
          </div>
        </div>
      </ModalForm>

      {/* Success Alert */}
      <ModalAlert
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
    </>
  );
}
