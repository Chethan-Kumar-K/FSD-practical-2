// Server-side copy of the emission catalogue in src/data/catalogue.ts.
// The API uses it to check every entry and to recalculate kg itself, so the
// database never stores a total the client made up. Keep the two in step.
export const KIND = {
  metro: { cat: 'travel', label: 'Metro', unit: 'km', factor: 0.04, max: 20000 },
  bus: { cat: 'travel', label: 'City bus', unit: 'km', factor: 0.05, max: 20000 },
  two: { cat: 'travel', label: 'Two-wheeler (petrol)', unit: 'km', factor: 0.05, max: 20000 },
  auto: { cat: 'travel', label: 'Auto-rickshaw (CNG)', unit: 'km', factor: 0.09, max: 20000 },
  car: { cat: 'travel', label: 'Car (petrol)', unit: 'km', factor: 0.17, max: 20000 },
  train: { cat: 'travel', label: 'Train', unit: 'km', factor: 0.03, max: 20000 },
  flight: { cat: 'travel', label: 'Domestic flight', unit: 'km', factor: 0.15, max: 20000 },
  walk: { cat: 'travel', label: 'Walk or cycle', unit: 'km', factor: 0, max: 20000 },
  elec: { cat: 'energy', label: 'Electricity', unit: 'kWh', factor: 0.7, max: 5000 },
  lpg: { cat: 'energy', label: 'LPG cooking gas', unit: 'kg', factor: 3.0, max: 100 },
  veg: { cat: 'food', label: 'Vegetarian meal', unit: 'meals', factor: 0.6, max: 50 },
  egg: { cat: 'food', label: 'Egg meal', unit: 'meals', factor: 0.9, max: 50 },
  chicken: { cat: 'food', label: 'Chicken meal', unit: 'meals', factor: 1.5, max: 50 },
  mutton: { cat: 'food', label: 'Mutton meal', unit: 'meals', factor: 4.0, max: 50 },
  tee: { cat: 'shopping', label: 'Cotton T-shirt', unit: 'items', factor: 7, max: 50 },
  jeans: { cat: 'shopping', label: 'Jeans', unit: 'items', factor: 25, max: 50 },
  phone: { cat: 'shopping', label: 'Smartphone', unit: 'items', factor: 65, max: 50 },
  laptop: { cat: 'shopping', label: 'Laptop', unit: 'items', factor: 300, max: 50 },
};
const round3 = (n) => Math.round(n * 1000) / 1000;

/** Returns the row to store, or { error } when the body is not a valid entry. */
export function cleanEntry(body) {
  const b = body && typeof body === 'object' ? body : {};
  const k = typeof b.kind === 'string' && Object.hasOwn(KIND, b.kind) ? KIND[b.kind] : null;
  if (!k) return { error: 'Unknown activity.' };
  const amount = typeof b.amount === 'number' ? b.amount : Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount must be a number above 0.' };
  if (amount > k.max) return { error: `Amount is more than ${k.max} ${k.unit}.` };
  const date = b.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z'))) {
    return { error: 'Date must be YYYY-MM-DD.' };
  }
  return { value: { date, cat: k.cat, kind: b.kind, label: k.label, amount, unit: k.unit, kg: round3(amount * k.factor) } };
}
