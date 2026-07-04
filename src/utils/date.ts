/**
 * Helpers for the app's `'YYYY-MM-DD'` date strings. Parsing anchors at local noon
 * to avoid DST/timezone off-by-one, matching `date-field.tsx`.
 */

function parseLocalDate(value: string): Date | null {
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
