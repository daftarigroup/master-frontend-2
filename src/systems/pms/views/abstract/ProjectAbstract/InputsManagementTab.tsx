// @ts-nocheck
import React, { useState } from 'react';
import {
  Minor,
  Adjustment,
  AbstractInputs,
  STANDARD_PIPE_DIAS
} from '@/systems/pms/utils/abstractTypes';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Save,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Info,
  DollarSign,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  minors: Minor[];
  plannedQtyByMinor: Record<string, Record<number, number>>;
  adjustments: Adjustment[];
  inputs: AbstractInputs;
  onUpdatePlannedQty: (planned: Record<string, Record<number, number>>) => void;
  onUpdateAdjustments: (adjustments: Adjustment[]) => void;
  onUpdateInputs: (inputs: AbstractInputs) => void;
}

export default function InputsManagementTab({
  minors,
  plannedQtyByMinor,
  adjustments,
  inputs,
  onUpdatePlannedQty,
  onUpdateAdjustments,
  onUpdateInputs
}: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'adjustments' | 'rates_billing' | 'planned' | 'cadwm'>('adjustments');

  // New adjustment form state
  const [newAdjMinor, setNewAdjMinor] = useState(minors[0]?.id || '');
  const [newAdjDia, setNewAdjDia] = useState<number>(160);
  const [newAdjVal, setNewAdjVal] = useState<number>(-2.91);
  const [newAdjNote, setNewAdjNote] = useState('172.69-175.6 -2.91 160MM Dia 175.6m');

  // Handle Rate change
  const handleRateChange = (dia: number, val: number) => {
    const updated = {
      ...inputs,
      rate: {
        ...inputs.rate,
        [dia]: val
      }
    };
    onUpdateInputs(updated);
  };

  // Handle RA1 Qty change
  const handleRa1Change = (dia: number, val: number) => {
    const updated = {
      ...inputs,
      ra1_qty: {
        ...inputs.ra1_qty,
        [dia]: val
      }
    };
    onUpdateInputs(updated);
  };

  // Handle RA2 Recorded change
  const handleRa2Change = (dia: number, val: number) => {
    const updated = {
      ...inputs,
      recorded_upto_ra2: {
        ...inputs.recorded_upto_ra2,
        [dia]: val
      }
    };
    onUpdateInputs(updated);
  };

  // Handle CAD Qty change
  const handleCadQtyChange = (minorId: string, dia: number, val: number) => {
    const currentMinorCad = inputs.cad_qty?.[minorId] || {};
    const updated = {
      ...inputs,
      cad_qty: {
        ...inputs.cad_qty,
        [minorId]: {
          ...currentMinorCad,
          [dia]: val
        }
      }
    };
    onUpdateInputs(updated);
  };

  // Handle CAD Previous Recorded change
  const handleCadPrevRecordedChange = (dia: number, val: number) => {
    const updated = {
      ...inputs,
      cad_previous_recorded: {
        ...inputs.cad_previous_recorded,
        [dia]: val
      }
    };
    onUpdateInputs(updated);
  };

  // Add adjustment
  const handleAddAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdjMinor || !newAdjDia || newAdjVal === 0) {
      toast.error('Please enter minor, diameter, and non-zero adjustment value');
      return;
    }

    const newAdj: Adjustment = {
      id: `adj_${Date.now()}`,
      minor_id: newAdjMinor,
      pipe_dia: Number(newAdjDia),
      value_m: Number(newAdjVal),
      note: newAdjNote.trim() || 'Manual adjustment',
      created_at: new Date().toISOString(),
      created_by: 'Engineer'
    };

    onUpdateAdjustments([...adjustments, newAdj]);
    toast.success('Adjustment record added');
    setNewAdjNote('');
    setNewAdjVal(0);
  };

  // Delete adjustment
  const handleDeleteAdjustment = (id: string) => {
    onUpdateAdjustments(adjustments.filter(a => a.id !== id));
    toast.success('Adjustment removed');
  };

  // Planned qty change
  const handlePlannedQtyChange = (minorId: string, dia: number, val: number) => {
    const current = plannedQtyByMinor[minorId] || {};
    const updated = {
      ...plannedQtyByMinor,
      [minorId]: {
        ...current,
        [dia]: val
      }
    };
    onUpdatePlannedQty(updated);
  };

  return (
    <div className="space-y-4">
      {/* Sub Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('adjustments')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'adjustments'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Adjustments ({adjustments.length})
        </button>
        <button
          onClick={() => setActiveSubTab('rates_billing')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'rates_billing'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Rates & Billing Inputs (RA1, RA2)
        </button>
        <button
          onClick={() => setActiveSubTab('cadwm')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'cadwm'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          CADWM Quantities & Reference
        </button>
        <button
          onClick={() => setActiveSubTab('planned')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'planned'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Planned Quantities (Design Scope)
        </button>
      </div>

      {/* 1. ADJUSTMENTS TAB */}
      {activeSubTab === 'adjustments' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-purple-900 text-xs flex items-start gap-2">
            <Info size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Explicit Adjustment Records (Improvement 5):</p>
              <p>
                Adjustments are stored as explicit audit records with explanations, rather than hardcoded inside spreadsheet formulas.
                Examples: Injewada 160 mm = -2.91 m (&quot;172.69-175.6 -2.91 160MM Dia 175.6m&quot;); Sonkund 450 mm = +9 m.
              </p>
            </div>
          </div>

          {/* Add Adjustment Form */}
          <form onSubmit={handleAddAdjustment} className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Add New Executed Length Adjustment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Minor / Village</label>
                <select
                  value={newAdjMinor}
                  onChange={(e) => setNewAdjMinor(e.target.value)}
                  className="w-full text-xs p-1.5 border border-slate-300 rounded"
                >
                  {minors.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Pipe Dia</label>
                <select
                  value={newAdjDia}
                  onChange={(e) => setNewAdjDia(Number(e.target.value))}
                  className="w-full text-xs p-1.5 border border-slate-300 rounded font-mono"
                >
                  {STANDARD_PIPE_DIAS.map(d => (
                    <option key={d} value={d}>{d} mm</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Correction (m, +/-)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAdjVal}
                  onChange={(e) => setNewAdjVal(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. -2.91 or +9"
                  className="w-full text-xs p-1.5 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={newAdjNote}
                  onChange={(e) => setNewAdjNote(e.target.value)}
                  placeholder="e.g. Chainage overlap / measurement correction"
                  className="w-full text-xs p-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold cursor-pointer transition-colors"
              >
                <Plus size={13} /> Add Adjustment Record
              </button>
            </div>
          </form>

          {/* Existing Adjustments Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-xs bg-white">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-200">Minor</th>
                  <th className="px-3 py-2 border-r border-slate-200 text-center">Pipe Dia</th>
                  <th className="px-3 py-2 border-r border-slate-200 text-right">Adjustment Value</th>
                  <th className="px-3 py-2 border-r border-slate-200">Reason / Note</th>
                  <th className="px-3 py-2 border-r border-slate-200 text-center">Created Date</th>
                  <th className="px-3 py-2 text-center w-14">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map(adj => {
                  const minorObj = minors.find(m => m.id === adj.minor_id);
                  return (
                    <tr key={adj.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-800 border-r border-slate-200">
                        {minorObj?.name || adj.minor_id}
                      </td>
                      <td className="px-3 py-2 font-mono text-center border-r border-slate-200 font-semibold">
                        {adj.pipe_dia} mm
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-bold border-r border-slate-200 ${
                        adj.value_m < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        {adj.value_m > 0 ? `+${adj.value_m}` : adj.value_m} m
                      </td>
                      <td className="px-3 py-2 text-slate-700 border-r border-slate-200">
                        {adj.note}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-400 text-[10px] font-mono border-r border-slate-200">
                        {new Date(adj.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDeleteAdjustment(adj.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete adjustment"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. RATES & BILLING INPUTS TAB */}
      {activeSubTab === 'rates_billing' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-xs flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Rate Validation (Improvement 2):</p>
              <p>
                In the original spreadsheet, rates were silently missing for 160 mm, 180 mm, and 355+ mm, resulting in 0 billing amount.
                Highlighted fields below indicate diameters where quantities exist but rate is 0/missing.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-xs bg-white">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 border-r border-slate-200">Diameter (mm)</th>
                  <th className="px-3 py-2.5 border-r border-slate-200 text-right">Billing Rate (₹ / m)</th>
                  <th className="px-3 py-2.5 border-r border-slate-200 text-right">RA1 Quantity (m)</th>
                  <th className="px-3 py-2.5 border-r border-slate-200 text-right">Recorded Upto RA2 (m)</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {STANDARD_PIPE_DIAS.map(dia => {
                  const rate = inputs.rate?.[dia] || 0;
                  const ra1 = inputs.ra1_qty?.[dia] || 0;
                  const ra2 = inputs.recorded_upto_ra2?.[dia] || 0;
                  const isMissingRate = rate === 0 && (ra1 > 0 || ra2 > 0);

                  return (
                    <tr key={dia} className={`hover:bg-slate-50 ${isMissingRate ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">
                        {dia} mm
                      </td>

                      {/* Rate Input */}
                      <td className="px-2 py-1.5 text-right border-r border-slate-200">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-400 text-[10px]">₹</span>
                          <input
                            type="number"
                            step="0.1"
                            value={rate || ''}
                            onChange={(e) => handleRateChange(dia, parseFloat(e.target.value) || 0)}
                            placeholder="0.0"
                            className={`w-24 text-right px-2 py-1 border rounded text-xs font-mono ${
                              isMissingRate ? 'border-amber-400 bg-amber-50 font-bold' : 'border-slate-300'
                            }`}
                          />
                        </div>
                      </td>

                      {/* RA1 Quantity */}
                      <td className="px-2 py-1.5 text-right border-r border-slate-200">
                        <input
                          type="number"
                          step="0.1"
                          value={ra1 || ''}
                          onChange={(e) => handleRa1Change(dia, parseFloat(e.target.value) || 0)}
                          placeholder="0.0"
                          className="w-24 text-right px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                        />
                      </td>

                      {/* Recorded Upto RA2 */}
                      <td className="px-2 py-1.5 text-right border-r border-slate-200">
                        <input
                          type="number"
                          step="0.1"
                          value={ra2 || ''}
                          onChange={(e) => handleRa2Change(dia, parseFloat(e.target.value) || 0)}
                          placeholder="0.0"
                          className="w-24 text-right px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                        />
                      </td>

                      <td className="px-3 py-2 text-center">
                        {isMissingRate ? (
                          <span className="text-amber-700 font-bold text-[10px] bg-amber-100 px-2 py-0.5 rounded">
                            ⚠️ Missing Rate
                          </span>
                        ) : rate > 0 ? (
                          <span className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                            ✓ Defined
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CADWM QUANTITIES TAB */}
      {activeSubTab === 'cadwm' && (
        <div className="space-y-4">
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-cyan-900 text-xs flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-cyan-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">CADWM Work Quantities (Section 1 & 5):</p>
                <p>
                  Entered or imported quantities per minor and pipe diameter.
                  Sonkund CAD quantities originally derived from another Google Sheet via IMPORTRANGE.
                  We store them locally so there is no broken external spreadsheet dependency.
                </p>
              </div>
            </div>
          </div>

          {/* Configurable Label for Hand-Entered Previous Recorded Row */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex-1 max-w-md">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Custom Label for Previous Recorded CADWM Row:
              </label>
              <input
                type="text"
                value={inputs.cad_previous_recorded_label}
                onChange={(e) => onUpdateInputs({ ...inputs, cad_previous_recorded_label: e.target.value })}
                className="w-full text-xs p-1.5 border border-slate-300 rounded"
              />
            </div>
            <span className="text-[11px] text-slate-500 italic">
              Original values: 4,990 m (125mm) and 11,726.5 m (140mm)
            </span>
          </div>

          {/* CADWM Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-xs bg-white">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-200">Minor</th>
                  {[125, 140, 160, 200, 250, 315].map(d => (
                    <th key={d} className="px-3 py-2 border-r border-slate-200 text-right">{d} mm</th>
                  ))}
                  <th className="px-3 py-2 text-right">Total CAD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {minors.map(m => {
                  const mCad = inputs.cad_qty?.[m.id] || {};
                  let mTotal = 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-800 border-r border-slate-200">{m.name}</td>
                      {[125, 140, 160, 200, 250, 315].map(dia => {
                        const v = mCad[dia] || 0;
                        mTotal += v;
                        return (
                          <td key={dia} className="px-2 py-1 text-right border-r border-slate-200">
                            <input
                              type="number"
                              step="0.1"
                              value={v || ''}
                              onChange={(e) => handleCadQtyChange(m.id, dia, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-20 text-right px-1.5 py-0.5 border border-slate-300 rounded text-xs font-mono"
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-bold text-cyan-900 bg-cyan-50/30">
                        {mTotal.toFixed(1)} m
                      </td>
                    </tr>
                  );
                })}

                {/* Hand Entered Previous Recorded Row */}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <td className="px-3 py-2 text-slate-700 border-r border-slate-200 italic">
                    {inputs.cad_previous_recorded_label || 'Previous Recorded CAD (Ref)'}
                  </td>
                  {[125, 140, 160, 200, 250, 315].map(dia => {
                    const v = inputs.cad_previous_recorded?.[dia] || 0;
                    return (
                      <td key={dia} className="px-2 py-1 text-right border-r border-slate-200">
                        <input
                          type="number"
                          step="0.1"
                          value={v || ''}
                          onChange={(e) => handleCadPrevRecordedChange(dia, parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-20 text-right px-1.5 py-0.5 border border-slate-300 rounded text-xs font-mono font-bold"
                        />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-bold text-slate-900">
                    {(Object.values(inputs.cad_previous_recorded || {}).reduce((a, b) => a + Number(b || 0), 0)).toFixed(1)} m
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PLANNED QUANTITIES TAB */}
      {activeSubTab === 'planned' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Total Planned Pipe Scope (Dia-Wise): </span>
            This planned scope is used to calculate completion % per diameter and overall minor execution %.
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-xs bg-white">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 border-r border-slate-200">Minor</th>
                  {STANDARD_PIPE_DIAS.map(d => (
                    <th key={d} className="px-2 py-2 border-r border-slate-200 text-right min-w-[70px]">{d} mm</th>
                  ))}
                  <th className="px-3 py-2 text-right">Planned Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {minors.map(m => {
                  const mPlanned = plannedQtyByMinor[m.id] || {};
                  let mTotal = 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-800 border-r border-slate-200">{m.name}</td>
                      {STANDARD_PIPE_DIAS.map(dia => {
                        const v = mPlanned[dia] || 0;
                        mTotal += v;
                        return (
                          <td key={dia} className="px-1 py-1 text-right border-r border-slate-200">
                            <input
                              type="number"
                              value={v || ''}
                              onChange={(e) => handlePlannedQtyChange(m.id, dia, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-16 text-right px-1 py-0.5 border border-slate-300 rounded text-xs font-mono"
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-bold text-indigo-900 bg-indigo-50/30">
                        {mTotal.toLocaleString()} m
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
