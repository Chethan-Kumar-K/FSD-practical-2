import type { Pledge } from '../types';
import { request } from './entriesApi';

/** READ: GET /pledges */
export const listPledges = () => request<Pledge[]>('/pledges');

/** CREATE: POST /pledges (the same change twice returns the existing one) */
export const createPledge = (pledge: Pledge) =>
  request<Pledge>('/pledges', { method: 'POST', body: JSON.stringify(pledge) });

/** DELETE: DELETE /pledges/:id */
export const deletePledge = (id: string) => request<void>(`/pledges/${encodeURIComponent(id)}`, { method: 'DELETE' });

/** DELETE: DELETE /pledges (clears them all) */
export const clearPledges = () => request<void>('/pledges', { method: 'DELETE' });
