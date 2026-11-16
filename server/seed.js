// Sample data: 60 days of an ordinary routine ending today, so the charts are not empty.
//   npm run seed   replaces every entry in the SQLite database with fresh sample data
import { pathToFileURL } from 'node:url';
import { openDb } from './db.js';
import { KIND } from './catalogue.js';

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

export function sampleEntries() {
  let seed = 20260921;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rows = [];
  const add = (age, kind, amount) => {
    const k = KIND[kind];
    rows.push({ date: fmtDate(daysAgo(age)), cat: k.cat, kind, label: k.label, amount, unit: k.unit, kg: Math.round(amount * k.factor * 1000) / 1000 });
  };
  for (let age = 59; age >= 0; age--) {
    const dow = daysAgo(age).getDay();
    const weekday = dow >= 1 && dow <= 5;
    const r = rnd();
    if (weekday) { if (r < 0.5) add(age, 'car', 26); else if (r < 0.8) add(age, 'metro', 28); else add(age, 'auto', 10); }
    else if (r < 0.6) add(age, 'car', 20);
    add(age, 'elec', Math.round((2 + rnd() * 1.2) * 10) / 10);
    const m = rnd();
    add(age, m < 0.55 ? 'veg' : m < 0.65 ? 'egg' : m < 0.92 ? 'chicken' : 'mutton', weekday ? 1 : 2);
    if (age % 4 === 0) add(age, 'lpg', 0.5);
  }
  add(5, 'tee', 1); add(17, 'jeans', 1); add(33, 'phone', 1); add(48, 'tee', 2);
  return rows;
}

export function insertRows(db, rows, replace = false) {
  const insert = db.prepare('INSERT INTO entries (date, cat, kind, label, amount, unit, kg) VALUES (@date, @cat, @kind, @label, @amount, @unit, @kg)');
  db.transaction(() => {
    if (replace) db.prepare('DELETE FROM entries').run();
    for (const r of rows) insert.run(r);
  })();
  return rows.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { db } = openDb();
  console.log(`SQLite database seeded with ${insertRows(db, sampleEntries(), true)} entries.`);
}
