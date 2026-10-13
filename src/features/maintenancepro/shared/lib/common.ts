// Small helpers shared by every Maintenance & Repair screen we keep.

/** Priority is 1 = Low ... 4 = Critical everywhere (this is what the API stores and returns). */
export const PRIORITY_OPTIONS = [
  { value: 1, label: 'Low', badge: 'bg-muted text-muted-foreground' },
  { value: 2, label: 'Medium', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' },
  { value: 3, label: 'High', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' },
  { value: 4, label: 'Critical', badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' },
] as const;

export const priorityLabel = (p: number | null | undefined): string =>
  PRIORITY_OPTIONS.find((o) => o.value === p)?.label ?? (p ? `P${p}` : '—');

export const priorityBadge = (p: number | null | undefined): string =>
  PRIORITY_OPTIONS.find((o) => o.value === p)?.badge ?? 'bg-muted text-muted-foreground';

/** Admin check that accepts every spelling in circulation (the role is SUPER_ADMIN, not SUPERADMIN). */
export function isAdminUser(user: unknown): boolean {
  const u = user as { role?: string; administrate?: unknown } | null | undefined;
  if (!u) return false;
  const role = String(u.role ?? '').toUpperCase().replace(/[\s-]/g, '_');
  return (
    role === 'SUPER_ADMIN' ||
    role === 'SUPERADMIN' ||
    role === 'ADMIN' ||
    u.administrate === true ||
    String(u.administrate).toLowerCase() === 'true'
  );
}

/** The workspace project id as an API firm filter: undefined for "all projects" or nothing selected. */
export function toFirmParam(selected: { id: number | 'all' } | null | undefined): string | undefined {
  if (!selected || selected.id === 'all') return undefined;
  return /^\d+$/.test(String(selected.id)) ? String(selected.id) : undefined;
}
