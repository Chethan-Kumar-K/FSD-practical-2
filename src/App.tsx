import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EntryInput, FootprintEntry } from './types';
import { useEntries } from './hooks/useEntries';
import { analyse } from './utils/analysis';
import { CAT_NAME } from './data/catalogue';
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
  const { entries, loading, error, reload, add, update, remove } = useEntries();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<FootprintEntry | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [dark, setDark] = useState(initialDark);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('cfi.theme', dark ? 'dark' : 'light');
    } catch {
      /* storage blocked */
    }
  }, [dark]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), []);

  // Newest first, then filtered by the search box
  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), [entries]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((e) =>
      `${e.label} ${CAT_NAME[e.cat]} ${e.date} ${niceDate(e.date)}`.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  const analysis = useMemo(() => analyse(entries, todayStr()), [entries]);

  async function handleSubmit(input: EntryInput): Promise<boolean> {
    try {
      if (editing) {
        await update(editing.id, input);
        notify(`Updated ${input.label}, ${amountText(input.amount, input.unit)}.`);
        setEditing(null);
      } else {
        await add(input);
        notify(`Added ${input.label}, ${amountText(input.amount, input.unit)}: ${fmt(input.kg)} kg CO₂e.`);
      }
      return true;
    } catch {
      notify('Could not save. Is JSON Server running on port 3001?');
      return false;
    }
  }

  async function handleDelete(id: number): Promise<boolean> {
    try {
      await remove(id);
      if (editing?.id === id) setEditing(null);
      notify('Entry deleted.');
      return true;
    } catch {
      notify('Could not delete. Is JSON Server running on port 3001?');
      return false;
    }
  }

  function handleEdit(entry: FootprintEntry) {
    setEditing(entry);
    // GSAP ScrollToPlugin glides up to the form
    if (prefersReducedMotion()) document.getElementById('activities')?.scrollIntoView();
    else gsap.to(window, { duration: 0.8, ease: 'power3.inOut', scrollTo: { y: '#activities', offsetY: 72 } });
  }

  return (
    <>
      <Header dark={dark} onToggleTheme={() => setDark((d) => !d)} />
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
            <EntryForm editing={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />
          </Reveal>
        </section>

        <section id="log" className="section section-tint">
          <Reveal className="container">
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
              onDelete={handleDelete}
              onRetry={reload}
            />
          </Reveal>
        </section>

        <section id="insights" className="section">
          <Reveal className="container">
            <StatsPanel analysis={analysis} />
          </Reveal>
          <Reveal className="container">
            <BarChart analysis={analysis} />
          </Reveal>
          <Reveal className="container">
            <Recommendations recs={analysis.recs} />
          </Reveal>
        </section>
      </main>
      <Footer />
      <Toast message={toast} />
    </>
  );
}
