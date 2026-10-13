import { Loader2 } from 'lucide-react';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { cn } from '@/lib/utils';
import { useMachineForm, type Ownership } from '../hooks/useMachineForm';
import type { Machine } from '../types/types';
import OwnedMachineForm from './OwnedMachineForm';
import RentedMachineForm from './RentedMachineForm';

const OPTIONS: { value: Ownership; label: string }[] = [
  { value: 'OWNED', label: 'Owned' },
  { value: 'RENTED', label: 'Rented' },
];

/** Ownership toggle first, then the matching form. Used by the Add page and the Edit dialog. */
export default function MachineFormBody({
  machine,
  onSaved,
  onCancel,
}: {
  machine?: Machine | null;
  onSaved?: (m: Machine) => void;
  onCancel?: () => void;
}) {
  const form = useMachineForm({ machine, onSaved });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      {form.edit ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Ownership <OwnershipBadge value={form.ownership} />
        </div>
      ) : (
        <div role="radiogroup" aria-label="Ownership" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={form.ownership === o.value}
              onClick={() => form.setOwnership(o.value)}
              className={cn(
                'min-h-11 rounded-lg text-sm font-semibold transition-colors',
                form.ownership === o.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {form.ownership === 'RENTED' ? <RentedMachineForm form={form} /> : <OwnedMachineForm form={form} />}

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-border px-5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={form.isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {form.isPending && <Loader2 className="size-4 animate-spin" />}
          {form.edit ? 'Save changes' : form.ownership === 'RENTED' ? 'Add rented equipment' : 'Add equipment'}
        </button>
      </div>
    </form>
  );
}
