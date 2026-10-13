const KEY = 'worklogs.wbsByMachine';

/** The last WBS activity used per machine, so repeat entries need no re-selection. localStorage can be blocked, so every access is guarded. */
export const readWbsMemory = (machineId: string): string => {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>)[machineId] ?? '';
  } catch {
    return '';
  }
};
export const writeWbsMemory = (machineId: string, wbsId: string) => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, string>;
    if (wbsId) all[machineId] = wbsId;
    else delete all[machineId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* remembering the choice is a convenience only */
  }
};
