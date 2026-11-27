import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { connectDb, isFreshDb, redact, DEFAULT_URI } from './db.js';
import { createApp } from './app.js';
import { cleanEntry } from './catalogue.js';
import { insertRows, sampleEntries } from './seed.js';

try { process.loadEnvFile(); } catch { /* no .env file: use the defaults */ }

let connection;
try {
  connection = await connectDb();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
const { client, db } = connection;

// First run only: bring over the entries from the old JSON Server file if it is there,
// otherwise start with sample data so the charts are not empty.
if ((await isFreshDb(db)) && process.env.SEED !== '0') {
  const legacy = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db.json');
  let rows = [];
  if (existsSync(legacy)) {
    try {
      const old = JSON.parse(readFileSync(legacy, 'utf8'));
      rows = (old.entries ?? []).map((e) => cleanEntry(e).value).filter(Boolean);
      if (rows.length) console.log(`Imported ${rows.length} entries from db.json into MongoDB.`);
    } catch { /* unreadable file: fall back to sample data */ }
  }
  if (!rows.length) {
    rows = sampleEntries();
    console.log(`New database: added ${rows.length} sample entries.`);
  }
  await insertRows(db, rows);
}

const PORT = Number(process.env.PORT) || 3001;
const server = createApp(db).listen(PORT, () => console.log(`API on http://localhost:${PORT}  (MongoDB: ${redact(process.env.MONGODB_URI || DEFAULT_URI)}, database "${db.databaseName}")`));

const shutdown = () => server.close(() => client.close().finally(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
