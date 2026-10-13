import { CompanySelectField } from '@/features/organization/components/CompanySelectField';
import { CONSUMPTION_LABEL, UNIT_LABEL, type MachineFormApi } from '../hooks/useMachineForm';
import {
  DepartmentField,
  EquipmentTypeField,
  Field,
  MachineImageField,
  MoreSection,
  ReadingUnitField,
  SiteLocationField,
  TextField,
  inputCls,
} from './MachineFormFields';

/** Company-owned machine: identity, purchase / warranty, and reading basis. */
export default function OwnedMachineForm({ form }: { form: MachineFormApi }) {
  const unit = form.values.readingUnit;
  const lockHint = form.edit ? 'Locked once readings exist.' : undefined;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="border-b border-border pb-2 text-sm font-bold text-foreground">Machine</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField form={form} k="name" label="Machine name" required />
          <EquipmentTypeField form={form} />
          <Field label="Firm" required error={form.errors.firmId}>
            <CompanySelectField
              value={form.values.firmId}
              defaultValue={form.values.firmId || undefined}
              onSelect={(c) => form.set('firmId', c.id)}
              className={inputCls}
            />
          </Field>
          <SiteLocationField form={form} />
          <DepartmentField form={form} />
          <TextField form={form} k="registrationNo" label="Registration no." />
          <TextField form={form} k="serialNumber" label="Serial number" />
          <MachineImageField form={form} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b border-border pb-2 text-sm font-bold text-foreground">Purchase and warranty</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField form={form} k="purchaseDate" label="Purchase date" type="date" />
          <TextField form={form} k="purchasePrice" label="Purchase price" type="number" inputMode="decimal" />
          <TextField form={form} k="warrantyExpiry" label="Warranty expiry" type="date" />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="border-b border-border pb-2 text-sm font-bold text-foreground">Usage basis</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadingUnitField form={form} disabled={form.edit} hint={lockHint} />
          <TextField
            form={form}
            k="openingReading"
            label="Opening reading"
            type="number"
            inputMode="decimal"
            suffix={UNIT_LABEL[unit] || undefined}
            disabled={form.edit}
            hint={lockHint}
          />
          <TextField
            form={form}
            k="expectedConsumption"
            label="Expected consumption"
            type="number"
            inputMode="decimal"
            suffix={CONSUMPTION_LABEL[unit]}
            disabled={unit === 'NONE'}
          />
        </div>
      </section>

      <MoreSection>
        <TextField form={form} k="manufacturer" label="Make" placeholder="e.g. Caterpillar, Tata, JCB" />
        <TextField form={form} k="modelNumber" label="Model" placeholder="e.g. 320D, LPK 2518" />
        <TextField form={form} k="capacityLabel" label="Capacity" placeholder="e.g. 20 t, 1 m3, 5 kVA" />
        <TextField form={form} k="supplier" label="Supplier / dealer" />
        <TextField form={form} k="installationDate" label="Commissioned on" type="date" hint="Date the machine went into service." />
      </MoreSection>
    </div>
  );
}
