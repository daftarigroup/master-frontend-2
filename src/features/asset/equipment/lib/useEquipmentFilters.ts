import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EQUIPMENT_CATEGORIES, type DerivedStatus, type EquipmentCategory, type EquipmentFilters, type OwnershipFilter, type SortKey } from '../types';

const SORTS: SortKey[] = ['code', 'name', 'utilization', 'status', 'recent', 'site'];

/**
 * Filter state lives in the URL, so a filtered list can be bookmarked or shared, survives a refresh and the back button, and
 * the mobile chips, the desktop filter bar and the stat tiles all read and write the same place.
 */
export function useEquipmentFilters() {
  const [params, setParams] = useSearchParams();

  const filters: EquipmentFilters = useMemo(() => {
    const category = params.get('category') ?? '';
    const ownership = params.get('ownership') ?? '';
    const status = params.get('status') ?? '';
    const sort = params.get('sort') ?? 'code';
    return {
      q: params.get('q') ?? '',
      category: (EQUIPMENT_CATEGORIES as readonly string[]).includes(category) ? (category as EquipmentCategory) : '',
      ownership: ownership === 'OWNED' || ownership === 'RENTED' ? (ownership as OwnershipFilter) : '',
      status: status === 'IN_USE' || status === 'IDLE' || status === 'UNDER_MAINT' || status === 'AVAILABLE' || status === 'IN_TRANSIT' ? (status as DerivedStatus) : '',
      siteId: /^\d+$/.test(params.get('siteId') ?? '') ? (params.get('siteId') as string) : '',
      vendor: params.get('vendor') ?? '',
      sort: (SORTS as string[]).includes(sort) ? (sort as SortKey) : 'code',
      dir: params.get('dir') === 'desc' ? 'desc' : 'asc',
    };
  }, [params]);

  const view: 'table' | 'grid' = params.get('view') === 'grid' ? 'grid' : 'table';

  /** Changing any filter goes back to page 1. Empty values remove the parameter. */
  const setFilters = useCallback(
    (patch: Partial<EquipmentFilters> & { view?: 'table' | 'grid' }) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            const empty = v === '' || v === undefined || (k === 'sort' && v === 'code') || (k === 'dir' && v === 'asc') || (k === 'view' && v === 'table');
            if (empty) next.delete(k);
            else next.set(k, String(v));
          }
          if (!('view' in patch)) next.set('page', '1');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const clearAll = useCallback(() => setFilters({ q: '', category: '', ownership: '', status: '', siteId: '', vendor: '' }), [setFilters]);

  const activeCount = [filters.category, filters.ownership, filters.status, filters.siteId, filters.vendor].filter(Boolean).length;
  return { filters, view, setFilters, clearAll, activeCount };
}
