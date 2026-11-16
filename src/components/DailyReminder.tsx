import { useEffect, useState } from 'react';
import { Button } from './ui/Button';

interface ReminderSettings {
  enabled: boolean;
  time: string;
  lastFired: string;
}

const STORAGE_KEY = 'cfi.reminder';
const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, time: '20:00', lastFired: '' };

function readSettings(): ReminderSettings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS;
    const saved = value as Partial<ReminderSettings>;
    return {
      enabled: saved.enabled === true,
      time: typeof saved.time === 'string' && /^\d{2}:\d{2}$/.test(saved.time) ? saved.time : DEFAULT_SETTINGS.time,
      lastFired: typeof saved.lastFired === 'string' ? saved.lastFired : '',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface DailyReminderProps {
  hasLoggedToday: boolean;
  onNotify: (message: string) => void;
}

export function DailyReminder({ hasLoggedToday, onNotify }: DailyReminderProps) {
  const [settings, setSettings] = useState(readSettings);
  const [status, setStatus] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      setStatus('Reminder settings could not be saved in this browser.');
    }
  }, [settings]);

  useEffect(() => {
    if (!settings.enabled) return;
    const check = () => {
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = localDate();
      if (settings.lastFired === today || time < settings.time) return;
      setSettings((current) => ({ ...current, lastFired: today }));
      if (!hasLoggedToday) {
        const message = 'You have not logged anything today. It takes about a minute.';
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Log today’s carbon', { body: message, tag: 'daily-log' });
          } catch {
            onNotify(message);
          }
        } else {
          onNotify(message);
        }
      }
    };
    const interval = window.setInterval(check, 30000);
    check();
    return () => window.clearInterval(interval);
  }, [hasLoggedToday, onNotify, settings]);

  async function toggleReminder() {
    if (settings.enabled) {
      setSettings((current) => ({ ...current, enabled: false }));
      return;
    }
    if (!('Notification' in window)) {
      setStatus('This browser does not support notifications. The reminder can only appear while this page is open.');
      setSettings((current) => ({ ...current, enabled: true }));
      return;
    }
    try {
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') {
        setStatus('Notifications are blocked. Allow them in browser settings to receive system notifications.');
        return;
      }
      setStatus('Keep this page open in a browser tab to receive reminders.');
      setSettings((current) => ({ ...current, enabled: true, lastFired: current.time <= new Date().toTimeString().slice(0, 5) ? localDate() : current.lastFired }));
    } catch {
      setStatus('Could not request notification permission. Check this site’s browser settings.');
    }
  }

  async function testNotification() {
    if (!('Notification' in window)) {
      onNotify('This browser does not support notifications.');
      return;
    }
    try {
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') {
        setStatus('Notifications are blocked. Allow them in browser settings to test a notification.');
        return;
      }
      new Notification('CarbonFootprint India', { body: 'This is a test. Reminders will look like this.', tag: 'test' });
      setStatus('Test notification sent.');
    } catch {
      setStatus('Could not show a notification. Check your browser settings.');
    }
  }

  return (
    <section className="card feature-card" aria-labelledby="reminder-title">
      <h3 id="reminder-title" className="form-title">Daily reminder and budget alerts</h3>
      <p className="muted">Choose a time to be reminded if you have not logged an activity today. Reminders work while this page is open.</p>
      <label className="field reminder-time">
        <span>Remind me at</span>
        <input
          type="time"
          value={settings.time}
          onChange={(event) => setSettings((current) => ({ ...current, time: event.target.value, lastFired: '' }))}
        />
      </label>
      <div className="feature-actions">
        <Button aria-pressed={settings.enabled} onClick={() => void toggleReminder()}>
          {settings.enabled ? 'Turn off reminders' : 'Turn on reminders'}
        </Button>
        <Button variant="outline" onClick={() => void testNotification()}>Send a test</Button>
      </div>
      <p className="tool-status" role="status">
        {status || (settings.enabled ? `Reminders are on for ${settings.time}.` : 'Reminders are off.')}
      </p>
    </section>
  );
}
