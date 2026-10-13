import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A collapsible block (collapsed by default on phones; the parent decides). Content mounts only when opened, so it fetches only when asked. */
export function Section({ title, defaultOpen = false, badge, children, className }: { title: string; defaultOpen?: boolean; badge?: ReactNode; children: (open: boolean) => ReactNode; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={cn('rounded-xl border bg-card', className)}>
      <h2>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold">
          <span className="flex-1">{title}</span>
          {badge}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      </h2>
      <div id={id} hidden={!open} className="border-t p-3 sm:p-4">
        {open && children(open)}
      </div>
    </section>
  );
}
