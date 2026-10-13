import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STATUS_ORDER } from './statusStyle';
import type { DerivedStatus } from '../types';

export interface AssignmentFilters {
  status: DerivedStatus | '';
  siteId: string;
  overdue: boolean;
  q: string;
}

/** Filters live in the URL (?status=IN_USE&site=3&overdue=1&q=...), so a tile tap or a link from another screen can deep-link a list. */
export function useAssignmentFilters() {
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get('status') ?? '';
  const filters: AssignmentFilters = useMemo(
    () => ({
      status: (STATUS_ORDER as string[]).includes(rawStatus) ? (rawStatus as DerivedStatus) : '',
      siteId: params.get('site') ?? '',
      overdue: params.get('overdue') === '1',
      q: params.get('q') ?? '',
    }),
    [rawStatus, params],
  );

  const patch = useCallback(
    (p: Partial<AssignmentFilters>) =>
      setParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          const set = (k: string, v: string) => (v ? n.set(k, v) : n.delete(k));
          if (p.status !== undefined) set('status', p.status);
          if (p.siteId !== undefined) set('site', p.siteId);
          if (p.overdue !== undefined) set('overdue', p.overdue ? '1' : '');
          if (p.q !== undefined) set('q', p.q);
          n.set('page', '1');
          return n;
        },
        { replace: true },
      ),
    [setParams],
  );

  const activeCount = (filters.status ? 1 : 0) + (filters.siteId ? 1 : 0) + (filters.overdue ? 1 : 0);
  return { filters, patch, activeCount };
}
