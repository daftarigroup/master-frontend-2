import {
  AlertCircle,
  Box,
  Building2,
  Calendar,
  ChevronRight,
  Download,
  MapPin,
  Package,
  Plus,
  QrCode,
  Search,
  Settings2,
  User,
  Wrench,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeModal } from './QRCodeModal';
import { BulkQRModal } from './BulkQRModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAssets, useCreateAsset, useUsersList } from '../server/tanstackQuery/useAssetQueries';
import {
  CATEGORY_COLORS,
  formatCurrency,
  formatDateOnly,
  STATUS_COLORS,
  type Asset,
  type AssetCategory,
  type AssetStatus,
} from '../types/types';

function AssetCard({ asset }: { asset: Asset }) {
  const catCfg = CATEGORY_COLORS[asset.category];
  const statusCfg = STATUS_COLORS[asset.status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-4 space-y-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={cn('rounded-xl p-2 shrink-0', catCfg?.bg)}>
            <Package className={cn('h-4 w-4', catCfg?.text)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{asset.productName}</p>
            <p className="text-[11px] text-muted-foreground">
              {asset.brand} · {asset.model}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border',
            statusCfg.bg,
            statusCfg.text,
            statusCfg.border
          )}
        >
          {asset.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-b border-border/50 text-center">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-bold mb-0.5">
            Dept
          </p>
          <p className="text-xs font-semibold text-foreground truncate">{asset.department}</p>
        </div>
        <div className="border-l border-border/50">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-bold mb-0.5">
            Location
          </p>
          <p className="text-xs font-semibold text-foreground truncate">{asset.location}</p>
        </div>
        <div className="border-l border-border/50">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-bold mb-0.5">
            Value
          </p>
          <p className="text-xs font-bold text-emerald-600">{formatCurrency(asset.assetValue)}</p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        {asset.firmName && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Building2 className="h-3 w-3" /> Project (Firm)
            </span>
            <span className="font-semibold text-foreground truncate max-w-[55%]">
              {asset.firmName}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" /> Assigned To
          </span>
          <span className="font-semibold text-foreground">{asset.assignedTo}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" /> Asset Date
          </span>
          <span className="font-semibold text-foreground">{formatDateOnly(asset.assetDate)}</span>
        </div>
        {asset.maintenanceRequired === 'Yes' && asset.nextService && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-amber-600">
              <Wrench className="h-3 w-3" /> Next Service
            </span>
            <span className="font-semibold text-amber-600">{formatDateOnly(asset.nextService)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full border',
              catCfg?.bg,
              catCfg?.text
            )}
          >
            {asset.category}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">{asset.sn}</span>
        </div>
        <Link
          to={`/asset/asset/${asset.id}`}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80"
        >
          Details <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.div>
  );
}

const CATEGORIES: AssetCategory[] = ['IT', 'Electronics', 'Furniture', 'Machinery', 'Tools', 'Vehicle'];

export default function AssetList() {
  const { data: assets = [] } = useAssets();
  const createAsset = useCreateAsset();

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'all' | AssetStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AssetCategory>('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [firmFilter, setFirmFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [bulkQrOpen, setBulkQrOpen] = useState(false);
  const [selectedQrAsset, setSelectedQrAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({
    productName: '',
    category: 'IT' as AssetCategory,
    type: 'Asset' as Asset['type'],
    brand: '',
    model: '',
    serialNo: '',
    sku: '',
    mfgDate: '',
    origin: '',
    assetDate: new Date().toISOString().slice(0, 10),
    invoiceNo: '',
    cost: '',
    quantity: '1',
    supplierName: '',
    supplierPhone: '',
    paymentMode: '',
    depMethod: 'Straight Line',
    location: '',
    department: '',
    firmId: '',
    assignedTo: '',
    responsiblePerson: '',
    warrantyAvailable: 'No' as 'Yes' | 'No',
    warrantyEnd: '',
    maintenanceRequired: 'No' as 'Yes' | 'No',
    priority: '',
  });

  const { data: firmsResponse } = useQuery({
    queryKey: ['asset', 'firms', 'list'],
    queryFn: () => api.get('/maintenance/firms'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const firms: { id: string; name: string }[] = firmsResponse?.data?.data ?? [];
  const { data: users = [] } = useUsersList();

  const departments = useMemo(
    () => [...new Set(assets.map((a) => a.department).filter(Boolean))],
    [assets]
  );

  const filtered = useMemo(() => {
    let list = assets;
    if (statusTab !== 'all') list = list.filter((a) => a.status === statusTab);
    if (categoryFilter !== 'all') list = list.filter((a) => a.category === categoryFilter);
    if (deptFilter !== 'all') list = list.filter((a) => a.department === deptFilter);
    if (firmFilter !== 'all')
      list = list.filter(
        (a) => String(a.firmId) === firmFilter || a.firmName === firmFilter
      );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.productName.toLowerCase().includes(q) ||
          a.sn.toLowerCase().includes(q) ||
          a.brand.toLowerCase().includes(q) ||
          a.assignedTo.toLowerCase().includes(q) ||
          a.department.toLowerCase().includes(q) ||
          (a.firmName && a.firmName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [assets, search, statusTab, categoryFilter, deptFilter, firmFilter]);

  const statusCounts = useMemo(
    () => ({
      all: assets.length,
      Active: assets.filter((a) => a.status === 'Active').length,
      Inactive: assets.filter((a) => a.status === 'Inactive').length,
      'Under Repair': assets.filter((a) => a.status === 'Under Repair').length,
      Disposed: assets.filter((a) => a.status === 'Disposed').length,
    }),
    [assets]
  );

  function resetForm() {
    setForm({
      productName: '',
      category: 'IT',
      type: 'Asset',
      brand: '',
      model: '',
      serialNo: '',
      sku: '',
      mfgDate: '',
      origin: '',
      assetDate: new Date().toISOString().slice(0, 10),
      invoiceNo: '',
      cost: '',
      quantity: '1',
      supplierName: '',
      supplierPhone: '',
      paymentMode: '',
      depMethod: 'Straight Line',
      location: '',
      department: '',
      firmId: '',
      assignedTo: '',
      responsiblePerson: '',
      warrantyAvailable: 'No',
      warrantyEnd: '',
      maintenanceRequired: 'No',
      priority: '',
    });
  }

  async function handleCreateAsset() {
    if (!form.productName.trim()) return;
    await createAsset.mutateAsync({
      ...form,
      firmId: form.firmId && form.firmId !== 'none' ? form.firmId : undefined,
      cost: Number(form.cost || 0),
      assetValue: Number(form.cost || 0),
      quantity: Number(form.quantity || 1),
      status: 'Active',
      warrantyEnd: form.warrantyAvailable === 'Yes' ? form.warrantyEnd : '',
      maintenanceRequired: form.maintenanceRequired,
      maintenanceType: form.maintenanceRequired === 'Yes' ? 'Preventive' : '',
      nextService: '',
      priority: form.maintenanceRequired === 'Yes' ? (form.priority as Asset['priority']) : '',
      amc: 'No',
      partChanged: 'No',
      partNames: [],
      repairCount: 0,
      repairCost: 0,
      totalRepairCost: 0,
      depMethod: form.depMethod || 'Straight Line',
    });
    setAddOpen(false);
    resetForm();
  }

  function handleExportCSV() {
    const headers = [
      'SN',
      'Asset Name',
      'Category',
      'Type',
      'Brand',
      'Model',
      'Serial No',
      'Department',
      'Project (Firm)',
      'Assigned To',
      'Location',
      'Status',
      'Value',
      'Warranty End',
      'Maintenance',
    ];
    const rows = filtered.map((a) => [
      a.sn,
      a.productName,
      a.category,
      a.type,
      a.brand,
      a.model,
      a.serialNo,
      a.department,
      a.firmName || '',
      a.assignedTo,
      a.location,
      a.status,
      a.assetValue,
      a.warrantyAvailable === 'Yes' ? a.warrantyEnd : 'No',
      a.maintenanceRequired,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assets_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleQRPDF() {
    setBulkQrOpen(true);
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Link
                to="/asset/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Asset Management
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">All Assets</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">All Assets</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-bold text-foreground">{filtered.length}</span> assets
              {filtered.length !== assets.length && ` of ${assets.length} total`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground border border-border rounded-xl px-3 py-2 hover:bg-muted transition-colors"
            >
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              type="button"
              onClick={handleQRPDF}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground border border-border rounded-xl px-3 py-2 hover:bg-muted transition-colors"
            >
              <QrCode className="h-4 w-4" /> QR PDF
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl px-4 py-2 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Asset
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-3 mb-5"
      >
        <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as typeof statusTab)}>
          <TabsList className="h-auto flex-wrap gap-1 bg-muted/60 p-1">
            {(['all', 'Active', 'Inactive', 'Under Repair'] as const).map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs">
                {s === 'all' ? 'All' : s}
                <span className="ml-1.5 text-[10px] opacity-60 font-bold">{statusCounts[s]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, SN, brand, assigned to…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}
          >
            <SelectTrigger className="h-9 w-full sm:w-40 text-sm">
              <Box className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-9 w-full sm:w-40 text-sm">
              <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={firmFilter} onValueChange={setFirmFilter}>
            <SelectTrigger className="h-9 w-full sm:w-44 text-sm">
              <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Project (Firm)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects (Firms)</SelectItem>
              {firms.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || categoryFilter !== 'all' || deptFilter !== 'all' || firmFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setDeptFilter('all');
                setFirmFilter('all');
              }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl px-3 py-2 transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </motion.div>

      <Separator className="mb-5" />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No assets found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Adjust your filters or search term
          </p>
        </div>
      ) : (
        <>
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>

          <div className="hidden md:block">
            <Card className="shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/60 z-10 min-w-[200px]">
                        Asset
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        SN
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Category
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Department
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Project (Firm)
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Assigned To
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Location
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Value
                      </th>
                      <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Warranty
                      </th>
                      <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Maintenance
                      </th>
                      <th className="text-center px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filtered.map((asset, idx) => {
                      const catCfg = CATEGORY_COLORS[asset.category];
                      const statusCfg = STATUS_COLORS[asset.status];
                      return (
                        <motion.tr
                          key={asset.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          <td className="px-4 py-3 sticky left-0 bg-card group-hover:bg-muted/30 transition-colors z-10">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn('rounded-lg p-1.5 shrink-0', catCfg?.bg)}>
                                <Package className={cn('h-3.5 w-3.5', catCfg?.text)} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                                   {asset.productName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {asset.brand} · {asset.model}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-mono text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                              {asset.sn}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                                catCfg?.bg,
                                catCfg?.text
                              )}
                            >
                              {asset.category}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-foreground">
                              {asset.department}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-foreground">
                              {asset.firmName || '—'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-primary">
                                  {asset.assignedTo.charAt(0)}
                                </span>
                              </div>
                              <span className="text-xs text-foreground truncate max-w-[100px]">
                                {asset.assignedTo}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{asset.location}</span>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold tabular-nums text-foreground">
                              {formatCurrency(asset.assetValue)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            {asset.warrantyAvailable === 'Yes' ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                Till {asset.warrantyEnd}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {asset.maintenanceRequired === 'Yes' ? (
                              <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-600">
                                <Wrench className="h-3 w-3" />
                                {asset.priority}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span
                              className={cn(
                                'px-2.5 py-1 rounded-full text-[10px] font-bold border',
                                statusCfg.bg,
                                statusCfg.text,
                                statusCfg.border
                              )}
                            >
                              {asset.status}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedQrAsset(asset)}
                                title="View QR Code & Tag"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                              >
                                <QrCode className="h-4 w-4" />
                              </button>
                              <Link
                                to={`/asset/asset/${asset.id}`}
                                title="View Details"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors inline-flex"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between px-5 py-3 border-t border-border/60 bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Showing <span className="font-bold text-foreground">{filtered.length}</span>{' '}
                  assets
                  {' · '}Total value:{' '}
                  <span className="font-bold text-foreground">
                    {formatCurrency(filtered.reduce((s, a) => s + a.assetValue, 0))}
                  </span>
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>Columns</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
            <DialogDescription>
              Create a new asset record with assignment, warranty, and maintenance details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Product name *"
              value={form.productName}
              onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
            />
            <Select
              value={form.category}
              onValueChange={(value) => setForm((f) => ({ ...f, category: value as AssetCategory }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Brand"
              value={form.brand}
              onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            />
            <Input
              placeholder="Model"
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            />
            <Input
              placeholder="Serial number"
              value={form.serialNo}
              onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))}
            />
            <Input
              placeholder="SKU"
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
            />
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Mfg Date</label>
              <Input
                type="date"
                value={form.mfgDate}
                onChange={(e) => setForm((f) => ({ ...f, mfgDate: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Country of Origin"
              value={form.origin}
              onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
            />
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Asset Date</label>
              <Input
                type="date"
                value={form.assetDate}
                onChange={(e) => setForm((f) => ({ ...f, assetDate: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Invoice No"
              value={form.invoiceNo}
              onChange={(e) => setForm((f) => ({ ...f, invoiceNo: e.target.value }))}
            />
            <Input
              placeholder="Cost"
              type="number"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
            />
            <Input
              placeholder="Quantity"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
            <Input
              placeholder="Supplier Name"
              value={form.supplierName}
              onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
            />
            <Input
              placeholder="Supplier Phone"
              value={form.supplierPhone}
              onChange={(e) => setForm((f) => ({ ...f, supplierPhone: e.target.value }))}
            />
            <Select
              value={form.paymentMode || undefined}
              onValueChange={(val) => setForm((f) => ({ ...f, paymentMode: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={form.depMethod || 'Straight Line'}
              onValueChange={(val) => setForm((f) => ({ ...f, depMethod: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Depreciation Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Straight Line">Straight Line</SelectItem>
                <SelectItem value="WDV">WDV</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <Input
              placeholder="Department"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
            <Select
              value={form.firmId || 'none'}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, firmId: value === 'none' ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Project (Firm)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project (Firm)</SelectItem>
                {firms.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.assignedTo || undefined}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, assignedTo: value === '_clear' ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Assigned To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_clear">Clear (None)</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.name}>
                    {u.name} {u.role ? `(${u.role})` : ''}
                  </SelectItem>
                ))}
                {form.assignedTo && !users.some((u) => u.name === form.assignedTo) && (
                  <SelectItem value={form.assignedTo}>{form.assignedTo}</SelectItem>
                )}
              </SelectContent>
            </Select>

            <Select
              value={form.responsiblePerson || undefined}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, responsiblePerson: value === '_clear' ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Responsible To" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_clear">Clear (None)</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.name}>
                    {u.name} {u.role ? `(${u.role})` : ''}
                  </SelectItem>
                ))}
                {form.responsiblePerson &&
                  !users.some((u) => u.name === form.responsiblePerson) && (
                    <SelectItem value={form.responsiblePerson}>{form.responsiblePerson}</SelectItem>
                  )}
              </SelectContent>
            </Select>
            <Select
              value={form.warrantyAvailable}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, warrantyAvailable: value as 'Yes' | 'No' }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Warranty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No">No Warranty</SelectItem>
                <SelectItem value="Yes">Warranty Available</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={form.warrantyEnd}
              disabled={form.warrantyAvailable === 'No'}
              onChange={(e) => setForm((f) => ({ ...f, warrantyEnd: e.target.value }))}
            />
            <Select
              value={form.maintenanceRequired}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, maintenanceRequired: value as 'Yes' | 'No' }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Maintenance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="No">No Maintenance</SelectItem>
                <SelectItem value="Yes">Maintenance Required</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={form.priority || 'Medium'}
              onValueChange={(value) => setForm((f) => ({ ...f, priority: value }))}
              disabled={form.maintenanceRequired === 'No'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateAsset}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add Asset
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals for QR Code & Bulk PDF Sheet */}
      <QRCodeModal
        asset={selectedQrAsset}
        open={!!selectedQrAsset}
        onOpenChange={(open) => !open && setSelectedQrAsset(null)}
      />
      <BulkQRModal
        assets={filtered}
        open={bulkQrOpen}
        onOpenChange={setBulkQrOpen}
      />
    </div>
  );
}
