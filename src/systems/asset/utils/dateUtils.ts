/** Formats an ISO/date-like value as DD-MM-YYYY, or '' if it can't be parsed. */
export function formatTimestampToDDMMYYYY(value?: string | number | Date | null): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
