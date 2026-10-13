import { useId, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, ChevronDown, Loader2, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';
import { useImageUpload } from '@/hooks/useImageUpload';
import { repairSystemApi } from '../../repair/server/api/repairSystemApi';
import { useSiteLocationsList } from '@/features/asset/asset/server/tanstackQuery/useAssetQueries';
import { EQUIPMENT_TYPES, type MachineFormApi } from '../hooks/useMachineForm';
import type { EquipmentType } from '../types/types';

export const inputCls =
  'w-full min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed ' +
  'disabled:bg-muted disabled:text-muted-foreground';

export function Field({
  label,
  error,
  hint,
  required,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  form,
  k,
  label,
  required,
  hint,
  type = 'text',
  placeholder,
  disabled,
  suffix,
  inputMode,
}: {
  form: MachineFormApi;
  k:
    | 'name'
    | 'registrationNo'
    | 'serialNumber'
    | 'purchaseDate'
    | 'purchasePrice'
    | 'warrantyExpiry'
    | 'openingReading'
    | 'expectedConsumption'
    | 'capacityLabel'
    | 'manufacturer'
    | 'modelNumber'
    | 'supplier'
    | 'installationDate'
    | 'rentalStartAt'
    | 'rentalEndAt';
  label: string;
  required?: boolean;
  hint?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  suffix?: string;
  inputMode?: 'decimal' | 'text';
}) {
  const id = useId();
  return (
    <Field label={suffix ? `${label} (${suffix})` : label} error={form.errors[k]} hint={hint} required={required} htmlFor={id}>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        step={type === 'number' ? 'any' : undefined}
        min={type === 'number' ? 0 : undefined}
        className={inputCls}
        value={form.values[k]}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => form.set(k, e.target.value)}
      />
    </Field>
  );
}

/** Collapsed-by-default extras so the first screen stays short. Opens itself when an error sits inside it. */
export function MoreSection({ title = 'More details', forceOpen, children }: { title?: string; forceOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const shown = open || !!forceOpen;
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={shown}
        className="flex min-h-11 w-full items-center justify-between px-3 text-sm font-semibold text-foreground"
      >
        {title}
        <ChevronDown className={cn('size-4 transition-transform', shown && 'rotate-180')} />
      </button>
      {shown && <div className="grid grid-cols-1 gap-4 border-t border-border p-3 sm:grid-cols-2">{children}</div>}
    </div>
  );
}

export function EquipmentTypeField({ form }: { form: MachineFormApi }) {
  const id = useId();
  return (
    <Field label="Equipment type" htmlFor={id}>
      <select
        id={id}
        className={inputCls}
        value={form.values.equipmentType}
        onChange={(e) => form.set('equipmentType', e.target.value as EquipmentType)}
      >
        {EQUIPMENT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ReadingUnitField({ form, disabled, hint }: { form: MachineFormApi; disabled?: boolean; hint?: string }) {
  const id = useId();
  return (
    <Field label="Reading unit" hint={hint} htmlFor={id}>
      <select
        id={id}
        className={inputCls}
        disabled={disabled}
        value={form.values.readingUnit}
        onChange={(e) => form.set('readingUnit', e.target.value as 'KM' | 'HOURS' | 'NONE')}
      >
        <option value="HOURS">Hours</option>
        <option value="KM">Kilometres</option>
        <option value="NONE">None</option>
      </select>
    </Field>
  );
}

export function DepartmentField({ form }: { form: MachineFormApi }) {
  const id = useId();
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['maintenance', 'departments', 'list'],
    queryFn: async () => {
      const res = await api.get('/maintenance/departments');
      return (res.data?.data ?? []) as { id: string; name: string }[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  return (
    <Field label="Department" htmlFor={id}>
      <select
        id={id}
        className={inputCls}
        value={form.values.departmentId}
        onChange={(e) => form.set('departmentId', e.target.value)}
      >
        <option value="">{isLoading ? 'Loading departments…' : 'None'}</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SiteLocationField({ form }: { form: MachineFormApi }) {
  const id = useId();
  const { data: allSites = [], isLoading } = useSiteLocationsList();
  const firmSites = form.values.firmId ? allSites.filter((s) => s.firmId === form.values.firmId) : [];

  return (
    <Field label="Site" htmlFor={id}>
      <select
        id={id}
        className={inputCls}
        disabled={!form.values.firmId}
        value={form.values.siteLocationId}
        onChange={(e) => form.set('siteLocationId', e.target.value)}
      >
        <option value="">
          {!form.values.firmId
            ? 'Select a firm first'
            : isLoading
              ? 'Loading sites…'
              : firmSites.length === 0
                ? 'No sites configured for this firm'
                : 'Select site'}
        </option>
        {firmSites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.location}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Optional vendor: type a name, or pick an existing vendor (sets rentalVendorId). */
export function VendorCombo({ form }: { form: MachineFormApi }) {
  const id = useId();
  const listId = `${id}-vendors`;
  const { data: vendors = [] } = useQuery({
    queryKey: ['repair-system', 'vendors'],
    queryFn: repairSystemApi.getAllVendors,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const onChange = (name: string) => {
    form.set('rentalVendorName', name);
    const match = vendors.find((v) => v.name.toLowerCase() === name.trim().toLowerCase());
    form.set('rentalVendorId', match ? String(match.id) : '');
  };
  return (
    <Field label="Vendor (optional)" hint="Pick an existing vendor or type a name; you can add it later." htmlFor={id}>
      <input
        id={id}
        list={listId}
        className={inputCls}
        value={form.values.rentalVendorName}
        placeholder="Vendor name"
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {vendors.map((v) => (
          <option key={v.id} value={v.name} />
        ))}
      </datalist>
    </Field>
  );
}

/** Photo upload field for machines, integrated with S3 presign upload. */
export function MachineImageField({ form }: { form: MachineFormApi }) {
  const { uploadImage, isUploading, progress, error } = useImageUpload({
    bucket: 'maintenance',
    pathPrefix: 'machines',
    maxSizeMB: 5,
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadImage(file);
      if (res?.url) {
        form.set('imageUrl', res.url);
      }
    } catch (_) {
      // error is handled by useImageUpload
    }
  };

  const removeImage = () => {
    form.set('imageUrl', '');
  };

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <span className="block text-xs font-semibold text-muted-foreground">
        Machine Photo (optional)
      </span>
      <div className="flex flex-col gap-3">
        {form.values.imageUrl ? (
          <div className="relative flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-xs">
            <img
              src={form.values.imageUrl}
              alt="Machine preview"
              className="h-20 w-20 rounded-lg object-cover border border-border"
            />
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Photo uploaded</span>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted">
                  <Upload size={13} /> Change photo
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFile}
                    disabled={isUploading}
                  />
                </label>
                <button
                  type="button"
                  onClick={removeImage}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <label className="flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 transition-colors hover:border-primary/50 hover:bg-muted/60">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Camera size={18} />
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-foreground">Upload machine photo</div>
              <div className="text-[11px] text-muted-foreground">JPG, PNG, or WEBP up to 5MB</div>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFile}
              disabled={isUploading}
            />
          </label>
        )}

        {isUploading && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin text-primary" />
                Uploading photo...
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

