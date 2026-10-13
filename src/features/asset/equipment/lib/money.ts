/** Indian digit grouping: 125000 -> "₹1,25,000". Null/undefined -> "—" (a missing amount is never shown as zero). */
export const formatINR = (n: number | null | undefined, opts: { decimals?: number } = {}): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const d = opts.decimals ?? (Number.isInteger(n) ? 0 : 2);
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
};

/** Short form for tight tiles: 202140 -> "₹2.02L", 4500000 -> "₹45L", 12500 -> "₹12.5k". Null -> "—". */
export const formatINRCompact = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const a = Math.abs(n);
  const r = (v: number) => String(Math.round(v * 100) / 100);
  if (a >= 10000000) return `₹${r(n / 10000000)}Cr`;
  if (a >= 100000) return `₹${r(n / 100000)}L`;
  if (a >= 10000) return `₹${r(n / 1000)}k`;
  return formatINR(n);
};

/** A plain quantity with Indian grouping and at most `digits` decimals. */
export const formatQty = (n: number | null | undefined, digits = 1): string =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : n.toLocaleString('en-IN', { maximumFractionDigits: digits });
