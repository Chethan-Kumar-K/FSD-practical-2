import express from 'express';
import { cleanEntry } from './catalogue.js';

const COLUMNS = 'id, date, cat, kind, label, amount, unit, kg';

/**
 * REST API over SQLite. The routes and JSON shapes match what JSON Server gave the
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

  const insert = db.prepare('INSERT INTO entries (date, cat, kind, label, amount, unit, kg) VALUES (@date, @cat, @kind, @label, @amount, @unit, @kg)');
  const update = db.prepare('UPDATE entries SET date=@date, cat=@cat, kind=@kind, label=@label, amount=@amount, unit=@unit, kg=@kg WHERE id=@id');
  const getOne = db.prepare(`SELECT ${COLUMNS} FROM entries WHERE id = ?`);
  const remove = db.prepare('DELETE FROM entries WHERE id = ?');

  const parseId = (v) => (/^\d+$/.test(v) ? Number(v) : null);

  // READ: all entries, oldest first
  app.get('/entries', (_req, res) => {
    res.json(db.prepare(`SELECT ${COLUMNS} FROM entries ORDER BY id`).all());
  });

  app.get('/entries/:id', (req, res) => {
    const row = getOne.get(parseId(req.params.id) ?? -1);
    if (!row) return res.status(404).json({ error: 'Entry not found.' });
    res.json(row);
  });

  // CREATE
  app.post('/entries', (req, res) => {
    const { value, error } = cleanEntry(req.body);
    if (error) return res.status(400).json({ error });
    const info = insert.run(value);
    res.status(201).json(getOne.get(info.lastInsertRowid));
  });

  // UPDATE
  app.put('/entries/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (id == null || !getOne.get(id)) return res.status(404).json({ error: 'Entry not found.' });
    const { value, error } = cleanEntry(req.body);
    if (error) return res.status(400).json({ error });
    update.run({ ...value, id });
    res.json(getOne.get(id));
  });

  // DELETE
  app.delete('/entries/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (id == null || !remove.run(id).changes) return res.status(404).json({ error: 'Entry not found.' });
    res.json({});
  });

  /* ============================== PLEDGES ================================= */
  const pledgeCols = 'id, title, saving';
  app.get('/pledges', (_req, res) => {
    res.json(db.prepare(`SELECT ${pledgeCols} FROM pledges ORDER BY created_at, rowid`).all());
  });

  // CREATE (pledging the same change twice just returns the existing pledge)
  app.post('/pledges', (req, res) => {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    const id = typeof b.id === 'string' ? b.id.trim().slice(0, 60) : '';
    const title = typeof b.title === 'string' ? b.title.trim().slice(0, 200) : '';
    const saving = typeof b.saving === 'number' ? b.saving : Number.NaN;
    if (!id || !title || !Number.isFinite(saving) || saving < 0) return res.status(400).json({ error: 'A pledge needs an id, a title and a saving of 0 or more.' });
    const info = db.prepare('INSERT OR IGNORE INTO pledges (id, title, saving) VALUES (?, ?, ?)').run(id, title, saving);
    res.status(info.changes ? 201 : 200).json(db.prepare(`SELECT ${pledgeCols} FROM pledges WHERE id = ?`).get(id));
  });

  // DELETE one, or all of them
  app.delete('/pledges/:id', (req, res) => {
    if (!db.prepare('DELETE FROM pledges WHERE id = ?').run(req.params.id).changes) return res.status(404).json({ error: 'Pledge not found.' });
    res.json({});
  });
  app.delete('/pledges', (_req, res) => {
    db.prepare('DELETE FROM pledges').run();
    res.json({});
  });

  /* ========================= REMINDER SETTINGS ============================ */
  const readReminder = () => {
    const r = db.prepare('SELECT enabled, time, last_fired FROM reminder WHERE id = 1').get();
    return r ? { enabled: r.enabled === 1, time: r.time, lastFired: r.last_fired, saved: true } : { enabled: false, time: '20:00', lastFired: '', saved: false };
  };
  app.get('/reminder', (_req, res) => res.json(readReminder()));
  app.put('/reminder', (req, res) => {
    const b = req.body && typeof req.body === 'object' ? req.body : {};
    if (typeof b.enabled !== 'boolean' || typeof b.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time)
      || typeof b.lastFired !== 'string' || !(b.lastFired === '' || /^\d{4}-\d{2}-\d{2}$/.test(b.lastFired))) {
      return res.status(400).json({ error: 'Reminder needs enabled (true/false), time (HH:MM) and lastFired (YYYY-MM-DD or empty).' });
    }
    db.prepare(`INSERT INTO reminder (id, enabled, time, last_fired) VALUES (1, @enabled, @time, @lastFired)
                ON CONFLICT(id) DO UPDATE SET enabled = @enabled, time = @time, last_fired = @lastFired`)
      .run({ enabled: b.enabled ? 1 : 0, time: b.time, lastFired: b.lastFired });
    res.json(readReminder());
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
