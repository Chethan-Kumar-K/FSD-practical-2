// CRUD cycle against the real Express app and a throw-away MongoDB database (dropped afterwards).   npm run test:api
// Needs a running MongoDB: a local mongod, or set MONGODB_URI (for example an Atlas cluster).
import assert from 'node:assert/strict';
import { connectDb } from '../server/db.js';
import { createApp } from '../server/app.js';

try { process.loadEnvFile(); } catch { /* no .env file */ }
const { client, db } = await connectDb({ dbName: `carbon_test_${Date.now()}` }).catch((e) => { console.error(e.message); process.exit(1); });
const server = createApp(db).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const call = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const today = new Date().toISOString().slice(0, 10);
let n = 0;
const ok = (name) => { n++; console.log('  ✓ ' + name); };

try {
  let r = await call('POST', '/entries', { date: today, cat: 'travel', kind: 'car', label: 'x', amount: 26, unit: 'km', kg: 999 });
  assert.equal(r.status, 201); assert.equal(r.body.kg, 4.42); assert.equal(r.body.label, 'Car (petrol)'); const id = r.body.id; ok('create recalculates kg on the server');
  r = await call('GET', '/entries'); assert.equal(r.body.length, 1); assert.equal(r.body[0].id, id); ok('read all');
  r = await call('PUT', `/entries/${id}`, { date: today, kind: 'metro', amount: 10 }); assert.equal(r.status, 200); assert.equal(r.body.kg, 0.4); assert.equal(r.body.cat, 'travel'); ok('update');
  r = await call('POST', '/entries', { date: today, kind: 'nope', amount: 1 }); assert.equal(r.status, 400); ok('unknown activity rejected');
  r = await call('POST', '/entries', { date: today, kind: 'lpg', amount: 500 }); assert.equal(r.status, 400); ok('amount above the limit rejected');
  r = await call('POST', '/entries', { date: 'tomorrow', kind: 'car', amount: 5 }); assert.equal(r.status, 400); ok('bad date rejected');
  r = await call('DELETE', `/entries/${id}`); assert.equal(r.status, 200); ok('delete');
  r = await call('DELETE', `/entries/${id}`); assert.equal(r.status, 404); ok('delete again is 404');
  r = await call('GET', '/entries'); assert.equal(r.body.length, 0); ok('table is empty again');
  r = await call('GET', '/pledges'); assert.deepEqual(r.body, []); ok('pledges start empty');
  r = await call('POST', '/pledges', { id: 'car-metro', title: 'Take the metro', saving: 12.3 }); assert.equal(r.status, 201); ok('create pledge');
  r = await call('POST', '/pledges', { id: 'car-metro', title: 'Take the metro', saving: 12.3 }); assert.equal(r.status, 200); ok('same pledge twice is not duplicated');
  r = await call('POST', '/pledges', { id: '', title: 'x', saving: -1 }); assert.equal(r.status, 400); ok('bad pledge rejected');
  r = await call('GET', '/pledges'); assert.equal(r.body.length, 1); assert.equal(r.body[0].saving, 12.3); ok('read pledges');
  r = await call('DELETE', '/pledges/car-metro'); assert.equal(r.status, 200); ok('delete pledge');
  await call('POST', '/pledges', { id: 'a', title: 'A', saving: 1 }); await call('POST', '/pledges', { id: 'b', title: 'B', saving: 2 });
  await call('DELETE', '/pledges'); r = await call('GET', '/pledges'); assert.equal(r.body.length, 0); ok('clear all pledges');
  r = await call('GET', '/reminder'); assert.deepEqual(r.body, { enabled: false, time: '20:00', lastFired: '', saved: false }); ok('reminder defaults before anything is saved');
  r = await call('PUT', '/reminder', { enabled: true, time: '07:45', lastFired: today }); assert.equal(r.status, 200); ok('save reminder settings');
  r = await call('GET', '/reminder'); assert.deepEqual(r.body, { enabled: true, time: '07:45', lastFired: today, saved: true }); ok('reminder settings persist');
  r = await call('PUT', '/reminder', { enabled: 'yes', time: '25:99', lastFired: '' }); assert.equal(r.status, 400); ok('bad reminder settings rejected');
  console.log(`\n${n} checks passed.`);
} finally { server.close(); await db.dropDatabase(); await client.close(); }
