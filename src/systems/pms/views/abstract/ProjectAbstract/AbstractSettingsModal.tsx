// @ts-nocheck
import React, { useState } from 'react';
import { AbstractInputs } from '@/systems/pms/utils/abstractTypes';
import { Settings, RefreshCw, RotateCcw, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inputs: AbstractInputs;
  onUpdateInputs: (inputs: AbstractInputs) => void;
  onResetToSeed: () => void;
  onRefreshCAD: () => void;
}

export default function AbstractSettingsModal({
  isOpen,
  onClose,
  inputs,
  onUpdateInputs,
  onResetToSeed,
  onRefreshCAD
}: Props) {
  const [labels, setLabels] = useState(inputs.labels_config);

  if (!isOpen) return null;

  const handleSaveLabels = () => {
    onUpdateInputs({
      ...inputs,
      labels_config: labels
    });
    toast.success('Terminology labels updated');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Project Abstract Settings & Terminology</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Section 1: Configurable Terms & Labels */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Configurable Display Labels (Terms)
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">PDN Label</label>
              <input
                type="text"
                value={labels.pdn}
                onChange={(e) => setLabels({ ...labels, pdn: e.target.value })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">CADWM Label</label>
              <input
                type="text"
                value={labels.cadwm}
                onChange={(e) => setLabels({ ...labels, cadwm: e.target.value })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">RMT Label</label>
              <input
                type="text"
                value={labels.rmt}
                onChange={(e) => setLabels({ ...labels, rmt: e.target.value })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">RA1 Bill Label</label>
              <input
                type="text"
                value={labels.ra1}
                onChange={(e) => setLabels({ ...labels, ra1: e.target.value })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">RA2 Bill Label</label>
              <input
                type="text"
                value={labels.ra2}
                onChange={(e) => setLabels({ ...labels, ra2: e.target.value })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">RA3 Bill Label</label>
              <input
                type="text"
                value={labels.ra3}
                onChange={(e) => setLabels({ ...labels, ra3: e.target.value })}
                className="w-full p-1.5 border border-slate-300 rounded text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: External CADWM IMPORTRANGE Sync */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">External CADWM IMPORTRANGE Sync</span>
            <button
              type="button"
              onClick={onRefreshCAD}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold cursor-pointer"
            >
              <RefreshCw size={12} /> Sync / Refresh Now
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Replaces broken Google Sheet IMPORTRANGE dependency with a decoupled local store.
            Last refreshed: {inputs.cad_last_refreshed ? new Date(inputs.cad_last_refreshed).toLocaleString() : 'Never'}
          </p>
        </div>

        {/* Section 3: Reset to Acceptance Test Seed Data */}
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Original Acceptance Test Seed</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all values back to original Acceptance Test seed data (Injewada..Palora)?')) {
                  onResetToSeed();
                  onClose();
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold cursor-pointer"
            >
              <RotateCcw size={12} /> Reset to Seed Data
            </button>
          </div>
          <p className="text-[11px] text-amber-800">
            Resets all quantities, adjustments, rates, and survey points to exact acceptance test criteria.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveLabels}
            className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold cursor-pointer"
          >
            <Check size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
