// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { pmsApi } from '../../services/pmsApi';
import { apiClient } from '@/lib/apiClient';
import { ComboBox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  Building2,
  Package,
  Wrench,
  CheckCircle2,
  X,
  ArrowLeft,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn, formatDate } from '@/lib/utils';

// Types
interface ProductRow {
  group_head: string;
  area_of_use: string;
  product_name: string;
  quantity: number | string;
  current_stock_qty: number;
  uom: string;
  expected_requirement_date: string;
  attachment_file?: string | null;
  attachment_name?: string;
  specifications: string;
  indent_type: 'Product';
}

interface EquipmentRow {
  group_head: string;
  area_of_use: string;
  equipment_name: string;
  type: 'Rent' | 'Owned';
  quantity: number | string;
  expected_time: string;
  day_charge: number | string;
  indent_type: 'Equipment';
}

interface ProjectOption {
  id: string | number;
  project_name: string;
  serial_no?: string;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

export default function PmsCreateIndentView() {
  const { user } = useAuth();

  // Page Mode: false = Show Table Only, true = Show Full Page Form
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Table Data & Filter States
  const [indentRows, setIndentRows] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Projects list
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Form State
  const [indentDate, setIndentDate] = useState<string>(getTodayString());
  const [projectId, setProjectId] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [projectSearch, setProjectSearch] = useState<string>('');
  const [indenterName, setIndenterName] = useState<string>('');
  const [priority, setPriority] = useState<'Non-Critical' | 'Critical'>('Non-Critical');

  // Product Items
  const [products, setProducts] = useState<ProductRow[]>([
    {
      group_head: '',
      area_of_use: '',
      product_name: '',
      quantity: '',
      current_stock_qty: 0,
      uom: 'Nos',
      expected_requirement_date: getTodayString(),
      attachment_file: null,
      attachment_name: '',
      specifications: '',
      indent_type: 'Product',
    },
  ]);

  // Equipment Items
  const [equipments, setEquipments] = useState<EquipmentRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Store item master (+ stock) - the Product Name dropdown is linked to it and auto-fills group head, UOM, stock
  const [storeItems, setStoreItems] = useState<{ key: string; name: string; groupHead: string; uom: string; stock: number }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const [itemRes, stockRes]: any[] = await Promise.all([
          apiClient.get('/store/entity/item', { params: { order: 'item_name.asc', limit: 'all' } }),
          apiClient.get('/store/inventory/stock').catch(() => ({ data: [] })),
        ]);
        const norm = (v: any) => String(v ?? '').trim().toLowerCase();
        const stockMap = new Map<string, number>();
        for (const r of (stockRes?.data ?? []) as any[]) {
          const k = `${norm(r.groupHead)}|${norm(r.itemName)}`;
          stockMap.set(k, (stockMap.get(k) ?? 0) + Number(r.current || 0));
        }
        const seen = new Set<string>();
        const rows: any[] = [];
        for (const r of (itemRes?.data ?? []) as any[]) {
          const name = String(r.item_name ?? '').trim();
          const gh = String(r.group_head?.name ?? '').trim();
          const k = `${norm(gh)}|${norm(name)}`;
          if (!name || seen.has(k)) continue;
          seen.add(k);
          rows.push({ key: k, name, groupHead: gh, uom: r.uom?.name ?? 'Nos', stock: stockMap.get(k) ?? 0 });
        }
        setStoreItems(rows);
      } catch (e) {
        console.warn('Failed to load store items', e);
      }
    })();
  }, []);

  const handleSelectStoreItem = (index: number, key: string) => {
    const it = storeItems.find((i) => i.key === key);
    if (!it) return;
    setProducts((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        product_name: it.name,
        group_head: it.groupHead,
        uom: it.uom,
        current_stock_qty: it.stock,
      };
      return updated;
    });
  };

  // Initialize Indenter Name from auth
  useEffect(() => {
    if (user?.username && !indenterName) {
      setIndenterName(user.username);
    }
  }, [user]);

  // Fetch Projects from PMS API
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await pmsApi.get('/projects');
      const list = Array.isArray(res) ? res : res?.data || [];
      const mapped = list.map((p: any) => ({
        id: p.id || p.serial_no || p.serialNo,
        project_name: p.project_name || p.projectName || `Project ${p.serial_no || p.id}`,
        serial_no: p.serial_no || p.serialNo,
      }));
      setProjects(mapped);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Fetch Indent History from PMS API
  const loadIndents = async () => {
    setLoadingTable(true);
    try {
      const res = await pmsApi.get('/indents');
      const list = Array.isArray(res) ? res : res?.data || [];
      const flattened: any[] = [];

      list.forEach((ind: any, indIdx: number) => {
        const indentId = ind.id || ind.indent_id || indIdx;
        const indentNo = ind.indent_number || ind.indentNo || `PI-${String(indentId).padStart(4, '0')}`;
        const baseIndent = {
          raw_indent: ind,
          indent_id: indentId,
          indent_number: indentNo,
          date: ind.indent_date || ind.date || ind.created_at,
          project_name: ind.project_name || ind.projectName || '-',
          indenter_name: ind.indenter_name || ind.indenter || '-',
          priority: ind.priority || 'Non-Critical',
          status: ind.status || 'Pending',
        };

        let hasItems = false;

        // Process Products
        if (Array.isArray(ind.products) && ind.products.length > 0) {
          hasItems = true;
          ind.products.forEach((p: any, pIdx: number) => {
            flattened.push({
              ...baseIndent,
              row_key: `${indentId}_p_${p.id || pIdx}`,
              group_head: p.group_head || '-',
              item_name: p.product_name || '-',
              quantity: p.quantity ?? '-',
              current_stock: p.current_stock_qty ?? p.current_stock ?? 0,
              uom: p.uom || 'Nos',
              area_of_use: p.area_of_use || '-',
              expected_date: p.expected_requirement_date || p.expected_date,
              item_type: 'Product',
            });
          });
        }

        // Process Equipments
        if (Array.isArray(ind.equipments) && ind.equipments.length > 0) {
          hasItems = true;
          ind.equipments.forEach((eq: any, eqIdx: number) => {
            flattened.push({
              ...baseIndent,
              row_key: `${indentId}_eq_${eq.id || eqIdx}`,
              group_head: eq.group_head || '-',
              item_name: eq.equipment_name || '-',
              quantity: eq.type === 'Rent' ? (eq.expected_time || '1 Rent') : '1 Owned',
              current_stock: 0,
              uom: eq.type || 'Equipment',
              area_of_use: eq.area_of_use || '-',
              expected_date: eq.expected_date || '-',
              item_type: 'Equipment',
            });
          });
        }

        // Generic Items fallback
        if (!hasItems && Array.isArray(ind.items) && ind.items.length > 0) {
          hasItems = true;
          ind.items.forEach((it: any, itIdx: number) => {
            flattened.push({
              ...baseIndent,
              row_key: `${indentId}_it_${it.id || itIdx}`,
              group_head: it.group_head || '-',
              item_name: it.product_name || it.item_name || '-',
              quantity: it.quantity ?? '-',
              current_stock: it.current_stock_qty ?? it.current_stock ?? 0,
              uom: it.uom || 'Nos',
              area_of_use: it.area_of_use || '-',
              expected_date: it.expected_date || it.expected_requirement_date,
              item_type: it.indent_type || 'Product',
            });
          });
        }

        if (!hasItems) {
          flattened.push({
            ...baseIndent,
            row_key: `${indentId}_single`,
            group_head: ind.group_head || '-',
            item_name: ind.product_name || ind.product || '-',
            quantity: ind.quantity ?? '-',
            current_stock: ind.current_stock_qty ?? ind.current_stock ?? 0,
            uom: ind.uom || 'Nos',
            area_of_use: ind.area_of_use || '-',
            expected_date: ind.expected_date || ind.expected_requirement_date,
            item_type: ind.indent_type || 'Product',
          });
        }
      });

      setIndentRows(flattened);
    } catch (err) {
      console.error('Failed to load indents', err);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadIndents();
  }, []);

  // Filtered Project Options for Dropdown
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.project_name.toLowerCase().includes(q) ||
        (p.serial_no && p.serial_no.toLowerCase().includes(q))
    );
  }, [projects, projectSearch]);

  const handleSelectProject = (selectedId: string) => {
    setProjectId(selectedId);
    const found = projects.find((p) => String(p.id) === selectedId);
    if (found) {
      setProjectName(found.project_name);
    }
  };

  // Filtered Table Rows
  const filteredRows = useMemo(() => {
    return indentRows.filter((row) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const indNo = String(row.indent_number || '').toLowerCase();
        const proj = String(row.project_name || '').toLowerCase();
        const ind = String(row.indenter_name || '').toLowerCase();
        const item = String(row.item_name || '').toLowerCase();
        const grp = String(row.group_head || '').toLowerCase();
        const area = String(row.area_of_use || '').toLowerCase();
        const matchesSearch =
          indNo.includes(q) ||
          proj.includes(q) ||
          ind.includes(q) ||
          item.includes(q) ||
          grp.includes(q) ||
          area.includes(q);
        if (!matchesSearch) return false;
      }

      if (filterProject !== 'ALL') {
        if (String(row.project_name).trim().toLowerCase() !== filterProject.trim().toLowerCase()) {
          return false;
        }
      }

      if (filterPriority !== 'ALL') {
        if (row.priority !== filterPriority) {
          return false;
        }
      }

      return true;
    });
  }, [indentRows, searchQuery, filterProject, filterPriority]);

  const uniqueProjectNames = useMemo(() => {
    const set = new Set<string>();
    indentRows.forEach((r) => {
      if (r.project_name && r.project_name !== '-') {
        set.add(r.project_name);
      }
    });
    return Array.from(set);
  }, [indentRows]);

  // Delete Action
  const handleDeleteIndent = async (indentId: string | number, indentNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete Indent ${indentNumber}?`)) {
      return;
    }
    try {
      const res = await pmsApi.delete(`/indents/${indentId}`);
      if (res?.error && !res.success) {
        toast.error(res.error || 'Failed to delete indent');
        return;
      }
      toast.success(`Indent ${indentNumber} deleted`);
      loadIndents();
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  // Reset Form
  const handleResetForm = () => {
    setIndentDate(getTodayString());
    setProjectId('');
    setProjectName('');
    setProjectSearch('');
    setIndenterName(user?.username || '');
    setPriority('Non-Critical');
    setProducts([
      {
        group_head: '',
        area_of_use: '',
        product_name: '',
        quantity: '',
        current_stock_qty: 0,
        uom: 'Nos',
        expected_requirement_date: getTodayString(),
        attachment_file: null,
        attachment_name: '',
        specifications: '',
        indent_type: 'Product',
      },
    ]);
    setEquipments([]);
  };

  // Open Full-Page Form
  const handleOpenCreatePage = () => {
    handleResetForm();
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Close Full-Page Form & Return to Table
  const handleBackToTable = () => {
    setIsCreating(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Product Operations
  const handleAddProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        group_head: '',
        area_of_use: '',
        product_name: '',
        quantity: '',
        current_stock_qty: 0,
        uom: 'Nos',
        expected_requirement_date: getTodayString(),
        attachment_file: null,
        attachment_name: '',
        specifications: '',
        indent_type: 'Product',
      },
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof ProductRow, value: any) => {
    setProducts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleProductFileUpload = (index: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleProductChange(index, 'attachment_file', reader.result as string);
      handleProductChange(index, 'attachment_name', file.name);
      toast.success(`Attached "${file.name}"`);
    };
    reader.readAsDataURL(file);
  };

  // Equipment Operations
  const handleAddEquipment = () => {
    setEquipments((prev) => [
      ...prev,
      {
        group_head: '',
        area_of_use: '',
        equipment_name: '',
        type: 'Rent',
        quantity: '',
        expected_time: '',
        day_charge: '',
        indent_type: 'Equipment',
      },
    ]);
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEquipmentChange = (index: number, field: keyof EquipmentRow, value: any) => {
    setEquipments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      toast.error('Please select a project');
      return;
    }
    if (!indenterName.trim()) {
      toast.error('Indenter name is required');
      return;
    }

    if (products.length === 0 && equipments.length === 0) {
      toast.error('At least one product item or equipment is required');
      return;
    }

    // Validate Products
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.product_name.trim()) {
        toast.error(`Item #${i + 1}: Product name is required`);
        return;
      }
      if (!p.quantity || Number(p.quantity) <= 0) {
        toast.error(`Item #${i + 1}: Valid quantity is required`);
        return;
      }
      if (!p.expected_requirement_date) {
        toast.error(`Item #${i + 1}: Expected requirement date is required`);
        return;
      }
    }

    // Validate Equipments
    for (let i = 0; i < equipments.length; i++) {
      const eq = equipments[i];
      if (!eq.equipment_name.trim()) {
        toast.error(`Equipment #${i + 1}: Equipment name is required`);
        return;
      }
      if (!eq.quantity || Number(eq.quantity) <= 0) {
        toast.error(`Equipment #${i + 1}: Quantity is required`);
        return;
      }
      if (eq.type === 'Rent') {
        if (!eq.expected_time.trim()) {
          toast.error(`Equipment #${i + 1}: Expected time is required for rented equipment`);
          return;
        }
        if (!eq.day_charge || Number(eq.day_charge) <= 0) {
          toast.error(`Equipment #${i + 1}: Day charge ₹ is required for rented equipment`);
          return;
        }
      }
    }

    setSubmitting(true);

    const payload = {
      project_id: isNaN(Number(projectId)) ? projectId : Number(projectId),
      project_name: projectName,
      indenter_name: indenterName,
      priority: priority,
      indent_date: indentDate || getTodayString(),
      products: products.map((p) => ({
        group_head: p.group_head || '',
        product_name: p.product_name,
        quantity: Number(p.quantity),
        current_stock_qty: p.current_stock_qty || 0,
        uom: p.uom || 'Nos',
        area_of_use: p.area_of_use || '',
        expected_requirement_date: p.expected_requirement_date,
        specifications: p.specifications || '',
        attachment_url: p.attachment_file || null,
        indent_type: 'Product',
      })),
      equipments: equipments.map((eq) => ({
        group_head: eq.group_head || '',
        area_of_use: eq.area_of_use || '',
        equipment_name: eq.equipment_name,
        type: eq.type,
        quantity: Number(eq.quantity),
        expected_time: eq.type === 'Rent' ? eq.expected_time : '',
        day_charge: eq.type === 'Rent' ? Number(eq.day_charge) : 0,
        indent_type: 'Equipment',
      })),
    };

    try {
      const res = await pmsApi.post('/indents', payload);

      if (res && res.error && !res.success) {
        toast.error(res.error || res.message || 'Failed to submit indent');
        setSubmitting(false);
        return;
      }

      const generatedIndentNo =
        res?.data?.indent_number || res?.indent_number || `PI-${Math.floor(1000 + Math.random() * 9000)}`;
      toast.success(`Indent ${generatedIndentNo} created successfully`);

      handleResetForm();
      loadIndents();
      setIsCreating(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit indent');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // VIEW 1: FULL-PAGE CREATE FORM (Rendered when isCreating is true)
  // =========================================================================
  if (isCreating) {
    return (
      <div className="min-h-screen bg-slate-50/70 pb-20">
        {/* Sticky Top Bar matching system style */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-4 py-3 shadow-xs">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {/* Back button */}
            <button
              type="button"
              onClick={handleBackToTable}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Indents</span>
            </button>

            {/* Title */}
            <h1 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-wider text-center">
              CREATE NEW INDENT
            </h1>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetForm}
                className="text-xs font-semibold h-9 px-3 border-slate-200"
              >
                Reset
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-xs h-9 px-5"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Create Indent</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Full-Page Form Container */}
        <div className="max-w-5xl mx-auto mt-6 px-4 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECTION 1: HEADER ROW (Spacious 4-column responsive grid) */}
            <Card className="border border-slate-200/90 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 py-4 px-6">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                    <Building2 className="w-3.5 h-3.5" /> Header Information
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Indent Date */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Indent Date
                    </Label>
                    <Input
                      type="date"
                      value={indentDate}
                      onChange={(e) => setIndentDate(e.target.value)}
                      className="bg-white h-10 text-xs border-slate-200 rounded-lg shadow-2xs font-medium"
                      required
                    />
                  </div>

                  {/* Project Name (Searchable Select) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Project Name <span className="text-red-500">*</span>
                    </Label>
                    <Select value={projectId} onValueChange={handleSelectProject}>
                      <SelectTrigger className="bg-white h-10 text-xs border-slate-200 rounded-lg shadow-2xs">
                        <SelectValue placeholder={loadingProjects ? 'Loading...' : 'Select Project'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <div className="p-2 border-b border-slate-100">
                          <Input
                            placeholder="Filter project list..."
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            className="h-8 text-xs bg-slate-50 border-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {filteredProjects.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">No projects found</div>
                        ) : (
                          filteredProjects.map((p) => (
                            <SelectItem key={String(p.id)} value={String(p.id)} className="text-xs">
                              {p.project_name} {p.serial_no ? `(${p.serial_no})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Indenter Name */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Indenter Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={indenterName}
                      onChange={(e) => setIndenterName(e.target.value)}
                      placeholder="Username / Indenter"
                      className="bg-white h-10 text-xs border-slate-200 rounded-lg shadow-2xs font-medium"
                      required
                    />
                  </div>

                  {/* Priority */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Priority
                    </Label>
                    <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                      <SelectTrigger className="bg-white h-10 text-xs border-slate-200 rounded-lg shadow-2xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Non-Critical" className="text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Non-Critical
                          </span>
                        </SelectItem>
                        <SelectItem value="Critical" className="text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Critical (Urgent)
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SECTION 2: PRODUCT ITEMS */}
            <Card className="border border-slate-200/90 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                    <Package className="w-3.5 h-3.5" /> Product Items ({products.length})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddProduct}
                  className="text-xs font-semibold text-blue-700 border-blue-200 bg-white hover:bg-blue-50/80 h-8 gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {products.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 bg-slate-50/40">
                    No product items added. Click "+ Add Item" to request materials.
                  </div>
                ) : (
                  products.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-5 border border-slate-200 rounded-xl bg-gradient-to-b from-white to-slate-50/50 relative space-y-4 shadow-xs transition-all hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider bg-blue-600 text-white px-2.5 py-1 rounded-md shadow-2xs">
                            ITEM #{idx + 1}
                          </span>
                          {item.product_name && (
                            <span className="text-xs font-semibold text-slate-800">
                              {item.product_name}
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(idx)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2.5 text-xs gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Group Head */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                            Group Head
                          </Label>
                          <Input
                            value={item.group_head}
                            readOnly
                            placeholder="Auto-filled from product"
                            className="bg-slate-100 cursor-not-allowed h-9 text-xs border-slate-200 rounded-lg"
                          />
                        </div>

                        {/* Area of Use */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                            Area Of Use
                          </Label>
                          <Input
                            value={item.area_of_use}
                            onChange={(e) => handleProductChange(idx, 'area_of_use', e.target.value)}
                            placeholder="Area Of Use"
                            className="bg-white h-9 text-xs border-slate-200 rounded-lg"
                          />
                        </div>

                        {/* Product Name */}
                        <div className="space-y-1 lg:col-span-2">
                          <Label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                            Product Name <span className="text-red-500">*</span>
                          </Label>
<ComboBox
                            options={storeItems.map((i) => ({ label: i.groupHead ? `${i.name} (${i.groupHead})` : i.name, value: i.key }))}
                            value={storeItems.find((i) => i.name === item.product_name && i.groupHead === item.group_head)?.key ? [storeItems.find((i) => i.name === item.product_name && i.groupHead === item.group_head)!.key] : []}
                            onChange={(v) => v[0] && handleSelectStoreItem(idx, v[0])}
                            placeholder="Select Product from Store"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                            Quantity <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                            placeholder="0"
                            className="bg-white h-9 text-xs border-slate-200 rounded-lg font-bold text-slate-900"
                            required
                          />
                        </div>

                        {/* Current Stock */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            Current Stock Qty
                          </Label>
                          <Input
                            type="number"
                            readOnly
                            value={item.current_stock_qty}
                            className="bg-slate-100 text-slate-500 h-9 text-xs border-slate-200 rounded-lg cursor-not-allowed"
                          />
                        </div>

                        {/* UOM */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                            UOM
                          </Label>
                          <Input
                            value={item.uom}
                            readOnly
                            placeholder="Auto-filled"
                            className="bg-slate-100 cursor-not-allowed h-9 text-xs border-slate-200 rounded-lg"
                          />
                        </div>

                        {/* Expected Requirement Date */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                            Expected Requirement Date <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="date"
                            min={getTodayString()}
                            value={item.expected_requirement_date}
                            onChange={(e) => handleProductChange(idx, 'expected_requirement_date', e.target.value)}
                            className="bg-white h-9 text-xs border-slate-200 rounded-lg font-medium"
                            required
                          />
                        </div>

                        {/* File Attachment */}
                        <div className="space-y-1 lg:col-span-2">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                            Attachment (Optional)
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              onChange={(e) => handleProductFileUpload(idx, e.target.files?.[0] || null)}
                              className="bg-white h-9 text-xs border-slate-200 rounded-lg file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700"
                            />
                            {item.attachment_name && (
                              <Badge variant="secondary" className="text-[10px] truncate max-w-[140px] shrink-0">
                                {item.attachment_name}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Specifications / Remarks */}
                        <div className="space-y-1 lg:col-span-2">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                            Specifications / Remarks
                          </Label>
                          <Textarea
                            value={item.specifications}
                            onChange={(e) => handleProductChange(idx, 'specifications', e.target.value)}
                            placeholder="Specifications / Remarks"
                            rows={2}
                            className="bg-white text-xs border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* SECTION 3: EQUIPMENT SECTION */}
            <Card className="border border-amber-200/90 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50/50 to-white border-b border-amber-100 py-4 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-300">
                    <Wrench className="w-3.5 h-3.5 text-amber-700" /> Equipment Section ({equipments.length})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEquipment}
                  className="text-xs font-semibold text-amber-800 border-amber-300 bg-white hover:bg-amber-50/80 h-8 gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700" /> Add Equipment
                </Button>
              </CardHeader>

              <CardContent className="p-6 space-y-5">
                {equipments.length === 0 ? (
                  <div className="p-8 border border-dashed border-amber-200 rounded-xl text-center text-xs text-amber-800/80 bg-amber-50/20">
                    No equipment added. Click "+ Add Equipment" to request vehicles, cranes, excavators, dump trucks, etc.
                  </div>
                ) : (
                  equipments.map((eq, idx) => (
                    <div
                      key={idx}
                      className="p-5 border border-amber-200 rounded-xl bg-gradient-to-b from-white to-amber-50/30 relative space-y-4 shadow-xs transition-all hover:border-amber-300"
                    >
                      <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider bg-amber-600 text-white px-2.5 py-1 rounded-md shadow-2xs">
                            EQUIPMENT #{idx + 1}
                          </span>
                          {eq.equipment_name && (
                            <span className="text-xs font-semibold text-slate-800">
                              {eq.equipment_name}
                            </span>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEquipment(idx)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2.5 text-xs gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Group Head */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                            Group Head
                          </Label>
                          <Input
                            value={eq.group_head}
                            onChange={(e) => handleEquipmentChange(idx, 'group_head', e.target.value)}
                            placeholder="Group Head"
                            className="bg-white h-9 text-xs border-amber-200 rounded-lg"
                          />
                        </div>

                        {/* Area of Use */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                            Area Of Use
                          </Label>
                          <Input
                            value={eq.area_of_use}
                            onChange={(e) => handleEquipmentChange(idx, 'area_of_use', e.target.value)}
                            placeholder="Area Of Use"
                            className="bg-white h-9 text-xs border-amber-200 rounded-lg"
                          />
                        </div>

                        {/* Equipment Name */}
                        <div className="space-y-1 lg:col-span-2">
                          <Label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                            Equipment Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={eq.equipment_name}
                            onChange={(e) => handleEquipmentChange(idx, 'equipment_name', e.target.value)}
                            placeholder="e.g. Vehicles, Crane, Excavator, Dump Truck"
                            className="bg-white h-9 text-xs border-amber-200 rounded-lg font-medium"
                            required
                          />
                        </div>

                        {/* Quantity */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                            Quantity <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            step="any"
                            value={eq.quantity}
                            onChange={(e) => handleEquipmentChange(idx, 'quantity', e.target.value)}
                            placeholder="Nos"
                            className="bg-white h-9 text-xs border-amber-200 rounded-lg font-medium"
                            required
                          />
                        </div>

                        {/* Type (Rent / Owned) */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                            Type
                          </Label>
                          <Select
                            value={eq.type}
                            onValueChange={(val: 'Rent' | 'Owned') => handleEquipmentChange(idx, 'type', val)}
                          >
                            <SelectTrigger className="bg-white h-9 text-xs border-amber-200 rounded-lg font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Rent" className="text-xs">
                                Rent
                              </SelectItem>
                              <SelectItem value="Owned" className="text-xs">
                                Owned
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Conditional Fields: When Type = Rent */}
                        {eq.type === 'Rent' && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
                                Expected Time <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                value={eq.expected_time}
                                onChange={(e) => handleEquipmentChange(idx, 'expected_time', e.target.value)}
                                placeholder="e.g. 15 Days, 1 Month, 8 Hours"
                                className="bg-white h-9 text-xs border-amber-300 rounded-lg font-medium"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
                                Day Charge ₹ <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={eq.day_charge}
                                onChange={(e) => handleEquipmentChange(idx, 'day_charge', e.target.value)}
                                placeholder="₹ Charge per day"
                                className="bg-white h-9 text-xs border-amber-300 rounded-lg font-bold text-amber-950"
                                required
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToTable}
                className="text-xs font-semibold h-10 px-5 border-slate-200"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 px-8 shadow-sm gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> SUBMITTING...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> CREATE INDENT
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: TABLE ONLY (Default page view when isCreating is false)
  // =========================================================================
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Page Title & "+ Create Indent" Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Indent</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage site requisitions, materials, and equipment requests
          </p>
        </div>

        <Button
          onClick={handleOpenCreatePage}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 h-9 shadow-sm gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create Indent
        </Button>
      </div>

      {/* Main Table with Search & Filters */}
      <Card className="border border-slate-200/90 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 py-3 px-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search indents, project, product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* All Projects Filter */}
              <div className="w-44">
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-lg">
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="ALL">All Projects</SelectItem>
                    {uniqueProjectNames.map((proj) => (
                      <SelectItem key={proj} value={proj}>
                        {proj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* All Priorities Filter */}
              <div className="w-36">
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-lg">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="Non-Critical">Non-Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={loadIndents}
                disabled={loadingTable}
                className="h-9 px-3 text-xs bg-white border-slate-200 rounded-lg gap-1.5"
                title="Refresh Table"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loadingTable && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Actions</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Indent No.</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Project</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Indenter</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Group Head</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Product / Equipment</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right whitespace-nowrap">Qty</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-center whitespace-nowrap">Current Stock</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">UOM</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Area of Use</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Expected Date</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Priority</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTable ? (
                  <TableRow>
                    <TableCell colSpan={14} className="h-36 text-center text-xs text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        Loading indents...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="h-36 text-center text-xs text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <AlertCircle className="w-5 h-5 text-slate-400" />
                        No indents found. Click "+ Create Indent" to raise a new requisition.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const isCritical = row.priority === 'Critical';
                    const isEquipment = row.item_type === 'Equipment';

                    return (
                      <TableRow key={row.row_key} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="text-xs whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteIndent(row.indent_id, row.indent_number)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                            title="Delete Indent"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                        <TableCell className="font-semibold text-xs text-blue-700 whitespace-nowrap">
                          {row.indent_number}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-800 whitespace-nowrap max-w-[160px] truncate" title={row.project_name}>
                          {row.project_name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {row.indenter_name}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {row.group_head}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900 max-w-[180px] truncate" title={row.item_name}>
                          <div className="flex items-center gap-1.5">
                            {isEquipment ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1 py-0">
                                Eq
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1 py-0">
                                Pr
                              </Badge>
                            )}
                            <span className="truncate">{row.item_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-bold text-slate-900 whitespace-nowrap">
                          {row.quantity}
                        </TableCell>
                        <TableCell className="text-xs text-center text-slate-500 whitespace-nowrap">
                          {row.current_stock}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {row.uom}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[140px] truncate whitespace-nowrap" title={row.area_of_use}>
                          {row.area_of_use}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                          {formatDate(row.expected_date)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {isCritical ? (
                            <Badge className="bg-red-50 text-red-700 border-red-200 text-[11px] font-semibold">
                              Critical
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-600 bg-slate-50 text-[11px]">
                              Non-Critical
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[11px] font-semibold capitalize',
                              row.status === 'Approved' && 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                              row.status === 'Rejected' && 'bg-rose-50 text-rose-700 border border-rose-200',
                              (!row.status || row.status === 'Pending') && 'bg-amber-50 text-amber-700 border border-amber-200'
                            )}
                          >
                            {row.status || 'Pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
