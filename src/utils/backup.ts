import type { EntryInput, FootprintEntry, Pledge } from '../types';
import { KIND, buildEntry } from '../data/catalogue';

export interface ParsedBackup {
  entries: EntryInput[];
  pledges: Pledge[];
  skipped: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function fingerprint(entry: Pick<FootprintEntry, 'date' | 'kind' | 'amount'>): string {
  return `${entry.date}:${entry.kind}:${entry.amount}`;
}

export function parseBackup(text: string, existing: FootprintEntry[]): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (!isRecord(data) || !Array.isArray(data.entries)) {
    throw new Error('That file is not a CarbonFootprint JSON backup.');
  }
  if (data.entries.length > 5000) {
    throw new Error('A backup can contain at most 5,000 entries.');
  }

  const known = new Set(existing.map(fingerprint));
  const entries: EntryInput[] = [];
  let skipped = 0;
  for (const raw of data.entries) {
    if (!isRecord(raw) || typeof raw.kind !== 'string' || !Object.prototype.hasOwnProperty.call(KIND, raw.kind)) {
      skipped++;
      continue;
    }

    const amount = Number(raw.amount);
    const date = raw.date;
    const kind = KIND[raw.kind];
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > kind.max
    ) {
      skipped++;
      continue;
    }

    const entry = buildEntry(date, raw.kind, amount);
    const key = fingerprint(entry);
    if (known.has(key)) {
      skipped++;
      continue;
    }
    known.add(key);
    entries.push(entry);
  }

  const pledges = Array.isArray(data.pledges)
    ? data.pledges.flatMap((raw): Pledge[] => {
        if (
          !isRecord(raw) ||
          typeof raw.id !== 'string' ||
          typeof raw.title !== 'string' ||
          !Number.isFinite(Number(raw.saving)) ||
          Number(raw.saving) < 0
        ) {
          return [];
        }
        return [{ id: raw.id.slice(0, 40), title: raw.title.slice(0, 160), saving: Number(raw.saving) }];
      })
    : [];

  return { entries, pledges, skipped };
}
