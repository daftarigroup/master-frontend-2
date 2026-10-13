import { useState } from 'react';
import type { OptionalColumn } from '../components/DocumentRow';

const STORE = 'documents.columns.v1';

/** Which optional register columns are hidden, remembered per browser. */
export function useHiddenColumns(): [ReadonlySet<OptionalColumn>, (c: OptionalColumn) => void] {
  const [hidden, setHidden] = useState<Set<OptionalColumn>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORE) ?? '["workOrder"]') as OptionalColumn[]);
    } catch {
      return new Set<OptionalColumn>(['workOrder']);
    }
  });
  const toggle = (c: OptionalColumn) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      try {
        localStorage.setItem(STORE, JSON.stringify([...next]));
      } catch {
        /* private window: the choice just is not remembered */
      }
      return next;
    });
  return [hidden, toggle];
}

