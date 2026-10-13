const UTC_DAY = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

/** "Tue" for a YYYY-MM-DD calendar day. */
export const weekdayShort = (ymd: string): string => UTC_DAY(ymd).toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });

/** "20" for a YYYY-MM-DD calendar day. */
export const dayOfMonth = (ymd: string): string => String(Number(ymd.slice(8, 10)));

/** "20 Oct 2026" for a YYYY-MM-DD calendar day. */
export const dayLong = (ymd: string): string => UTC_DAY(ymd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "20 Oct" for an ISO instant, in IST. */
export const shortIst = (iso: string): string => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });

export const endLabel = (e: { firm: { name: string }; site: string | null }): string => (e.site ? `${e.firm.name} / ${e.site}` : e.firm.name);
