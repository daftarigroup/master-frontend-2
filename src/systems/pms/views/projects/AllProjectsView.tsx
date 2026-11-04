// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Info, RotateCcw, Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';

import DataTable from '@/shared/components/element/DataTable';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';

import { fetchProjects, deleteProject, type Project } from '@/systems/pms/services/pmsApiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import Edit_Add_Project from './EditProjectView';

export default function AllProject() {
  const navigate = useNavigate();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [viewProject, setViewProject] = useState<Project | null>(null);

  const initialFilters = {
    searchQuery: '',
    projectName: '',
    contractorName: '',
    projectLocation: ''
  };
  const [filters, setFilters] = useState({ ...initialFilters });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleClearFilters = () => {
    setFilters({ ...initialFilters });
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  const handleDelete = async (item: Project) => {
    const idOrSerial = item.id || item.serialNo;
    if (!window.confirm(`Delete project ${item.serialNo} "${item.projectName}"? This cannot be undone.`)) return;
    try {
      await deleteProject(idOrSerial);
      toast.success(`Project ${item.serialNo} deleted`);
      loadProjects();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete project');
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (filters.projectName && p.projectName !== filters.projectName) return false;
      if (filters.contractorName && p.contractorName !== filters.contractorName) return false;
      if (filters.projectLocation && p.projectLocation !== filters.projectLocation) return false;

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          (p.serialNo || '').toLowerCase().includes(q) ||
          (p.projectName || '').toLowerCase().includes(q) ||
          (p.contractorName || '').toLowerCase().includes(q) ||
          (p.contractorPhone || '').toLowerCase().includes(q) ||
          (p.contractorEmail || '').toLowerCase().includes(q) ||
          (p.projectLocation || '').toLowerCase().includes(q)
        );
      }
      return true;
    }).slice().reverse();
  }, [projects, filters]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const paginatedProjects = useMemo(() => {
    return filteredProjects.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredProjects, currentPage, itemsPerPage]);

  const columns = useMemo<ColumnDef<Project>[]>(() => [
    {
      accessorKey: 'serialNo',
      header: () => <div className="text-center font-bold">Project No</div>,
      cell: ({ row }) => (
        <span className="text-center text-xs text-indigo-600 font-bold whitespace-nowrap block">
          {row.original.serialNo}
        </span>
      ),
    },
    {
      accessorKey: 'projectName',
      header: () => <div className="text-center font-bold">Project Name</div>,
      cell: ({ row }) => (
        <span className="text-center text-[11px] text-gray-900 font-medium whitespace-nowrap block">
          {row.original.projectName}
        </span>
      ),
    },
    {
      accessorKey: 'contractorName',
      header: () => <div className="text-center font-bold">Contractor Name</div>,
      cell: ({ row }) => (
        <span className="text-center text-[11px] text-gray-700 whitespace-nowrap block">
          {row.original.contractorName}
        </span>
      ),
    },
    {
      accessorKey: 'contractorPhone',
      header: () => <div className="text-center font-bold">Contractor Phone No</div>,
      cell: ({ row }) => (
        <span className="text-center text-[11px] text-gray-600 whitespace-nowrap block">
          {row.original.contractorPhone}
        </span>
      ),
    },
    {
      accessorKey: 'projectLocation',
      header: () => <div className="text-center font-bold">Project Location</div>,
      cell: ({ row }) => (
        <span className="text-center text-[11px] text-gray-600 whitespace-nowrap block">
          {row.original.projectLocation || '-'}
        </span>
      ),
    },
    {
      id: 'action',
      header: () => <div className="text-center font-bold">Action</div>,
      cell: ({ row }) => (
        <div className="text-center whitespace-nowrap flex items-center justify-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setEditProject(row.original); }}
            className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded text-[11px] font-semibold hover:bg-amber-100 transition-colors"
            title="Edit Project"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }}
            className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded text-[11px] font-semibold hover:bg-rose-100 transition-colors"
            title="Delete Project"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ], []);

  const renderCard = (item: Project) => (
    <div key={item.serialNo} onClick={() => setViewProject(item)} className="cursor-pointer bg-white rounded-lg border border-indigo-50 shadow-sm p-3 space-y-2">
      <div className="flex justify-between items-start border-b border-gray-100 pb-2">
        <div>
          <span className="text-[9px] text-indigo-500 uppercase tracking-widest leading-none block mb-1">{item.serialNo}</span>
          <h4 className="text-sm text-gray-900 leading-tight font-medium">{item.projectName}</h4>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <p className="text-gray-400 uppercase tracking-tighter text-[8px]">Contractor</p>
          <p className="text-gray-700 truncate leading-tight">{item.contractorName}</p>
        </div>
        <div>
          <p className="text-gray-400 uppercase tracking-tighter text-[8px]">Phone</p>
          <p className="text-gray-700 truncate leading-tight">{item.contractorPhone}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded p-2 text-[10px] space-y-1">
        {item.agreementNumber && (
          <div className="flex justify-between">
            <span className="text-gray-500">Agreement No:</span>
            <span className="text-gray-700">{item.agreementNumber}</span>
          </div>
        )}
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
          <span className="text-gray-700">{item.startDate} - {item.plannedEndDate}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); setEditProject(item); }}
          className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5"
        >
          <Pencil size={13} /> Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
          className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full">
        {/* Mobile Top Bar */}
        <div className="flex items-center gap-2 w-full lg:hidden">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-[9px] text-gray-400" size={14} />
            <Input
              type="text"
              placeholder="Search projects..."
              value={filters.searchQuery}
              onChange={(e) => { setFilters({ ...filters, searchQuery: e.target.value }); setCurrentPage(1); }}
              className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:border-sky-500 text-xs h-[32px]"
            />
          </div>
          <button
             onClick={() => setShowMobileFilters(!showMobileFilters)}
             className={`flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={14} />
          </button>
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded-lg h-[32px] w-[32px] flex-shrink-0 shadow-sm active:scale-95"
            title="Clear Filters"
          >
            <RotateCcw size={14} />
          </button>
          <Button
            onClick={() => navigate('/pms/projects/new')}
            className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-[32px] w-[32px] p-0 shrink-0 shadow-xs"
            title="Add Project"
          >
            <Plus size={16} />
          </Button>
        </div>

        {/* Mobile Collapsible Filters */}
        <div className={`${showMobileFilters ? 'grid' : 'hidden'} lg:hidden grid-cols-2 gap-2 w-full`}>
          <Select
            value={filters.projectName || 'ALL'}
            onValueChange={(val) => { setFilters({ ...filters, projectName: val === 'ALL' ? '' : val }); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-full bg-white border border-gray-300 rounded text-xs h-[32px]">
              <SelectValue placeholder="All Project Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Project Name</SelectItem>
              {Array.from(new Set(projects.map(p => p.projectName))).filter(Boolean).sort().map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.contractorName || 'ALL'}
            onValueChange={(val) => { setFilters({ ...filters, contractorName: val === 'ALL' ? '' : val }); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-full bg-white border border-gray-300 rounded text-xs h-[32px]">
              <SelectValue placeholder="All Contractor Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Contractor Name</SelectItem>
              {Array.from(new Set(projects.map(p => p.contractorName))).filter(Boolean).sort().map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="col-span-2">
            <Select
              value={filters.projectLocation || 'ALL'}
              onValueChange={(val) => { setFilters({ ...filters, projectLocation: val === 'ALL' ? '' : val }); setCurrentPage(1); }}
            >
              <SelectTrigger className="w-full bg-white border border-gray-300 rounded text-xs h-[32px]">
                <SelectValue placeholder="All Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Location</SelectItem>
                {Array.from(new Set(projects.map(p => p.projectLocation))).filter(Boolean).sort().map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Row: Search + Dropdowns share equal width, reset button stays fixed, Add Project button on right */}
        <div className="hidden lg:flex lg:flex-1 items-center gap-3">
          <div className="flex-1 min-w-0 relative">
            <Search className="absolute left-2.5 top-[11px] text-gray-400" size={14} />
            <Input
              type="text"
              placeholder="Search projects..."
              value={filters.searchQuery}
              onChange={(e) => { setFilters({ ...filters, searchQuery: e.target.value }); setCurrentPage(1); }}
              className="w-full bg-white border border-gray-300 rounded pl-8 pr-2 text-sm h-[38px]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <Select
              value={filters.projectName || 'ALL'}
              onValueChange={(val) => { setFilters({ ...filters, projectName: val === 'ALL' ? '' : val }); setCurrentPage(1); }}
            >
              <SelectTrigger className="w-full bg-white border border-gray-300 rounded text-sm h-[38px]">
                <SelectValue placeholder="All Project Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Project Name</SelectItem>
                {Array.from(new Set(projects.map(p => p.projectName))).filter(Boolean).sort().map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-0">
            <Select
              value={filters.contractorName || 'ALL'}
              onValueChange={(val) => { setFilters({ ...filters, contractorName: val === 'ALL' ? '' : val }); setCurrentPage(1); }}
            >
              <SelectTrigger className="w-full bg-white border border-gray-300 rounded text-sm h-[38px]">
                <SelectValue placeholder="All Contractor Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Contractor Name</SelectItem>
                {Array.from(new Set(projects.map(p => p.contractorName))).filter(Boolean).sort().map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-0">
            <Select
              value={filters.projectLocation || 'ALL'}
              onValueChange={(val) => { setFilters({ ...filters, projectLocation: val === 'ALL' ? '' : val }); setCurrentPage(1); }}
            >
              <SelectTrigger className="w-full bg-white border border-gray-300 rounded text-sm h-[38px]">
                <SelectValue placeholder="All Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Location</SelectItem>
                {Array.from(new Set(projects.map(p => p.projectLocation))).filter(Boolean).sort().map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={handleClearFilters}
            className="flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded w-[38px] h-[38px] hover:bg-gray-100 transition-colors shadow-sm flex-shrink-0"
            title="Clear Filters"
          >
            <RotateCcw size={16} />
          </button>
          <Button
            onClick={() => navigate('/pms/projects/new')}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3.5 py-2 text-xs font-semibold uppercase tracking-wider shadow-xs transition-colors shrink-0 h-[38px]"
          >
            <Plus size={14} /> Add Project
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Mobile View */}
        <div className="block lg:hidden flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paginatedProjects.length > 0 ? (
            paginatedProjects.map(renderCard)
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">No Projects Found</div>
          )}
        </div>

        {/* Desktop View using shared DataTable */}
        <div className="hidden lg:block flex-1 min-h-0">
          <DataTable
            columns={columns}
            data={paginatedProjects}
            dataLoading={loading}
            className="h-[65dvh]"
            onRowClick={setViewProject}
          />
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4 rounded-b-xl flex-none">
          {/* Left Side: Items Per Page */}
          <div className="flex items-center gap-2">
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500 bg-white font-medium text-xs md:text-sm shadow-sm"
            >
              {[50, 100, 200, 300].map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
            <span className="text-[10px] md:text-sm text-gray-500 whitespace-nowrap font-medium hidden sm:inline">
              {filteredProjects.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}-{Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length}
            </span>
          </div>

          {/* Right Side: Pagination Controls */}
          <div className="flex items-center gap-2 md:gap-4 text-gray-700">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
            <div className="flex items-center text-xs md:text-sm font-semibold text-gray-600">
              {currentPage} / {totalPages || 1}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 md:px-2 md:py-1 border border-gray-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition shadow-sm flex items-center justify-center text-indigo-600"
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Project Details Popup */}
      <Dialog open={!!viewProject} onOpenChange={(o) => !o && setViewProject(null)}>
        <DialogContent className="max-w-2xl w-[95vw] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:text-white [&>button]:opacity-90">
          {viewProject && (() => {
            const Field = ({ label, value }: { label: string; value?: string }) => (
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm text-gray-800 font-medium break-words">{value || '-'}</p>
              </div>
            );
            const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                <p className="text-xs font-bold text-indigo-600 mb-3">{title}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">{children}</div>
              </div>
            );
            return (
              <>
                <DialogHeader className="px-6 py-5 pr-14 bg-gradient-to-r from-indigo-600 to-violet-600 text-left space-y-1">
                  <span className="inline-block w-fit text-[10px] font-bold tracking-widest bg-white/20 text-white rounded px-2 py-0.5">
                    {viewProject.serialNo}
                  </span>
                  <DialogTitle className="text-white text-lg leading-snug">{viewProject.projectName}</DialogTitle>
                </DialogHeader>
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  <Section title="Contractor">
                    <Field label="Name" value={viewProject.contractorName} />
                    <Field label="Phone" value={viewProject.contractorPhone} />
                    <div className="sm:col-span-2"><Field label="Gmail" value={viewProject.contractorEmail} /></div>
                  </Section>
                  <Section title="Location">
                    <div className="sm:col-span-2"><Field label="Project Location" value={viewProject.projectLocation} /></div>
                    <Field label="Village" value={viewProject.village} />
                    <Field label="District" value={viewProject.district} />
                    <Field label="State" value={viewProject.state} />
                  </Section>
                  <Section title="Agreement & Timeline">
                    <div className="sm:col-span-2"><Field label="Agreement Number" value={viewProject.agreementNumber} /></div>
                    <Field label="Start Date" value={viewProject.startDate} />
                    <Field label="Planned End Date" value={viewProject.plannedEndDate} />
                  </Section>
                  {viewProject.projectDescription && (
                    <Section title="Description">
                      <p className="sm:col-span-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewProject.projectDescription}</p>
                    </Section>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Edit_Add_Project
        isOpen={!!editProject}
        onClose={() => setEditProject(null)}
        project={editProject}
        onUpdated={() => {
          setEditProject(null);
          loadProjects();
        }}
      />
    </div>
  );
}
