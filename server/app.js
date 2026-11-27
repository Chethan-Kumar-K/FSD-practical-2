import express from 'express';
import { cleanEntry } from './catalogue.js';

import { reserveEntryIds } from './db.js';

const NO_ID = { projection: { _id: 0 } };

/**
 * REST API over MongoDB. The routes and JSON shapes match what JSON Server gave the
 * React app (GET/POST /entries, PUT/DELETE /entries/:id); pledges and the reminder settings live here too, so the front end is unchanged.
 */
export function createApp(db) {
  const app = express();
  app.use(express.json({ limit: '200kb' }));

  // The React dev server (port 5173) calls this API directly, so allow it.
  app.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  const entries = db.collection('entries');
  const pledges = db.collection('pledges');
  const reminder = db.collection('reminder');

  const parseId = (v) => (/^\d+$/.test(v) ? Number(v) : null);
  const getOne = (id) => entries.findOne({ id }, NO_ID);

  // READ: all entries, oldest first
  app.get('/entries', async (_req, res) => {
    res.json(await entries.find({}, NO_ID).sort({ id: 1 }).toArray());
  });

  app.get('/entries/:id', async (req, res) => {
    const row = await getOne(parseId(req.params.id) ?? -1);
    if (!row) return res.status(404).json({ error: 'Entry not found.' });
    res.json(row);
  });

  // CREATE
  app.post('/entries', async (req, res) => {
    const { value, error } = cleanEntry(req.body);
    if (error) return res.status(400).json({ error });
    // MongoDB's findOneAndUpdate is atomic, so ids never repeat. The unique index on `id` plus this retry is a safety net
    // (and keeps the app working on MongoDB-compatible servers that are not strictly atomic).
    for (let attempt = 0; ; attempt++) {
      const id = await reserveEntryIds(db);
      try {
        await entries.insertOne({ id, ...value });
        return res.status(201).json(await getOne(id));
      } catch (err) {
        if (err.code !== 11000 || attempt >= 40) throw err;
        await new Promise((r) => setTimeout(r, 5 + Math.random() * 20));
      }
    }
  });

  // UPDATE
  app.put('/entries/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (id == null || !(await getOne(id))) return res.status(404).json({ error: 'Entry not found.' });
    const { value, error } = cleanEntry(req.body);
    if (error) return res.status(400).json({ error });
    await entries.updateOne({ id }, { $set: value });
    res.json(await getOne(id));
  });

  // DELETE
  app.delete('/entries/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (id == null || !(await entries.deleteOne({ id })).deletedCount) return res.status(404).json({ error: 'Entry not found.' });
    res.json({});
  });

  /* ============================== PLEDGES ================================= */
  const pledgeOut = (d) => (d ? { id: d._id, title: d.title, saving: d.saving } : null);
  app.get('/pledges', async (_req, res) => {
    res.json((await pledges.find({}).sort({ createdAt: 1, _id: 1 }).toArray()).map(pledgeOut));
  });

  // CREATE (pledging the same change twice just returns the existing pledge)
  app.post('/pledges', async (req, res) => {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const id = typeof b.id === 'string' ? b.id.trim().slice(0, 60) : '';
    const title = typeof b.title === 'string' ? b.title.trim().slice(0, 200) : '';
    const saving = typeof b.saving === 'number' ? b.saving : Number.NaN;
    if (!id || !title || !Number.isFinite(saving) || saving < 0) return res.status(400).json({ error: 'A pledge needs an id, a title and a saving of 0 or more.' });
    const r = await pledges.updateOne({ _id: id }, { $setOnInsert: { title, saving, createdAt: new Date() } }, { upsert: true });
    res.status(r.upsertedCount ? 201 : 200).json(pledgeOut(await pledges.findOne({ _id: id })));
  });

  // DELETE one, or all of them
  app.delete('/pledges/:id', async (req, res) => {
    if (!(await pledges.deleteOne({ _id: req.params.id })).deletedCount) return res.status(404).json({ error: 'Pledge not found.' });
    res.json({});
  });
  app.delete('/pledges', async (_req, res) => {
    await pledges.deleteMany({});
    res.json({});
  });

  /* ========================= REMINDER SETTINGS ============================ */
  const readReminder = async () => {
    const r = await reminder.findOne({ _id: 'reminder' });
    return r ? { enabled: r.enabled, time: r.time, lastFired: r.lastFired, saved: true } : { enabled: false, time: '20:00', lastFired: '', saved: false };
  };
  app.get('/reminder', async (_req, res) => res.json(await readReminder()));
  app.put('/reminder', async (req, res) => {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (typeof b.enabled !== 'boolean' || typeof b.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)
      || typeof b.lastFired !== 'string' || !(b.lastFired === '' || /^\d{4}-\d{2}-\d{2}$/.test(b.lastFired))) {
      return res.status(400).json({ error: 'Reminder needs enabled (true/false), time (HH:MM) and lastFired (YYYY-MM-DD or empty).' });
    }
    await reminder.updateOne({ _id: 'reminder' }, { $set: { enabled: b.enabled, time: b.time, lastFired: b.lastFired } }, { upsert: true });
    res.json(await readReminder());
  });

  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
  // Bad JSON and anything unexpected come back as JSON, never an HTML stack trace.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status === 400 ? 'Invalid JSON.' : 'Server error.' });
  });
  return app;
}
