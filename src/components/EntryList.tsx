import { useEffect, useRef, useState } from 'react';
import type { CategoryKey, FootprintEntry } from '../types';
import { CAT_COLOR, CAT_ORDER, CAT_SHORT } from '../data/catalogue';
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap';
import { Button } from './ui/Button';
import { EntryRow } from './EntryRow';

const PAGE = 8;

interface EntryListProps {
  entries: FootprintEntry[]; // already filtered and sorted
  totalCount: number;
  query: string;
  loading: boolean;
  error: string | null;
  editingId: number | null;
  onEdit: (entry: FootprintEntry) => void;
  onRepeat: (entry: FootprintEntry) => void;
  onDelete: (id: number) => Promise<boolean>;
  onRetry: () => void;
}

export function EntryList({
  entries,
  totalCount,
  query,
  loading,
  error,
  editingId,
  onEdit,
  onRepeat,
  onDelete,
  onRetry,
}: EntryListProps) {
  const [showAll, setShowAll] = useState(false);
  const [cat, setCat] = useState<CategoryKey | 'all'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest'>('newest');
  const listRef = useRef<HTMLUListElement>(null);
  const seen = useRef<Set<string>>(new Set());

  const q = query.trim();
  const counts = CAT_ORDER.map((k) => [k, entries.filter((e) => e.cat === k).length] as const);
  const visible = cat === 'all' ? entries : entries.filter((e) => e.cat === cat);
  const filtering = Boolean(q) || cat !== 'all';
  const ordered = [...visible].sort((a, b) => {
    if (sort === 'oldest') return a.date.localeCompare(b.date) || a.id - b.id;
    if (sort === 'highest') return b.kg - a.kg || b.date.localeCompare(a.date);
    return b.date.localeCompare(a.date) || b.id - a.id;
  });
  const shown = showAll || filtering ? ordered : ordered.slice(0, PAGE);

  useEffect(() => {
    const showForPrint = () => setShowAll(true);
    const restoreAfterPrint = () => setShowAll(false);
    window.addEventListener('beforeprint', showForPrint);
    window.addEventListener('afterprint', restoreAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', showForPrint);
      window.removeEventListener('afterprint', restoreAfterPrint);
    };
  }, []);

  // Animate rows the first time they appear: a stagger on load, a flash for new records
  useGSAP(
    () => {
      const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-row]') ?? []);
      const fresh = rows.filter((r) => !seen.current.has(r.dataset.id ?? ''));
      rows.forEach((r) => seen.current.add(r.dataset.id ?? ''));
      if (!fresh.length || prefersReducedMotion()) return;
      gsap.from(fresh, {
        opacity: 0,
        y: 18,
        duration: 0.45,
        ease: 'power2.out',
        stagger: fresh.length > 3 ? 0.05 : 0.1,
        clearProps: 'opacity,transform',
      });
      if (fresh.length === 1) {
        gsap.fromTo(
          fresh[0],
          { backgroundColor: 'rgba(242, 169, 0, 0.45)' },
          { backgroundColor: 'rgba(242, 169, 0, 0)', duration: 1.4, clearProps: 'backgroundColor' },
        );
      }
    },
    { scope: listRef, dependencies: [shown.map((e) => e.id).join(',')] },
  );

  if (error) {
    return (
      <div className="notice notice-error" role="alert">
        <p>{error}</p>
        <Button small onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  if (loading) return <p className="notice">Loading your log…</p>;

  const kgTotal = Math.round(visible.reduce((sum, e) => sum + e.kg, 0)).toLocaleString('en-IN');
  const catName = cat === 'all' ? '' : CAT_SHORT[cat];

  return (
    <>
      {totalCount > 0 && (
        <div className="chip-row" role="group" aria-label="Filter the log by category">
          <button type="button" className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
            All <span className="chip-count">{entries.length}</span>
          </button>
          {counts.map(([k, n]) => (
            <button
              key={k}
              type="button"
              className="chip"
              aria-pressed={cat === k}
              disabled={n === 0 && cat !== k}
              onClick={() => setCat(cat === k ? 'all' : k)}
            >
              <i className="swatch" style={{ background: CAT_COLOR[k] }} aria-hidden="true" />
              {CAT_SHORT[k]} <span className="chip-count">{n}</span>
            </button>
          ))}
        </div>
      )}

      <p className="log-summary" aria-live="polite">
        {totalCount === 0
          ? 'No entries yet. Add one above.'
          : q
            ? `${visible.length} of ${totalCount} entries match “${q}”${catName ? ` in ${catName}` : ''}.`
            : catName
              ? `${visible.length} ${catName} entries, ${kgTotal} kg CO₂e.`
              : `${totalCount} entries, ${kgTotal} kg CO₂e in total.`}
      </p>

      {visible.length > 1 && (
        <div className="log-controls">
          <label htmlFor="log-sort">Sort by</label>
          <select id="log-sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest impact</option>
          </select>
        </div>
      )}

      {visible.length === 0 && totalCount > 0 && (
        <p className="notice">{q ? `No entries match “${q}”${catName ? ` in ${catName}` : ''}.` : `No ${catName} entries yet.`}</p>
      )}

      <ul ref={listRef} className="entry-list" aria-label="Logged activities, newest first">
        {shown.map((e) => (
          <EntryRow key={e.id} entry={e} editing={e.id === editingId} onEdit={onEdit} onRepeat={onRepeat} onDelete={onDelete} />
        ))}
      </ul>

      {!filtering && visible.length > PAGE && (
        <Button variant="ghost" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show fewer' : `Show all ${visible.length} entries`}
        </Button>
      )}
    </>
  );
}
