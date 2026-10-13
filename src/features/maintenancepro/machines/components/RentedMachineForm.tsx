import { CompanySelectField } from '@/features/organization/components/CompanySelectField';
import { CONSUMPTION_LABEL, UNIT_LABEL, type MachineFormApi } from '../hooks/useMachineForm';
import {
  EquipmentTypeField,
  Field,
  MachineImageField,
  MoreSection,
  ReadingUnitField,
  SiteLocationField,
  TextField,
  VendorCombo,
  inputCls,
} from './MachineFormFields';

/** Hired machine: seven primary fields, vendor optional; type, capacity, hire end, hire type and reading unit under "More". */
export default function RentedMachineForm({ form }: { form: MachineFormApi }) {
  const unit = form.values.readingUnit;
  const consumptionLabel = CONSUMPTION_LABEL[unit];
  const readingLabel = UNIT_LABEL[unit];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField form={form} k="name" label="Machine name" required placeholder="e.g. JCB 3DX" />
        <TextField form={form} k="registrationNo" label="Registration / identifier no." required placeholder="e.g. MH12 AB 1234" />
        <Field label="Firm" required error={form.errors.firmId}>
          <CompanySelectField
            value={form.values.firmId}
            defaultValue={form.values.firmId || undefined}
            onSelect={(c) => form.set('firmId', c.id)}
            className={inputCls}
          />
        </Field>
        <SiteLocationField form={form} />
        <TextField form={form} k="rentalStartAt" label="Hire start" required type="datetime-local" />
        <TextField
          form={form}
          k="openingReading"
          label="Opening reading"
          required
          type="number"
          inputMode="decimal"
          suffix={readingLabel || undefined}
        />
        <TextField
          form={form}
          k="expectedConsumption"
          label="Expected consumption"
          type="number"
          inputMode="decimal"
          suffix={consumptionLabel}
          disabled={unit === 'NONE'}
        />
        <VendorCombo form={form} />
        <MachineImageField form={form} />
      </div>

      <MoreSection forceOpen={!!form.errors.rentalEndAt}>
        <EquipmentTypeField form={form} />
        <TextField form={form} k="capacityLabel" label="Capacity" placeholder="e.g. 20 t, 1 m3, 5 kVA" />
        <TextField form={form} k="rentalEndAt" label="Hire end (if known)" type="date" />
        <Field label="Hire type" hint="Dry: we supply the diesel. Wet: the vendor supplies it.">
          <select
            className={inputCls}
            value={form.values.hireType}
            onChange={(e) => form.set('hireType', e.target.value as 'DRY' | 'WET')}
          >
            <option value="DRY">Dry</option>
            <option value="WET">Wet</option>
          </select>
        </Field>
        <ReadingUnitField
          form={form}
          disabled={form.edit}
          hint={form.edit ? 'Locked once readings exist.' : 'Defaults from the equipment type.'}
        />
      </MoreSection>
    </div>
  );
}
