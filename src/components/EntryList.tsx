import { useRef, useState } from 'react';
import type { FootprintEntry } from '../types';
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
  onDelete,
  onRetry,
}: EntryListProps) {
  const [showAll, setShowAll] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const seen = useRef<Set<string>>(new Set());

  const q = query.trim();
  const shown = showAll || q ? entries : entries.slice(0, PAGE);

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

  return (
    <>
      <p className="log-summary">
        {totalCount === 0
          ? 'No entries yet. Add one above.'
          : q
            ? `${entries.length} of ${totalCount} entries match “${q}”.`
            : `${totalCount} entries, ${Math.round(entries.reduce((s, e) => s + e.kg, 0)).toLocaleString('en-IN')} kg CO₂e in total.`}
      </p>

      {entries.length === 0 && totalCount > 0 && <p className="notice">No entries match “{q}”.</p>}

      <ul ref={listRef} className="entry-list" aria-label="Logged activities, newest first">
        {shown.map((e) => (
          <EntryRow key={e.id} entry={e} editing={e.id === editingId} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </ul>

      {!q && entries.length > PAGE && (
        <Button variant="ghost" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show fewer' : `Show all ${entries.length} entries`}
        </Button>
      )}
    </>
  );
}
