const inrFormatters = new Map<string, Intl.NumberFormat>();

/** Currency in Indian grouping for INR (₹1,25,000) and locale-neutral grouping otherwise. */
export function money(amount: number, currency = 'INR', opts: { decimals?: number } = {}) {
  const key = `${currency}|${opts.decimals ?? 'auto'}`;
  let f = inrFormatters.get(key);
  if (!f) {
    const decimals = opts.decimals ?? (currency === 'INR' || currency === 'JPY' || currency === 'IDR' || currency === 'KRW' ? 0 : 2);
    f = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });
    inrFormatters.set(key, f);
  }
  return f.format(Number.isFinite(amount) ? amount : 0);
}

/** Plain-text money for PDFs: jsPDF's built-in fonts have no ₹ glyph. */
export function moneyText(amount: number, currency = 'INR') {
  const n = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
    minimumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(amount);
  return `${currency} ${n}`;
}

export function compact(n: number) {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', opts);
}

export function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  return formatDate(iso, { day: 'numeric', month: 'short' });
}

export function addDays(iso: string, n: number) {
  // Work in UTC so the calendar date never shifts with the local timezone.
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function paxLabel(adults: number, children: number) {
  return `${adults} adult${adults === 1 ? '' : 's'}${children ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''}`;
}

export function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
