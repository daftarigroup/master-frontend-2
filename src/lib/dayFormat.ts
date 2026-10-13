/** 'YYYY-MM-DD' -> '20 May 2025, Tue' */
export const formatDayLong = (iso: string) => {
  const parts = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short', timeZone: 'UTC' }).formatToParts(new Date(`${iso}T00:00:00Z`));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')} ${get('month')} ${get('year')}, ${get('weekday')}`;
};
