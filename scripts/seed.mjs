// Regenerates db.json with ~60 days of sample entries ending today.
// Run with: npm run seed
import { writeFileSync } from 'node:fs';

const KIND = {
  metro: ['travel', 'Metro', 'km', 0.04], auto: ['travel', 'Auto-rickshaw (CNG)', 'km', 0.09],
  car: ['travel', 'Car (petrol)', 'km', 0.17], elec: ['energy', 'Electricity', 'kWh', 0.7],
  lpg: ['energy', 'LPG cooking gas', 'kg', 3.0], veg: ['food', 'Vegetarian meal', 'meals', 0.6],
  egg: ['food', 'Egg meal', 'meals', 0.9], chicken: ['food', 'Chicken meal', 'meals', 1.5],
  mutton: ['food', 'Mutton meal', 'meals', 4.0], tee: ['shopping', 'Cotton T-shirt', 'items', 7],
  jeans: ['shopping', 'Jeans', 'items', 25], phone: ['shopping', 'Smartphone', 'items', 65],
};

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

let seed = 20260921;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const entries = [];
let id = 1;
const add = (age, kind, amount) => {
  const [cat, label, unit, factor] = KIND[kind];
  entries.push({ id: id++, date: fmtDate(daysAgo(age)), cat, kind, label, amount, unit, kg: Math.round(amount * factor * 1000) / 1000 });
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

writeFileSync(new URL('../db.json', import.meta.url), JSON.stringify({ entries }, null, 2) + '\n');
console.log(`db.json written with ${entries.length} entries.`);
