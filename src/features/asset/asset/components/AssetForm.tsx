import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { useProject } from '@/context/ProjectContext';
import { useCostAccess } from '@/features/asset/equipment/lib/useCostAccess';
import { filterByFirmAccess } from '@/lib/firmAccess';
import { ArrowRight, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useUsersList,
  useDepartmentsList,
  useSiteLocationsList,
  type SiteLocationOption,
} from '../server/tanstackQuery/useAssetQueries';
import {
  formatDateOnly,
  type Asset,
  type AssetCategory,
  type AssetStatus,
  type AssetType,
  type OwnershipType,
} from '../types/types';

export const ASSET_CATEGORIES: AssetCategory[] = [
  'IT',
  'Electronics',
  'Furniture',
  'Machinery',
  'Tools',
  'Vehicle',
];
const STATUSES: AssetStatus[] = ['Active', 'Inactive', 'Under Repair', 'Disposed'];
const ASSET_TYPES: AssetType[] = ['Asset', 'Non-Consumable', 'Consumable'];

interface AssetFormState {
  ownershipType: OwnershipType;
  productName: string;
  category: AssetCategory;
  type: AssetType;
  status: AssetStatus;
  brand: string;
  model: string;
  serialNo: string;
  sku: string;
  mfgDate: string;
  origin: string;
  assetDate: string;
  invoiceNo: string;
  cost: string;
  quantity: string;
  supplierName: string;
  supplierPhone: string;
  paymentMode: string;
  depMethod: string;
  location: string;
  department: string;
  firmId: string;
  assignedTo: string;
  responsiblePerson: string;
  warrantyAvailable: 'Yes' | 'No';
  warrantyEnd: string;
  maintenanceRequired: 'Yes' | 'No';
  priority: 'Low' | 'Medium' | 'High' | '';
}

export interface AssetFormProps {
  mode: 'create' | 'edit';
  /** Existing asset (edit mode). Ignored in create mode. */
  initial?: Asset | null;
  saving?: boolean;
  /** Receives the API payload. May be async; the caller closes the modal. */
  onSubmit: (payload: Partial<Asset> & Pick<Asset, 'productName'>) => void | Promise<void>;
  onCancel: () => void;
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <label className="text-[11px] font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function AssetForm({ mode, initial, saving, onSubmit, onCancel }: AssetFormProps) {
  // Cost, supplier and payment fields are cost data: hidden for users without cost access (the server also ignores them).
  const canCost = useCostAccess();
  const { selectedProject, effectivePermittedFirms } = useProject();

  const [form, setForm] = useState<AssetFormState>(() => {
    if (mode === 'edit' && initial) {
      return {
        ownershipType: initial.ownershipType === 'RENTED' ? 'RENTED' : 'OWNED',
        productName: initial.productName || '',
        category: initial.category || 'IT',
        type: initial.type || 'Asset',
        status: initial.status || 'Active',
        brand: initial.brand || '',
        model: initial.model || '',
        serialNo: initial.serialNo || '',
        sku: initial.sku || '',
        mfgDate: initial.mfgDate ? formatDateOnly(initial.mfgDate) : '',
        origin: initial.origin || '',
        assetDate: initial.assetDate ? formatDateOnly(initial.assetDate) : '',
        invoiceNo: initial.invoiceNo || '',
        cost: initial.cost !== undefined ? String(initial.cost) : '',
        quantity: initial.quantity !== undefined ? String(initial.quantity) : '1',
        supplierName: initial.supplierName || '',
        supplierPhone: initial.supplierPhone || '',
        paymentMode: initial.paymentMode || '',
        depMethod: initial.depMethod || 'Straight Line',
        location: initial.location || '',
        department: initial.department || '',
        firmId: (initial.firmId as string) || '',
        assignedTo: initial.assignedTo || '',
        responsiblePerson: initial.responsiblePerson || '',
        warrantyAvailable: initial.warrantyAvailable || 'No',
        warrantyEnd: initial.warrantyEnd ? formatDateOnly(initial.warrantyEnd) : '',
        maintenanceRequired: initial.maintenanceRequired || 'No',
        priority: initial.priority || '',
      };
    }
    return {
      ownershipType: 'OWNED',
      productName: '',
      category: 'IT',
      type: 'Asset',
      status: 'Active',
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
      firmId: selectedProject && selectedProject.id !== 'all' ? String(selectedProject.id) : '',
      assignedTo: '',
      responsiblePerson: '',
      warrantyAvailable: 'No',
      warrantyEnd: '',
      maintenanceRequired: 'No',
      priority: '',
    };
  });

  const { data: firmsResponse } = useQuery({
    queryKey: ['asset', 'firms', 'list'],
    queryFn: () => api.get('/maintenance/firms'),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const rawFirms: { id: string; name: string }[] = firmsResponse?.data?.data ?? [];
  const firms = useMemo<{ id: string; name: string }[]>(
    () => filterByFirmAccess(rawFirms, effectivePermittedFirms),
    [rawFirms, effectivePermittedFirms]
  );
  const { data: users = [] } = useUsersList();
  const { data: dbDepartments = [] } = useDepartmentsList();
  const { data: dbLocations = [] } = useSiteLocationsList();

  const availableLocations = useMemo(() => {
    const selectedFirmId = form.firmId && form.firmId !== 'none' ? String(form.firmId) : null;
    let list = dbLocations;
    if (selectedFirmId) {
      list = dbLocations.filter((l) => l.firmId && String(l.firmId) === selectedFirmId);
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

  const rented = form.ownershipType === 'RENTED';
  const set = <K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit() {
    if (!form.productName.trim()) {
      toast.error('Product name is required');
      return;
    }
    const firmId = form.firmId && form.firmId !== 'none' ? form.firmId : undefined;

    if (rented) {
      // Server clears cost/warranty/AMC/maintenance for rented assets; send neutral values.
      await onSubmit({
        ...form,
        firmId,
        ownershipType: 'RENTED',
        cost: 0,
        assetValue: 0,
        quantity: Number(form.quantity) || 1,
        invoiceNo: '',
        paymentMode: '',
        depMethod: '',
        warrantyAvailable: 'No',
        warrantyEnd: '',
        amc: 'No',
        maintenanceRequired: 'No',
        maintenanceType: '',
        priority: '',
        mfgDate: form.mfgDate || undefined,
        origin: form.origin || undefined,
        assetDate: form.assetDate || undefined,
        supplierName: form.supplierName || undefined,
        supplierPhone: form.supplierPhone || undefined,
      });
      return;
    }

    if (mode === 'create') {
      await onSubmit({
        ...form,
        firmId,
        ownershipType: 'OWNED',
        cost: Number(form.cost || 0),
        assetValue: Number(form.cost || 0),
        quantity: Number(form.quantity || 1),
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
      return;
    }

    await onSubmit({
      ...form,
      firmId,
      ownershipType: 'OWNED',
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
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-xs">
        {mode === 'create' ? (
          // New assets here are company-owned office / IT / site items. Hired equipment and anything that runs, burns
          // diesel or breaks down is a machine, and is added through Add Equipment (which also creates the asset record).
          <div
            className={`md:col-span-2 rounded-xl border p-3.5 transition-all ${
              form.category === 'Machinery' || form.category === 'Vehicle'
                ? 'border-amber-300/90 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/40 text-amber-950 dark:border-amber-500/40 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-orange-950/10 dark:text-amber-200 shadow-xs'
                : 'border-amber-200/80 bg-gradient-to-r from-amber-50/60 via-amber-50/20 to-muted/20 text-foreground dark:border-amber-500/30 dark:from-amber-950/25 dark:via-muted/10 dark:to-background shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`size-9 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                    form.category === 'Machinery' || form.category === 'Vehicle'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-500/30'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  }`}
                >
                  <Wrench className="size-4.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-foreground">
                      {form.category === 'Machinery' || form.category === 'Vehicle'
                        ? 'Machines & Vehicles require an Equipment Record'
                        : 'Adding an Excavator, Crane, Truck, DG Set, or Hired Machine?'}
                    </span>
                    {(form.category === 'Machinery' || form.category === 'Vehicle') && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                        Notice
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {form.category === 'Machinery' || form.category === 'Vehicle' ? (
                      <>
                        Machines and vehicles need a machine record to track logbooks, diesel entries, and maintenance. This form only creates an asset record.
                      </>
                    ) : (
                      <>
                        Heavy machinery, site vehicles, and hired equipment are managed with logbooks and fuel entries in <strong>Equipment Master</strong>.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <Button
                asChild
                size="sm"
                className="shrink-0 h-8 px-3.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs rounded-lg transition-all group self-start sm:self-center cursor-pointer"
              >
                <Link to="/maintenance/machines/new" onClick={onCancel} className="inline-flex items-center gap-1.5">
                  <Wrench className="size-3.5" />
                  <span>Go to Add Equipment</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <Field label="Ownership" className="md:col-span-2">
            <Tabs
              value={form.ownershipType}
              onValueChange={(v) => set('ownershipType', v as OwnershipType)}
            >
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="OWNED" className="text-xs px-4">
                  Owned
                </TabsTrigger>
                <TabsTrigger value="RENTED" className="text-xs px-4">
                  Rented
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Field>
        )}

        <Field label="Product Name *" className="md:col-span-2">
          <Input
            placeholder="Product Name"
            value={form.productName}
            onChange={(e) => set('productName', e.target.value)}
          />
        </Field>

        <Field label="Category">
          <Select value={form.category} onValueChange={(v) => set('category', v as AssetCategory)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {ASSET_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set('status', v as AssetStatus)}>
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
        </Field>

        <Field label="Asset Type">
          <Select value={form.type} onValueChange={(v) => set('type', v as AssetType)}>
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
        </Field>

        <Field label="Brand">
          <Input placeholder="Brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
        </Field>

        <Field label="Model">
          <Input placeholder="Model" value={form.model} onChange={(e) => set('model', e.target.value)} />
        </Field>

        <Field label="Serial No">
          <Input
            placeholder="Serial No"
            value={form.serialNo}
            onChange={(e) => set('serialNo', e.target.value)}
          />
        </Field>

        <Field label="SKU">
          <Input placeholder="SKU" value={form.sku} onChange={(e) => set('sku', e.target.value)} />
        </Field>

        <Field label="Mfg Date">
          <Input type="date" value={form.mfgDate} onChange={(e) => set('mfgDate', e.target.value)} />
        </Field>

        <Field label="Country of Origin">
          <Input
            placeholder="Country of Origin"
            value={form.origin}
            onChange={(e) => set('origin', e.target.value)}
          />
        </Field>

        <Field label={rented ? 'Rental Start Date' : 'Asset Date'}>
          <Input
            type="date"
            value={form.assetDate}
            onChange={(e) => set('assetDate', e.target.value)}
          />
        </Field>

        {!rented && (
          <>
            <Field label="Invoice No">
              <Input
                placeholder="Invoice No"
                value={form.invoiceNo}
                onChange={(e) => set('invoiceNo', e.target.value)}
              />
            </Field>

            {canCost && (
            <Field label="Purchase Cost (₹)">
              <Input
                type="number"
                placeholder="Cost"
                value={form.cost}
                onChange={(e) => set('cost', e.target.value)}
              />
            </Field>
            )}
          </>
        )}

        <Field label="Quantity">
          <Input
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
        </Field>

        {canCost && (
        <Field label={rented ? 'Vendor Name' : 'Supplier Name'}>
          <Input
            placeholder={rented ? 'Vendor Name' : 'Supplier Name'}
            value={form.supplierName}
            onChange={(e) => set('supplierName', e.target.value)}
          />
        </Field>
        )}

        {canCost && (
        <Field label={rented ? 'Vendor Phone' : 'Supplier Phone'}>
          <Input
            placeholder={rented ? 'Vendor Phone' : 'Supplier Phone'}
            value={form.supplierPhone}
            onChange={(e) => set('supplierPhone', e.target.value)}
          />
        </Field>
        )}

        {!rented && (
          <>
            {canCost && (
            <Field label="Payment Mode">
              <Select
                value={form.paymentMode || undefined}
                onValueChange={(val) => set('paymentMode', val)}
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
            </Field>
            )}

            {canCost && (
            <Field label="Depreciation Method">
              <Select
                value={form.depMethod || 'Straight Line'}
                onValueChange={(val) => set('depMethod', val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Depreciation Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Straight Line">Straight Line</SelectItem>
                  <SelectItem value="WDV">WDV</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            )}
          </>
        )}

        <Field label="Location">
          <Select
            value={form.location || undefined}
            onValueChange={(val) => {
              if (val === '_clear') {
                set('location', '');
              } else {
                const match = dbLocations.find((l) => l.location === val);
                setForm((f) => ({
                  ...f,
                  location: val,
                  firmId:
                    (!f.firmId || f.firmId === 'none') && match?.firmId
                      ? String(match.firmId)
                      : f.firmId,
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
        </Field>

        <Field label="Department">
          <Select
            value={form.department || undefined}
            onValueChange={(val) => set('department', val === '_clear' ? '' : val)}
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
        </Field>

        <Field label="Project (Firm)">
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
                return { ...f, firmId: newFirmId, location: belongs ? f.location : '' };
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
        </Field>

        <Field label="Assigned To">
          <Select
            value={form.assignedTo || undefined}
            onValueChange={(val) => set('assignedTo', val === '_clear' ? '' : val)}
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
        </Field>

        <Field label="Responsible To">
          <Select
            value={form.responsiblePerson || undefined}
            onValueChange={(val) => set('responsiblePerson', val === '_clear' ? '' : val)}
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
              {form.responsiblePerson && !users.some((u) => u.name === form.responsiblePerson) && (
                <SelectItem value={form.responsiblePerson}>{form.responsiblePerson}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </Field>

        {!rented && (
          <>
            <Field label="Warranty Available">
              <Select
                value={form.warrantyAvailable}
                onValueChange={(val) => set('warrantyAvailable', val as 'Yes' | 'No')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Warranty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Warranty End Date">
              <Input
                type="date"
                disabled={form.warrantyAvailable === 'No'}
                value={form.warrantyEnd}
                onChange={(e) => set('warrantyEnd', e.target.value)}
              />
            </Field>

            <Field label="Maintenance Required">
              <Select
                value={form.maintenanceRequired}
                onValueChange={(val) => set('maintenanceRequired', val as 'Yes' | 'No')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Maintenance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Priority">
              <Select
                value={form.priority || 'Medium'}
                disabled={form.maintenanceRequired === 'No'}
                onValueChange={(val) => set('priority', val as 'Low' | 'Medium' | 'High')}
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
            </Field>
          </>
        )}
      </div>

      <DialogFooter className="pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-muted transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Add Asset' : 'Save Changes'}
        </button>
      </DialogFooter>
    </>
  );
}

export default AssetForm;
