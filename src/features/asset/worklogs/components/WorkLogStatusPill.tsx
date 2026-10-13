import { cn } from '@/lib/utils';
import { STATUS_LABEL, STATUS_STYLE } from '../lib/format';
import type { WorkLogStatus } from '../types';

export function WorkLogStatusPill({ status, open, className }: { status: WorkLogStatus; open?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-semibold leading-none', STATUS_STYLE[status], className)}>
      {STATUS_LABEL[status]}
      {open && status === 'PENDING' ? ' · Open' : ''}
    </span>
  );
}

export default WorkLogStatusPill;
