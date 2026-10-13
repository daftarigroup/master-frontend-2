'use client';

import { PRIORITY_OPTIONS, isAdminUser } from '../../shared/lib/common';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import {
  AlertTriangle,
  BarChart2,
  Building,
  Calendar,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Factory,
  FileText,
  History as HistoryIcon,
  MapPin,
  MoreVertical,
  Package,
  Phone,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Upload,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { isAllowedFirm } from '@/lib/firmAccess';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAppSelector } from '@/store/hook';
import { selectUser } from '@/store/slice/userAccountData';
import { useMachineDetails, useUpdateMachine } from '../server/tanstackQuery/useMachinesQueries';
import { MACHINE_CATEGORY_LABELS, MACHINE_STATUS_LABELS } from '../types/types';
import { AddMachinePartForm } from './AddMachinePartForm';
import { MachinePartDetailsModal } from './MachinePartDetailsModal';

interface MachineDetailsProps {
  id?: string;
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  OPERATIONAL: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    text: 'text-green-800 dark:text-green-400',
    dot: 'bg-green-500',
  },
  UNDER_MAINTENANCE: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-800 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  BREAKDOWN: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-400',
    dot: 'bg-red-500',
  },
  IDLE: { bg: 'bg-muted', text: 'text-foreground/80', dot: 'bg-gray-400' },
  DECOMMISSIONED: { bg: 'bg-muted', text: 'text-foreground/60', dot: 'bg-slate-400' },
};

function getHealthScore(status: string, breakdowns: number): number {
  const base: Record<string, number> = {
    OPERATIONAL: 90,
    UNDER_MAINTENANCE: 65,
    BREAKDOWN: 30,
    IDLE: 75,
    DECOMMISSIONED: 10,
  };
  return Math.max(5, (base[status] ?? 50) - Math.min(breakdowns * 3, 30));
}
function getHealthColor(score: number) {
  if (score >= 85) return 'bg-green-500';
  if (score >= 65) return 'bg-blue-500';
  if (score >= 45) return 'bg-amber-500';
  return 'bg-red-500';
}

type TabId =
  | 'overview'
  | 'maintenance'
  | 'repairs'
  | 'parts'
  | 'purchases'
  | 'documents'
  | 'analytics';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Factory size={14} /> },
  { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={14} /> },
  { id: 'repairs', label: 'Repair History', icon: <HistoryIcon size={14} /> },
  { id: 'parts', label: 'Parts', icon: <Package size={14} /> },
  { id: 'purchases', label: 'Purchases & Assets', icon: <ShoppingCart size={14} /> },
  { id: 'documents', label: 'Documents', icon: <FileText size={14} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={14} /> },
];

export default function MachineDetails({ id: propId }: MachineDetailsProps = {}) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || paramId || '';
  const { data: machine, isLoading, error: queryError, isError } = useMachineDetails(id);
  const navigate = useNavigate();
  const router = { push: (p: string) => navigate(p), back: () => navigate(-1) };
  const currentUser = useAppSelector(selectUser);
  const isAdmin = isAdminUser(currentUser);

  const { effectivePermittedFirms } = useProject();
  const hasAccessToMachine = useMemo(() => {
    if (!machine) return true;
    return isAllowedFirm(
      { id: machine.firmId ?? undefined, name: machine.firmName ?? undefined },
      effectivePermittedFirms
    );
  }, [machine, effectivePermittedFirms]);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const updateMachine = useUpdateMachine();
  const { uploadImage: uploadDoc, isUploading: isUploadingDoc } = useImageUpload({
    bucket: 'mis-docs',
    pathPrefix: 'maintenance/machines/documents',
    maxSizeMB: 20,
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
  });
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docDescription, setDocDescription] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docFileName, setDocFileName] = useState('');
  const [docFilter, setDocFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditPartModalOpen, setIsEditPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<unknown>(null);
  const [selectedWO, setSelectedWO] = useState<
    import('../types/types').MaintenanceWorkOrder | null
  >(null);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !machine) {
    const msg =
      (queryError as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (queryError as { message?: string })?.message ||
      'The machine details could not be retrieved.';
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-rose-500" />
        <div className="text-center">
          <h2 className="text-xl font-bold">Failed to load machine</h2>
          <p className="text-muted-foreground text-sm">{msg}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!hasAccessToMachine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 space-y-4">
        <div className="text-amber-500 font-semibold text-lg">Access Restricted</div>
        <p className="text-muted-foreground text-sm max-w-md">
          You do not have permission to view machine records belonging to this project/firm.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const statusStyle = STATUS_BADGE[machine.status] ?? STATUS_BADGE.IDLE;
  const repairCount = machine._count?.breakdownReports ?? 0;
  const healthScore = getHealthScore(machine.status, repairCount);
  const healthColor = getHealthColor(healthScore);

  // Analytics data derived from real machine data
  const workOrdersByType = ['SCHEDULED', 'BREAKDOWN', 'PREVENTIVE'].map((type) => ({
    name: type.charAt(0) + type.slice(1).toLowerCase(),
    count: machine.workOrders?.filter((wo) => wo.type === type).length ?? 0,
  }));
  const breakdownsBySeverity = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((sev) => ({
    name: sev,
    count: machine.breakdownReports?.filter((r) => r.severity === sev).length ?? 0,
  }));
  const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 p-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center text-sky-600 hover:text-sky-900 font-bold text-sm whitespace-nowrap"
        >
          <ChevronLeft size={20} className="mr-1" />
          Back to Machines
        </button>
        <h1 className="w-full min-w-0 truncate text-xl font-bold text-foreground tracking-tight sm:w-auto sm:flex-1 md:text-2xl">
          {machine.name}
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
            {MACHINE_STATUS_LABELS[machine.status]}
          </span>
          <OwnershipBadge value={machine.ownershipType === 'RENTED' || machine.ownershipType === 'HIRED' ? 'RENTED' : 'OWNED'} />
          <Link
            to={`/asset/machines/${machine.id}/logbook`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
          >
            Logbook
          </Link>
        </div>
      </div>

      {/* Machine image + quick info */}
      <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-6 p-6">
          {machine.imageUrl ? (
            <img
              src={machine.imageUrl}
              alt={machine.name}
              className="w-full sm:w-48 h-36 object-cover rounded-xl border border-border flex-shrink-0"
            />
          ) : (
            <div className="w-full sm:w-48 h-36 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <Factory size={48} className="text-muted-foreground/40" />
            </div>
          )}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                Work Orders
              </p>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                {machine._count?.workOrders ?? 0}
              </p>
              <p className="text-xs text-blue-400 mt-1">Total life-cycle</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-100 dark:border-red-900/50">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                Breakdowns
              </p>
              <p className="text-3xl font-bold text-red-700 dark:text-red-300 tabular-nums">{repairCount}</p>
              <p className="text-xs text-red-400 mt-1">Total reported</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/40 rounded-xl border border-green-100 dark:border-green-900/50">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                Parts
              </p>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300 tabular-nums">
                {machine._count?.parts ?? 0}
              </p>
              <p className="text-xs text-green-400 mt-1">Registered</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-900/50">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
                Running Hrs
              </p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 tabular-nums">
                {machine.runningHours ?? 0}h
              </p>
              <p className="text-xs text-purple-400 mt-1">Usage tracked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-hidden bg-card rounded-2xl shadow-lg border border-border">
        <div className="border-b border-border">
          <nav className="flex -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-4 px-5 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Machine Information */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Factory size={14} className="text-sky-500" /> Machine Information
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Asset Code', value: machine.assetCode },
                      { label: 'Serial Number', value: machine.serialNumber },
                      { label: 'Model', value: machine.modelNumber },
                      { label: 'Manufacturer', value: machine.manufacturer },
                      { label: 'Department', value: machine.department?.name },
                      { label: 'Project (Firm)', value: machine.firm?.name || machine.firmName },
                      { label: 'Supplier', value: machine.supplier },
                      { label: 'Category', value: MACHINE_CATEGORY_LABELS[machine.category] },
                      { label: 'Criticality', value: `Level ${machine.criticalityLevel}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">{label}:</span>
                        <span className="font-semibold text-foreground text-right max-w-[60%] truncate">
                          {value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Purchase Details */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calendar size={14} className="text-sky-500" /> Purchase Details
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Purchase Date', value: formatDate(machine.purchaseDate) },
                      { label: 'Installation Date', value: formatDate(machine.installationDate) },
                      { label: 'Warranty Expiry', value: formatDate(machine.warrantyExpiry) },
                      { label: 'Registered', value: formatDate(machine.createdAt) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">{label}:</span>
                        <span className="font-semibold text-foreground">{value}</span>
                      </div>
                    ))}
                    {machine.purchaseDate && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Asset Age:</span>
                        <span className="font-semibold text-foreground">
                          {Math.floor(
                            (Date.now() - new Date(machine.purchaseDate).getTime()) /
                              (365.25 * 24 * 60 * 60 * 1000)
                          )}{' '}
                          years
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Health & Maintenance */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-5">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ShieldAlert size={14} className="text-sky-500" /> Health & Maintenance
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">Health Score:</span>
                        <span className="font-bold text-foreground">{healthScore}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all ${healthColor}`}
                          style={{ width: `${healthScore}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Total Breakdowns', value: String(repairCount) },
                        {
                          label: 'Total Work Orders',
                          value: String(machine._count?.workOrders ?? 0),
                        },
                        {
                          label: 'Active Plans',
                          value: String(
                            machine._count?.maintenancePlans ??
                              machine.maintenancePlans?.length ??
                              0
                          ),
                        },
                        { label: 'Running Hours', value: `${machine.runningHours}h` },
                        { label: 'Status Since', value: formatDate(machine.statusChangedAt) },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-medium">{label}:</span>
                          <span className="font-semibold text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Assignment */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <MapPin size={14} className="text-sky-500" /> Location & Assignment
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                      <MapPin size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Location
                      </p>
                      <p className="text-sm font-bold text-foreground">{machine.location || '—'}</p>
                      {machine.locationCode && (
                        <p className="text-xs font-mono text-muted-foreground">
                          {machine.locationCode}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                      <Factory size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Department
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {machine.department?.name || '—'}
                      </p>
                    </div>
                  </div>
                  {machine.assignments && machine.assignments.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-100 dark:border-sky-900/50">
                        <User size={16} className="text-sky-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Assigned To
                        </p>
                        <div className="space-y-1 mt-0.5">
                          {machine.assignments.map((a) => (
                            <p key={a.id} className="text-sm font-bold text-foreground">
                              {a.user.name}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MAINTENANCE (Image 3 Style) ── */}
          {activeTab === 'maintenance' && (
            <div className="space-y-5">
              {(() => {
                const woTasks = (machine.workOrders ?? []).filter(
                  (wo) => wo.breakdownReportId === null
                );
                const priorityMap: Record<number, string> = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, `P${o.value} — ${o.label}`]));
                const priorityColors: Record<number, string> = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.badge]));
                const statusColors: Record<string, string> = {
                  PENDING: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
                  IN_PROGRESS:
                    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
                  PENDING_APPROVAL:
                    'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
                  COMPLETED: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
                  COMPLETED_LATE:
                    'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
                  COMPLETION_REJECTED:
                    'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
                  OVERDUE: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
                  ON_LEAVE:
                    'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
                  MISSED: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
                  SKIPPED: 'bg-muted text-muted-foreground',
                  CANCELLED: 'bg-red-50 dark:bg-red-950/40 text-red-400 dark:text-red-400',
                  ON_HOLD:
                    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
                };

                return (
                  <div className="space-y-4">
                    {/* Service due, schedule, checklist, mechanic and cost live in Maintenance Records (real data) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-foreground">Service schedule and checklist</div>
                        <div className="text-xs text-muted-foreground">Next service due, checklist progress, mechanic, estimated cost and service documents.</div>
                      </div>
                      <Button asChild className="shrink-0 gap-2">
                        <Link to={`/maintenance/records/${machine.id}`}>
                          <Calendar size={16} />
                          Open Maintenance Records
                        </Link>
                      </Button>
                    </div>

                    {/* Work Orders List Header */}
                    <div className="pt-4">
                      <h4 className="text-sm font-bold text-foreground mb-3">
                        Detailed Maintenance Work Orders
                      </h4>
                    </div>

                    {woTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-60 border border-dashed border-border rounded-2xl">
                        <Calendar size={32} className="text-muted-foreground/40" />
                        <p className="text-xs font-semibold text-muted-foreground">
                          No additional work orders scheduled
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto overflow-hidden rounded-xl border border-border">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted/50">
                            <tr>
                              {[
                                'Action',
                                'Type',
                                'Plan',
                                'Scheduled',
                                'Due Date',
                                'Priority',
                                'Status',
                                'Assigned To',
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left whitespace-nowrap"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {woTasks.map((wo) => (
                              <tr key={wo.id} className="hover:bg-muted/50">
                                <td className="px-4 py-3">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 rounded-lg px-3 text-xs font-bold hover:bg-primary/10 hover:text-primary"
                                    onClick={() => setSelectedWO(wo)}
                                  >
                                    View
                                  </Button>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-400">
                                    {wo.type.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs font-medium text-foreground/80 max-w-[140px] truncate">
                                  {wo.plan?.title ?? (
                                    <span className="text-muted-foreground/60">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                  {formatDate(wo.scheduledDate)}
                                </td>
                                <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                                  {formatDate(wo.actualDueDate)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityColors[wo.priority] ?? 'bg-muted text-muted-foreground'}`}
                                  >
                                    {priorityMap[wo.priority] ?? `P${wo.priority}`}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[wo.status] ?? 'bg-muted text-muted-foreground'}`}
                                  >
                                    {wo.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs font-medium text-foreground/80 whitespace-nowrap">
                                  {wo.currentAssignee?.name ?? (
                                    <span className="text-muted-foreground/60">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          )}

          {/* ── WORK ORDER DETAIL MODAL ── */}
          {selectedWO &&
            (() => {
              const wo = selectedWO;
              const priorityMap: Record<number, string> = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, `P${o.value} — ${o.label}`]));
              const priorityColors: Record<number, string> = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.badge]));
              const statusColors: Record<string, string> = {
                PENDING: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
                IN_PROGRESS: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
                PENDING_APPROVAL:
                  'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
                COMPLETED: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
                COMPLETED_LATE: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
                COMPLETION_REJECTED: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
                OVERDUE: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
                ON_LEAVE:
                  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
                MISSED: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
                SKIPPED: 'bg-muted text-muted-foreground',
                CANCELLED: 'bg-red-50 dark:bg-red-950/40 text-red-400 dark:text-red-400',
                ON_HOLD: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
              };
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 py-5 border-b border-border bg-gradient-to-r from-indigo-50 dark:from-indigo-950/40 to-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 mb-1">
                          Work Order
                        </p>
                        <h3 className="text-base font-semibold text-foreground">
                          {wo.type.replace(/_/g, ' ')}
                        </h3>
                        {wo.plan && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {wo.plan.title}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[wo.status] ?? 'bg-muted text-muted-foreground'}`}
                          >
                            {wo.status.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${priorityColors[wo.priority] ?? 'bg-muted text-muted-foreground'}`}
                          >
                            {priorityMap[wo.priority] ?? `P${wo.priority}`}
                          </span>
                          {wo.slaBreach && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                              SLA Breached
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedWO(null)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors ml-4 shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="overflow-y-auto flex-1 p-6 space-y-5">
                      {/* Timing */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                          Timing
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-muted/50 rounded-xl p-3">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                              Scheduled Date
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {formatDate(wo.scheduledDate)}
                            </p>
                          </div>
                          <div className="bg-muted/50 rounded-xl p-3">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                              Due Date
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {formatDate(wo.actualDueDate)}
                            </p>
                          </div>
                          {wo.startedAt && (
                            <div className="bg-muted/50 rounded-xl p-3">
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                Started At
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {formatDate(wo.startedAt)}
                              </p>
                            </div>
                          )}
                          {wo.completedAt && (
                            <div className="bg-muted/50 rounded-xl p-3">
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                Completed At
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {formatDate(wo.completedAt)}
                              </p>
                            </div>
                          )}
                          {wo.actualMinutesTaken != null && (
                            <div className="bg-muted/50 rounded-xl p-3">
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                Time Taken
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {wo.actualMinutesTaken} min
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* People */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                          People
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-muted/50 rounded-xl p-3">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                              Assigned To
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {wo.currentAssignee?.name ?? '—'}
                            </p>
                            {wo.currentAssignee?.email && (
                              <p className="text-xs text-muted-foreground/60 mt-0.5">
                                {wo.currentAssignee.email}
                              </p>
                            )}
                          </div>
                          {wo.completedBy && (
                            <div className="bg-muted/50 rounded-xl p-3">
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                Completed By
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {wo.completedBy.name}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Plan & Component */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                          Details
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {wo.plan && (
                            <div className="bg-muted/50 rounded-xl p-3">
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                Maintenance Plan
                              </p>
                              <p className="text-sm font-semibold text-foreground">
                                {wo.plan.title}
                              </p>
                              <p className="text-xs text-muted-foreground/60 mt-0.5">
                                {wo.plan.activityType?.name}
                              </p>
                            </div>
                          )}
                          <div className="bg-muted/50 rounded-xl p-3">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                              Component / Part
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                              {wo.machinePart?.name ?? 'General'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Notes / Reason */}
                      {(wo.completionNote || wo.cancelReason || wo.skipReason) && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Notes
                          </p>
                          {wo.completionNote && (
                            <div className="bg-muted/50 rounded-xl p-3 mb-2">
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Completion Note
                              </p>
                              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                {wo.completionNote}
                              </p>
                            </div>
                          )}
                          {wo.cancelReason && (
                            <div className="bg-red-50 dark:bg-red-950/40 rounded-xl p-3 mb-2">
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-red-400 mb-1">
                                Cancel Reason
                              </p>
                              <p className="text-sm text-foreground/80 leading-relaxed">
                                {wo.cancelReason}
                              </p>
                            </div>
                          )}
                          {wo.skipReason && (
                            <div className="bg-muted/50 rounded-xl p-3">
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                Skip Reason
                              </p>
                              <p className="text-sm text-foreground/80 leading-relaxed">
                                {wo.skipReason}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Breakdown Report (repair tasks only) */}
                      {wo.breakdownReport &&
                        (() => {
                          const br = wo.breakdownReport;
                          const sevColors: Record<string, string> = {
                            CRITICAL:
                              'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
                            HIGH: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
                            MEDIUM:
                              'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
                            LOW: 'bg-muted text-muted-foreground',
                          };
                          const brStatusColors: Record<string, string> = {
                            OPEN: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
                            IN_PROGRESS:
                              'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
                            RESOLVED:
                              'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
                            CLOSED: 'bg-muted text-muted-foreground',
                          };
                          return (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                Breakdown Report
                              </p>
                              <div className="rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <p className="text-sm font-bold text-foreground">{br.title}</p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sevColors[br.severity] ?? 'bg-muted text-muted-foreground'}`}
                                    >
                                      {br.severity}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${brStatusColors[br.status] ?? 'bg-muted text-muted-foreground'}`}
                                    >
                                      {br.status.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                                {br.description && (
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {br.description}
                                  </p>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="bg-card rounded-lg p-2">
                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                      Reported At
                                    </p>
                                    <p className="text-xs font-semibold text-foreground/80">
                                      {formatDate(br.reportedAt)}
                                    </p>
                                  </div>
                                  {br.resolvedAt && (
                                    <div className="bg-card rounded-lg p-2">
                                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                        Resolved At
                                      </p>
                                      <p className="text-xs font-semibold text-foreground/80">
                                        {formatDate(br.resolvedAt)}
                                      </p>
                                    </div>
                                  )}
                                  {br.failureType && (
                                    <div className="bg-card rounded-lg p-2">
                                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                                        Failure Type
                                      </p>
                                      <p className="text-xs font-semibold text-foreground/80">
                                        {br.failureType}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                {br.rootCause && (
                                  <div className="bg-card rounded-lg p-2">
                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                      Root Cause
                                    </p>
                                    <p className="text-xs text-foreground/80 leading-relaxed">
                                      {br.rootCause}
                                    </p>
                                  </div>
                                )}
                                {br.correctiveAction && (
                                  <div className="bg-card rounded-lg p-2">
                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                      Corrective Action
                                    </p>
                                    <p className="text-xs text-foreground/80 leading-relaxed">
                                      {br.correctiveAction}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                      {/* Reference */}
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                          Work Order ID
                        </p>
                        <p className="text-xs font-mono text-muted-foreground break-all">{wo.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* ── REPAIR HISTORY ── */}
          {activeTab === 'repairs' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-foreground">Repair History</h3>

              {(() => {
                const repairTasks = (machine.workOrders ?? []).filter(
                  (wo) => (wo.statusLogs?.length ?? 0) > 0
                );
                const priorityMap: Record<number, string> = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, `P${o.value} — ${o.label}`]));
                const priorityColors: Record<number, string> = Object.fromEntries(PRIORITY_OPTIONS.map((o) => [o.value, o.badge]));
                const statusColors: Record<string, string> = {
                  PENDING: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
                  IN_PROGRESS:
                    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
                  PENDING_APPROVAL:
                    'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
                  COMPLETED: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
                  COMPLETED_LATE:
                    'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
                  COMPLETION_REJECTED:
                    'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
                  OVERDUE: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
                  ON_LEAVE:
                    'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
                  MISSED: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
                  SKIPPED: 'bg-muted text-muted-foreground',
                  CANCELLED: 'bg-red-50 dark:bg-red-950/40 text-red-400 dark:text-red-400',
                  ON_HOLD:
                    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
                };
                if (repairTasks.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-60">
                      <CheckCircle size={40} className="text-green-400" />
                      <p className="text-sm font-bold text-muted-foreground">
                        No repair tasks recorded for this machine
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto overflow-hidden rounded-xl border border-border">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted/50">
                        <tr>
                          {[
                            'Action',
                            'Type',
                            'Plan',
                            'Sent For Repair',
                            'Due Date',
                            'Priority',
                            'Status',
                            'Assigned To',
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {repairTasks.map((wo) => (
                          <tr key={wo.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-lg px-3 text-xs font-bold hover:bg-primary/10 hover:text-primary"
                                onClick={() => setSelectedWO(wo)}
                              >
                                View
                              </Button>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-400">
                                {wo.type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-foreground/80 max-w-[140px] truncate">
                              {wo.plan?.title ?? (
                                <span className="text-muted-foreground/60">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                              {wo.statusLogs?.[0]?.createdAt
                                ? formatDate(wo.statusLogs[0].createdAt)
                                : formatDate(wo.scheduledDate)}
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                              {formatDate(wo.actualDueDate)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityColors[wo.priority] ?? 'bg-muted text-muted-foreground'}`}
                              >
                                {priorityMap[wo.priority] ?? `P${wo.priority}`}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[wo.status] ?? 'bg-muted text-muted-foreground'}`}
                              >
                                {wo.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-foreground/80 whitespace-nowrap">
                              {wo.currentAssignee?.name ?? (
                                <span className="text-muted-foreground/60">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── PARTS ── */}
          {activeTab === 'parts' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-base font-semibold text-foreground">Components & Parts</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl font-bold text-xs uppercase tracking-wider sm:w-auto"
                  asChild
                >
                  <Link to={`/maintenance/machines/${id}/parts`}>Manage Parts</Link>
                </Button>
              </div>

              {machine.parts && machine.parts.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted/50">
                        <tr>
                          {[
                            'Photo',
                            'Part Name',
                            'Part Number',
                            'Description',
                            'Status',
                            'Actions',
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {machine.parts.map((part) => (
                          <tr key={part.id} className="hover:bg-muted/50">
                            <td className="px-5 py-4">
                              <div className="h-10 w-10 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                                {part.imageUrl ? (
                                  <img
                                    src={part.imageUrl}
                                    alt={part.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Package size={16} className="text-muted-foreground/40" />
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-foreground">
                              {part.name}
                            </td>
                            <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                              {part.partNumber || '—'}
                            </td>
                            <td className="px-5 py-4 text-xs text-muted-foreground max-w-xs truncate">
                              {part.description || '—'}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${part.isActive ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}
                              >
                                {part.isActive ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                                  title="Part History"
                                  onClick={() => {
                                    setSelectedPartId(part.id);
                                    setIsHistoryModalOpen(true);
                                  }}
                                >
                                  <HistoryIcon size={14} />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                                    title="Edit Part"
                                    onClick={() => {
                                      setEditingPart(part);
                                      setIsEditPartModalOpen(true);
                                    }}
                                  >
                                    <Settings size={14} />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-60">
                  <Package size={40} className="text-muted-foreground/40" />
                  <p className="text-sm font-bold text-muted-foreground">
                    No parts registered for this machine
                  </p>
                  <Button variant="outline" size="sm" className="rounded-xl font-bold" asChild>
                    <Link to={`/maintenance/machines/${id}/parts`}>Add Parts</Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── PURCHASES & ASSETS ── */}
          {activeTab === 'purchases' &&
            (() => {
              const fromStore = !!machine.storeCheckIn;
              const purchasePrice = machine.purchasePrice ?? 0;
              const repairCost = machine.totalRepairCost ?? 0;
              const totalInvestment = purchasePrice + repairCost;
              const purchasePct =
                totalInvestment > 0 ? ((purchasePrice / totalInvestment) * 100).toFixed(1) : '0.0';
              const repairPct =
                totalInvestment > 0 ? ((repairCost / totalInvestment) * 100).toFixed(1) : '0.0';
              const purchaseLabel = fromStore ? 'Store Purchase' : 'Machine Purchase';
              const categoryData: { category: string; amount: number }[] = [];
              if (purchasePrice > 0)
                categoryData.push({ category: purchaseLabel, amount: purchasePrice });
              if (repairCost > 0)
                categoryData.push({ category: 'Repair Costs', amount: repairCost });
              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center">
                    <h3 className="text-xl font-bold text-foreground">Purchases &amp; Assets</h3>
                  </div>

                  {/* Cost Summary */}
                  <div className="overflow-hidden bg-card rounded-lg border border-border shadow-lg">
                    <div className="px-6 py-4 bg-muted/50 border-b border-border">
                      <h4 className="text-base font-semibold text-foreground">Cost Summary</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                          <tr>
                            {['Category', 'Amount', 'Percentage'].map((h, i) => (
                              <th
                                key={h}
                                className={`px-6 py-3 text-xs font-medium tracking-wider text-muted-foreground uppercase ${i > 0 ? 'text-right' : 'text-left'}`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                          <tr className="hover:bg-muted/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div
                                  className={`flex justify-center items-center w-10 h-10 rounded-full flex-shrink-0 ${fromStore ? 'bg-green-500' : 'bg-blue-500'}`}
                                >
                                  {fromStore ? (
                                    <ShoppingCart className="w-5 h-5 text-white" />
                                  ) : (
                                    <DollarSign className="w-5 h-5 text-white" />
                                  )}
                                </div>
                                <div className="ml-4 text-xs font-medium text-foreground">
                                  {purchaseLabel}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-right text-foreground whitespace-nowrap">
                              ₹{purchasePrice.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-xs text-right text-muted-foreground whitespace-nowrap">
                              {purchasePct}%
                            </td>
                          </tr>
                          <tr className="hover:bg-muted/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex justify-center items-center w-10 h-10 bg-amber-500 rounded-full flex-shrink-0">
                                  <Wrench className="w-5 h-5 text-white" />
                                </div>
                                <div className="ml-4 text-xs font-medium text-foreground">
                                  Repair Costs
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-right text-foreground whitespace-nowrap">
                              ₹{repairCost.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-xs text-right text-muted-foreground whitespace-nowrap">
                              {repairPct}%
                            </td>
                          </tr>
                          <tr className="bg-muted/50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex justify-center items-center w-10 h-10 bg-purple-500 rounded-full flex-shrink-0">
                                  <Package className="w-5 h-5 text-white" />
                                </div>
                                <div className="ml-4 text-xs font-medium text-foreground">
                                  Total Investment
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-right text-foreground whitespace-nowrap">
                              ₹{totalInvestment.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-right text-foreground whitespace-nowrap">
                              100.0%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Purchase Categories Chart & Fixed Assets */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="bg-card rounded-lg border border-border shadow-lg">
                      <div className="px-6 py-4 bg-muted/50 border-b border-border">
                        <h4 className="text-base font-semibold text-foreground">
                          Purchase Categories
                        </h4>
                      </div>
                      <div className="p-6">
                        {categoryData.length > 0 ? (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={categoryData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({
                                    category,
                                    percent,
                                  }: {
                                    category: string;
                                    percent: number;
                                  }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                                  outerRadius={80}
                                  dataKey="amount"
                                >
                                  {categoryData.map((entry, index) => (
                                    <Cell
                                      key={entry.category}
                                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: number) => [
                                    `₹${value.toLocaleString()}`,
                                    'Amount',
                                  ]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-64 flex flex-col items-center justify-center gap-3 opacity-50">
                            <DollarSign size={40} className="text-muted-foreground/40" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                              No purchase data
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-card rounded-lg border border-border shadow-lg">
                      <div className="px-6 py-4 bg-muted/50 border-b border-border">
                        <h4 className="text-base font-semibold text-foreground">Fixed Assets</h4>
                      </div>
                      <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-50">
                        <Building size={40} className="text-muted-foreground/40" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          No fixed assets recorded
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Store Purchase Record — only for machines registered via Store FMS */}
                  {fromStore && (
                    <div className="bg-card rounded-lg border border-border shadow-lg">
                      <div className="px-6 py-4 bg-muted/50 border-b border-border">
                        <h4 className="text-base font-semibold text-foreground">
                          Store Purchase Record
                        </h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                          <thead className="bg-muted/50">
                            <tr>
                              {[
                                'Purchase Order',
                                'Date',
                                'Vendor',
                                'Product',
                                'Amount',
                                'Status',
                              ].map((h, i) => (
                                <th
                                  key={h}
                                  className={`px-6 py-3 text-xs font-medium tracking-wider text-muted-foreground uppercase ${i === 4 ? 'text-right' : 'text-left'}`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-card divide-y divide-border">
                            {(() => {
                              const sc = machine.storeCheckIn!;
                              const po = sc.poItem?.po;
                              const product = sc.poItem?.product;
                              return (
                                <tr className="hover:bg-muted/50">
                                  <td className="px-6 py-4 text-xs font-mono font-medium text-foreground">
                                    {po?.poNumber ?? '—'}
                                  </td>
                                  <td className="px-6 py-4 text-xs text-muted-foreground">
                                    {sc.createdAt
                                      ? new Date(sc.createdAt).toLocaleDateString('en-IN')
                                      : '—'}
                                  </td>
                                  <td className="px-6 py-4 text-xs text-muted-foreground">
                                    {po?.supplierName ?? '—'}
                                  </td>
                                  <td className="px-6 py-4 text-xs text-foreground">
                                    {product?.name ?? '—'}
                                  </td>
                                  <td className="px-6 py-4 text-xs font-semibold text-right text-foreground">
                                    {sc.billAmount != null
                                      ? `₹${Number(sc.billAmount).toLocaleString()}`
                                      : sc.poItem?.rate != null
                                        ? `₹${Number(sc.poItem.rate).toLocaleString()}`
                                        : '—'}
                                  </td>
                                  <td className="px-6 py-4 text-xs">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                                      {sc.status ?? 'Checked In'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Item Usage History Table */}
                  <div className="bg-card rounded-lg border border-border shadow-lg">
                    <div className="px-6 py-4 bg-muted/50 border-b border-border">
                      <h4 className="text-base font-semibold text-foreground">
                        Item Usage History
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                          <tr>
                            {[
                              'Item',
                              'Category',
                              'Stock',
                              'Last Used',
                              'Avg Lifespan',
                              'Total Cost',
                            ].map((h, i) => (
                              <th
                                key={h}
                                className={`px-6 py-3 text-xs font-medium tracking-wider text-muted-foreground uppercase ${i === 5 ? 'text-right' : 'text-left'}`}
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-card">
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center gap-3 opacity-50">
                                <Package size={40} className="text-muted-foreground/40" />
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                  No item usage history
                                </p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* ── DOCUMENTS ── */}
          {activeTab === 'documents' &&
            (() => {
              const parseDoc = (entry: string): { url: string; description: string } => {
                try {
                  const p = JSON.parse(entry) as { url?: string; description?: string };
                  if (p?.url) return { url: p.url, description: p.description ?? '' };
                } catch {
                  // Fallback for plain URL strings
                }
                return { url: entry, description: '' };
              };

              const docs = machine.documentUrls ?? [];
              const parsed = docs.map(parseDoc);

              const handleDocSubmit = async () => {
                if (!docFile) return;
                try {
                  const result = await uploadDoc(docFile);
                  const entry = JSON.stringify({
                    url: result.url,
                    description: docDescription.trim(),
                  });
                  await updateMachine.mutateAsync({
                    id,
                    data: { documentUrls: [...docs, entry] },
                  });
                  setDocModalOpen(false);
                  setDocDescription('');
                  setDocFile(null);
                  setDocFileName('');
                } catch (error) {
                  console.error('Failed to upload document:', error);
                }
              };

              return (
                <>
                  <div className="space-y-4">
                    {/* Header & Filter Sub-Tabs (Image 5 style) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setDocFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                            docFilter === 'all'
                              ? 'bg-primary text-primary-foreground shadow-2xs'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          All Documents
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocFilter('expiring')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                            docFilter === 'expiring'
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <span>Expiring Soon</span>
                          <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 text-[10px] flex items-center justify-center font-extrabold">
                            3
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocFilter('expired')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                            docFilter === 'expired'
                              ? 'bg-rose-500 text-white shadow-2xs'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <span>Expired</span>
                          <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-900 text-[10px] flex items-center justify-center font-extrabold">
                            1
                          </span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDocModalOpen(true)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow-sm hover:opacity-90 transition-all active:scale-95 whitespace-nowrap"
                      >
                        <Upload size={14} />
                        Upload Document
                      </button>
                    </div>

                    {/* Rich Document Cards (Image 5 style) */}
                    {(() => {
                      interface EquipmentDocItem {
                        id: string;
                        title: string;
                        code: string;
                        uploadedDate: string;
                        validTill: string;
                        status: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'LATEST';
                        type: string;
                        url?: string;
                      }

                      // expiry dates and document types are tracked in Maintenance Records (machine documents); this list is only the uploaded files
                      const standardDocs: EquipmentDocItem[] = [];

                      // Merge uploaded documents
                      const userUploadedDocs: EquipmentDocItem[] = parsed.map((p, idx) => ({
                        id: `usr-doc-${idx}`,
                        title: p.description || `Uploaded Document ${idx + 1}`,
                        code: p.url.split('/').pop() || 'document.pdf',
                        uploadedDate: formatDate(machine.createdAt),
                        validTill: '-',
                        status: 'LATEST',
                        type: 'pdf',
                        url: p.url,
                      }));

                      const allDocsList: EquipmentDocItem[] = [...userUploadedDocs, ...standardDocs];

                      const filteredDocsList = allDocsList.filter((doc) => {
                        if (docFilter === 'expiring') return doc.status === 'EXPIRING';
                        if (docFilter === 'expired') return doc.status === 'EXPIRED';
                        return true;
                      });

                      const statusBadges = {
                        VALID: (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                            Valid
                          </span>
                        ),
                        EXPIRING: (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50">
                            Expiring Soon
                          </span>
                        ),
                        EXPIRED: (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50">
                            Expired
                          </span>
                        ),
                        LATEST: (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/50">
                            Latest
                          </span>
                        ),
                      };

                      return (
                        <div className="space-y-2.5">
                          {filteredDocsList.map((doc) => (
                            <div
                              key={doc.id}
                              className="p-3.5 bg-card rounded-2xl border border-border flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-shadow"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center shrink-0">
                                  {doc.type === 'shield' ? (
                                    <ShieldCheck size={18} />
                                  ) : doc.type === 'user' ? (
                                    <User size={18} />
                                  ) : doc.type === 'wrench' ? (
                                    <Wrench size={18} />
                                  ) : (
                                    <FileText size={18} />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-foreground truncate">
                                    {doc.title}
                                  </h4>
                                  <p className="text-[11px] font-mono text-sky-600 dark:text-sky-400 mt-0.5 truncate">
                                    {doc.code}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Uploaded on {doc.uploadedDate}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right hidden sm:block">
                                  <div className="text-[10px] text-muted-foreground font-medium">
                                    Valid Till
                                  </div>
                                  <div className="text-xs font-bold text-foreground">
                                    {doc.validTill}
                                  </div>
                                </div>

                                {statusBadges[doc.status]}

                                <button
                                  type="button"
                                  className="p-1.5 text-muted-foreground/60 hover:text-foreground rounded-lg"
                                  onClick={() => {
                                    if (doc.url) window.open(doc.url, '_blank');
                                  }}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Expiry Warning Banner (Image 5 style) */}
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <AlertTriangle size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            3 documents expiring in next 30 days
                          </div>
                          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 truncate">
                            Insurance, PUC, Fitness Certificate
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDocFilter('expiring')}
                        className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-gray-800 shadow-2xs shrink-0"
                      >
                        View All
                      </button>
                    </div>

                    {/* Sticky Upload CTA at Bottom (Image 5 style) */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setDocModalOpen(true)}
                        className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Upload size={16} />
                        Upload Document
                      </button>
                    </div>
                  </div>

                  {/* Upload Document Modal */}
                  <Dialog
                    open={docModalOpen}
                    onOpenChange={(open) => {
                      if (!open) {
                        setDocModalOpen(false);
                        setDocDescription('');
                        setDocFile(null);
                        setDocFileName('');
                      }
                    }}
                  >
                    <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
                      <DialogTitle className="text-base font-bold">Upload Document</DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Attach a file to this machine. Description is optional.
                      </DialogDescription>
                      <div className="space-y-4 mt-2">
                        {/* Description */}
                        <div className="space-y-1.5">
                          <label
                            htmlFor="doc-description"
                            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                          >
                            Description <span className="font-normal normal-case">(optional)</span>
                          </label>
                          <input
                            id="doc-description"
                            type="text"
                            placeholder="e.g. User Manual, Warranty Card…"
                            value={docDescription}
                            onChange={(e) => setDocDescription(e.target.value)}
                            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                          />
                        </div>

                        {/* File picker */}
                        <div className="space-y-1.5">
                          <label
                            htmlFor="doc-file"
                            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                          >
                            File <span className="text-destructive">*</span>
                          </label>
                          <label
                            htmlFor="doc-file-input"
                            className="flex flex-col items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-border bg-muted/50 py-6 cursor-pointer hover:border-primary transition-colors"
                          >
                            {docFileName ? (
                              <>
                                <FileText size={28} className="text-primary" />
                                <span className="text-xs font-semibold text-foreground max-w-full truncate px-4">
                                  {docFileName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Click to change
                                </span>
                              </>
                            ) : (
                              <>
                                <Upload size={28} className="text-muted-foreground/60" />
                                <span className="text-xs font-semibold text-primary">
                                  Click to select file
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  PDF, DOC, DOCX, XLS, XLSX, Images — up to 20MB
                                </span>
                              </>
                            )}
                            <input
                              id="doc-file-input"
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setDocFile(f);
                                  setDocFileName(f.name);
                                }
                              }}
                            />
                          </label>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDocModalOpen(false);
                              setDocDescription('');
                              setDocFile(null);
                              setDocFileName('');
                            }}
                            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-muted text-foreground hover:bg-muted/80 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDocSubmit}
                            disabled={!docFile || isUploadingDoc || updateMachine.isPending}
                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                          >
                            {isUploadingDoc || updateMachine.isPending ? 'Uploading…' : 'Upload'}
                          </button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              );
            })()}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-foreground">Machine Analytics</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Work Orders by Type */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Work Orders by Type
                  </h4>
                  {workOrdersByType.some((d) => d.count > 0) ? (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={workOrdersByType}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            name="Work Orders"
                            fill="#0ea5e9"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-52 flex items-center justify-center opacity-40">
                      <p className="text-xs font-bold text-muted-foreground uppercase">
                        No work order data
                      </p>
                    </div>
                  )}
                </div>

                {/* Breakdowns by Severity */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Breakdowns by Severity
                  </h4>
                  {breakdownsBySeverity.some((d) => d.count > 0) ? (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={breakdownsBySeverity.filter((d) => d.count > 0)}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {breakdownsBySeverity
                              .filter((d) => d.count > 0)
                              .map((_, idx) => (
                                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-52 flex items-center justify-center opacity-40">
                      <p className="text-xs font-bold text-muted-foreground uppercase">
                        No breakdown data
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Metrics Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Work Orders',
                    value: machine._count?.workOrders ?? 0,
                    color: 'text-sky-600',
                    bg: 'bg-sky-50 dark:bg-sky-950/40',
                  },
                  {
                    label: 'Total Breakdowns',
                    value: repairCount,
                    color: 'text-red-600',
                    bg: 'bg-red-50 dark:bg-red-950/40',
                  },
                  {
                    label: 'Registered Parts',
                    value: machine._count?.parts ?? 0,
                    color: 'text-green-600',
                    bg: 'bg-green-50 dark:bg-green-950/40',
                  },
                  {
                    label: 'Health Score',
                    value: `${healthScore}%`,
                    color: 'text-purple-600',
                    bg: 'bg-purple-50 dark:bg-purple-950/40',
                  },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`p-4 rounded-xl ${bg} border border-border`}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {label}
                    </p>
                    <p className={`text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Part History Modal */}
      <MachinePartDetailsModal
        partId={selectedPartId}
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedPartId(null);
        }}
      />

      {/* Edit Part Modal */}
      <Dialog
        open={isEditPartModalOpen}
        onOpenChange={(open) => !open && setIsEditPartModalOpen(false)}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-border shadow-2xl">
          <DialogTitle className="sr-only">Edit Machine Part</DialogTitle>
          <DialogDescription className="sr-only">
            Update component specifications.
          </DialogDescription>
          <AddMachinePartForm
            machineId={id}
            part={editingPart as Parameters<typeof AddMachinePartForm>[0]['part']}
            hideCloseButton={true}
            onClose={() => {
              setIsEditPartModalOpen(false);
              setEditingPart(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
