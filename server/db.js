import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH || path.join(here, '..', 'data', 'carbon.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS entries (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  date   TEXT NOT NULL,                                   -- local day, YYYY-MM-DD
  cat    TEXT NOT NULL CHECK (cat IN ('travel','energy','food','shopping')),
  kind   TEXT NOT NULL,                                   -- activity id, e.g. 'car'
  label  TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  unit   TEXT NOT NULL,
  kg     REAL NOT NULL CHECK (kg >= 0)                    -- kg CO2e
);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries (date);

-- Changes the person pledged to make (the id is the recommendation id, e.g. 'car-metro')
CREATE TABLE IF NOT EXISTS pledges (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  saving     REAL NOT NULL CHECK (saving >= 0),           -- kg CO2e a month
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Daily reminder settings: one row, always id 1
CREATE TABLE IF NOT EXISTS reminder (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  enabled    INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  time       TEXT NOT NULL DEFAULT '20:00',               -- HH:MM
  last_fired TEXT NOT NULL DEFAULT ''                     -- YYYY-MM-DD of the last reminder
);
`;

/** Opens (and creates, if needed) the SQLite database. `created` is true on the first run. */
export function openDb(file = DB_PATH) {
  const inMemory = file === ':memory:';
  const created = inMemory || !existsSync(file);
  if (!inMemory) mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return { db, created };
}
