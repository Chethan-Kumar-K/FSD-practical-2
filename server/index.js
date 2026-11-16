import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { openDb, DB_PATH } from './db.js';
import { createApp } from './app.js';
import { cleanEntry } from './catalogue.js';
import { insertRows, sampleEntries } from './seed.js';

const { db, created } = openDb();

// First run only: bring over the entries from the old JSON Server file if it is there,
// otherwise start with sample data so the charts are not empty.
if (created && process.env.SEED !== '0') {
  const legacy = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db.json');
  let rows = [];
  if (existsSync(legacy)) {
    try {
      const old = JSON.parse(readFileSync(legacy, 'utf8'));
      rows = (old.entries ?? []).map((e) => cleanEntry(e).value).filter(Boolean);
      if (rows.length) console.log(`Imported ${rows.length} entries from db.json into SQLite.`);
    } catch { /* unreadable file: fall back to sample data */ }
  }
  if (!rows.length) {
    rows = sampleEntries();
    console.log(`New database: added ${rows.length} sample entries.`);
  }
  insertRows(db, rows);
}

const PORT = Number(process.env.PORT) || 3001;
createApp(db).listen(PORT, () => console.log(`API on http://localhost:${PORT}  (SQLite file: ${DB_PATH})`));
