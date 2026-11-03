export type CategoryKey = 'travel' | 'energy' | 'food' | 'shopping';

/** One logged activity, exactly as stored in db.json */
export interface FootprintEntry {
  id: number;
  date: string; // local "YYYY-MM-DD"
  cat: CategoryKey;
  kind: string; // activity id, e.g. "car"
  label: string;
  amount: number;
  unit: string;
  kg: number; // kg CO2e
}

/** What the form sends to the server (JSON Server adds the id) */
export type EntryInput = Omit<FootprintEntry, 'id'>;

export interface CategoryOption {
  id: string;
  label: string;
  factor: number;
  unit?: string;
  max?: number;
}

export interface CategoryDef {
  unit: string;
  start: number;
  max: number;
  compare: boolean;
  note?: string;
  options: CategoryOption[];
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  saving: number;
}

export interface Analysis {
  today: string;
  cats: Record<CategoryKey, number>;
  byDay14: number[];
  byDay30: number[];
  monthTotal: number;
  prevTotal: number;
  todayTotal: number;
  recs: Recommendation[];
}
