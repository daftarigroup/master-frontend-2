// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Clock, History as HistoryIcon, Search, RotateCcw } from 'lucide-react';
import {
  getFinalApprovals,
  fetchFinalApprovals,
  upsertFinalApproval,
  isFinalApprovalComplete
} from '@/systems/pms/utils/storageManager';
import { fetchProjects } from '@/systems/pms/services/pmsApiClient';
import { pmsApi as poApi } from '@/systems/pms/services/pmsApi';
import { amountInWords } from '@/systems/pms/utils/helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DataTable from '@/systems/pms/components/DataTable';
import ModalForm from '@/systems/pms/components/ModalForm';
import SearchableDropdown from '@/systems/pms/components/SearchableDropdown';

// Format YYYY-MM-DD -> DD/MM/YYYY for display
const formatDate = (val) => {
  if (!val) return '-';
  const parts = val.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return val;
};

const APPROVAL_STAGES = [
  { key: 'subDivision', label: 'Sub Division' },
  { key: 'division', label: 'Division' },
  { key: 'circleOffice', label: 'Circle Office' },
  { key: 'ceoOffice', label: 'CEO Office' }
];

const initialFormData = {
  subDivision: false,
  division: false,
  circleOffice: false,
  ceoOffice: false,
  remarks: ''
};

const initialFilters = { searchQuery: '', projectName: '', contractorName: '', projectLocation: '' };

export default function FinalApproval() {
  const [projects, setProjects] = useState([]);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [formProject, setFormProject] = useState(null);
  const [formData, setFormData] = useState({ ...initialFormData });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ ...initialFilters });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // A project is listed once at least one PO has been created for it (PO History)
  const refresh = async () => {
    try {
      const [allProjects, posRes] = await Promise.all([fetchProjects(), poApi.get('/pos')]);
      const poList = Array.isArray(posRes) ? posRes : posRes?.data || [];
      const withPo = new Set(poList.map((po) => String(po.project_id)));
      const eligibleProjects = allProjects.filter((p) => withPo.has(String(p.id)));

      const approvals = await fetchFinalApprovals(eligibleProjects);
      setProjects(eligibleProjects);
      setRecords(approvals);
    } catch (e) {
      console.warn('Final Approval: could not load projects', e);
      setProjects([]);
      setRecords(getFinalApprovals());
    }
  };

  useEffect(() => { refresh(); }, []);

  const recordFor = (projectNo) => records.find(r => r.projectNo === projectNo) || null;

  const pendingProjects = projects.filter(p => !isFinalApprovalComplete(recordFor(p.serialNo))).reverse();
  const historyProjects = projects.filter(p => isFinalApprovalComplete(recordFor(p.serialNo))).reverse();

  const list = activeTab === 'pending' ? pendingProjects : historyProjects;

  const filteredList = list.filter(p => {
    if (filters.projectName && p.projectName !== filters.projectName) return false;
    if (filters.contractorName && p.contractorName !== filters.contractorName) return false;
    if (filters.projectLocation && p.projectLocation !== filters.projectLocation) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      return (
        p.serialNo.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        p.contractorName.toLowerCase().includes(q) ||
        (p.contractorPhone || '').toLowerCase().includes(q) ||
        (p.contractorEmail || '').toLowerCase().includes(q) ||
        p.projectLocation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginated = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleClearFilters = () => {
    setFilters({ ...initialFilters });
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  const openForm = (project) => {
    const rec = recordFor(project.serialNo);
    setFormData(rec ? {
      subDivision: !!rec.subDivision,
      division: !!rec.division,
      circleOffice: !!rec.circleOffice,
      ceoOffice: !!rec.ceoOffice,
      remarks: rec.remarks || ''
    } : { ...initialFormData });
    setFormProject(project);
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.subDivision && !formData.division && !formData.circleOffice && !formData.ceoOffice) {
      toast.error('Please select at least one approval stage');
      return;
    }

    setLoading(true);
    const saved = upsertFinalApproval({ projectNo: formProject.serialNo, ...formData });
    setLoading(false);
    setFormProject(null);
    refresh();

    toast.success(
      isFinalApprovalComplete(saved)
        ? `${formProject.serialNo} approved — moved to History & Drawing Upload`
        : 'Approval details saved'
    );
  };

  const approvedCount = (rec) => APPROVAL_STAGES.filter(s => rec?.[s.key]).length;

  const tableHeaders = ["Action", "Project No", "Project Name", "Contractor Name", "Project Location", "Approvals"];

  const [detailProject, setDetailProject] = useState(null);

  const detailFields = (item) => [
    ['Project Type', item.projectType],
    ['Agreement Number', item.agreementNumber],
    ['Contractor Phone No', item.contractorPhone],
    ['Contractor Gmail', item.contractorEmail],
    ['Village', item.village],
    ['District', item.district],
    ['State', item.state],
    ['Start Date', item.startDate ? formatDate(item.startDate) : ''],
    ['Planned End Date', item.plannedEndDate ? formatDate(item.plannedEndDate) : ''],
    ['Work Order', item.workOrder],
    ['Work Order Date', item.workOrderDate ? formatDate(item.workOrderDate) : ''],
    ['Irrigation Capacity', item.irrigationCapacity],
    ['Tender ID', item.tenderId],
    ['Tender Amount', item.tenderAmount],
    ['Accepted Amount', item.acceptedAmount],
    ['Work Period', item.workPeriod],
    ['Maintenance Period', item.maintenancePeriod],
  ];

  const renderRow = (item) => {
    const rec = recordFor(item.serialNo);
    return (
      <tr
        key={item.serialNo}
        onClick={() => setDetailProject(item)}
        className="hover:bg-indigo-50/30 transition-colors border-b border-gray-100 cursor-pointer"
      >
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <button
            onClick={(e) => { e.stopPropagation(); openForm(item); }}
            className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wide hover:bg-indigo-100 transition-colors"
          >
            <ShieldCheck size={12} /> {activeTab === 'history' ? 'View' : 'Approve'}
          </button>
        </td>
        <td className="px-4 py-3 text-center text-[13px] text-indigo-600 font-bold whitespace-nowrap">{item.serialNo}</td>
        <td className="px-4 py-3 text-center text-[13px] text-gray-900 font-medium">{item.projectName}</td>
        <td className="px-4 py-3 text-center text-[13px] text-gray-700 whitespace-nowrap">{item.contractorName || '-'}</td>
        <td className="px-4 py-3 text-center text-[13px] text-gray-600 whitespace-nowrap">{item.projectLocation || '-'}</td>
        <td className="px-4 py-3 text-center whitespace-nowrap">
          <div className="flex flex-wrap justify-center gap-1 max-w-[220px] mx-auto">
            {APPROVAL_STAGES.map(st => (
              <span
                key={st.key}
                className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                  rec?.[st.key]
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}
              >
                {st.label}
              </span>
            ))}
          </div>
        </td>
      </tr>
    );
  };

  const renderCard = (item) => {
    const rec = recordFor(item.serialNo);
    return (
      <div key={item.serialNo} className="bg-white rounded-lg border border-indigo-50 shadow-sm p-3 space-y-2">
        <div className="flex justify-between items-start border-b border-gray-100 pb-2">
          <div>
            <span className="text-[9px] text-indigo-500 uppercase tracking-widest leading-none block mb-1">{item.serialNo}</span>
            <h4 className="text-sm text-gray-900 leading-tight">{item.projectName}</h4>
          </div>
          <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 flex-shrink-0">
            {approvedCount(rec)}/{APPROVAL_STAGES.length}
          </span>
        </div>

        <div className="bg-slate-50 rounded p-2 text-[10px] space-y-1">
          {item.agreementNumber && (
            <div className="flex justify-between">
              <span className="text-gray-500">Agreement No:</span>
              <span className="text-gray-700">{item.agreementNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Contractor:</span>
            <span className="text-gray-700">{item.contractorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Location:</span>
            <span className="text-gray-700">{item.projectLocation || '-'}</span>
          </div>
          {(item.village || item.district || item.state) && (
            <div className="flex justify-between">
              <span className="text-gray-500">Village/Dist/State:</span>
              <span className="text-gray-700 text-right">{[item.village, item.district, item.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Start / End:</span>
            <span className="text-gray-700">{formatDate(item.startDate)} - {formatDate(item.plannedEndDate)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {APPROVAL_STAGES.map(s => (
            <span
              key={s.key}
              className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                rec?.[s.key]
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>

        <button
          onClick={() => openForm(item)}
          className="w-full bg-indigo-50 text-indigo-600 border border-indigo-200 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5"
        >
          <ShieldCheck size={12} /> {activeTab === 'history' ? 'View' : 'Approve'}
        </button>
      </div>
    );
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-3 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Tabs + Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 px-2 sm:px-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
            className={`flex items-center gap-1.5 px-3 h-[34px] rounded-lg text-xs md:text-sm font-semibold border transition-colors ${
              activeTab === 'pending'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Clock size={14} /> Pending ({pendingProjects.length})
          </button>
          <button
            onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
            className={`flex items-center gap-1.5 px-3 h-[34px] rounded-lg text-xs md:text-sm font-semibold border transition-colors ${
              activeTab === 'history'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <HistoryIcon size={14} /> History ({historyProjects.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
        <div className="flex-1 min-w-[160px] relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search projects..."
            value={filters.searchQuery}
            onChange={(e) => { setFilters({ ...filters, searchQuery: e.target.value }); setCurrentPage(1); }}
            className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs sm:text-sm h-[34px]"
          />
        </div>
        <div className="w-full sm:w-44 flex-shrink-0">
          <SearchableDropdown
            options={Array.from(new Set(projects.map(p => p.projectName))).filter(Boolean).sort().map(v => ({ value: v, label: v }))}
            value={filters.projectName}
            onChange={(val) => { setFilters({ ...filters, projectName: val }); setCurrentPage(1); }}
            placeholder="All Project Name"
            height="h-[34px]"
          />
        </div>
        <div className="w-full sm:w-44 flex-shrink-0">
          <SearchableDropdown
            options={Array.from(new Set(projects.map(p => p.contractorName))).filter(Boolean).sort().map(v => ({ value: v, label: v }))}
            value={filters.contractorName}
            onChange={(val) => { setFilters({ ...filters, contractorName: val }); setCurrentPage(1); }}
            placeholder="All Contractor Name"
            height="h-[34px]"
          />
        </div>
        <div className="w-full sm:w-44 flex-shrink-0">
          <SearchableDropdown
            options={Array.from(new Set(projects.map(p => p.projectLocation))).filter(Boolean).sort().map(v => ({ value: v, label: v }))}
            value={filters.projectLocation}
            onChange={(val) => { setFilters({ ...filters, projectLocation: val }); setCurrentPage(1); }}
            placeholder="All Location"
            height="h-[34px]"
          />
        </div>
        <button
          onClick={handleClearFilters}
          className="flex items-center justify-center gap-1.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg w-full sm:w-[34px] h-[34px] hover:bg-gray-100 transition-colors shadow-sm flex-shrink-0"
          title="Clear Filters"
        >
          <RotateCcw size={16} />
          <span className="sm:hidden text-xs font-semibold">Clear Filters</span>
        </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mx-2 sm:mx-0">
        <DataTable
          headers={tableHeaders}
          data={paginated}
          renderRow={renderRow}
          renderCard={renderCard}
          minWidth="900px"
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          totalResults={filteredList.length}
        />
      </div>

      {/* Final Approval Modal */}
      <ModalForm
        isOpen={!!formProject}
        onClose={() => setFormProject(null)}
        title={formProject ? `Final Approval — ${formProject.serialNo}` : ''}
        onSubmit={handleSubmit}
        submitText={loading ? 'Saving...' : 'Save'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-3">
          {/* Project Info (read-only, pre-filled from the selected project) */}
          {formProject && (
            <div className="bg-slate-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{formProject.projectName}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Project Type</p>
                  <p className="text-gray-700 truncate">{formProject.projectType || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Contractor</p>
                  <p className="text-gray-700 truncate">{formProject.contractorName || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 uppercase tracking-tighter text-[9px]">Project Location</p>
                  <p className="text-gray-700 truncate">{formProject.projectLocation || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Approvals */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-indigo-600" />
                <span className="text-[12px] md:text-[13px] font-semibold text-gray-800 uppercase tracking-tight">Approval</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const allChecked = APPROVAL_STAGES.every(s => formData[s.key]);
                  APPROVAL_STAGES.forEach(s => handleChange(s.key, !allChecked));
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                {APPROVAL_STAGES.every(s => formData[s.key]) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {APPROVAL_STAGES.map(s => (
                <label
                  key={s.key}
                  className={`flex items-center gap-2 border rounded-lg p-2.5 cursor-pointer transition-colors ${
                    formData[s.key] ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData[s.key]}
                    onChange={(e) => handleChange(s.key, e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-[13px] md:text-[15px] font-semibold text-gray-800">{s.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1 pt-1">
              <label className="block text-[13px] md:text-[15px] text-gray-700 uppercase tracking-tight">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                placeholder="Add any remarks (optional)"
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[13px] md:text-[15px] resize-none"
              />
            </div>
          </div>
        </div>
      </ModalForm>
      {detailProject && (
        <Dialog open={!!detailProject} onOpenChange={(o) => !o && setDetailProject(null)}>
          <DialogContent className="w-[95vw] max-w-xl sm:max-w-3xl bg-white rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-slate-900">
                {detailProject.serialNo} — {detailProject.projectName}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2">
              {detailFields(detailProject).map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="text-[13px] text-gray-800 break-words">{val || '-'}</p>
                  {(label === 'Tender Amount' || label === 'Accepted Amount') && amountInWords(val) && (
                    <p className="text-[10px] text-gray-400 italic">{amountInWords(val)}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => { const p = detailProject; setDetailProject(null); openForm(p); }}
                className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded text-xs font-semibold uppercase tracking-wide hover:bg-indigo-700"
              >
                <ShieldCheck size={14} /> {activeTab === 'history' ? 'View Approvals' : 'Approve'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
