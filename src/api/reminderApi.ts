import { request } from './entriesApi';

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:MM
  lastFired: string; // YYYY-MM-DD or ''
}

/** `saved` is false until the settings have been stored in SQLite for the first time. */
export const getReminder = () => request<ReminderSettings & { saved: boolean }>('/reminder');

export const saveReminder = (settings: ReminderSettings) =>
  request<ReminderSettings>('/reminder', { method: 'PUT', body: JSON.stringify(settings) });
