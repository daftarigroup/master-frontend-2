import { useSyncExternalStore } from 'react';
import { getProjectOrMinor } from './storageManager';

// Shares the key with PMSContext so both stay in sync.
const KEY = 'pms_selected_project';
const EVENT = 'pms-active-project-change';

export interface ActiveProject {
  id?: string | number;
  serial_no: string;
  serialNo: string;
  project_name: string;
  projectName: string;
  [k: string]: any;
}

let cachedRaw: string | null | undefined;
let cachedVal: ActiveProject | null = null;

export const getActiveProject = (): ActiveProject | null => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw === cachedRaw) return cachedVal;
  cachedRaw = raw;
  try {
    cachedVal = raw ? JSON.parse(raw) : null;
  } catch {
    cachedVal = null;
  }
  return cachedVal;
};

export const setActiveProject = (p: any | null) => {
  try {
    if (p) {
      const serial = p.serialNo || p.serial_no || '';
      const name = p.projectName || p.project_name || '';
      localStorage.setItem(
        KEY,
        JSON.stringify({ ...p, serialNo: serial, serial_no: serial, projectName: name, project_name: name })
      );
    } else {
      localStorage.removeItem(KEY);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
};

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
};

export const useActiveProject = () => useSyncExternalStore(subscribe, getActiveProject, () => null);

const serialOf = (x: any) => String(x?.serialNo || x?.serial_no || x?.projectNo || x?.project_no || '');

/** Keeps only the opened project's record(s); returns the list untouched when no project is open. */
export const scopeProjects = <T,>(list: T[]): T[] => {
  const a = getActiveProject();
  if (!a || !Array.isArray(list)) return list;
  return list.filter((p: any) => serialOf(p) === a.serialNo || (a.id != null && p?.id != null && String(p.id) === String(a.id)));
};

/** Same, for records keyed by projectNo (bills, drawings, logs...). */
export const scopeByProjectNo = <T,>(list: T[], get: (r: T) => any = (r: any) => r?.projectNo): T[] => {
  const a = getActiveProject();
  if (!a || !Array.isArray(list)) return list;
  return list.filter((r) => String(get(r) ?? '') === a.serialNo);
};

/** Bills/entries may be keyed by a minor id; resolve to the parent project before comparing. */
export const scopeByProjectOrMinor = <T,>(list: T[], get: (r: T) => any = (r: any) => r?.projectNo): T[] => {
  const a = getActiveProject();
  if (!a || !Array.isArray(list)) return list;
  return list.filter((r) => {
    const id = String(get(r) ?? '');
    if (id === a.serialNo) return true;
    const m = getProjectOrMinor(id);
    return !!m && (m.parentProjectNo === a.serialNo || m.serialNo === a.serialNo);
  });
};
