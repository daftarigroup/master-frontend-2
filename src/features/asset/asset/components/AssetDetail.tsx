import {
  AlertTriangle,
  Building2,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Hammer,
  IndianRupee,
  MapPin,
  Package,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Shield,
  Tag,
  Wrench,
} from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeModal } from './QRCodeModal';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess, isAllowedFirm } from '@/lib/firmAccess';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMachines } from '@/features/maintenancepro/machines/server/tanstackQuery/useMachinesQueries';
import { useWorkOrders } from '@/features/maintenancepro/unique_task/server/tanstackQuery/useWorkOrdersQueries';
import { useRepairSystem } from '@/features/maintenancepro/repair/server/tanstackQuery/useRepairSystem';
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
import { cn } from '@/lib/utils';
import {
  useAsset,
  useUpdateAsset,
  useUsersList,
  useDepartmentsList,
  useSiteLocationsList,
  type SiteLocationOption,
} from '../server/tanstackQuery/useAssetQueries';
import {
  CATEGORY_COLORS,
  formatCurrency,
  formatDateOnly,
  STATUS_COLORS,
  type AssetCategory,
  type AssetStatus,
  type AssetType,
} from '../types/types';

const CATEGORIES: AssetCategory[] = [
  'IT',
  'Electronics',
  'Furniture',
  'Machinery',
  'Tools',
  'Vehicle',
];
const STATUSES: AssetStatus[] = ['Active', 'Inactive', 'Under Repair', 'Disposed'];
const ASSET_TYPES: AssetType[] = ['Asset', 'Non-Consumable', 'Consumable'];

function InfoRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
}) {
  const displayValue = value !== null && value !== undefined && value !== '' ? value : '—';
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 text-xs">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={cn('font-semibold text-right', accent || 'text-foreground')}>
        {displayValue}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  iconColor,
  iconBg,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring' as const, stiffness: 240, damping: 24 }}
    >
      <Card className="shadow-xs hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center gap-2">
            <div className={cn('rounded-lg p-1.5 shrink-0', iconBg)}>
              <Icon className={cn('h-4 w-4', iconColor)} />
            </div>
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="px-5 py-3">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: asset, isLoading } = useAsset(id ?? '');
  const updateAssetMutation = useUpdateAsset();

  const [qrOpen, setQrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Real cross-system linkage: Machine.assetId is a real FK (see
  // ASSET_MAINTENANCE_REPAIR_SCHEMA_ARCHITECTURE.md), so resolve this asset's
  // Machine row first, then pull its real work orders / repair indents —
  // no more fuzzy name/serial matching on the frontend.
  const { data: machinesForAsset } = useMachines({ assetId: asset?.id }, undefined, { enabled: !!asset?.id });
  const machine = machinesForAsset?.data?.[0];

  const { data: workOrdersResp } = useWorkOrders({ machineId: machine?.id }, { enabled: !!machine?.id });
  const linkedWorkOrders = workOrdersResp?.data ?? [];

  const { useIndentsByMachine } = useRepairSystem();
  const { data: linkedRepairs = [] } = useIndentsByMachine(machine?.name, machine?.serialNumber);

  const breakdownUrl = useMemo(() => {
    if (!asset) return '/maintenance/breakdown-log?new=true';
    const params = new URLSearchParams();
    params.set('new', 'true');
    if (asset.id) params.set('assetId', String(asset.id));
    if (asset.productName) params.set('assetName', asset.productName);

    const fId = asset.firmId || machine?.firmId;
    if (fId) params.set('firmId', String(fId));
    const fName = asset.firmName || machine?.firmName;
    if (fName) params.set('firmName', fName);

    const mId = machine?.id;
    if (mId) params.set('machineId', String(mId));
    const mName = machine?.name || asset.productName;
    if (mName) params.set('machineName', mName);

    return `/maintenance/breakdown-log?${params.toString()}`;
  }, [asset, machine]);

  const { data: firmsResponse } = useQuery({
    queryKey: ['asset', 'firms', 'list'],
    queryFn: () => api.get('/maintenance/firms'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { effectivePermittedFirms } = useProject();
  const rawFirms: { id: string; name: string }[] = firmsResponse?.data?.data ?? [];
  const firms = useMemo<{ id: string; name: string }[]>(
    () => filterByFirmAccess(rawFirms, effectivePermittedFirms),
    [rawFirms, effectivePermittedFirms]
  );

  const hasAccessToAsset = useMemo(() => {
    if (!asset) return true;
    return isAllowedFirm(
      { id: asset.firmId ?? machine?.firmId, name: asset.firmName ?? machine?.firmName },
      effectivePermittedFirms
    );
  }, [asset, machine, effectivePermittedFirms]);

  const { data: users = [] } = useUsersList();
  const { data: dbDepartments = [] } = useDepartmentsList();
  const { data: dbLocations = [] } = useSiteLocationsList();

  const [form, setForm] = useState({
    productName: '',
    category: 'IT' as AssetCategory,
    type: 'Asset' as AssetType,
    status: 'Active' as AssetStatus,
    brand: '',
    model: '',
    serialNo: '',
    sku: '',
    mfgDate: '',
    origin: '',
    assetDate: '',
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
    priority: '' as 'Low' | 'Medium' | 'High' | '',
  });

  const availableLocations = useMemo(() => {
    const selectedFirmId = form.firmId && form.firmId !== 'none' ? String(form.firmId) : null;
    let list = dbLocations;
    if (selectedFirmId) {
      list = dbLocations.filter(
        (l) => l.firmId && String(l.firmId) === selectedFirmId
      );
    }
    const seen = new Set<string>();
    const result: SiteLocationOption[] = [];
    for (const item of list) {
      const key = item.location.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
    return result;
  }, [dbLocations, form.firmId]);

  function handleOpenEdit() {
    if (!asset) return;
    setForm({
      productName: asset.productName || '',
      category: asset.category || 'IT',
      type: asset.type || 'Asset',
      status: asset.status || 'Active',
      brand: asset.brand || '',
      model: asset.model || '',
      serialNo: asset.serialNo || '',
      sku: asset.sku || '',
      mfgDate: asset.mfgDate ? formatDateOnly(asset.mfgDate) : '',
      origin: asset.origin || '',
      assetDate: asset.assetDate ? formatDateOnly(asset.assetDate) : '',
      invoiceNo: asset.invoiceNo || '',
      cost: asset.cost !== undefined ? String(asset.cost) : '',
      quantity: asset.quantity !== undefined ? String(asset.quantity) : '1',
      supplierName: asset.supplierName || '',
      supplierPhone: asset.supplierPhone || '',
      paymentMode: asset.paymentMode || '',
      depMethod: asset.depMethod || 'Straight Line',
      location: asset.location || '',
      department: asset.department || '',
      firmId: (asset.firmId as string) || '',
      assignedTo: asset.assignedTo || '',
      responsiblePerson: asset.responsiblePerson || '',
      warrantyAvailable: asset.warrantyAvailable || 'No',
      warrantyEnd: asset.warrantyEnd ? formatDateOnly(asset.warrantyEnd) : '',
      maintenanceRequired: asset.maintenanceRequired || 'No',
      priority: asset.priority || '',
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!asset) return;
    if (!form.productName.trim()) {
      toast.error('Product name is required');
      return;
    }
    try {
      await updateAssetMutation.mutateAsync({
        id: asset.id,
        data: {
          ...form,
          firmId: form.firmId && form.firmId !== 'none' ? form.firmId : undefined,
          cost: Number(form.cost) || 0,
          quantity: Number(form.quantity) || 1,
          mfgDate: form.mfgDate || undefined,
          origin: form.origin || undefined,
          assetDate: form.assetDate || undefined,
          invoiceNo: form.invoiceNo || undefined,
          supplierName: form.supplierName || undefined,
          supplierPhone: form.supplierPhone || undefined,
          paymentMode: form.paymentMode || undefined,
          depMethod: form.depMethod || undefined,
        },
      });
      toast.success('Asset updated successfully');
      setEditOpen(false);
    } catch {
      toast.error('Failed to update asset');
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading asset...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Asset not found</p>
          <Link
            to="/asset/assets"
            className="text-xs text-primary mt-2 inline-block hover:underline"
          >
            ← Back to Assets
          </Link>
        </div>
      </div>
    );
  }

  if (!hasAccessToAsset) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">Access Restricted</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            You do not have permission to access assets belonging to this project/firm.
          </p>
          <Link
            to="/asset/assets"
            className="text-xs text-primary mt-3 inline-block hover:underline"
          >
            ← Back to Assets
          </Link>
        </div>
      </div>
    );
  }

  const catCfg = CATEGORY_COLORS[asset.category];
  const statusCfg = STATUS_COLORS[asset.status];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-5">
        <Link to="/asset/dashboard" className="hover:text-foreground transition-colors">
          Asset Management
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to="/asset/assets" className="hover:text-foreground transition-colors">
          All Assets
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-semibold truncate max-w-[200px]">
          {asset.productName}
        </span>
      </div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <Card
          className={cn(
            'border-2 overflow-hidden shadow-sm',
            asset.status === 'Under Repair'
              ? 'border-amber-300/60'
              : asset.status === 'Active'
                ? 'border-emerald-300/40'
                : 'border-border'
          )}
        >
          <div
            className={cn(
              'h-1 w-full',
              asset.status === 'Under Repair'
                ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                : asset.status === 'Active'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-slate-400 to-slate-300'
            )}
          />
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className={cn('rounded-2xl p-5 shrink-0 self-start', catCfg?.bg)}>
                <Package className={cn('h-10 w-10', catCfg?.text)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h1 className="text-xl font-black text-foreground">{asset.productName}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {asset.brand} · {asset.model}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-bold border',
                        statusCfg.bg,
                        statusCfg.text,
                        statusCfg.border
                      )}
                    >
                      {asset.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQrOpen(true)}
                      title="View QR Code & Tag"
                      className="p-2 rounded-xl border border-border hover:bg-muted hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                    >
                      <QrCode className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenEdit}
                      title="Edit Asset"
                      className="p-2 rounded-xl border border-border hover:bg-muted hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span
                    className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-full border',
                      catCfg?.bg,
                      catCfg?.text
                    )}
                  >
                    {asset.category}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-mono">
                    {asset.sn}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {asset.type}
                  </span>
                  {asset.maintenanceRequired === 'Yes' && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> Maintenance Due
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  {[
                    {
                      label: 'Purchase Cost',
                      value: `₹${asset.cost.toLocaleString()}`,
                      color: 'text-foreground',
                    },
                    {
                      label: 'Current Value',
                      value: formatCurrency(asset.assetValue),
                      color: 'text-emerald-600',
                    },
                    { label: 'Department', value: asset.department, color: 'text-foreground' },
                    { label: 'Assigned To', value: asset.assignedTo, color: 'text-primary' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-muted/50 border border-border/60 p-3"
                    >
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold mb-1">
                        {item.label}
                      </p>
                      <p className={cn('text-sm font-bold truncate', item.color)}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Product Information"
          icon={Tag}
          iconColor="text-blue-600"
          iconBg="bg-blue-500/10"
        >
          <InfoRow label="Serial No" value={asset.serialNo} />
          <InfoRow label="SKU" value={asset.sku} />
          <InfoRow label="Category" value={asset.category} />
          <InfoRow label="Type" value={asset.type} />
          <InfoRow label="Brand" value={asset.brand} />
          <InfoRow label="Model" value={asset.model} />
          <InfoRow label="Mfg Date" value={formatDateOnly(asset.mfgDate)} />
          <InfoRow label="Country of Origin" value={asset.origin} />
        </SectionCard>

        <SectionCard
          title="Asset & Financial Info"
          icon={IndianRupee}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-500/10"
        >
          <InfoRow label="Asset Date" value={formatDateOnly(asset.assetDate)} />
          <InfoRow label="Invoice No" value={asset.invoiceNo} />
          <InfoRow
            label="Purchase Cost"
            value={`₹${asset.cost.toLocaleString()}`}
            accent="text-foreground font-bold"
          />
          <InfoRow label="Quantity" value={asset.quantity} />
          <InfoRow label="Supplier" value={asset.supplierName} />
          <InfoRow label="Payment Mode" value={asset.paymentMode} />
          <InfoRow
            label="Current Book Value"
            value={formatCurrency(asset.assetValue)}
            accent="text-emerald-600 font-bold"
          />
          <InfoRow label="Depreciation Method" value={asset.depMethod} />
        </SectionCard>

        <SectionCard
          title="Location & Ownership"
          icon={MapPin}
          iconColor="text-teal-600"
          iconBg="bg-teal-500/10"
        >
          <InfoRow label="Location" value={asset.location} />
          <InfoRow label="Department" value={asset.department} />
          <InfoRow label="Project (Firm)" value={asset.firmName || '—'} />
          <InfoRow label="Assigned To" value={asset.assignedTo} accent="text-primary" />
          <InfoRow label="Responsible Person" value={asset.responsiblePerson} />
        </SectionCard>

        <SectionCard
          title="Warranty & AMC"
          icon={Shield}
          iconColor="text-violet-600"
          iconBg="bg-violet-500/10"
        >
          <InfoRow
            label="Warranty Available"
            value={asset.warrantyAvailable}
            accent={
              asset.warrantyAvailable === 'Yes' ? 'text-emerald-600' : 'text-muted-foreground'
            }
          />
          {asset.warrantyAvailable === 'Yes' && (
            <InfoRow
              label="Warranty Valid Till"
              value={formatDateOnly(asset.warrantyEnd)}
              accent="text-emerald-600"
            />
          )}
          <InfoRow
            label="AMC"
            value={asset.amc}
            accent={asset.amc === 'Yes' ? 'text-blue-600' : 'text-muted-foreground'}
          />
          {asset.amc === 'Yes' && asset.amcEnd && (
            <InfoRow label="AMC Valid Till" value={formatDateOnly(asset.amcEnd)} accent="text-blue-600" />
          )}
        </SectionCard>

        <SectionCard
          title="Maintenance"
          icon={Wrench}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-500/10"
        >
          <InfoRow label="Total Maintenance" value={asset.maintenanceCount ?? 0} />
          {(asset.maintenanceCount ?? 0) > 0 && (
            <InfoRow label="Last Maintenance Date" value={formatDateOnly(asset.lastMaintenanceDate)} />
          )}
          <InfoRow
            label="Maintenance Required"
            value={asset.maintenanceRequired}
            accent={
              asset.maintenanceRequired === 'Yes' ? 'text-amber-600' : 'text-muted-foreground'
            }
          />
          {asset.maintenanceRequired === 'Yes' && (
            <>
              <InfoRow label="Type" value={asset.maintenanceType} />
              <InfoRow label="Frequency" value={asset.frequency} />
              <InfoRow
                label="Next Service Date"
                value={formatDateOnly(asset.nextService)}
                accent="text-amber-600 font-bold"
              />
              <InfoRow
                label="Priority"
                value={asset.priority}
                accent={
                  asset.priority === 'High'
                    ? 'text-rose-600'
                    : asset.priority === 'Medium'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }
              />
            </>
          )}
          {linkedWorkOrders.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold mb-1.5">
                Linked PM Tasks ({linkedWorkOrders.length})
              </p>
              <div className="space-y-1.5">
                {linkedWorkOrders.slice(0, 3).map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-semibold text-foreground truncate">
                        {w.plan?.title || w.machine?.name || 'Work Order'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {w.actualDueDate ? formatDateOnly(w.actualDueDate) : '—'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0',
                        w.status === 'COMPLETED' || w.status === 'COMPLETED_LATE'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : w.status === 'IN_PROGRESS' || w.status === 'PENDING_APPROVAL'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      )}
                    >
                      {w.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="pt-3 flex gap-2">
            <Link
              to="/maintenance/tasks"
              className="flex-1 text-center text-xs font-semibold py-1.5 px-2.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
            >
              <span>Maintenance Hub</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              to="/maintenance/plans"
              className="text-xs font-semibold py-1.5 px-2.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              PM Plans
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Repair History"
          icon={FileText}
          iconColor="text-rose-600"
          iconBg="bg-rose-500/10"
        >
          <InfoRow label="Total Repairs" value={asset.repairCount} />
          {asset.repairCount > 0 ? (
            <>
              <InfoRow label="Last Repair Date" value={formatDateOnly(asset.lastRepairDate)} />
              <InfoRow
                label="Last Repair Cost"
                value={`₹${asset.repairCost.toLocaleString()}`}
                accent="text-rose-600"
              />
              <InfoRow
                label="Total Repair Cost"
                value={`₹${asset.totalRepairCost.toLocaleString()}`}
                accent="text-rose-600 font-bold"
              />
              <InfoRow label="Parts Changed" value={asset.partChanged} />
              {asset.partChanged === 'Yes' && asset.partNames.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold mb-1.5">
                    Parts Replaced
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {asset.partNames.map((p) => (
                      <span
                        key={p}
                        className="text-[11px] bg-rose-50 border border-rose-100 text-rose-700 px-2 py-0.5 rounded-full dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2 text-center">No repair history</p>
          )}

          {linkedRepairs.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold mb-1.5">
                Repair Indents ({linkedRepairs.length})
              </p>
              <div className="space-y-1.5">
                {linkedRepairs.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/50 text-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-semibold text-foreground truncate">
                        {(r as any).indentNo || r.indentNumber} · {(r as any).problemDescription || r.problem}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {(r as any).date ? formatDateOnly((r as any).date) : r.createdAt ? formatDateOnly(r.createdAt) : '—'}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0',
                        (r as any).status === 'Completed' || (r.taskStatus as string) === 'Payment Done'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : (r as any).status === 'Under Repair' || (r.taskStatus as string) === 'Sent for Repair' || (r.taskStatus as string) === 'Assigned'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {(r as any).status || r.taskStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 flex gap-2">
            <Link
              to="/repair/tasks"
              className="flex-1 text-center text-xs font-semibold py-1.5 px-2.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
            >
              <span>Repair Indents</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              to={breakdownUrl}
              className="text-xs font-semibold py-1.5 px-2.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Report Breakdown
            </Link>
          </div>
          <Separator className="my-3" />
          <InfoRow label="Created By" value={asset.createdBy || 'Admin'} />
        </SectionCard>
      </div>

      {/* QR Code Dialog */}
      <QRCodeModal asset={asset} open={qrOpen} onOpenChange={setQrOpen} />

      {/* Edit Asset Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" /> Edit Asset
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update details and specifications for {asset.productName} ({asset.sn}).
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-xs">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Product Name *
              </label>
              <Input
                placeholder="Product Name"
                value={form.productName}
                onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Category</label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm((f) => ({ ...f, category: val as AssetCategory }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Status</label>
              <Select
                value={form.status}
                onValueChange={(val) => setForm((f) => ({ ...f, status: val as AssetStatus }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Asset Type</label>
              <Select
                value={form.type}
                onValueChange={(val) => setForm((f) => ({ ...f, type: val as AssetType }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Brand</label>
              <Input
                placeholder="Brand"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Model</label>
              <Input
                placeholder="Model"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Serial No</label>
              <Input
                placeholder="Serial No"
                value={form.serialNo}
                onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">SKU</label>
              <Input
                placeholder="SKU"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Mfg Date</label>
              <Input
                type="date"
                value={form.mfgDate}
                onChange={(e) => setForm((f) => ({ ...f, mfgDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Country of Origin
              </label>
              <Input
                placeholder="Country of Origin"
                value={form.origin}
                onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Asset Date</label>
              <Input
                type="date"
                value={form.assetDate}
                onChange={(e) => setForm((f) => ({ ...f, assetDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Invoice No</label>
              <Input
                placeholder="Invoice No"
                value={form.invoiceNo}
                onChange={(e) => setForm((f) => ({ ...f, invoiceNo: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Purchase Cost (₹)
              </label>
              <Input
                type="number"
                placeholder="Cost"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Quantity</label>
              <Input
                type="number"
                placeholder="Quantity"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Supplier Name
              </label>
              <Input
                placeholder="Supplier Name"
                value={form.supplierName}
                onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Supplier Phone
              </label>
              <Input
                placeholder="Supplier Phone"
                value={form.supplierPhone}
                onChange={(e) => setForm((f) => ({ ...f, supplierPhone: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Payment Mode
              </label>
              <Select
                value={form.paymentMode || undefined}
                onValueChange={(val) => setForm((f) => ({ ...f, paymentMode: val }))}
              >
                <SelectTrigger className="w-full">
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
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Depreciation Method
              </label>
              <Select
                value={form.depMethod || 'Straight Line'}
                onValueChange={(val) => setForm((f) => ({ ...f, depMethod: val }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Depreciation Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Straight Line">Straight Line</SelectItem>
                  <SelectItem value="WDV">WDV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Location</label>
              <Select
                value={form.location || undefined}
                onValueChange={(val) => {
                  if (val === '_clear') {
                    setForm((f) => ({ ...f, location: '' }));
                  } else {
                    const match = dbLocations.find((l) => l.location === val);
                    setForm((f) => ({
                      ...f,
                      location: val,
                      firmId: (!f.firmId || f.firmId === 'none') && match?.firmId ? String(match.firmId) : f.firmId,
                    }));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_clear">Clear (None)</SelectItem>
                  {availableLocations.map((l) => (
                    <SelectItem key={l.id} value={l.location}>
                      {l.location}
                      {(!form.firmId || form.firmId === 'none') && l.firmName ? ` (${l.firmName})` : ''}
                    </SelectItem>
                  ))}
                  {form.location && !availableLocations.some((l) => l.location === form.location) && (
                    <SelectItem value={form.location}>{form.location}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Department</label>
              <Select
                value={form.department || undefined}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, department: val === '_clear' ? '' : val }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_clear">Clear (None)</SelectItem>
                  {dbDepartments.map((d) => (
                    <SelectItem key={d.id} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                  {form.department && !dbDepartments.some((d) => d.name === form.department) && (
                    <SelectItem value={form.department}>{form.department}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Project (Firm)
              </label>
              <Select
                value={form.firmId || 'none'}
                onValueChange={(val) => {
                  const newFirmId = val === 'none' ? '' : val;
                  setForm((f) => {
                    const belongs =
                      !f.location ||
                      !newFirmId ||
                      dbLocations.some(
                        (l) =>
                          l.location.toLowerCase() === f.location.toLowerCase() &&
                          String(l.firmId) === newFirmId
                      );
                    return {
                      ...f,
                      firmId: newFirmId,
                      location: belongs ? f.location : '',
                    };
                  });
                }}
              >
                <SelectTrigger className="w-full">
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
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Assigned To
              </label>
              <Select
                value={form.assignedTo || undefined}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, assignedTo: value === '_clear' ? '' : value }))
                }
              >
                <SelectTrigger className="w-full">
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
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Responsible To
              </label>
              <Select
                value={form.responsiblePerson || undefined}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, responsiblePerson: value === '_clear' ? '' : value }))
                }
              >
                <SelectTrigger className="w-full">
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
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Warranty Available
              </label>
              <Select
                value={form.warrantyAvailable}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, warrantyAvailable: val as 'Yes' | 'No' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Warranty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Warranty End Date
              </label>
              <Input
                type="date"
                disabled={form.warrantyAvailable === 'No'}
                value={form.warrantyEnd}
                onChange={(e) => setForm((f) => ({ ...f, warrantyEnd: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Maintenance Required
              </label>
              <Select
                value={form.maintenanceRequired}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, maintenanceRequired: val as 'Yes' | 'No' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Maintenance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Priority</label>
              <Select
                value={form.priority || 'Medium'}
                disabled={form.maintenanceRequired === 'No'}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, priority: val as 'Low' | 'Medium' | 'High' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={updateAssetMutation.isPending}
              onClick={handleSaveEdit}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {updateAssetMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
