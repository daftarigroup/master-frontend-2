import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OwnershipBadge } from '@/features/asset/fleet/components/OwnershipBadge';
import { CATEGORY_LABEL } from '../lib/labels';
import { formatINR } from '../lib/money';
import type { EquipmentItem } from '../types';
import { EquipmentMenu } from './EquipmentMenu';
import { EquipmentPhoto } from './EquipmentPhoto';
import { StatusPill } from './StatusPill';
import { UtilizationMeter } from './UtilizationMeter';

interface Props {
  item: EquipmentItem;
  canCost: boolean;
  /**
   * compact: the phone list card (the mockup). comfortable: the same card, a little roomier, used in the desktop card grid,
   * where it can also show this month's hours and spend. One component, two densities.
   */
  density?: 'compact' | 'comfortable';
  selected?: boolean;
  onOpen?: (item: EquipmentItem) => void;
  onQr: (item: EquipmentItem) => void;
}

export function EquipmentCard({ item, canCost, density = 'compact', selected, onOpen, onQr }: Props) {
  const rented = item.ownershipType === 'RENTED';
  const comfortable = density === 'comfortable';

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => onOpen?.(item)}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className={cn(
        'relative flex min-w-0 gap-3 rounded-xl border bg-card p-3 text-left shadow-xs transition-colors',
        onOpen && 'cursor-pointer hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary',
        selected && 'border-primary ring-1 ring-primary',
      )}
    >
      <EquipmentPhoto src={item.imageUrl} category={item.category} name={item.name} className={comfortable ? 'size-24' : 'size-[72px] sm:size-24'} />

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 pr-2 text-[15px] font-bold leading-tight">{item.name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-bold text-primary">{item.assetCode}</span>
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{CATEGORY_LABEL[item.category]}</span>
        </div>
        <dl className="mt-1.5 space-y-0.5 text-xs">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Ownership</dt>
            <dd className="flex items-center gap-1 font-semibold">
              <OwnershipBadge value={item.ownershipType} />
              {rented && item.hireType && <span className="text-[10px] font-medium text-muted-foreground">{item.hireType === 'WET' ? 'wet rate' : 'dry rate'}</span>}
            </dd>
          </div>
          {rented && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted-foreground">Vendor</dt>
              <dd className="min-w-0 truncate font-medium">{item.vendor ?? '—'}</dd>
            </div>
          )}
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-muted-foreground">Site</dt>
            <dd className="min-w-0 truncate font-medium">{item.site ?? '—'}</dd>
          </div>
          {comfortable && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-muted-foreground">This month</dt>
              <dd className="font-medium tabular-nums">
                {item.unit ? `${item.hoursThisMonth ?? 0} ${item.unit}` : '—'}
                {canCost && item.monthSpend !== undefined && <span className="ml-2 text-muted-foreground">{formatINR(item.monthSpend)}</span>}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* the menu sits in the card corner (a 44px touch target) so it does not squeeze the name */}
      <EquipmentMenu item={item} canCost={canCost} onQr={onQr} className="absolute right-0.5 top-0.5" />

      <div className="flex shrink-0 flex-col items-end justify-between gap-2 pt-7">
        <StatusPill status={item.status} />
        <UtilizationMeter percent={item.utilization.percent} overShift={item.utilization.overShift} />
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 gap-1 px-3 lg:min-h-8"
          onClick={(e) => {
            e.stopPropagation();
            onQr(item);
          }}
        >
          <QrCode className="size-4" /> Scan
        </Button>
      </div>
    </div>
  );
}

export default EquipmentCard;
