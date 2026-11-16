import { useCallback, useEffect, useState } from 'react';
import type { Pledge } from '../types';
import * as api from '../api/pledgesApi';

const LEGACY_KEY = 'cfi.pledges';

/** Pledges before they lived in SQLite were kept in this browser; read them once so nothing is lost. */
function readLegacy(): Pledge[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (p): p is Pledge =>
        typeof p === 'object' && p !== null && typeof p.id === 'string' && typeof p.title === 'string' &&
        Number.isFinite(p.saving) && p.saving >= 0,
    );
  } catch {
    return [];
  }
}

/** Holds the pledges in state and keeps them in step with the SQLite API. Writers throw on failure. */
export function usePledges() {
  const [pledges, setPledges] = useState<Pledge[]>([]);

  const load = useCallback(async () => {
    let list = await api.listPledges();
    const legacy = readLegacy();
    if (legacy.length) {
      // One-time move of the old browser-stored pledges into the database
      const known = new Set(list.map((p) => p.id));
      for (const p of legacy) if (!known.has(p.id)) await api.createPledge(p);
      try { localStorage.removeItem(LEGACY_KEY); } catch { /* storage blocked */ }
      list = await api.listPledges();
    }
    setPledges(list);
  }, []);

  useEffect(() => {
    void load().catch(() => { /* the entries list already shows the "API not reachable" message */ });
  }, [load]);

  const add = useCallback(async (pledge: Pledge) => {
    const saved = await api.createPledge(pledge);
    setPledges((prev) => (prev.some((p) => p.id === saved.id) ? prev : [...prev, saved]));
  }, []);

  const remove = useCallback(async (id: string) => {
    await api.deletePledge(id);
    setPledges((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addMany = useCallback(async (imported: Pledge[]) => {
    try {
      for (const p of imported) await api.createPledge(p);
    } finally {
      await load();
    }
  }, [load]);

  const clear = useCallback(async () => {
    await api.clearPledges();
    setPledges([]);
  }, []);

  return { pledges, add, remove, addMany, clear };
}
