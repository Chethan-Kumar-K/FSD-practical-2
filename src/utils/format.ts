export const fmt = (n: number): string =>
  n.toLocaleString('en-IN', { maximumFractionDigits: n < 1000 ? 1 : 0 });

export const fmtT = (n: number): string =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1);

export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/** "1 meal", "2 meals", "12 km" */
export const amountText = (n: number, unit: string): string =>
  fmt(n) + ' ' + (n === 1 && (unit === 'meals' || unit === 'items') ? unit.slice(0, -1) : unit);

// Dates are handled as local "YYYY-MM-DD" strings
export const toStr = (d: Date): string =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export const todayStr = (): string => toStr(new Date());

export function shiftDate(s: string, n: number): string {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toStr(d);
}

export const niceDate = (s: string, withWeekday = false): string =>
  new Date(s + 'T12:00:00').toLocaleDateString(
    'en-IN',
    withWeekday ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' },
  );
