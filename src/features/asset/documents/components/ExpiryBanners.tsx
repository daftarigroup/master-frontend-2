import { AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MachineDocs } from '../types';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Red "n expired" and amber "n expiring" banners. They come from the same data as the tabs and hide when the count is zero. */
export function ExpiryBanners({ banners, onViewExpiring, onViewExpired }: { banners: MachineDocs['banners']; onViewExpiring: () => void; onViewExpired: () => void }) {
  if (!banners.expired && !banners.expiring) return null;
  return (
    <div className="space-y-2" role="region" aria-label="Expiry alerts">
      {banners.expired && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-600 text-white"><XCircle className="size-5" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">{banners.expired.count} expired: {banners.expired.names}</p>
          </div>
          <Button variant="outline" size="sm" className="h-9 shrink-0 border-red-300 bg-transparent text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950" onClick={onViewExpired}>View All</Button>
        </div>
      )}
      {banners.expiring && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500 text-white"><AlertTriangle className="size-5" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{plural(banners.expiring.count, 'document')} expiring in next {banners.expiring.windowDays} days</p>
            <p className="truncate text-xs text-amber-800/80 dark:text-amber-200/80">{banners.expiring.names}</p>
          </div>
          <Button variant="outline" size="sm" className="h-9 shrink-0 border-amber-400 bg-transparent text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-950" onClick={onViewExpiring}>View All</Button>
        </div>
      )}
    </div>
  );
}
