import { MongoClient } from 'mongodb';

export const DEFAULT_URI = 'mongodb://127.0.0.1:27017';
export const DEFAULT_DB_NAME = 'carbonfootprint';

/**
 * Connects to MongoDB and makes sure the indexes exist.
 *   MONGODB_URI   connection string (local mongod or MongoDB Atlas), default mongodb://127.0.0.1:27017
 *   MONGODB_DB    database name, default "carbonfootprint"
 *
 * Collections
 *   entries   { id, date, cat, kind, label, amount, unit, kg }   id is a number so the React app is unchanged
 *   pledges   { _id: <recommendation id>, title, saving, createdAt }
 *   reminder  { _id: 'reminder', enabled, time, lastFired }      one document
 *   counters  { _id: 'entries', seq }                            hands out the numeric entry ids
 */
export async function connectDb({ uri = process.env.MONGODB_URI || DEFAULT_URI, dbName = process.env.MONGODB_DB || DEFAULT_DB_NAME } = {}) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
  } catch (err) {
    await client.close().catch(() => {});
    throw new Error(`Could not reach MongoDB at ${redact(uri)}. Start mongod, or set MONGODB_URI (see .env.example). (${err.message})`);
  }
  const db = client.db(dbName);
  await db.collection('entries').createIndex({ id: 1 }, { unique: true });
  await db.collection('entries').createIndex({ date: 1 });
  return { client, db };
}

/** Hides any password in a connection string before it is printed. */
export const redact = (uri) => uri.replace(/\/\/([^:@/]+):[^@]*@/, '//$1:***@');

/** Reserves `n` consecutive entry ids and returns the first one. */
export async function reserveEntryIds(db, n = 1) {
  const doc = await db.collection('counters').findOneAndUpdate({ _id: 'entries' }, { $inc: { seq: n } }, { upsert: true, returnDocument: 'after' });
  return doc.seq - n + 1;
}

/** True when nothing has ever been stored (no entries and no id counter), so a first run can be seeded. */
export async function isFreshDb(db) {
  const [count, counter] = await Promise.all([db.collection('entries').estimatedDocumentCount(), db.collection('counters').findOne({ _id: 'entries' })]);
  return count === 0 && !counter;
}
