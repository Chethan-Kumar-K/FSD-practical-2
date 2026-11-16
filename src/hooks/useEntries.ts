import { useCallback, useEffect, useState } from 'react';
import type { EntryInput, FootprintEntry } from '../types';
import * as api from '../api/entriesApi';

/** Holds the log in state and keeps it in step with JSON Server (full CRUD). */
export function useEntries() {
  const [entries, setEntries] = useState<FootprintEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await api.listEntries());
      setError(null);
    } catch {
      setError('Could not reach JSON Server on port 3001. Start it with "npm run server" and reload.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The three writers throw on failure so the caller can show a message.
  const add = useCallback(async (input: EntryInput) => {
    const created = await api.createEntry(input);
    setEntries((prev) => [...prev, created]);
    return created;
  }, []);

  const update = useCallback(async (id: number, input: EntryInput) => {
    const saved = await api.updateEntry(id, input);
    setEntries((prev) => prev.map((e) => (e.id === id ? saved : e)));
    return saved;
  }, []);

  const remove = useCallback(async (id: number) => {
    await api.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addMany = useCallback(async (inputs: EntryInput[]) => {
    try {
      const created: FootprintEntry[] = [];
      for (let offset = 0; offset < inputs.length; offset += 25) {
        const batch = inputs.slice(offset, offset + 25);
        created.push(...(await Promise.all(batch.map((input) => api.createEntry(input)))));
      }
      setEntries((prev) => [...prev, ...created]);
      return created.length;
    } catch (cause) {
      await load();
      throw cause;
    }
  }, [load]);

  const clearAll = useCallback(async () => {
    try {
      for (let offset = 0; offset < entries.length; offset += 25) {
        await Promise.all(entries.slice(offset, offset + 25).map((entry) => api.deleteEntry(entry.id)));
      }
      setEntries([]);
    } catch (cause) {
      await load();
      throw cause;
    }
  }, [entries, load]);

  return { entries, loading, error, reload: load, add, update, remove, addMany, clearAll };
}
