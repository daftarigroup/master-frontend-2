/** Litres and readings show at most 2 decimals and no trailing zeros. */
export const fmtNum = (n: number | null | undefined, digits = 2): string =>
  n === null || n === undefined || Number.isNaN(n)
    ? '—'
    : Number(n.toFixed(digits)).toLocaleString('en-IN', { maximumFractionDigits: digits });

/** YYYY-MM-DD in the Asia/Kolkata calendar (the backend groups days by IST). */
export const istToday = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const istMonth = (): string => istToday().slice(0, 7);

/** IST wall-clock HH:mm for a time input. */
export const istNowTime = (): string =>
  new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

/** Combine an IST date and time into an ISO instant. */
export const istToIso = (date: string, time: string): string =>
  new Date(`${date}T${time || '00:00'}:00+05:30`).toISOString();

export const fmtDateTime = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const fmtDay = (ymd: string): string => {
  const [y, m, d] = ymd.split('-');
  return `${d}-${m}-${y}`;
};

export const shiftMonth = (month: string, by: number): string => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** Axios error to the message the API sent (new routes use `message`, older ones `error`). */
export const apiErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string } | null;
  return e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
};
