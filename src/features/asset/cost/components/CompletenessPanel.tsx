import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatQty } from '@/features/asset/equipment/lib/money';
import type { MachineCost } from '../types';

interface Item { text: string; action?: { label: string; run: () => void } }

/** What still needs attention for this month's figures to be complete. Every line comes from the server's completeness flags. */
export function CompletenessPanel({ cost, canEdit, onAddRate, onAddEntry }: { cost: MachineCost; canEdit: boolean; onAddRate: () => void; onAddEntry: () => void }) {
  const k = cost.completeness;
  const items: Item[] = [];
  if (k.missingInternalRate) items.push({ text: 'No charge-out rate is set, so the charge-out value is not shown.', action: canEdit ? { label: 'Add rate', run: onAddRate } : undefined });
  if (k.missingRentalRate) items.push({ text: 'This rented machine has no rental rate, so rental cost cannot be worked out.', action: canEdit ? { label: 'Add rate', run: onAddRate } : undefined });
  if (k.rentalNotInvoiced) items.push({ text: 'The month is over and no rental invoice has been entered: rental is an estimate.', action: canEdit ? { label: 'Add invoice', run: onAddEntry } : undefined });
  if (k.unpricedDieselLogs > 0) items.push({ text: `${k.unpricedDieselLogs} diesel entr${k.unpricedDieselLogs === 1 ? 'y has' : 'ies have'} no price and ${k.unpricedDieselLogs === 1 ? 'is' : 'are'} left out of Fuel. Set the firm default diesel price (Store diesel is valued at the Store average price when it is known).` });
  if (k.estimatedDieselLogs > 0) items.push({ text: `${k.estimatedDieselLogs} diesel entr${k.estimatedDieselLogs === 1 ? 'y is' : 'ies are'} valued at the default price (estimated).` });
  if (k.untaggedHours > 0) items.push({ text: `${formatQty(k.untaggedHours)} ${cost.usage.unit ?? ''} of usage has no WBS activity; it shows under "Unassigned".` });
  if (k.openUsageEntries > 0) items.push({ text: `${k.openUsageEntries} usage entr${k.openUsageEntries === 1 ? 'y is' : 'ies are'} still open (no stop reading) and not counted.` });
  if (cost.rental.uncovered) items.push({ text: 'Some days on hire fall outside every rental rate period.', action: canEdit ? { label: 'Add rate', run: onAddRate } : undefined });

  if (items.length === 0) {
    return <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-4" aria-hidden /> Everything needed for this month's figures is in place.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.text} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="flex-1">{i.text}</span>
          {i.action && <Button size="sm" variant="outline" className="shrink-0" onClick={i.action.run}>{i.action.label}</Button>}
        </li>
      ))}
    </ul>
  );
}
