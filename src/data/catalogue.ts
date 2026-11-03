import type { CategoryDef, CategoryKey, EntryInput } from '../types';
import { round3 } from '../utils/format';

/* Emission catalogue (illustrative kg CO2e per unit), carried over from Part 1 */
export const DAILY_BUDGET = 6.3; // 2.3 t a year is about 6.3 kg a day
export const CAT_ORDER: CategoryKey[] = ['travel', 'energy', 'food', 'shopping'];
export const CAT_NAME: Record<CategoryKey, string> = {
  travel: 'Transportation',
  energy: 'Home energy',
  food: 'Food',
  shopping: 'Shopping',
};
export const CAT_SHORT: Record<CategoryKey, string> = {
  travel: 'Travel',
  energy: 'Home energy',
  food: 'Food',
  shopping: 'Shopping',
};
export const CAT_COLOR: Record<CategoryKey, string> = {
  travel: '#F2A900',
  energy: '#0F4C47',
  food: '#2F7D57',
  shopping: '#7FB2A6',
};

export const categories: Record<CategoryKey, CategoryDef> = {
  travel: {
    unit: 'km',
    start: 10,
    max: 20000,
    compare: true,
    options: [
      { id: 'metro', label: 'Metro', factor: 0.04 },
      { id: 'bus', label: 'City bus', factor: 0.05 },
      { id: 'two', label: 'Two-wheeler (petrol)', factor: 0.05 },
      { id: 'auto', label: 'Auto-rickshaw (CNG)', factor: 0.09 },
      { id: 'car', label: 'Car (petrol)', factor: 0.17 },
      { id: 'train', label: 'Train', factor: 0.03 },
      { id: 'flight', label: 'Domestic flight', factor: 0.15 },
      { id: 'walk', label: 'Walk or cycle', factor: 0 },
    ],
  },
  energy: {
    unit: 'kWh',
    start: 5,
    max: 5000,
    compare: false,
    note: 'Emissions depend on the fuel and the power grid, so using less energy is the main lever.',
    options: [
      { id: 'elec', label: 'Electricity', unit: 'kWh', factor: 0.7 },
      { id: 'lpg', label: 'LPG cooking gas', unit: 'kg', factor: 3.0, max: 100 },
    ],
  },
  food: {
    unit: 'meals',
    start: 1,
    max: 50,
    compare: true,
    options: [
      { id: 'veg', label: 'Vegetarian meal', factor: 0.6 },
      { id: 'egg', label: 'Egg meal', factor: 0.9 },
      { id: 'chicken', label: 'Chicken meal', factor: 1.5 },
      { id: 'mutton', label: 'Mutton meal', factor: 4.0 },
    ],
  },
  shopping: {
    unit: 'items',
    start: 1,
    max: 50,
    compare: false,
    note: 'Buying second-hand, repairing and keeping things longer avoids most of this.',
    options: [
      { id: 'tee', label: 'Cotton T-shirt', factor: 7 },
      { id: 'jeans', label: 'Jeans', factor: 25 },
      { id: 'phone', label: 'Smartphone', factor: 65 },
      { id: 'laptop', label: 'Laptop', factor: 300 },
    ],
  },
};

export interface KindInfo {
  cat: CategoryKey;
  label: string;
  unit: string;
  factor: number;
  max: number;
}

/** Lookup by activity id: KIND.car -> { cat, label, unit, factor, max } */
export const KIND: Record<string, KindInfo> = {};
export const FACTORS: Record<string, number> = {};
for (const [cat, c] of Object.entries(categories) as [CategoryKey, CategoryDef][]) {
  for (const o of c.options) {
    KIND[o.id] = { cat, label: o.label, unit: o.unit ?? c.unit, factor: o.factor, max: o.max ?? c.max };
    FACTORS[o.id] = o.factor;
  }
}

/** Builds the record that is sent to JSON Server (kg is calculated here, from the catalogue) */
export function buildEntry(date: string, kind: string, amount: number): EntryInput {
  const k = KIND[kind];
  return { date, cat: k.cat, kind, label: k.label, amount, unit: k.unit, kg: round3(amount * k.factor) };
}
