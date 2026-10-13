import { useCallback, useState } from 'react';

export type ColumnId = 'time' | 'meter' | 'usage' | 'operator' | 'workType' | 'location' | 'remarks' | 'machine';

/** Log ID, Status and the actions are always shown; these are the ones the picker can toggle. */
export const COLUMNS: Array<{ id: ColumnId; label: string }> = [
  { id: 'machine', label: 'Machine' },
  { id: 'time', label: 'Time' },
  { id: 'meter', label: 'Meter start-end' },
  { id: 'usage', label: 'Usage' },
  { id: 'operator', label: 'Operator' },
  { id: 'workType', label: 'Work type' },
  { id: 'location', label: 'Location' },
  { id: 'remarks', label: 'Remarks' },
];

const DEFAULTS: ColumnId[] = ['time', 'meter', 'usage', 'operator', 'workType'];
const KEY = 'worklogs.columns';

const read = (): ColumnId[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as unknown;
    if (Array.isArray(raw)) return raw.filter((c): c is ColumnId => COLUMNS.some((x) => x.id === c));
  } catch {
    /* blocked or corrupt storage: use the defaults */
  }
  return DEFAULTS;
};

/** Visible optional columns, remembered per browser. localStorage can be blocked, so every access is guarded. */
export function useColumnPrefs() {
  const [cols, setCols] = useState<ColumnId[]>(read);
  const toggle = useCallback((id: ColumnId) => {
    setCols((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* remembering the choice is a convenience only */
      }
      return next;
    });
  }, []);
  return { cols, toggle };
}
