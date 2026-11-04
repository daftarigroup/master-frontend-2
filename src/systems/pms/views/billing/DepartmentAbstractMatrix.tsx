// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Search, Filter, Eye, Layers, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Table1CalculationResult, CalculatedRow } from '@/systems/pms/utils/billingEngine';
import type { MinorMeta } from '@/systems/pms/utils/table1SeedData';

interface Props {
  calcResult: Table1CalculationResult;
  selectedMinorFilter?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  ALL: { label: 'All Items', color: 'bg-gray-100 text-gray-800' },
  CCA: { label: 'Area CCA', color: 'bg-emerald-100 text-emerald-800' },
  HDPE_SUPPLY: { label: 'HDPE Pipe Supply (110-800mm)', color: 'bg-blue-100 text-blue-800' },
  PCCP_SUPPLY: { label: 'PCCP Pipe Supply (900mm)', color: 'bg-cyan-100 text-cyan-800' },
  EARTHWORK: { label: 'Earthwork & Bedding', color: 'bg-amber-100 text-amber-800' },
  HDPE_LAYING: { label: 'HDPE Laying & Jointing', color: 'bg-indigo-100 text-indigo-800' },
  PCCP_LAYING: { label: 'PCCP Laying & Jointing', color: 'bg-purple-100 text-purple-800' },
  AIR_VALVES: { label: 'Air Valves', color: 'bg-teal-100 text-teal-800' },
  AIR_VALVE_SHAFTS: { label: 'Air Valve Shafts', color: 'bg-sky-100 text-sky-800' },
  CONCRETE_STEEL: { label: 'Concrete & Steel', color: 'bg-stone-100 text-stone-800' },
  SLUICE_VALVES: { label: 'CI Sluice Valves', color: 'bg-rose-100 text-rose-800' },
  CADWM_WUA: { label: 'CADWM & WUA Activities', color: 'bg-green-100 text-green-800' },
  FLOW_METERS: { label: 'Electromagnetic Flow Meters', color: 'bg-violet-100 text-violet-800' },
  SPECIALS_TESTING: { label: 'Hydraulic Testing & Specials', color: 'bg-pink-100 text-pink-800' },
  STRUCTURES: { label: 'Civil Structures & Masonry', color: 'bg-orange-100 text-orange-800' },
  SOLAR_PLANNING: { label: 'Solar & Planning', color: 'bg-yellow-100 text-yellow-800' },
  OM: { label: '5-Year O&M', color: 'bg-red-100 text-red-800' },
};

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return '₹ ' + Math.round(val).toLocaleString('en-IN');
};

const formatQty = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return val.toLocaleString('en-IN', { maximumFractionDigits: 3 });
};

export default function DepartmentAbstractMatrix({ calcResult, selectedMinorFilter = 'ALL' }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showSupplyBlock, setShowSupplyBlock] = useState(true);

  const { items, minors, tenderGrandTotal, designGrandTotal, diffGrandTotal, pctDiffGrandTotal } = calcResult;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      // Exclude grand total or pure header rows from the scrollable body
      if (it.row >= 146 || it.category === 'HEADER') return false;

      // Supply block toggle
      if (!showSupplyBlock && it.isSupplyRow) return false;

      // Category filter
      if (selectedCategory !== 'ALL' && it.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = it.description.toLowerCase().includes(q);
        const matchesNo = it.itemNo.toLowerCase().includes(q);
        const matchesDia = it.pipeDiaMm ? String(it.pipeDiaMm).includes(q) : false;
        const matchesUnit = it.unit.toLowerCase().includes(q);
        if (!matchesDesc && !matchesNo && !matchesDia && !matchesUnit) return false;
      }

      return true;
    });
  }, [items, selectedCategory, searchQuery, showSupplyBlock]);

  // Minor list filtered if a specific minor is selected
  const displayedMinors = useMemo(() => {
    if (selectedMinorFilter === 'ALL') return minors;
    return minors.filter(m => m.id === selectedMinorFilter);
  }, [minors, selectedMinorFilter]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative min-w-[280px] max-w-md flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search description, pipe dia (e.g. 160), unit, item no..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Toggle Supply Block */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSupplyBlock}
                onChange={e => setShowSupplyBlock(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Show Supply Analysis (Rows 7-27)
            </label>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs font-semibold text-gray-500">
              Showing <span className="text-indigo-600 font-bold">{filteredItems.length}</span> items
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-[11px]">
          {Object.entries(CATEGORY_LABELS).map(([catKey, conf]) => (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === catKey
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {conf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table 1 Spreadsheet Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex flex-col flex-1 min-h-[500px]">
        <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[70vh]">
          <table className="w-full text-left border-collapse text-[11px]">
            {/* Table Header Row 1: Section Super-headers */}
            <thead className="bg-slate-900 text-white sticky top-0 z-30 shadow-sm">
              <tr>
                <th colSpan={5} className="py-2.5 px-3 font-bold border-r border-slate-700 text-left uppercase tracking-wider text-[11px]">
                  Bill Item Master (Schedule B)
                </th>
                {displayedMinors.map(m => (
                  <th key={m.id} colSpan={2} className="py-2.5 px-2 text-center font-bold border-r border-slate-700 uppercase tracking-tight bg-slate-800">
                    {m.name} <span className="text-slate-400 text-[10px]">({m.rd})</span>
                  </th>
                ))}
                <th colSpan={6} className="py-2.5 px-3 text-center font-bold uppercase tracking-wider bg-slate-900 text-amber-300">
                  Total Summary & Variance Analysis
                </th>
              </tr>

              {/* Table Header Row 2: Sub-headers */}
              <tr className="bg-slate-800 text-slate-200 text-[10px] border-t border-slate-700">
                <th className="py-2 px-2 border-r border-slate-700 w-12 text-center font-semibold">Row</th>
                <th className="py-2 px-3 border-r border-slate-700 min-w-[240px] font-semibold">Item Description</th>
                <th className="py-2 px-2 border-r border-slate-700 w-16 text-center font-semibold">Size</th>
                <th className="py-2 px-2 border-r border-slate-700 w-14 text-center font-semibold">Unit</th>
                <th className="py-2 px-2 border-r border-slate-700 w-24 text-right font-semibold">Rate (₹)</th>

                {/* Minor pairs */}
                {displayedMinors.map(m => (
                  <React.Fragment key={m.id}>
                    <th className="py-2 px-2 border-r border-slate-700 w-20 text-right bg-blue-950/40 text-blue-200 font-semibold">Tender Qty</th>
                    <th className="py-2 px-2 border-r border-slate-700 w-20 text-right bg-indigo-950/40 text-indigo-200 font-semibold">Design Qty</th>
                  </React.Fragment>
                ))}

                {/* Summary Headers */}
                <th className="py-2 px-2 border-r border-slate-700 w-24 text-right bg-blue-900/40 text-blue-100 font-bold">Total Tender</th>
                <th className="py-2 px-3 border-r border-slate-700 w-32 text-right bg-blue-900/60 text-blue-200 font-bold">Tender Amt (₹)</th>
                <th className="py-2 px-2 border-r border-slate-700 w-24 text-right bg-indigo-900/40 text-indigo-100 font-bold">Total Design</th>
                <th className="py-2 px-3 border-r border-slate-700 w-32 text-right bg-indigo-900/60 text-indigo-200 font-bold">Design Amt (₹)</th>
                <th className="py-2 px-3 border-r border-slate-700 w-28 text-right bg-amber-950/50 text-amber-200 font-bold">Diff (Y-W)</th>
                <th className="py-2 px-2 w-16 text-right bg-amber-950/70 text-amber-200 font-bold">% Diff</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-200 text-gray-800 font-mono">
              {filteredItems.map(it => {
                const isSubtotal = it.row === 25;
                const isAvgRate = it.row === 26;
                const isSupply = it.isSupplyRow;
                const isCca = it.category === 'CCA';
                const hasVariance = it.calculatedDiffAmount !== 0;
                const isIncrease = it.calculatedDiffAmount > 0;

                let rowBg = 'hover:bg-gray-50';
                if (isSubtotal) rowBg = 'bg-blue-50 font-bold hover:bg-blue-100';
                else if (isAvgRate) rowBg = 'bg-gray-100 italic';
                else if (isCca) rowBg = 'bg-emerald-50/70 font-semibold';
                else if (isSupply) rowBg = 'bg-slate-50/40';

                return (
                  <tr key={it.row} className={`transition-colors ${rowBg}`}>
                    {/* Row Index */}
                    <td className="py-2 px-2 border-r border-gray-200 text-center text-gray-400 font-mono text-[10px]">
                      {it.row}
                    </td>

                    {/* Description */}
                    <td className="py-2 px-3 border-r border-gray-200 font-sans text-gray-900 leading-tight">
                      <div className="font-medium">{it.description}</div>
                      {it.category && (
                        <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded font-mono text-gray-500 bg-gray-100">
                          {it.category}
                        </span>
                      )}
                    </td>

                    {/* Pipe Size */}
                    <td className="py-2 px-2 border-r border-gray-200 text-center font-semibold text-gray-700">
                      {it.pipeDiaMm ? `${it.pipeDiaMm} mm` : '-'}
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-2 border-r border-gray-200 text-center text-gray-600 font-medium">
                      {it.unit || '-'}
                    </td>

                    {/* Rate */}
                    <td className="py-2 px-2 border-r border-gray-200 text-right text-gray-900 font-semibold">
                      {it.rate > 0 ? it.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>

                    {/* Minor Columns */}
                    {displayedMinors.map(m => {
                      const mData = it.minors[m.id];
                      const tQty = mData?.tenderQty || 0;
                      const dQty = mData?.designQty || 0;
                      return (
                        <React.Fragment key={m.id}>
                          <td className="py-2 px-2 border-r border-gray-200 text-right text-gray-700 bg-blue-50/20">
                            {tQty !== 0 ? formatQty(tQty) : <span className="text-gray-300">-</span>}
                          </td>
                          <td className="py-2 px-2 border-r border-gray-200 text-right text-gray-900 bg-indigo-50/20 font-medium">
                            {dQty !== 0 ? formatQty(dQty) : <span className="text-gray-300">-</span>}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* Summary Columns */}
                    <td className="py-2 px-2 border-r border-gray-200 text-right font-semibold text-blue-900 bg-blue-50/40">
                      {it.calculatedTenderQty !== 0 ? formatQty(it.calculatedTenderQty) : '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-200 text-right font-semibold text-blue-950 bg-blue-50/60">
                      {it.calculatedTenderAmount !== 0 ? formatCurrency(it.calculatedTenderAmount) : '-'}
                    </td>

                    <td className="py-2 px-2 border-r border-gray-200 text-right font-semibold text-indigo-900 bg-indigo-50/40">
                      {it.calculatedDesignQty !== 0 ? formatQty(it.calculatedDesignQty) : '-'}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-200 text-right font-semibold text-indigo-950 bg-indigo-50/60">
                      {it.calculatedDesignAmount !== 0 ? formatCurrency(it.calculatedDesignAmount) : '-'}
                    </td>

                    {/* Diff */}
                    <td className={`py-2 px-3 border-r border-gray-200 text-right font-bold ${
                      !hasVariance ? 'text-gray-400' : isIncrease ? 'text-rose-600 bg-rose-50/30' : 'text-emerald-600 bg-emerald-50/30'
                    }`}>
                      {hasVariance ? formatCurrency(it.calculatedDiffAmount) : '-'}
                    </td>

                    {/* % Diff */}
                    <td className={`py-2 px-2 text-right font-bold text-[10px] ${
                      !hasVariance ? 'text-gray-400' : isIncrease ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {hasVariance ? `${it.calculatedPctDiff.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer: Pinned Grand Totals */}
            <tfoot className="bg-slate-900 text-white font-mono sticky bottom-0 z-20 shadow-lg border-t-2 border-indigo-500">
              <tr>
                <td colSpan={5} className="py-3 px-4 font-black uppercase text-xs tracking-wider text-amber-300">
                  Grand Total (Works Cost + 5-Year O&M)
                </td>
                {displayedMinors.map(m => (
                  <td key={m.id} colSpan={2} className="py-3 px-2 text-center text-slate-400 text-[10px] border-r border-slate-700">
                    RD: {m.rd}
                  </td>
                ))}
                <td className="py-3 px-2 text-right border-r border-slate-700 text-slate-400">-</td>
                <td className="py-3 px-3 text-right border-r border-slate-700 text-blue-200 font-black text-xs">
                  {formatCurrency(tenderGrandTotal)}
                </td>
                <td className="py-3 px-2 text-right border-r border-slate-700 text-slate-400">-</td>
                <td className="py-3 px-3 text-right border-r border-slate-700 text-indigo-200 font-black text-xs">
                  {formatCurrency(designGrandTotal)}
                </td>
                <td className={`py-3 px-3 text-right border-r border-slate-700 font-black text-xs ${diffGrandTotal >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatCurrency(diffGrandTotal)}
                </td>
                <td className="py-3 px-2 text-right font-black text-xs text-amber-300">
                  {pctDiffGrandTotal >= 0 ? `+${pctDiffGrandTotal.toFixed(2)}%` : `${pctDiffGrandTotal.toFixed(2)}%`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
