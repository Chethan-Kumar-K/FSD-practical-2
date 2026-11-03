import type { EntryInput, FootprintEntry } from '../types';

/** JSON Server base URL. Override with VITE_API_URL in a .env file if needed. */
const BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** READ: GET /entries */
export const listEntries = () => request<FootprintEntry[]>('/entries');

/** CREATE: POST /entries */
export const createEntry = (input: EntryInput) =>
  request<FootprintEntry>('/entries', { method: 'POST', body: JSON.stringify(input) });

/** UPDATE: PUT /entries/:id */
export const updateEntry = (id: number, input: EntryInput) =>
  request<FootprintEntry>(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(input) });

/** DELETE: DELETE /entries/:id */
export const deleteEntry = (id: number) => request<void>(`/entries/${id}`, { method: 'DELETE' });
