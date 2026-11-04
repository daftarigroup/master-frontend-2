// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Tag,
  User,
  Calendar,
  Layers,
  Search,
  RotateCcw,
  Package,
  FileText,
  Hash
} from 'lucide-react';
import {
  getProjectOrMinor,
  getExternalPurchaseOrders,
  getProductsByPONumber
} from '@/systems/pms/utils/storageManager';
import { pmsApi } from '@/systems/pms/services/pmsApi';
import { pmsApi as pmsApiClient } from '@/systems/pms/services/pmsApiClient';
import { calculateProductAmount } from '@/systems/pms/utils/storageManager';
import DataTable from '@/systems/pms/components/DataTable';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';

// Format YYYY-MM-DD -> DD/MM/YYYY for display
const formatDate = (val) => {
  if (!val) return '-';
  const parts = val.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
};

export default function ProductIMF() {
  const { projectNo } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [selectedPo, setSelectedPo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState([]);
  const [backendPos, setBackendPos] = useState([]);

  // Real POs live in the backend (Create PO page), not in localStorage
  useEffect(() => {
    pmsApi.get('/pos')
      .then((res) => setBackendPos(Array.isArray(res) ? res : res?.data || []))
      .catch(() => setBackendPos([]));
  }, []);

  useEffect(() => {
    const decodedNo = decodeURIComponent(projectNo || '');
    const found = getProjectOrMinor(decodedNo);
    setProject(found || null);

    if (found) {
      // Find initial PO number
      let initialPo = found.poNumber || '';
      
      if (!initialPo) {
        // Try external PO matching contractor name
        const extPOs = getExternalPurchaseOrders();
        const match = extPOs.find(p => p.name === found.contractorName);
        if (match) initialPo = match.poNumber;
        else if (extPOs.length > 0) initialPo = extPOs[0].poNumber;
      }

      if (!initialPo && backendPos.length > 0) {
        const base = found.originalProjectName || found.projectName;
        const match = backendPos.find(p => p.project_name === base) || backendPos[0];
        initialPo = match.po_number;
      }

      setSelectedPo(initialPo || '');
    }
  }, [projectNo, backendPos]);

  // Load products whenever selectedPo changes: saved IMF -> backend PO items -> local cache
  useEffect(() => {
    if (!selectedPo) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const fromPO = () => {
      const po = backendPos.find(p => p.po_number === selectedPo);
      return (po?.items || []).map((it, idx) => ({
        id: it.id,
        sn: idx + 1,
        internalCode: it.indent_number || '',
        product: it.product_name,
        qty: Number(it.quantity) || 0,
        issued: 0,
        issueReturn: 0,
        missing: 0,
        damage: 0,
        unit: it.uom,
        rate: Number(it.rate) || 0,
        gst: Number(it.gst_percent) || 0,
        discount: Number(it.discount_percent) || 0,
        amount: calculateProductAmount(it.quantity, it.rate, it.gst_percent, it.discount_percent),
      }));
    };
    const local = getProductsByPONumber(selectedPo);
    setItems(local.length ? local : fromPO());
    pmsApiClient.getProductIMF(selectedPo)
      .then((res) => {
        const saved = Array.isArray(res) ? res : res?.data;
        if (!cancelled && Array.isArray(saved) && saved.length) setItems(saved);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedPo, backendPos]);

  // Available PO dropdown options
  const poOptions = useMemo(() => {
    if (!project) return [];
    const list = [];
    const seen = new Set();

    const add = (num, label) => {
      const trimmed = String(num || '').trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        list.push({
          value: trimmed,
          label: label ? `${trimmed} — ${label}` : trimmed
        });
      }
    };

    if (project.poNumber) add(project.poNumber, project.contractorName || 'Project PO');

    backendPos.forEach(p => add(p.po_number, p.vendor_name));
    const extPOs = getExternalPurchaseOrders();
    extPOs.forEach(p => {
      add(p.poNumber, p.name);
    });

    return list;
  }, [project, backendPos]);

  // Detailed info for current PO
  const poDetails = useMemo(() => {
    if (!selectedPo) return null;
    const bp = backendPos.find(p => p.po_number === selectedPo);
    if (bp) return { name: bp.vendor_name, poDate: bp.po_date ? String(bp.po_date).slice(0, 10) : '' };
    const ext = getExternalPurchaseOrders().find(p => p.poNumber === selectedPo);
    if (ext) return ext;

    return null;
  }, [selectedPo, backendPos]);

  // Search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(it =>
      (it.product || '').toLowerCase().includes(q) ||
      (it.internalCode || '').toLowerCase().includes(q) ||
      (it.unit || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Totals calculation
  const totalQty = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
  }, [filteredItems]);

  const totalIssued = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (Number(it.issued) || 0), 0);
  }, [filteredItems]);

  const totalIssueReturn = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (Number(it.issueReturn) || 0), 0);
  }, [filteredItems]);

  const totalMissing = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (Number(it.missing) || 0), 0);
  }, [filteredItems]);

  const totalDamage = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (Number(it.damage) || 0), 0);
  }, [filteredItems]);

  const totalAmount = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  }, [filteredItems]);

  // Columns with explicit center alignment matching data cells:
  // S/N, Internal Code, Product, Qty, Issued, Issue Return, Missing, Damage, Unit, Rate, GST (%), Discount (%), Amount
  const tableHeaders = [
    { label: 'S/N', align: 'center' },
    { label: 'Internal Code', align: 'center' },
    { label: 'Product', align: 'center' },
    { label: 'Qty', align: 'center' },
    { label: 'Issued', align: 'center' },
    { label: 'Issue Return', align: 'center' },
    { label: 'Missing', align: 'center' },
    { label: 'Damage', align: 'center' },
    { label: 'Unit', align: 'center' },
    { label: 'Rate', align: 'center' },
    { label: 'GST (%)', align: 'center' },
    { label: 'Discount (%)', align: 'center' },
    { label: 'Amount', align: 'center' }
  ];

  const totalRow = [
    'Total',
    '-',
    '-',
    totalQty.toLocaleString('en-IN'),
    totalIssued.toLocaleString('en-IN'),
    totalIssueReturn.toLocaleString('en-IN'),
    totalMissing.toLocaleString('en-IN'),
    totalDamage.toLocaleString('en-IN'),
    '-',
    '-',
    '-',
    '-',
    `₹ ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ];

  const renderRow = (item, idx) => (
    <tr key={item.id || item.internalCode || idx} className="hover:bg-gray-50/70 transition-colors border-b border-gray-100">
      <td className="px-4 py-2.5 text-center align-middle text-xs text-indigo-600 font-bold whitespace-nowrap">
        {item.sn ?? (idx + 1)}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] font-mono font-semibold text-gray-800 whitespace-nowrap">
        {item.internalCode || '-'}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] font-semibold text-gray-900 whitespace-nowrap">
        {item.product}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] font-semibold text-gray-800 whitespace-nowrap">
        {Number(item.qty || 0).toLocaleString('en-IN')}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
        {Number(item.issued || 0).toLocaleString('en-IN')}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] font-semibold text-amber-700 whitespace-nowrap">
        {Number(item.issueReturn || 0).toLocaleString('en-IN')}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] font-semibold text-rose-600 whitespace-nowrap">
        {Number(item.missing || 0).toLocaleString('en-IN')}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] font-semibold text-red-600 whitespace-nowrap">
        {Number(item.damage || 0).toLocaleString('en-IN')}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] text-gray-600 font-medium whitespace-nowrap">
        {item.unit || '-'}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] text-gray-800 font-medium whitespace-nowrap">
        ₹{Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] text-gray-700 whitespace-nowrap">
        {item.gst ?? 0}%
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] text-gray-700 whitespace-nowrap">
        {item.discount ?? 0}%
      </td>
      <td className="px-4 py-2.5 text-center align-middle text-[11px] font-bold text-gray-900 whitespace-nowrap">
        ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
    </tr>
  );

  const renderCard = (item, idx) => (
    <div key={item.id || item.internalCode || idx} className="rounded-lg border border-gray-200 shadow-sm p-3 space-y-2 bg-white text-xs">
      <div className="flex justify-between items-start border-b border-gray-100 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
            #{item.sn ?? (idx + 1)}
          </span>
          <span className="font-mono text-[11px] font-semibold text-gray-700">
            {item.internalCode}
          </span>
        </div>
        <span className="font-bold text-gray-900">
          ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{item.product}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-gray-100 text-gray-600">
        <div>
          <span className="text-gray-400">Qty:</span>{' '}
          <span className="font-medium text-gray-800">{Number(item.qty || 0).toLocaleString('en-IN')} {item.unit}</span>
        </div>
        <div>
          <span className="text-gray-400">Issued:</span>{' '}
          <span className="font-semibold text-emerald-700">{Number(item.issued || 0).toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-gray-400">Return:</span>{' '}
          <span className="font-semibold text-amber-700">{Number(item.issueReturn || 0).toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-gray-400">Missing:</span>{' '}
          <span className="font-semibold text-rose-600">{Number(item.missing || 0).toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-gray-400">Damage:</span>{' '}
          <span className="font-semibold text-red-600">{Number(item.damage || 0).toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-gray-400">Rate:</span>{' '}
          <span className="font-medium text-gray-800">₹{Number(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div>
          <span className="text-gray-400">GST:</span>{' '}
          <span className="font-medium text-gray-800">{item.gst}%</span>
        </div>
        <div>
          <span className="text-gray-400">Discount:</span>{' '}
          <span className="font-medium text-gray-800">{item.discount}%</span>
        </div>
      </div>
    </div>
  );

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate('/pms/projects/new')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-500 text-sm">
          Project not found.
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Back + Search + PO Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full px-2 sm:px-0">
        <button
          onClick={() => navigate(`/pms/view-design/${encodeURIComponent(project.serialNo)}`)}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-semibold w-fit flex-shrink-0"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          <h1 className="text-lg md:text-xl font-black text-gray-800 flex items-center gap-2">
            <Package size={20} className="text-blue-600" /> Sub Contractor IMF
          </h1>
        </div>

        <div className="flex-1 min-w-0 relative max-w-sm">
          <Search className="absolute left-2.5 top-[9px] md:top-[11px] text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search product, code, unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg md:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs md:text-sm h-[32px] md:h-[38px]"
          />
        </div>

        <div className="w-56 md:w-64 flex-shrink-0">
          <SearchableDropdown
            options={poOptions}
            value={selectedPo}
            onChange={(val) => setSelectedPo(val)}
            placeholder="Select PO Number"
            height="h-[32px] md:h-[38px]"
          />
        </div>

        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded-lg md:rounded w-[32px] h-[32px] md:w-[38px] md:h-[38px] hover:bg-gray-100 transition-colors shadow-sm flex-shrink-0"
            title="Clear Search"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* Project Header - Same UI as Execution Details */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-5 mx-2 sm:mx-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex items-start gap-2 min-w-0">
            <Building2 size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Project Name</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{project.originalProjectName || project.projectName}</p>
            </div>
          </div>

          {project.isMinor && (
            <div className="flex items-start gap-2 min-w-0">
              <Tag size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Minor Name</p>
                <p className="text-base md:text-lg text-indigo-600 font-bold truncate">{project.minorName}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 min-w-0">
            <Hash size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">PO Number</p>
              <p className="text-base md:text-lg text-indigo-600 font-bold truncate">{selectedPo || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <User size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Contractor / Vendor</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{poDetails?.name || project.contractorName || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <Calendar size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">PO Date</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{formatDate(poDetails?.poDate || project.startDate)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 min-w-0">
            <Layers size={20} className="text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] md:text-xs font-bold text-gray-500 uppercase tracking-wide">Total Items</p>
              <p className="text-base md:text-lg text-gray-900 font-bold truncate">{filteredItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Table - Same UI as Execution Details */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-2 sm:mx-0">
        <DataTable
          headers={tableHeaders}
          data={filteredItems}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="1380px"
          totalRow={totalRow}
          tableId="product-imf-table"
        />
      </div>
    </div>
  );
}
