import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useProject } from '@/context/ProjectContext';
import { useCreateMachine, useUpdateMachine } from '../server/tanstackQuery/useMachinesQueries';
import type { CreateMachinePayload, EquipmentType, Machine } from '../types/types';

export type Ownership = 'OWNED' | 'RENTED';
export type ReadingUnit = 'KM' | 'HOURS' | 'NONE';

export const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: 'EXCAVATOR', label: 'Excavator' },
  { value: 'BACKHOE_LOADER', label: 'Backhoe loader' },
  { value: 'TIPPER', label: 'Tipper' },
  { value: 'TRUCK', label: 'Truck' },
  { value: 'TRANSIT_MIXER', label: 'Transit mixer' },
  { value: 'ROLLER', label: 'Roller' },
  { value: 'TRACTOR', label: 'Tractor' },
  { value: 'WATER_PUMP', label: 'Water pump' },
  { value: 'DG_SET', label: 'DG set' },
  { value: 'LOADER', label: 'Wheel loader' },
  { value: 'DOZER', label: 'Dozer' },
  { value: 'GRADER', label: 'Motor grader' },
  { value: 'CRANE', label: 'Crane' },
  { value: 'CONCRETE_PUMP', label: 'Concrete pump' },
  { value: 'BATCHING_PLANT', label: 'Batching plant' },
  { value: 'COMPRESSOR', label: 'Air compressor' },
  { value: 'WATER_TANKER', label: 'Water tanker' },
  { value: 'CAR', label: 'Car' },
  { value: 'OTHER', label: 'Other' },
];

// Same road-vehicle set as the backend (fleet/lib/equipment.ts); everything else on site runs on engine hours.
const KM_TYPES: EquipmentType[] = ['TIPPER', 'TRUCK', 'TRANSIT_MIXER', 'WATER_TANKER', 'CAR'];
export const defaultReadingUnit = (t: EquipmentType): ReadingUnit => (KM_TYPES.includes(t) ? 'KM' : 'HOURS');
export const UNIT_LABEL: Record<ReadingUnit, string> = { KM: 'km', HOURS: 'hrs', NONE: '' };
export const CONSUMPTION_LABEL: Record<ReadingUnit, string> = { KM: 'L/km', HOURS: 'L/hr', NONE: 'L' };

export interface MachineFormValues {
  name: string;
  equipmentType: EquipmentType;
  firmId: string;
  siteLocationId: string;
  registrationNo: string;
  serialNumber: string;
  departmentId: string;
  purchaseDate: string;
  purchasePrice: string;
  warrantyExpiry: string;
  readingUnit: ReadingUnit;
  openingReading: string;
  expectedConsumption: string;
  capacityLabel: string;
  manufacturer: string;
  modelNumber: string;
  supplier: string;
  installationDate: string;
  rentalStartAt: string; // datetime-local
  rentalEndAt: string; // date; optional
  rentalVendorName: string;
  rentalVendorId: string;
  hireType: 'DRY' | 'WET';
  imageUrl: string;
}

const EMPTY: MachineFormValues = {
  name: '',
  equipmentType: 'OTHER',
  firmId: '',
  siteLocationId: '',
  registrationNo: '',
  serialNumber: '',
  departmentId: '',
  purchaseDate: '',
  purchasePrice: '',
  warrantyExpiry: '',
  readingUnit: 'HOURS',
  openingReading: '0',
  expectedConsumption: '',
  capacityLabel: '',
  manufacturer: '',
  modelNumber: '',
  supplier: '',
  installationDate: '',
  rentalStartAt: '',
  rentalEndAt: '',
  rentalVendorName: '',
  rentalVendorId: '',
  hireType: 'DRY',
  imageUrl: '',
};

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

export const nowLocalInput = () => toLocalInput(new Date().toISOString());

function fromMachine(m: Machine): MachineFormValues {
  const equipmentType = (m.equipmentType ?? 'OTHER') as EquipmentType;
  return {
    name: m.name ?? '',
    equipmentType,
    firmId: m.firmId ?? '',
    siteLocationId: m.siteLocationId ?? '',
    registrationNo: m.registrationNo ?? '',
    serialNumber: m.serialNumber ?? '',
    departmentId: m.departmentId ?? '',
    purchaseDate: toDateInput(m.purchaseDate),
    purchasePrice: m.purchasePrice != null ? String(m.purchasePrice) : '',
    warrantyExpiry: toDateInput(m.warrantyExpiry),
    readingUnit: (m.readingUnit ?? defaultReadingUnit(equipmentType)) as ReadingUnit,
    openingReading: String(m.openingReading ?? 0),
    expectedConsumption: m.expectedConsumption != null ? String(m.expectedConsumption) : '',
    capacityLabel: m.capacityLabel ?? '',
    manufacturer: m.manufacturer ?? '',
    modelNumber: m.modelNumber ?? '',
    supplier: m.supplier ?? '',
    installationDate: toDateInput(m.installationDate),
    rentalStartAt: toLocalInput(m.rentalStartAt),
    rentalEndAt: toDateInput(m.rentalEndAt),
    rentalVendorName: m.rentalVendorName ?? '',
    rentalVendorId: m.rentalVendorId ?? '',
    hireType: (m.hireType ?? 'DRY') as 'DRY' | 'WET',
    imageUrl: m.imageUrl ?? '',
  };
}

export type MachineFormErrors = Partial<Record<keyof MachineFormValues, string>>;

export function validateMachine(ownership: Ownership, v: MachineFormValues): MachineFormErrors {
  const e: MachineFormErrors = {};
  if (!v.name.trim()) e.name = 'Name is required';
  if (!v.firmId) e.firmId = 'Select a firm';
  const num = (s: string) => (s.trim() === '' ? NaN : Number(s));
  if (v.openingReading.trim() !== '' && !(num(v.openingReading) >= 0)) e.openingReading = 'Must be 0 or more';
  if (v.expectedConsumption.trim() !== '' && !(num(v.expectedConsumption) > 0)) {
    e.expectedConsumption = 'Must be greater than 0';
  }
  if (ownership === 'RENTED') {
    if (!v.registrationNo.trim()) e.registrationNo = 'Registration / identifier is required';
    if (!v.rentalStartAt) e.rentalStartAt = 'Hire start is required';
    if (v.openingReading.trim() === '') e.openingReading = 'Opening reading is required';
    if (v.rentalStartAt && v.rentalEndAt && v.rentalEndAt < v.rentalStartAt.slice(0, 10)) {
      e.rentalEndAt = 'Hire end cannot be before hire start';
    }
  } else if (v.purchasePrice.trim() !== '' && !(num(v.purchasePrice) >= 0)) {
    e.purchasePrice = 'Must be 0 or more';
  }
  return e;
}

const t = (s: string) => s.trim() || undefined;
const n = (s: string) => (s.trim() === '' ? undefined : Number(s));

/** Builds the API body. RENTED never carries purchase / warranty / parts / AMC fields (the API rejects them). */
export function buildMachinePayload(
  ownership: Ownership,
  v: MachineFormValues,
  opts: { edit: boolean }
): CreateMachinePayload {
  const meter: Partial<CreateMachinePayload> = {
    equipmentType: v.equipmentType,
    expectedConsumption: n(v.expectedConsumption),
    capacityLabel: t(v.capacityLabel),
  };
  // reading unit / opening reading are locked by the API once readings exist, so edit never sends them
  if (!opts.edit) {
    meter.readingUnit = v.readingUnit;
    meter.openingReading = n(v.openingReading) ?? 0;
  }
  if (ownership === 'RENTED') {
    return {
      ownershipType: 'RENTED',
      name: v.name.trim(),
      registrationNo: t(v.registrationNo),
      firmId: v.firmId,
      siteLocationId: t(v.siteLocationId),
      rentalStartAt: v.rentalStartAt ? new Date(v.rentalStartAt).toISOString() : undefined,
      rentalEndAt: t(v.rentalEndAt),
      rentalVendorId: t(v.rentalVendorId),
      rentalVendorName: t(v.rentalVendorName),
      hireType: v.hireType,
      imageUrl: t(v.imageUrl),
      ...meter,
    };
  }
  return {
    ownershipType: 'OWNED',
    name: v.name.trim(),
    ...(opts.edit ? {} : { assetCode: t(v.serialNumber), category: 'PRODUCTION' as const }),
    firmId: v.firmId,
    siteLocationId: t(v.siteLocationId),
    registrationNo: t(v.registrationNo),
    serialNumber: t(v.serialNumber),
    manufacturer: t(v.manufacturer),
    modelNumber: t(v.modelNumber),
    supplier: t(v.supplier),
    installationDate: t(v.installationDate),
    departmentId: t(v.departmentId),
    purchaseDate: t(v.purchaseDate),
    purchasePrice: n(v.purchasePrice),
    warrantyExpiry: t(v.warrantyExpiry),
    imageUrl: t(v.imageUrl),
    ...meter,
  };
}

export function useMachineForm(opts: {
  machine?: Machine | null;
  initialOwnership?: Ownership;
  onSaved?: (m: Machine) => void;
}) {
  const { machine, onSaved } = opts;
  const edit = !!machine;
  const createMut = useCreateMachine();
  const updateMut = useUpdateMachine();
  const { selectedProject } = useProject();

  const [ownership, setOwnershipState] = useState<Ownership>(
    machine
      ? machine.ownershipType === 'RENTED' || machine.ownershipType === 'HIRED'
        ? 'RENTED'
        : 'OWNED'
      : (opts.initialOwnership ?? 'OWNED')
  );
  const [values, setValues] = useState<MachineFormValues>(() => {
    if (machine) return fromMachine(machine);
    const initialFirmId = selectedProject && selectedProject.id !== 'all' ? String(selectedProject.id) : '';
    return { ...EMPTY, firmId: initialFirmId, rentalStartAt: nowLocalInput() };
  });
  const [errors, setErrors] = useState<MachineFormErrors>({});
  // Once the user picks a reading unit themselves, equipment type stops driving it.
  const [unitTouched, setUnitTouched] = useState(edit);

  // When adding a new machine, reactively prefill/update firmId when top bar project changes
  useEffect(() => {
    if (edit) return;
    if (selectedProject && selectedProject.id !== 'all') {
      const projId = String(selectedProject.id);
      setValues((prev) => (prev.firmId !== projId ? { ...prev, firmId: projId, siteLocationId: '' } : prev));
      setErrors((prev) => (prev.firmId ? { ...prev, firmId: undefined } : prev));
    }
  }, [selectedProject?.id, edit]);

  const set = useCallback(
    <K extends keyof MachineFormValues>(key: K, val: MachineFormValues[K]) => {
      setValues((prev) => {
        const next = { ...prev, [key]: val };
        if (key === 'equipmentType' && !unitTouched) next.readingUnit = defaultReadingUnit(val as EquipmentType);
        if (key === 'firmId' && val !== prev.firmId) next.siteLocationId = '';
        return next;
      });
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
      if (key === 'readingUnit') setUnitTouched(true);
    },
    [unitTouched]
  );

  const setOwnership = useCallback(
    (o: Ownership) => {
      if (!edit) {
        setOwnershipState(o);
        setErrors({});
      }
    },
    [edit]
  );

  const isPending = createMut.isPending || updateMut.isPending;

  const submit = useCallback(async () => {
    const errs = validateMachine(ownership, values);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error('Please fix the highlighted fields');
      return false;
    }
    const payload = buildMachinePayload(ownership, values, { edit });
    try {
      const saved = machine
        ? await updateMut.mutateAsync({ id: machine.id, data: payload })
        : await createMut.mutateAsync(payload);
      toast.success(edit ? 'Equipment updated' : 'Equipment added');
      onSaved?.(saved);
      return true;
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || 'Failed to save machine');
      return false;
    }
  }, [ownership, values, edit, machine, updateMut, createMut, onSaved]);

  return useMemo(
    () => ({ ownership, setOwnership, values, set, errors, submit, isPending, edit }),
    [ownership, setOwnership, values, set, errors, submit, isPending, edit]
  );
}

export type MachineFormApi = ReturnType<typeof useMachineForm>;
