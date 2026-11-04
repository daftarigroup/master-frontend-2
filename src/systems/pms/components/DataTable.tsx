// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Columns3,
  Search,
  X
} from 'lucide-react';
import DragScrollTable from './DragScrollTable';

// Helper to extract a displayable label from any header type (string, number, React element, or object)
const getHeaderLabel = (header: any, index: number): string => {
  if (typeof header === 'string' && header.trim()) return header.trim();
  if (typeof header === 'number') return String(header);
  if (header && typeof header === 'object') {
    if (typeof header.name === 'string' && header.name.trim()) return header.name.trim();
    if (typeof header.title === 'string' && header.title.trim()) return header.title.trim();
    if (typeof header.label === 'string' && header.label.trim()) return header.label.trim();
  }
  if (React.isValidElement(header)) {
    const props = (header as any).props;
    if (typeof props?.children === 'string' && props.children.trim()) {
      return props.children.trim();
    }
    if (props?.title) return String(props.title).trim();
    if (props?.name) return String(props.name).trim();
    if (props?.['aria-label']) return String(props['aria-label']).trim();
  }
  return `Column ${index + 1}`;
};

export interface DataTableProps {
  headers?: any[];
  data?: any[];
  renderRow?: (item: any, index?: number) => React.ReactNode;
  renderCard?: (item: any, index?: number) => React.ReactNode;
  minWidth?: string;
  stickyFirstColumn?: boolean;
  stickyLastColumn?: boolean;
  totalRow?: any;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (items: number) => void;
  totalResults?: number;
  tableId?: string;
  showColumnFilter?: boolean;
  [key: string]: any;
}

const DataTable: React.FC<DataTableProps> = ({
  headers = [],
  data = [],
  renderRow,
  renderCard,
  minWidth = "1000px",
  stickyFirstColumn = false,
  stickyLastColumn = false,
  totalRow = null,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  totalResults,
  tableId,
  showColumnFilter = true
}) => {
  // Normalize to a list of rows - accepts either a single flat row or an array of rows
  const totalRows = totalRow ? (Array.isArray(totalRow[0]) ? totalRow : [totalRow]) : null;

  // Extract clean labels for each header
  const headerLabels = useMemo(() => {
    return headers.map((h, i) => getHeaderLabel(h, i));
  }, [headers]);

  // Unique storage key for persistent column visibility per page
  const storageKey = useMemo(() => {
    if (tableId) return `dt_cols_${tableId}`;
    const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+/g, '_') : 'global';
    return `dt_cols_${path}_${headers.length}`;
  }, [tableId, headers.length]);

  // Initial visible indices: load from localStorage if available and matching headers count
  const [visibleIndices, setVisibleIndices] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every(idx => typeof idx === 'number' && idx >= 0 && idx < headers.length)
        ) {
          return parsed.sort((a, b) => a - b);
        }
      }
    } catch {
      // fallback on error
    }
    return headers.map((_, i) => i);
  });

  // Keep visible indices in sync if headers count changes
  useEffect(() => {
    setVisibleIndices(prev => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every(idx => typeof idx === 'number' && idx >= 0 && idx < headers.length)
          ) {
            return parsed.sort((a, b) => a - b);
          }
        }
      } catch {}
      const valid = prev.filter(idx => idx < headers.length);
      return valid.length > 0 ? valid : headers.map((_, i) => i);
    });
  }, [storageKey, headers.length]);

  const updateVisibleIndices = (newIndices) => {
    const sorted = [...newIndices].sort((a, b) => a - b);
    setVisibleIndices(sorted);
    try {
      localStorage.setItem(storageKey, JSON.stringify(sorted));
    } catch {}
  };

  const toggleColumn = (idx) => {
    if (visibleIndices.includes(idx)) {
      if (visibleIndices.length <= 1) return; // Keep at least 1 column visible
      updateVisibleIndices(visibleIndices.filter(i => i !== idx));
    } else {
      updateVisibleIndices([...visibleIndices, idx]);
    }
  };

  const handleSelectAll = () => {
    updateVisibleIndices(headers.map((_, i) => i));
  };

  const handleResetAll = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    updateVisibleIndices(headers.map((_, i) => i));
  };

  // Dropdown state and click outside handler
  const [isOpen, setIsOpen] = useState(false);
  const [colSearch, setColSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredColumnsList = useMemo(() => {
    if (!colSearch.trim()) {
      return headers.map((h, i) => ({ index: i, label: headerLabels[i] }));
    }
    const q = colSearch.toLowerCase();
    return headers
      .map((h, i) => ({ index: i, label: headerLabels[i] }))
      .filter(item => item.label.toLowerCase().includes(q));
  }, [headers, headerLabels, colSearch]);

  const hiddenCount = headers.length - visibleIndices.length;

  // Proportional minWidth calculation when columns are hidden
  const calculatedMinWidth = useMemo(() => {
    if (!minWidth) return undefined;
    const match = String(minWidth).match(/^(\d+)(px|%)?$/);
    if (!match || match[2] === '%' || !headers.length) return minWidth;
    const basePx = parseInt(match[1], 10);
    if (isNaN(basePx) || basePx <= 0) return minWidth;
    const scaled = Math.round((basePx * visibleIndices.length) / headers.length);
    return `${Math.max(600, scaled)}px`;
  }, [minWidth, headers.length, visibleIndices.length]);

  // Headers filtered by visibility
  const filteredHeaders = useMemo(() => {
    return headers.filter((_, idx) => visibleIndices.includes(idx));
  }, [headers, visibleIndices]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Table Toolbar with Column Filter Dropdown */}
      {showColumnFilter && headers.length > 0 && (
        <div className="hidden md:flex px-4 py-2 border-b border-gray-200 bg-slate-50/80 items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <SlidersHorizontal size={14} className="text-indigo-600" />
              Table Columns:
            </span>
            <span className="text-[11px] text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-md font-medium shadow-2xs">
              {visibleIndices.length} of {headers.length} visible
            </span>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={handleResetAll}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline ml-1 cursor-pointer"
                title="Reset all columns to visible"
              >
                Reset ({hiddenCount} hidden)
              </button>
            )}
          </div>

          {/* Filter Columns Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(prev => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-2xs cursor-pointer ${
                hiddenCount > 0
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-400'
              }`}
              title="Select which columns to show on the table"
            >
              <Columns3 size={14} className={hiddenCount > 0 ? 'text-indigo-600' : 'text-gray-500'} />
              <span>Filter Columns</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  hiddenCount > 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {visibleIndices.length}/{headers.length}
              </span>
              <ChevronDown size={13} className={`text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                {/* Popover Header */}
                <div className="p-2.5 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-tight flex items-center gap-1.5">
                    <Columns3 size={13} className="text-indigo-600" />
                    Select Columns
                  </span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold px-1.5 py-0.5 rounded hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      Show All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="text-gray-600 hover:text-gray-900 font-medium px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Search columns inside dropdown */}
                {headers.length > 5 && (
                  <div className="p-2 border-b border-gray-100 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                    <input
                      type="text"
                      placeholder="Search columns..."
                      value={colSearch}
                      onChange={(e) => setColSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-gray-200 rounded-md pl-7 pr-7 py-1 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
                      autoFocus
                    />
                    {colSearch && (
                      <button
                        type="button"
                        onClick={() => setColSearch('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Checkbox List */}
                <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                  {filteredColumnsList.length > 0 ? (
                    filteredColumnsList.map(({ index: colIdx, label }) => {
                      const isChecked = visibleIndices.includes(colIdx);
                      const isOnlyOne = visibleIndices.length === 1 && isChecked;
                      return (
                        <label
                          key={colIdx}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer select-none ${
                            isChecked ? 'bg-indigo-50/40 hover:bg-indigo-50' : 'hover:bg-gray-50 text-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isOnlyOne}
                              onChange={() => toggleColumn(colIdx)}
                              className="w-3.5 h-3.5 rounded text-indigo-600 accent-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                            <span className={`truncate ${isChecked ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                              {label}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono ml-2">
                            #{colIdx + 1}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-xs text-gray-400">
                      No matching columns
                    </div>
                  )}
                </div>

                {/* Popover Footer */}
                <div className="p-2 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{visibleIndices.length} of {headers.length} visible</span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-2.5 py-0.5 bg-white border border-gray-200 rounded text-gray-700 font-semibold hover:bg-gray-100 shadow-2xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Card View (Hidden on Desktop) */}
      <div className="md:hidden flex flex-col gap-3 p-3 overflow-y-auto flex-1 bg-slate-50/50 scrollbar-hide">
        {data.length > 0 ? (
          data.map((item, index) => renderCard(item, index))
        ) : (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-100 shadow-sm text-xs font-medium">
            No records found.
          </div>
        )}
      </div>

      {/* Desktop Table View (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 overflow-hidden">
        <DragScrollTable className="w-full flex-1 min-h-0">
          <table
            className="w-full relative border-collapse"
            style={{
              ...(totalRow ? { height: '100%' } : {}),
              minWidth: calculatedMinWidth
            }}
          >
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              <tr>
                {filteredHeaders.map((header, filteredIndex) => {
                  const isFirst = stickyFirstColumn && filteredIndex === 0;
                  const isLast = stickyLastColumn && filteredIndex === filteredHeaders.length - 1;
                  const headerLabel = (header && typeof header === 'object' && header.label) ? header.label : header;
                  const align = (header && typeof header === 'object' && header.align) ? header.align : 'center';
                  const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
                  return (
                    <th
                      key={filteredIndex}
                      className={`px-4 py-3 ${alignClass} align-middle text-sm font-semibold text-gray-900 whitespace-nowrap uppercase tracking-wider`}
                      style={{
                        ...(isFirst ? { position: 'sticky', left: 0, zIndex: 20, background: '#f9fafb', boxShadow: '2px 0 4px rgba(0,0,0,0.08)' } : {}),
                        ...(isLast  ? { position: 'sticky', right: 0, zIndex: 20, background: '#f9fafb', boxShadow: '-2px 0 4px rgba(0,0,0,0.08)' } : {}),
                      }}
                    >
                      {headerLabel}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.map((item, index) => {
                if (!renderRow) return null;
                const rowElement = renderRow(item, index);
                if (!rowElement || !React.isValidElement(rowElement)) return rowElement;

                const rawChildren = React.Children.toArray((rowElement.props as any)?.children);
                if (rawChildren.length === headers.length) {
                  const filteredChildren = visibleIndices.map(i => rawChildren[i]);
                  return React.cloneElement(rowElement as React.ReactElement<any>, { key: rowElement.key || index }, filteredChildren);
                }
                return rowElement;
              })}
            </tbody>
            {totalRow && (
              <tbody aria-hidden="true" style={{ height: '100%' }}>
                <tr style={{ height: '100%' }}>
                  <td colSpan={visibleIndices.length} style={{ padding: 0, border: 'none' }} />
                </tr>
              </tbody>
            )}
            {totalRows && (
              <tfoot className="sticky bottom-0 z-10">
                {totalRows.map((row, rowIndex) => {
                  const filteredRow = Array.isArray(row) && row.length === headers.length
                    ? visibleIndices.map(i => row[i])
                    : row;
                  return (
                    <tr key={rowIndex} className={`bg-gray-100 ${rowIndex === 0 ? 'border-t-2 border-gray-300' : 'border-t border-gray-200'}`}>
                      {filteredRow.map((cell, cellIdx) => {
                        const origColIdx = Array.isArray(row) && row.length === headers.length ? visibleIndices[cellIdx] : cellIdx;
                        const origHeader = headers[origColIdx];
                        const align = (origHeader && typeof origHeader === 'object' && origHeader.align) ? origHeader.align : 'center';
                        const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
                        return (
                          <td key={cellIdx} className={`px-4 py-3 ${alignClass} align-middle text-sm font-bold text-gray-900 whitespace-nowrap`}>
                            {cell || cell === 0 ? cell : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tfoot>
            )}
          </table>
        </DragScrollTable>
      </div>

      {/* Footer - Unified for both views. Replaced by the totals row above when totalRow is provided. */}
      {!totalRow && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4 rounded-b-lg">
          {/* Left Side: Row Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500 bg-white font-medium text-xs md:text-sm shadow-sm"
            >
              {[50, 100, 200, 300].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
            <span className="text-[10px] md:text-sm text-gray-500 whitespace-nowrap font-medium hidden sm:inline">
              {totalResults > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults}
            </span>
          </div>

          {/* Right Side: Pagination Controls */}
          <div className="flex items-center gap-2 md:gap-4 text-gray-700">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <div className="flex items-center text-xs md:text-sm font-semibold text-gray-600">
              {currentPage} / {totalPages || 1}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
