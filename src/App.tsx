import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EntryInput, FootprintEntry, Pledge } from './types';
import { useEntries } from './hooks/useEntries';
import { useAnalysis } from './hooks/useAnalysis';
import { usePledges } from './hooks/usePledges';
import { CAT_NAME, DAILY_BUDGET, buildEntry } from './data/catalogue';
import { amountText, fmt, niceDate, todayStr } from './utils/format';
import { gsap, prefersReducedMotion } from './lib/gsap';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { EntryForm } from './components/EntryForm';
import { SearchBar } from './components/SearchBar';
import { EntryList } from './components/EntryList';
import { StatsPanel } from './components/StatsPanel';
import { BarChart } from './components/BarChart';
import { Recommendations } from './components/Recommendations';
import { Footer } from './components/Footer';
import { Toast, type ToastMessage } from './components/Toast';
import { Reveal } from './components/ui/Reveal';
import { DataTools } from './components/DataTools';
import { ProgressPanel } from './components/ProgressPanel';
import { TripTracker } from './components/TripTracker';
import { DailyReminder } from './components/DailyReminder';
import { ScrollProgress } from './components/ScrollProgress';

function initialDark(): boolean {
  try {
    const saved = localStorage.getItem('cfi.theme');
    if (saved) return saved === 'dark';
  } catch {
    /* storage blocked */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function App() {
  const { entries, loading, error, reload, add, update, remove, addMany, clearAll } = useEntries();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<FootprintEntry | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [dark, setDark] = useState(initialDark);
  const { pledges, add: savePledge, remove: deletePledge, addMany: savePledges, clear: clearPledges } = usePledges();
  const [undoEntry, setUndoEntry] = useState<FootprintEntry | null>(null);
  const [tripPrefill, setTripPrefill] = useState<{ kind: string; amount: number; version: number } | null>(null);
  const [today, setToday] = useState(todayStr);
  const printQuery = useRef('');

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      try {
        if (!localStorage.getItem('cfi.theme')) setDark(event.matches);
      } catch {
        setDark(event.matches);
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayStr()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tripPrefill) return;
    const target = document.getElementById('activities');
    if (prefersReducedMotion()) target?.scrollIntoView();
    else gsap.to(window, { duration: 0.8, ease: 'power3.inOut', scrollTo: { y: '#activities', offsetY: 72 } });
    document.getElementById('amount')?.focus({ preventScroll: true });
  }, [tripPrefill]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), []);
  const { analysis } = useAnalysis(entries, today);
  const toggleTheme = useCallback(() => {
    setDark((current) => {
      const next = !current;
      try {
        localStorage.setItem('cfi.theme', next ? 'dark' : 'light');
      } catch {
        notify('Theme changed, but this browser could not save the preference.');
      }
      return next;
    });
  }, [notify]);

  // Newest first, then filtered by the search box
  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [entries]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((e) =>
      `${e.label} ${CAT_NAME[e.cat]} ${e.date} ${niceDate(e.date)}`.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  async function handleSubmit(input: EntryInput): Promise<boolean> {
    const todayTotal = input.date === today
      ? entries.reduce((sum, entry) => (entry.date === today ? sum + entry.kg : sum), 0)
      : 0;
    try {
      if (editing) {
        await update(editing.id, input);
        notify(`Updated ${input.label}, ${amountText(input.amount, input.unit)}.`);
        setEditing(null);
      } else {
        await add(input);
        notify(`Added ${input.label}, ${amountText(input.amount, input.unit)}: ${fmt(input.kg)} kg CO₂e.`);
        if (input.date === today && todayTotal <= DAILY_BUDGET && todayTotal + input.kg > DAILY_BUDGET) {
          const message = `Today is at ${fmt(todayTotal + input.kg)} kg, over the ${DAILY_BUDGET} kg daily budget.`;
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Over today’s carbon budget', { body: message, tag: 'budget-alert' });
            } catch {
              notify(message);
            }
          } else {
            notify(message);
          }
        }
      }
      return true;
    } catch {
      notify('Could not save. Is the API server running on port 3001?');
      return false;
    }
  }

  async function handleDelete(id: number): Promise<boolean> {
    const target = entries.find((entry) => entry.id === id);
    try {
      await remove(id);
      if (editing?.id === id) setEditing(null);
      if (target) setUndoEntry(target);
      notify('Entry deleted. Press Ctrl+Z to undo.');
      return true;
    } catch {
      notify('Could not delete. Is the API server running on port 3001?');
      return false;
    }
  }

  async function handleRepeat(entry: FootprintEntry) {
    try {
      const repeated = await add(buildEntry(today, entry.kind, entry.amount));
      notify(`Logged again today: ${repeated.label}, ${amountText(repeated.amount, repeated.unit)}.`);
    } catch {
      notify('Could not repeat this activity. Is the API server running on port 3001?');
    }
  }

  async function handleUndo() {
    if (!undoEntry) return;
    try {
      const restored = await add(buildEntry(undoEntry.date, undoEntry.kind, undoEntry.amount));
      setUndoEntry(null);
      notify(`${restored.label} restored.`);
    } catch {
      notify('Could not restore the entry. Is the API server running on port 3001?');
    }
  }

  async function addPledge(pledge: Pledge) {
    if (pledges.some((item) => item.id === pledge.id)) return;
    try {
      await savePledge(pledge);
      notify(`Pledged: ${pledge.title}`);
    } catch {
      notify('Could not save the pledge. Is the API server running on port 3001?');
    }
  }

  async function removePledge(id: string) {
    try {
      await deletePledge(id);
      notify('Removed from pledges.');
    } catch {
      notify('Could not remove the pledge. Is the API server running on port 3001?');
    }
  }

  function handleEdit(entry: FootprintEntry) {
    setEditing(entry);
    // GSAP ScrollToPlugin glides up to the form
    if (prefersReducedMotion()) document.getElementById('activities')?.scrollIntoView();
    else gsap.to(window, { duration: 0.8, ease: 'power3.inOut', scrollTo: { y: '#activities', offsetY: 72 } });
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const typing = target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]');
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && target instanceof Node && document.getElementById('activities')?.contains(target)) {
        event.preventDefault();
        document.querySelector<HTMLFormElement>('.estimator')?.requestSubmit();
      } else if (event.altKey && /^Digit[1-4]$/.test(event.code)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>(`input[name="category"][value="${['travel', 'energy', 'food', 'shopping'][Number(event.code.slice(5)) - 1]}"]`)?.click();
      } else if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        document.getElementById('amount')?.focus();
        document.getElementById('activities')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !typing && undoEntry) {
        event.preventDefault();
        void handleUndo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoEntry, handleUndo]);

  useEffect(() => {
    const offline = () => notify('You are offline. Changes require a connection to the API server.');
    const online = () => notify('Back online.');
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
    };
  }, [notify]);

  useEffect(() => {
    const receipt = document.querySelector<HTMLElement>('.receipt-paper');
    if (!receipt) return;
    const onCopy = (event: ClipboardEvent) => {
      const selection = String(document.getSelection());
      if (!selection || !event.clipboardData) return;
      event.preventDefault();
      event.clipboardData.setData('text/plain', `${selection}\n— CarbonFootprint India, ${niceDate(today)}`);
      notify('Receipt text copied with a source line.');
    };
    receipt.addEventListener('copy', onCopy);
    return () => receipt.removeEventListener('copy', onCopy);
  }, [today, notify]);

  useEffect(() => {
    const names: Record<string, string> = {
      home: 'Dashboard', activities: 'Log Activity', log: 'My Log', insights: 'Insights', pledges: 'Pledges', about: 'About',
    };
    const updateTitle = () => {
      document.title = `CarbonFootprint India | ${names[window.location.hash.slice(1)] ?? 'Dashboard'}`;
    };
    window.addEventListener('hashchange', updateTitle);
    updateTitle();
    return () => window.removeEventListener('hashchange', updateTitle);
  }, []);

  useEffect(() => {
    const beforePrint = () => {
      printQuery.current = query;
      setQuery('');
    };
    const afterPrint = () => setQuery(printQuery.current);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [query]);

  const hasLoggedToday = entries.some((entry) => entry.date === today);

  return (
    <>
      <ScrollProgress />
      <Header dark={dark} onToggleTheme={toggleTheme} />
      <main id="main">
        <Hero entries={entries} />

        <section id="activities" className="section">
          <Reveal className="container split">
            <div className="intro">
              <h2 className="section-title">Log an activity and see what it costs in carbon</h2>
              <p>
                Pick a category, choose what you did and enter how much. The estimate updates as you type and uses
                everyday Indian conditions: two-wheelers, auto-rickshaws, the metro and LPG cooking gas.
              </p>
              <p className="muted">Emission factors here are illustrative. A production version would use verified figures.</p>
            </div>
            <EntryForm editing={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} tripPrefill={tripPrefill} />
          </Reveal>
          <Reveal className="container feature-grid">
            <TripTracker onUseTrip={(kind, amount) => setTripPrefill({ kind, amount, version: Date.now() })} />
            <DailyReminder hasLoggedToday={hasLoggedToday} onNotify={notify} />
          </Reveal>
        </section>

        <section id="log" className="section section-tint">
          <Reveal className="container log-layout">
            <div className="log-main">
              <div className="log-head">
                <h2 className="section-title">Your activity log</h2>
                <SearchBar value={query} onChange={setQuery} />
              </div>
              <EntryList
                entries={visible}
                totalCount={entries.length}
                query={query}
                loading={loading}
                error={error}
                editingId={editing?.id ?? null}
                onEdit={handleEdit}
                onRepeat={handleRepeat}
                onDelete={handleDelete}
                onRetry={reload}
              />
            </div>
            <DataTools
              entries={entries}
              analysis={analysis}
              pledges={pledges}
              onImport={addMany}
              onImportPledges={(imported) => void savePledges(imported).catch(() => notify('Some pledges could not be saved. Is the API server running on port 3001?'))}
              onClear={clearAll}
              onClearPledges={() => void clearPledges().catch(() => notify('Pledges could not be cleared. Is the API server running on port 3001?'))}
              onNotify={notify}
            />
          </Reveal>
        </section>

        <section id="insights" className="section">
          <Reveal className="container">
            <StatsPanel analysis={analysis} />
          </Reveal>
          <Reveal className="container">
            <ProgressPanel entries={entries} previousTotal={analysis.prevTotal} monthTotal={analysis.monthTotal} />
          </Reveal>
          <Reveal className="container">
            <BarChart analysis={analysis} />
          </Reveal>
        </section>
        <section id="pledges" className="section section-tint">
          <Reveal className="container">
            <Recommendations recs={analysis.recs} pledges={pledges} onAdd={addPledge} onRemove={removePledge} />
          </Reveal>
        </section>
      </main>
      <Footer />
      <Toast message={toast} />
    </>
  );
}
