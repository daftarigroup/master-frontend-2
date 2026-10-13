import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** A titled card used by every block on the screen. */
export function Panel({ title, count, action, children, className }: { title: string; count?: number; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card p-3 sm:p-4', className)}>
      <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          {title}
          {count !== undefined && <span className="text-muted-foreground"> ({count})</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PanelState({ loading, error, onRetry, empty, rows = 3 }: { loading: boolean; error: boolean; onRetry: () => void; empty?: string; rows?: number }) {
  if (loading) return <div className="space-y-2" aria-busy="true">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
        <AlertCircle className="size-5 text-red-600" aria-hidden />
        Could not load this section.
        <Button variant="outline" className="h-11" onClick={onRetry}>Retry</Button>
      </div>
    );
  }
  return empty ? <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p> : null;
}
