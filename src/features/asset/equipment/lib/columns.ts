import { useCallback, useState } from 'react';
import type { SortKey } from '../types';

export type ColumnKey = 'photo' | 'code' | 'category' | 'ownership' | 'vendor' | 'site' | 'status' | 'utilization' | 'hours' | 'lastReading' | 'lastDiesel' | 'efficiency' | 'spend';

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  /** Server-side sort key for this column, when the API can sort by it. */
  sort?: SortKey;
  /** Shown only to users who may see cost. */
  costOnly?: boolean;
  defaultVisible: boolean;
}

// Name, the row checkbox and the actions menu are always present; everything else can be switched off.
export const COLUMNS: ColumnDef[] = [
  { key: 'photo', label: 'Photo', defaultVisible: true },
  { key: 'code', label: 'Asset code', sort: 'code', defaultVisible: true },
  { key: 'category', label: 'Category', defaultVisible: true },
  { key: 'ownership', label: 'Ownership', defaultVisible: true },
  { key: 'vendor', label: 'Vendor', defaultVisible: true },
  { key: 'site', label: 'Site', sort: 'site', defaultVisible: true },
  { key: 'status', label: 'Status', sort: 'status', defaultVisible: true },
  { key: 'utilization', label: 'Utilization', sort: 'utilization', defaultVisible: true },
  { key: 'hours', label: 'Hours / Km', defaultVisible: true },
  { key: 'lastReading', label: 'Last reading', defaultVisible: false },
  { key: 'lastDiesel', label: 'Last diesel', defaultVisible: false },
  { key: 'efficiency', label: 'Fuel efficiency', defaultVisible: false },
  { key: 'spend', label: 'Month spend', costOnly: true, defaultVisible: true },
];

const STORAGE_KEY = 'equipment.columns.v1';
// The table sits beside the sidebar, so it starts with the columns that fit: fewer on narrower screens. The Columns button adds
// the rest, and the choice is remembered.
const hiddenFor = (width: number): ColumnKey[] => (width < 1536 ? ['photo', 'category', 'vendor'] : width < 1920 ? ['category', 'vendor'] : []);
const defaults = (): ColumnKey[] => {
  const hidden = hiddenFor(typeof window !== 'undefined' ? window.innerWidth : 1920);
  return COLUMNS.filter((c) => c.defaultVisible && !hidden.includes(c.key)).map((c) => c.key);
};

/** The chosen columns are remembered in this browser. Storage can be blocked or empty: fall back to the defaults, never fail. */
export function useColumnVisibility() {
  const [visible, setVisible] = useState<ColumnKey[]>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      if (Array.isArray(parsed)) return parsed.filter((k): k is ColumnKey => COLUMNS.some((c) => c.key === k));
    } catch {
      /* ignore */
    }
    return defaults();
  });

  const update = useCallback((next: ColumnKey[]) => {
    setVisible(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback((key: ColumnKey) => update(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key]), [visible, update]);
  const reset = useCallback(() => update(defaults()), [update]);
  return { visible, toggle, reset };
}
