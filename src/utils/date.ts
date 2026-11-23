/**
 * Helpers for the app's `'YYYY-MM-DD'` date strings. Parsing anchors at local noon
 * to avoid DST/timezone off-by-one, matching `date-field.tsx`.
 */

export function parseLocalDate(value: string): Date | null {
  const [y, m, d] = value.split('-').map(Number);
  if (y && m && d) return new Date(y, m - 1, d, 12);
  return null;
}

/** Whole days from today until `dateStr` (negative if in the past). */
export function daysUntil(dateStr: string, now: Date = new Date()): number | null {
  const target = parseLocalDate(dateStr);
  if (!target) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Hebrew relative-day label, e.g. "היום", "מחר", "בעוד 5 ימים", "לפני 2 ימים". */
export function formatDaysUntil(dateStr: string, now: Date = new Date()): string | null {
  const diff = daysUntil(dateStr, now);
  if (diff === null) return null;
  if (diff === 0) return 'היום';
  if (diff === 1) return 'מחר';
  if (diff === -1) return 'אתמול';
  if (diff > 1) return `בעוד ${diff} ימים`;
  return `לפני ${Math.abs(diff)} ימים`;
}

/**
 * Display form of a stored `'YYYY-MM-DD'` date in Hebrew, e.g. "6 בדצמבר 2026". Parsed as a
 * local date (never `new Date('YYYY-MM-DD')`, which is UTC and shifts a day west of UTC).
 * Empty input gives `''`; anything that is not a real calendar date is returned unchanged
 * so no user data is ever hidden. The stored value stays ISO.
 */
export function formatDisplayDate(value: string | undefined | null): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const date = match ? parseLocalDate(value.trim()) : null;
  // Reject rollovers like 2026-02-31 (Date would silently turn it into March 3).
  if (!match || !date || date.getMonth() + 1 !== Number(match[2]) || date.getDate() !== Number(match[3])) return value;
  // Built per call (cheap) so it follows the device timezone if it changes mid-session.
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}
